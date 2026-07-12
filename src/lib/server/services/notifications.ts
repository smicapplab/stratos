import { db } from '../db/db';
import { notifications, tasks } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { Actor } from './users';
import { globalEventEmitter } from './events';

export async function createNotification(
	userId: string,
	actorId: string,
	type: 'assigned' | 'mentioned' | 'status_changed',
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
