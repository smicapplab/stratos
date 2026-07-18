import { db } from '../db/db';
import { projects, projectMembers, boards, stages, tasks, auditLogs, comments, users, attachments, groups } from '../db/schema';
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

	return await db.transaction(async (tx) => {
		// Lock the group row to serialize support infrastructure creation for the tenant
		await tx.select({ id: groups.id })
			.from(groups)
			.where(eq(groups.id, actor.groupId))
			.for('update');

		// 1. Find or create the Private support project
		let [supportProject] = await tx.select({ id: projects.id }).from(projects).where(
			and(
				eq(projects.groupId, actor.groupId),
				eq(projects.name, 'System Support & Tickets'),
				isNull(projects.deletedAt)
			)
		).limit(1);

		if (!supportProject) {
			const projectResults = await tx.insert(projects).values({
				name: 'System Support & Tickets',
				groupId: actor.groupId,
				visibility: 'Private'
			}).onConflictDoNothing().returning();

			if (projectResults.length > 0) {
				supportProject = projectResults[0];
			} else {
				[supportProject] = await tx.select({ id: projects.id }).from(projects).where(
					and(
						eq(projects.groupId, actor.groupId),
						eq(projects.name, 'System Support & Tickets'),
						isNull(projects.deletedAt)
					)
				).limit(1);
			}

			// Add Group Admins as members/admins of this project automatically
			const groupAdmins = await tx.select({ id: users.id })
				.from(users)
				.where(
					and(
						eq(users.groupId, actor.groupId),
						eq(users.role, 'Admin'),
						isNull(users.deletedAt)
					)
				);
			
			if (groupAdmins.length > 0 && supportProject) {
				await tx.insert(projectMembers).values(
					groupAdmins.map(admin => ({
						projectId: supportProject.id,
						userId: admin.id,
						role: 'Admin'
					}))
				).onConflictDoNothing();
			}
		}

		if (!supportProject) {
			throw new Error('Failed to initialize support project');
		}

		// 2. Find or create the Helpdesk Tickets board inside this project
		let [helpdeskBoard] = await tx.select({ id: boards.id }).from(boards).where(
			and(
				eq(boards.groupId, actor.groupId),
				eq(boards.projectId, supportProject.id),
				eq(boards.name, 'Helpdesk Tickets'),
				isNull(boards.deletedAt)
			)
		).limit(1);

		if (!helpdeskBoard) {
			const boardResults = await tx.insert(boards).values({
				name: 'Helpdesk Tickets',
				projectId: supportProject.id,
				groupId: actor.groupId,
				prefix: 'TIC'
			}).onConflictDoNothing().returning();

			if (boardResults.length > 0) {
				helpdeskBoard = boardResults[0];
			} else {
				[helpdeskBoard] = await tx.select({ id: boards.id }).from(boards).where(
					and(
						eq(boards.groupId, actor.groupId),
						eq(boards.projectId, supportProject.id),
						eq(boards.name, 'Helpdesk Tickets'),
						isNull(boards.deletedAt)
					)
				).limit(1);
			}
		}

		if (!helpdeskBoard) {
			throw new Error('Failed to initialize support board');
		}

		// Lock the board row to serialize task creation number generation on this board
		await tx.select({ id: boards.id })
			.from(boards)
			.where(eq(boards.id, helpdeskBoard.id))
			.for('update');

		// 3. Find or create the default "Incoming" stage for this board
		let [incomingStage] = await tx.select({ id: stages.id }).from(stages).where(
			and(
				eq(stages.boardId, helpdeskBoard.id),
				eq(stages.name, 'Incoming'),
				isNull(stages.deletedAt)
			)
		).limit(1);

		if (!incomingStage) {
			const orderIndexIncoming = generateKeyBetween(null, null);
			const stageResults = await tx.insert(stages).values({
				name: 'Incoming',
				boardId: helpdeskBoard.id,
				orderIndex: orderIndexIncoming
			}).onConflictDoNothing().returning();

			if (stageResults.length > 0) {
				incomingStage = stageResults[0];
			} else {
				[incomingStage] = await tx.select({ id: stages.id }).from(stages).where(
					and(
						eq(stages.boardId, helpdeskBoard.id),
						eq(stages.name, 'Incoming'),
						isNull(stages.deletedAt)
					)
				).limit(1);
			}

			const orderIndexProgress = generateKeyBetween(orderIndexIncoming, null);
			const orderIndexResolved = generateKeyBetween(orderIndexProgress, null);

			await tx.insert(stages).values([
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
			]).onConflictDoNothing();
		}

		const [maxResult] = await tx.select({
			maxNumber: sql<number>`COALESCE(MAX(${tasks.number}), 0)`
		})
		.from(tasks)
		.where(eq(tasks.boardId, helpdeskBoard.id));

		const number = (maxResult?.maxNumber ?? 0) + 1;
		const orderIndex = generateKeyBetween(null, null);

		// 5. Insert the task directly, storing reporterId in customFields
		const [newTask] = await tx.insert(tasks).values({
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

		// 6. Audit log
		await tx.insert(auditLogs).values({
			groupId: actor.groupId,
			projectId: supportProject.id,
			taskId: newTask.id,
			userId: actor.id,
			actionType: 'task_created',
			details: { ticketType: type }
		});

		return newTask;
	}).then((newTask) => {
		emitBoardEvent(newTask.boardId!, 'task_created', { task: newTask });
		return newTask;
	});
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
async function verifyTicketAccess(
	actor: Actor,
	task: { projectId: string | null; customFields: unknown }
): Promise<boolean> {
	if (actor.role === 'Admin') return true;

	// Check if the actor is the reporter
	const customFields = task.customFields as Record<string, unknown> | null;
	if (customFields && customFields.reporterId === actor.id) return true;

	if (!task.projectId) return false;

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

	const [task] = await db.select({
		id: tasks.id,
		number: tasks.number,
		title: tasks.title,
		description: tasks.description,
		priority: tasks.priority,
		createdAt: tasks.createdAt,
		updatedAt: tasks.updatedAt,
		projectId: tasks.projectId,
		groupId: tasks.groupId,
		stageId: tasks.stageId,
		customFields: tasks.customFields
	}).from(tasks).where(
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

	// Fetch Attachments
	const taskAttachments = await db.select({
		id: attachments.id,
		fileName: attachments.fileName,
		fileUrl: attachments.fileUrl,
		mimeType: attachments.mimeType,
		createdAt: attachments.createdAt,
		uploader: {
			id: users.id,
			name: users.name
		}
	})
	.from(attachments)
	.innerJoin(users, eq(attachments.uploaderId, users.id))
	.where(eq(attachments.taskId, ticketId))
	.orderBy(desc(attachments.createdAt));

	return {
		task,
		comments: taskComments,
		auditLogs: taskAudits,
		attachments: taskAttachments
	};
}

/**
 * Submits a comment/reply onto a helpdesk ticket.
 */
export async function submitHelpdeskComment(actor: Actor, ticketId: string, content: string) {
	if (!actor.groupId) {
		throw new Error('Unauthorized');
	}
	
	const trimmedContent = content.trim();
	if (!trimmedContent) {
		throw new Error('Comment content cannot be empty');
	}

	const [task] = await db.select({
		id: tasks.id,
		groupId: tasks.groupId,
		projectId: tasks.projectId,
		customFields: tasks.customFields
	}).from(tasks).where(
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
		content: trimmedContent
	}).returning();

	await notifyCommentAdded(actor.id, ticketId);

	return newComment;
}
