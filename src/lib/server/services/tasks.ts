import { db } from '../db/db';
import { tasks, auditLogs, comments, users, commentReactions, stages, taskLinks, boards, taskTags, tags } from '../db/schema';
import { eq, and, isNull, sql, inArray } from 'drizzle-orm';
import { unionAll } from 'drizzle-orm/pg-core';
import type { Actor } from './users';
import { generateKeyBetween } from 'fractional-indexing';
import { emitBoardEvent } from './events';
import { createNotification } from './notifications';
import { invalidateDashboardCache } from '../redis';

export async function createTask(actor: Actor, stageId: string, title: string, previousIndex: string | null = null, nextIndex: string | null = null, parentTaskId: string | null = null) {
	if (actor.role === 'Viewer') {
		throw new Error('Unauthorized: Viewers cannot create tasks.');
	}
	const orderIndex = generateKeyBetween(previousIndex, nextIndex);
	
	const result = await db.transaction(async (tx) => {
		// Get boardId from stage and validate group/soft-delete
		const [stage] = await tx.select({ boardId: stages.boardId })
			.from(stages)
			.innerJoin(boards, eq(stages.boardId, boards.id))
			.where(
				and(
					eq(stages.id, stageId),
					eq(boards.groupId, actor.groupId),
					isNull(stages.deletedAt),
					isNull(boards.deletedAt)
				)
			);
		if (!stage) throw new Error('Stage not found or access denied');
		const boardId = stage.boardId;

		// Atomically claim the next task number via a locked read inside a transaction
		// to prevent race conditions where two concurrent creates get the same number.
		// We lock the board row to serialize operations on this board.
		await tx.select({ id: boards.id })
			.from(boards)
			.where(eq(boards.id, boardId))
			.for('update');

		const [maxResult] = await tx.select({
			maxNumber: sql<number>`COALESCE(MAX(${tasks.number}), 0)`
		})
		.from(tasks)
		.where(eq(tasks.boardId, boardId));

		const number = (maxResult?.maxNumber ?? 0) + 1;

		const [newTask] = await tx.insert(tasks).values({
			title, stageId, boardId, groupId: actor.groupId, orderIndex, parentTaskId, number
		}).returning();

		await tx.insert(auditLogs).values({
			groupId: actor.groupId,
			taskId: newTask.id,
			userId: actor.id,
			actionType: 'task_created',
			oldValue: null,
			newValue: null
		});

		return { newTask, boardId };
	});

	emitBoardEvent(result.boardId, 'task_created', { task: result.newTask });

	await invalidateDashboardCache(actor.groupId);

	return result.newTask;
}

export async function moveTask(actor: Actor, taskId: string, newStageId: string, previousIndex: string | null = null, nextIndex: string | null = null) {
	if (actor.role === 'Viewer') {
		throw new Error('Unauthorized: Viewers cannot move tasks.');
	}

	const [oldTask] = await db.select({ stageId: tasks.stageId, boardId: tasks.boardId, assigneeId: tasks.assigneeId }).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.groupId, actor.groupId), isNull(tasks.deletedAt)));
	if (!oldTask) throw new Error('Task not found');

	const orderIndex = generateKeyBetween(previousIndex, nextIndex);
	
	// Get new boardId if stage changed and validate group/soft-delete
	let boardId = oldTask.boardId;
	if (oldTask.stageId !== newStageId) {
		const [newStage] = await db.select({ boardId: stages.boardId })
			.from(stages)
			.innerJoin(boards, eq(stages.boardId, boards.id))
			.where(
				and(
					eq(stages.id, newStageId),
					eq(boards.groupId, actor.groupId),
					isNull(stages.deletedAt),
					isNull(boards.deletedAt)
				)
			);
		if (!newStage) throw new Error('Stage not found or access denied');
		boardId = newStage.boardId;
	}

	let sendNotification = false;

	const updated = await db.transaction(async (tx) => {
		const [updated] = await tx.update(tasks)
			.set({ stageId: newStageId, orderIndex, boardId })
			.where(and(eq(tasks.id, taskId), eq(tasks.groupId, actor.groupId)))
			.returning();

		if (oldTask.stageId !== newStageId) {
			await tx.insert(auditLogs).values({
				groupId: actor.groupId,
				taskId,
				userId: actor.id,
				actionType: 'stage_change',
				oldValue: oldTask.stageId,
				newValue: newStageId
			});
			if (oldTask.assigneeId) {
				sendNotification = true;
			}
		}
		return updated;
	});

	if (sendNotification && oldTask.assigneeId) {
		await createNotification(oldTask.assigneeId, actor.id, 'status_changed', taskId);
	}

	if (boardId) {
		emitBoardEvent(boardId, 'task_moved', { task: updated });
	}

	await invalidateDashboardCache(actor.groupId);

	return updated;
}

export async function softDeleteTask(actor: Actor, taskId: string) {
	if (actor.role === 'Viewer') {
		throw new Error('Unauthorized: Viewers cannot delete tasks.');
	}
	const [task] = await db.update(tasks)
		.set({ deletedAt: new Date() })
		.where(and(eq(tasks.id, taskId), eq(tasks.groupId, actor.groupId)))
		.returning();

	if (task && task.boardId) {
		emitBoardEvent(task.boardId, 'task_deleted', { taskId: task.id });
	}

	await invalidateDashboardCache(actor.groupId);
}

export interface TaskUpdatePayload {
	title?: string;
	description?: string | null;
	priority?: string;
	assigneeId?: string | null;
	dueDate?: Date | null;
	checklists?: { id: string; text: string; completed: boolean }[];
	stageId?: string;
	parentTaskId?: string | null;
	customFields?: Record<string, string | number | boolean | null>;
}

export async function updateTask(actor: Actor, taskId: string, updates: TaskUpdatePayload) {
	if (actor.role === 'Viewer') {
		throw new Error('Unauthorized: Viewers cannot edit tasks.');
	}

	const [oldTask] = await db.select({
		title: tasks.title,
		priority: tasks.priority,
		assigneeId: tasks.assigneeId,
		stageId: tasks.stageId,
		dueDate: tasks.dueDate,
		boardId: tasks.boardId,
		parentTaskId: tasks.parentTaskId
	}).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.groupId, actor.groupId), isNull(tasks.deletedAt)));
	if (!oldTask) throw new Error('Task not found');

	// Whitelist parameters to prevent cross-tenant/unsafe property injection
	const setPayload: Record<string, any> = {};
	if (updates.title !== undefined) setPayload.title = updates.title;
	if (updates.description !== undefined) setPayload.description = updates.description;
	if (updates.priority !== undefined) setPayload.priority = updates.priority;
	if (updates.assigneeId !== undefined) setPayload.assigneeId = updates.assigneeId;
	if (updates.dueDate !== undefined) setPayload.dueDate = updates.dueDate;
	if (updates.checklists !== undefined) setPayload.checklists = updates.checklists;
	if (updates.parentTaskId !== undefined) setPayload.parentTaskId = updates.parentTaskId;
	if (updates.customFields !== undefined) setPayload.customFields = updates.customFields;
	setPayload.updatedAt = new Date();

	if (updates.stageId && updates.stageId !== oldTask.stageId) {
		const [newStage] = await db.select({ boardId: stages.boardId })
			.from(stages)
			.innerJoin(boards, eq(stages.boardId, boards.id))
			.where(
				and(
					eq(stages.id, updates.stageId),
					eq(boards.groupId, actor.groupId),
					isNull(stages.deletedAt),
					isNull(boards.deletedAt)
				)
			);
		if (!newStage) throw new Error('Stage not found or access denied');
		setPayload.stageId = updates.stageId;
		setPayload.boardId = newStage.boardId;
	}

	const { updatedTask, notificationsToSend } = await db.transaction(async (tx) => {
		const [updatedTask] = await tx.update(tasks)
			.set(setPayload)
			.where(and(eq(tasks.id, taskId), eq(tasks.groupId, actor.groupId)))
			.returning();

		const logs: { groupId: string; taskId: string; userId: string; actionType: string; oldValue: string | null; newValue: string | null }[] = [];
		const notificationsToSend: { userId: string; type: 'assigned' | 'status_changed' }[] = [];

		if (updates.priority && updates.priority !== oldTask.priority) {
			logs.push({ groupId: actor.groupId, taskId, userId: actor.id, actionType: 'priority_change', oldValue: oldTask.priority, newValue: updates.priority });
		}
		if (updates.assigneeId !== undefined && updates.assigneeId !== oldTask.assigneeId) {
			logs.push({ groupId: actor.groupId, taskId, userId: actor.id, actionType: 'assignee_change', oldValue: oldTask.assigneeId || 'unassigned', newValue: updates.assigneeId || 'unassigned' });
			if (updates.assigneeId) {
				notificationsToSend.push({ userId: updates.assigneeId, type: 'assigned' });
			}
		}
		if (updates.title && updates.title !== oldTask.title) {
			logs.push({ groupId: actor.groupId, taskId, userId: actor.id, actionType: 'title_change', oldValue: oldTask.title, newValue: updates.title });
		}
		if (updates.stageId && updates.stageId !== oldTask.stageId) {
			logs.push({ groupId: actor.groupId, taskId, userId: actor.id, actionType: 'stage_change', oldValue: oldTask.stageId, newValue: updates.stageId });
			if (oldTask.assigneeId) {
				notificationsToSend.push({ userId: oldTask.assigneeId, type: 'status_changed' });
			}
		}
		if (updates.dueDate !== undefined) {
			const oldDateStr = oldTask.dueDate?.toISOString() || 'none';
			const newDateStr = updates.dueDate?.toISOString() || 'none';
			if (oldDateStr !== newDateStr) {
				logs.push({ groupId: actor.groupId, taskId, userId: actor.id, actionType: 'due_date_change', oldValue: oldDateStr, newValue: newDateStr });
			}
		}
		if (updates.parentTaskId !== undefined && updates.parentTaskId !== oldTask.parentTaskId) {
			logs.push({ groupId: actor.groupId, taskId, userId: actor.id, actionType: 'parent_change', oldValue: oldTask.parentTaskId || 'none', newValue: updates.parentTaskId || 'none' });

			if (updates.parentTaskId === null && oldTask.parentTaskId !== null) {
				const siblings = await tx.select({ id: tasks.id })
					.from(tasks)
					.where(
						and(
							eq(tasks.parentTaskId, oldTask.parentTaskId),
							eq(tasks.groupId, actor.groupId),
							isNull(tasks.deletedAt)
						)
					);
				
				const newLinks: { sourceTaskId: string; targetTaskId: string; linkType: string }[] = [];
				newLinks.push({
					sourceTaskId: taskId,
					targetTaskId: oldTask.parentTaskId,
					linkType: 'relates_to'
				});
				
				for (const sib of siblings) {
					if (sib.id !== taskId) {
						newLinks.push({
							sourceTaskId: taskId,
							targetTaskId: sib.id,
							linkType: 'relates_to'
						});
					}
				}
				if (newLinks.length > 0) {
					await tx.insert(taskLinks).values(newLinks);
				}
			}
		}

		if (logs.length > 0) {
			await tx.insert(auditLogs).values(logs);
		}

		return { updatedTask, logs, notificationsToSend };
	});

	for (const note of notificationsToSend) {
		await createNotification(note.userId, actor.id, note.type, taskId);
	}

	const boardIdToEmit = setPayload.boardId || oldTask.boardId;
	if (boardIdToEmit && updatedTask) {
		emitBoardEvent(boardIdToEmit, 'task_updated', { task: updatedTask });
	}

	await invalidateDashboardCache(actor.groupId);

	return updatedTask;
}

export async function getBoardTasks(groupId: string, stageIds: string[]) {
	if (stageIds.length === 0) return [];
	
	const fetchedTasks = await db.select({
		id: tasks.id,
		groupId: tasks.groupId,
		projectId: tasks.projectId,
		boardId: tasks.boardId,
		boardName: boards.name,
		boardPrefix: boards.prefix,
		number: tasks.number,
		stageId: tasks.stageId,
		parentTaskId: tasks.parentTaskId,
		title: tasks.title,
		description: tasks.description,
		priority: tasks.priority,
		checklists: tasks.checklists,
		assigneeId: tasks.assigneeId,
		dueDate: tasks.dueDate,
		createdAt: tasks.createdAt,
		orderIndex: tasks.orderIndex,
	})
		.from(tasks)
		.leftJoin(boards, eq(tasks.boardId, boards.id))
		.where(and(eq(tasks.groupId, groupId), isNull(tasks.deletedAt), inArray(tasks.stageId, stageIds)))
		.orderBy(tasks.orderIndex);

	if (fetchedTasks.length === 0) return [];

	const taskIds = fetchedTasks.map((t) => t.id);
	
	const fetchedTags = await db.select({
		taskId: taskTags.taskId,
		id: tags.id,
		name: tags.name,
		color: tags.color
	}).from(taskTags)
	.innerJoin(tags, eq(taskTags.tagId, tags.id))
	.where(inArray(taskTags.taskId, taskIds));

	const tagsMap: Record<string, { id: string; name: string; color: string }[]> = {};
	for (const tag of fetchedTags) {
		if (!tagsMap[tag.taskId]) tagsMap[tag.taskId] = [];
		tagsMap[tag.taskId].push({
			id: tag.id,
			name: tag.name,
			color: tag.color
		});
	}

	return fetchedTasks.map((t) => ({
		...t,
		tags: tagsMap[t.id] || []
	}));
}

interface ActivityEntry {
	id: string;
	type: string;
	taskId: string;
	createdAt: Date;
	updatedAt: Date | null;
	userId: string;
	userName: string;
	content: string | null;
	actionType: string | null;
	oldValue: string | null;
	newValue: string | null;
	parentCommentId: string | null;
	reactions?: { emoji: string; userName: string; userId: string; id: string }[];
}

export async function getTaskActivity(taskId: string, actor: Actor): Promise<ActivityEntry[]> {
	// Verify task belongs to actor's group
	const [task] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.groupId, actor.groupId), isNull(tasks.deletedAt)));
	if (!task) throw new Error('Task not found');

	const commentsQuery = db.select({
		id: comments.id,
		type: sql<string>`'comment'`,
		taskId: sql<string | null>`${comments.taskId}`,
		createdAt: comments.createdAt,
		updatedAt: sql<Date | null>`${comments.updatedAt}`,
		userId: users.id,
		userName: users.name,
		content: sql<string | null>`${comments.content}`,
		actionType: sql<string | null>`null`,
		oldValue: sql<string | null>`null`,
		newValue: sql<string | null>`null`,
		parentCommentId: comments.parentCommentId
	}).from(comments).innerJoin(users, eq(comments.authorId, users.id)).where(eq(comments.taskId, taskId));

	const auditLogsQuery = db.select({
		id: auditLogs.id,
		type: sql<string>`'audit_log'`,
		taskId: auditLogs.taskId,
		createdAt: auditLogs.createdAt,
		updatedAt: sql<Date | null>`null`,
		userId: users.id,
		userName: users.name,
		content: sql<string | null>`null`,
		actionType: auditLogs.actionType,
		oldValue: auditLogs.oldValue,
		newValue: auditLogs.newValue,
		parentCommentId: sql<string | null>`null`
	}).from(auditLogs).innerJoin(users, eq(auditLogs.userId, users.id)).where(eq(auditLogs.taskId, taskId));

	const activity = await unionAll(commentsQuery, auditLogsQuery);

	const commentIds = activity.filter(a => a.type === 'comment').map(a => a.id as string);
	let reactionsMap: Record<string, { emoji: string; userName: string; userId: string; id: string }[]> = {};
	if (commentIds.length > 0) {
		const reactions = await db.select({
			id: commentReactions.id,
			commentId: commentReactions.commentId,
			emoji: commentReactions.emoji,
			userId: users.id,
			userName: users.name
		}).from(commentReactions)
		.innerJoin(users, eq(commentReactions.userId, users.id))
		.where(inArray(commentReactions.commentId, commentIds));
		
		for (const r of reactions) {
			if (!reactionsMap[r.commentId]) reactionsMap[r.commentId] = [];
			reactionsMap[r.commentId].push({ emoji: r.emoji, userName: r.userName, userId: r.userId, id: r.id });
		}
	}
	
	return activity.map(a => ({
		id: a.id as string,
		type: a.type as string,
		taskId: a.taskId as string,
		createdAt: new Date(a.createdAt as string | Date),
		updatedAt: a.updatedAt ? new Date(a.updatedAt as string | Date) : null,
		userId: a.userId as string,
		userName: a.userName as string,
		content: a.content as string | null,
		actionType: a.actionType as string | null,
		oldValue: a.oldValue as string | null,
		newValue: a.newValue as string | null,
		parentCommentId: a.parentCommentId as string | null,
		reactions: a.type === 'comment' ? (reactionsMap[a.id as string] || []) : undefined
	})).sort((a, b) => {
		const timeA = a.createdAt.getTime();
		const timeB = b.createdAt.getTime();
		return timeA - timeB;
	});
}

export async function linkTasks(actor: Actor, sourceTaskId: string, targetTaskId: string, linkType: string) {
	if (actor.role === 'Viewer') throw new Error('Unauthorized');
	if (sourceTaskId === targetTaskId) throw new Error('Cannot link task to itself');

	// Verify both tasks belong to the actor's group and are not deleted
	const [sourceTask] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, sourceTaskId), eq(tasks.groupId, actor.groupId), isNull(tasks.deletedAt)));
	const [targetTask] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, targetTaskId), eq(tasks.groupId, actor.groupId), isNull(tasks.deletedAt)));
	if (!sourceTask || !targetTask) throw new Error('Task not found');

	if (linkType === 'blocks' || linkType === 'is_blocked_by') {
		const actualSource = linkType === 'blocks' ? sourceTaskId : targetTaskId;
		const actualTarget = linkType === 'blocks' ? targetTaskId : sourceTaskId;

		const cycleQuery = sql`
			WITH RECURSIVE traverse AS (
				SELECT target_task_id FROM task_links WHERE source_task_id = ${actualTarget} AND link_type = 'blocks'
				UNION
				SELECT tl.target_task_id FROM task_links tl
				INNER JOIN traverse t ON t.target_task_id = tl.source_task_id
				WHERE tl.link_type = 'blocks'
			)
			SELECT target_task_id FROM traverse WHERE target_task_id = ${actualSource};
		`;
		const res = await db.execute(cycleQuery);
		if (res.rows.length > 0) throw new Error('Circular dependency detected');

		await db.insert(taskLinks).values({
			sourceTaskId: actualSource,
			targetTaskId: actualTarget,
			linkType: 'blocks'
		});
	} else {
		await db.insert(taskLinks).values({
			sourceTaskId,
			targetTaskId,
			linkType
		});
	}
}

export async function removeTaskLink(actor: Actor, linkId: string) {
	if (actor.role === 'Viewer') throw new Error('Unauthorized');
	// Verify the link belongs to a task in the actor's group
	const [link] = await db.select({ id: taskLinks.id, sourceTaskId: taskLinks.sourceTaskId })
		.from(taskLinks)
		.innerJoin(tasks, eq(taskLinks.sourceTaskId, tasks.id))
		.where(and(eq(taskLinks.id, linkId), eq(tasks.groupId, actor.groupId)));
	if (!link) throw new Error('Link not found');
	await db.delete(taskLinks).where(eq(taskLinks.id, linkId));
}

export async function getTaskLinks(actor: Actor, taskId: string) {
	// Verify the task belongs to the actor's group
	const [task] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.groupId, actor.groupId), isNull(tasks.deletedAt)));
	if (!task) throw new Error('Task not found');

	// Links where task is source
	const outgoing = await db.select({
		id: taskLinks.id,
		linkedTaskId: tasks.id,
		title: tasks.title,
		stageId: tasks.stageId,
		linkType: taskLinks.linkType,
		direction: sql<string>`'out'`
	}).from(taskLinks)
	  .innerJoin(tasks, eq(taskLinks.targetTaskId, tasks.id))
	  .where(and(
		eq(taskLinks.sourceTaskId, taskId),
		eq(tasks.groupId, actor.groupId),
		isNull(tasks.deletedAt)
	  ));

	// Links where task is target
	const incoming = await db.select({
		id: taskLinks.id,
		linkedTaskId: tasks.id,
		title: tasks.title,
		stageId: tasks.stageId,
		linkType: taskLinks.linkType,
		direction: sql<string>`'in'`
	}).from(taskLinks)
	  .innerJoin(tasks, eq(taskLinks.sourceTaskId, tasks.id))
	  .where(and(
		eq(taskLinks.targetTaskId, taskId),
		eq(tasks.groupId, actor.groupId),
		isNull(tasks.deletedAt)
	  ));

	return [...outgoing, ...incoming];
}
