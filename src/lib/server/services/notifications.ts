import { db } from '../db/db';
import { notifications, tasks } from '../db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import type { Actor } from './users';
import { globalEventEmitter } from './events';

export async function createNotification(
	userId: string,
	actorId: string,
	type: 'assigned' | 'mentioned' | 'status_changed' | 'comment_added',
	taskId: string
) {
	// Don't notify yourself
	if (userId === actorId) return;

	const [notif] = await db.insert(notifications).values({
		userId,
		actorId,
		type,
		taskId
	}).returning();

	const [taskObj] = await db.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, taskId));

	globalEventEmitter.emit(`user:${userId}`, {
		type: 'notification_created',
		payload: {
			id: notif.id,
			type: notif.type,
			taskId: notif.taskId,
			taskTitle: taskObj?.title,
			createdAt: notif.createdAt,
			readAt: null
		}
	});
}

export async function getNotifications(actor: Actor) {
	return await db.select({
		id: notifications.id,
		type: notifications.type,
		readAt: notifications.readAt,
		createdAt: notifications.createdAt,
		taskId: notifications.taskId,
		taskTitle: tasks.title,
		actorId: notifications.actorId
	})
	.from(notifications)
	.leftJoin(tasks, eq(tasks.id, notifications.taskId))
	.where(eq(notifications.userId, actor.id))
	.orderBy(desc(notifications.createdAt))
	.limit(50);
}

export async function markAsRead(actor: Actor, notificationId?: string) {
	if (notificationId) {
		await db.update(notifications)
			.set({ readAt: new Date() })
			.where(and(eq(notifications.id, notificationId), eq(notifications.userId, actor.id)));
	} else {
		// Mark all as read
		await db.update(notifications)
			.set({ readAt: new Date() })
			.where(eq(notifications.userId, actor.id));
	}
}

/**
 * Automatically fires notifications of type 'comment_added' to the task assignee
 * and the task reporter (creator) when a new comment is posted.
 */
export async function notifyCommentAdded(authorId: string, taskId: string): Promise<void> {
	try {
		const [task] = await db.select({
			id: tasks.id,
			assigneeId: tasks.assigneeId,
			customFields: tasks.customFields
		})
		.from(tasks)
		.where(eq(tasks.id, taskId))
		.limit(1);

		if (!task) return;

		// 1. Notify assignee (if the author is not the assignee)
		if (task.assigneeId && task.assigneeId !== authorId) {
			await createNotification(task.assigneeId, authorId, 'comment_added', taskId);
		}

		// 2. Notify reporter (if the author is not the reporter and reporter is distinct from assignee)
		const customFields = (task.customFields || {}) as { reporterId?: string };
		const reporterId = customFields.reporterId;
		if (reporterId && reporterId !== authorId && reporterId !== task.assigneeId) {
			await createNotification(reporterId, authorId, 'comment_added', taskId);
		}
	} catch (err) {
		console.error(`Failed to notify comment added for task ${taskId}:`, err);
	}
}

/**
 * Marks all notifications for a specific task and user as read.
 */
export async function markTaskNotificationsAsRead(actor: Actor, taskId: string): Promise<void> {
	try {
		await db.update(notifications)
			.set({ readAt: new Date() })
			.where(
				and(
					eq(notifications.taskId, taskId),
					eq(notifications.userId, actor.id),
					isNull(notifications.readAt)
				)
			);
	} catch (err) {
		console.error(`Failed to mark task notifications read for task ${taskId}:`, err);
	}
}


