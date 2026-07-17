import { db } from '../db/db';
import { projects, projectMembers, boards, stages, tasks, auditLogs, comments, users } from '../db/schema';
import { eq, and, isNull, sql, asc, desc } from 'drizzle-orm';
import type { Actor } from './users';
import { generateKeyBetween } from 'fractional-indexing';
import { emitBoardEvent } from './events';
import { notifyCommentAdded } from './notifications';

/**
 * Creates a helpdesk ticket (task) for a group and ensures that the default 
 * Private "System Support & Tickets" project, "Helpdesk Tickets" board, 
 * and stages are dynamically initialized if they don't exist.
 */
export async function createHelpdeskTicket(
	actor: Actor,
	type: 'Bug' | 'Feature' | 'Support',
	title: string,
	description: string
) {
	if (!actor.groupId) {
		throw new Error('Unauthorized');
	}

	// 1. Find or create the Private support project
	let [supportProject] = await db.select({ id: projects.id }).from(projects).where(
		and(
			eq(projects.groupId, actor.groupId),
			eq(projects.name, 'System Support & Tickets'),
			isNull(projects.deletedAt)
		)
	).limit(1);

	if (!supportProject) {
		[supportProject] = await db.insert(projects).values({
			name: 'System Support & Tickets',
			groupId: actor.groupId,
			visibility: 'Private'
		}).returning();

		// Add Group Admins as members/admins of this project automatically
		const groupAdmins = await db.select({ id: users.id })
			.from(users)
			.where(
				and(
					eq(users.groupId, actor.groupId),
					eq(users.role, 'Admin'),
					isNull(users.deletedAt)
				)
			);
		
		if (groupAdmins.length > 0) {
			await db.insert(projectMembers).values(
				groupAdmins.map(admin => ({
					projectId: supportProject.id,
					userId: admin.id,
					role: 'Admin'
				}))
			);
		}
	}

	// 2. Find or create the Helpdesk Tickets board inside this project
	let [helpdeskBoard] = await db.select({ id: boards.id }).from(boards).where(
		and(
			eq(boards.groupId, actor.groupId),
			eq(boards.projectId, supportProject.id),
			eq(boards.name, 'Helpdesk Tickets'),
			isNull(boards.deletedAt)
		)
	).limit(1);

	if (!helpdeskBoard) {
		[helpdeskBoard] = await db.insert(boards).values({
			name: 'Helpdesk Tickets',
			projectId: supportProject.id,
			groupId: actor.groupId,
			prefix: 'TIC'
		}).returning();
	}

	// 3. Find or create the default "Incoming" stage for this board
	let [incomingStage] = await db.select({ id: stages.id }).from(stages).where(
		and(
			eq(stages.boardId, helpdeskBoard.id),
			eq(stages.name, 'Incoming'),
			isNull(stages.deletedAt)
		)
	).limit(1);

	if (!incomingStage) {
		const orderIndexIncoming = generateKeyBetween(null, null);
		[incomingStage] = await db.insert(stages).values({
			name: 'Incoming',
			boardId: helpdeskBoard.id,
			orderIndex: orderIndexIncoming
		}).returning();

		const orderIndexProgress = generateKeyBetween(orderIndexIncoming, null);
		const orderIndexResolved = generateKeyBetween(orderIndexProgress, null);

		await db.insert(stages).values([
			{
				name: 'In Progress',
				boardId: helpdeskBoard.id,
				orderIndex: orderIndexProgress
			},
			{
				name: 'Resolved',
				boardId: helpdeskBoard.id,
				orderIndex: orderIndexResolved,
				isCompleted: true
			}
		]);
	}

	// 4. Claim next task number for the board (Atomic locking)
	const lockResult = await db.execute(
		sql`SELECT COALESCE(MAX(${tasks.number}), 0) + 1 AS next_number FROM ${tasks} WHERE ${tasks.groupId} = ${actor.groupId} AND ${tasks.boardId} = ${helpdeskBoard.id} FOR UPDATE`
	);
	const number = (lockResult.rows[0] as { next_number: number })?.next_number ?? 1;
	const orderIndex = generateKeyBetween(null, null);

	// 5. Insert the task directly, storing reporterId in customFields
	const [newTask] = await db.insert(tasks).values({
		title: `[${type}] ${title}`,
		description,
		stageId: incomingStage.id,
		boardId: helpdeskBoard.id,
		projectId: supportProject.id,
		groupId: actor.groupId,
		orderIndex,
		number,
		priority: 'Medium',
		customFields: {
			reporterId: actor.id,
			ticketType: type
		}
	}).returning();

	// 6. Audit log & Board event
	await db.insert(auditLogs).values({
		groupId: actor.groupId,
		projectId: supportProject.id,
		taskId: newTask.id,
		userId: actor.id,
		actionType: 'task_created',
		details: { ticketType: type }
	});

	emitBoardEvent(helpdeskBoard.id, 'task_created', { task: newTask });

	return newTask;
}

/**
 * Returns all helpdesk tickets filed by a specific user.
 */
export async function getUserHelpdeskTickets(actor: Actor) {
	if (!actor.groupId) {
		throw new Error('Unauthorized');
	}

	// Find support board
	const [supportProject] = await db.select({ id: projects.id }).from(projects).where(
		and(
			eq(projects.groupId, actor.groupId),
			eq(projects.name, 'System Support & Tickets'),
			isNull(projects.deletedAt)
		)
	).limit(1);

	if (!supportProject) return [];

	const [helpdeskBoard] = await db.select({ id: boards.id }).from(boards).where(
		and(
			eq(boards.groupId, actor.groupId),
			eq(boards.projectId, supportProject.id),
			eq(boards.name, 'Helpdesk Tickets'),
			isNull(boards.deletedAt)
		)
	).limit(1);

	if (!helpdeskBoard) return [];

	return await db.select({
		id: tasks.id,
		title: tasks.title,
		number: tasks.number,
		priority: tasks.priority,
		createdAt: tasks.createdAt,
		updatedAt: tasks.updatedAt,
		stageId: tasks.stageId,
		stageName: stages.name,
		customFields: tasks.customFields
	})
	.from(tasks)
	.innerJoin(stages, eq(tasks.stageId, stages.id))
	.where(
		and(
			eq(tasks.groupId, actor.groupId),
			eq(tasks.boardId, helpdeskBoard.id),
			eq(sql`${tasks.customFields}->>'reporterId'`, actor.id),
			isNull(tasks.deletedAt)
		)
	)
	.orderBy(desc(tasks.createdAt));
}

/**
 * Helper to verify if an actor has access to a specific helpdesk ticket.
 */
async function verifyTicketAccess(actor: Actor, task: any): Promise<boolean> {
	if (actor.role === 'Admin') return true;

	// Check if the actor is the reporter
	const customFields = (task.customFields || {}) as any;
	if (customFields.reporterId === actor.id) return true;

	// Check if the actor is an explicitly invited project member
	const [member] = await db.select({ role: projectMembers.role }).from(projectMembers).where(
		and(
			eq(projectMembers.projectId, task.projectId),
			eq(projectMembers.userId, actor.id)
		)
	).limit(1);

	return !!member;
}

/**
 * Fetches a single helpdesk ticket and its full comments + audit log history.
 */
export async function getHelpdeskTicket(actor: Actor, ticketId: string) {
	if (!actor.groupId) {
		throw new Error('Unauthorized');
	}

	const [task] = await db.select().from(tasks).where(
		and(
			eq(tasks.id, ticketId),
			eq(tasks.groupId, actor.groupId),
			isNull(tasks.deletedAt)
		)
	).limit(1);

	if (!task) {
		throw new Error('Ticket not found');
	}

	const hasAccess = await verifyTicketAccess(actor, task);
	if (!hasAccess) {
		throw new Error('Access denied');
	}

	// Fetch Comments
	const taskComments = await db.select({
		id: comments.id,
		content: comments.content,
		createdAt: comments.createdAt,
		author: {
			id: users.id,
			name: users.name,
			role: users.role,
			avatarUrl: users.avatarUrl
		}
	})
	.from(comments)
	.innerJoin(users, eq(comments.authorId, users.id))
	.where(eq(comments.taskId, ticketId))
	.orderBy(asc(comments.createdAt));

	// Fetch Audit Logs
	const taskAudits = await db.select({
		id: auditLogs.id,
		actionType: auditLogs.actionType,
		oldValue: auditLogs.oldValue,
		newValue: auditLogs.newValue,
		createdAt: auditLogs.createdAt,
		actor: {
			id: users.id,
			name: users.name
		}
	})
	.from(auditLogs)
	.innerJoin(users, eq(auditLogs.userId, users.id))
	.where(eq(auditLogs.taskId, ticketId))
	.orderBy(asc(auditLogs.createdAt));

	return {
		task,
		comments: taskComments,
		auditLogs: taskAudits
	};
}

/**
 * Submits a comment/reply onto a helpdesk ticket.
 */
export async function submitHelpdeskComment(actor: Actor, ticketId: string, content: string) {
	if (!actor.groupId || !content.trim()) {
		throw new Error('Unauthorized');
	}

	const [task] = await db.select().from(tasks).where(
		and(
			eq(tasks.id, ticketId),
			eq(tasks.groupId, actor.groupId),
			isNull(tasks.deletedAt)
		)
	).limit(1);

	if (!task) {
		throw new Error('Ticket not found');
	}

	const hasAccess = await verifyTicketAccess(actor, task);
	if (!hasAccess) {
		throw new Error('Access denied');
	}

	const [newComment] = await db.insert(comments).values({
		taskId: ticketId,
		authorId: actor.id,
		content: content.trim()
	}).returning();

	await notifyCommentAdded(actor.id, ticketId);

	return newComment;
}
