import { db } from '../db/db';
import { notifications, tasks, taskFollowers, users } from '../db/schema';
import { eq, and, desc, isNull, or, max, inArray } from 'drizzle-orm';
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

	const [taskObj] = await db.select({ title: tasks.title }).from(tasks).where(
		and(eq(tasks.id, taskId), isNull(tasks.deletedAt))
	);

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

export async function getNotifications(actor: Actor, limit = 20, offset = 0) {
	// Step 1: Select distinct task IDs for user ordered by latest activity
	const taskSubquery = await db
		.select({
			taskId: notifications.taskId,
			latestActivity: max(notifications.createdAt)
		})
		.from(notifications)
		.leftJoin(tasks, eq(tasks.id, notifications.taskId))
		.where(
			and(
				eq(notifications.userId, actor.id),
				or(isNull(notifications.taskId), isNull(tasks.deletedAt))
			)
		)
		.groupBy(notifications.taskId)
		.orderBy(desc(max(notifications.createdAt)))
		.limit(limit)
		.offset(offset);

	if (taskSubquery.length === 0) return [];

	const targetTaskIds = taskSubquery.map((t) => t.taskId);
	const hasNullTask = targetTaskIds.some((id) => id === null);
	const validTaskIds = targetTaskIds.filter((id): id is string => id !== null);

	const taskConditions = [];
	if (validTaskIds.length > 0) {
		taskConditions.push(inArray(notifications.taskId, validTaskIds));
	}
	if (hasNullTask) {
		taskConditions.push(isNull(notifications.taskId));
	}

	return await db.select({
		id: notifications.id,
		type: notifications.type,
		readAt: notifications.readAt,
		createdAt: notifications.createdAt,
		taskId: notifications.taskId,
		boardId: tasks.boardId,
		taskTitle: tasks.title,
		actorId: notifications.actorId,
		actorName: users.name
	})
	.from(notifications)
	.leftJoin(tasks, eq(tasks.id, notifications.taskId))
	.leftJoin(users, eq(users.id, notifications.actorId))
	.where(
		and(
			eq(notifications.userId, actor.id),
			or(isNull(notifications.taskId), isNull(tasks.deletedAt)),
			or(...taskConditions)
		)
	)
	.orderBy(desc(notifications.createdAt));
}

export async function getSentNotifications(actor: Actor, limit = 20, offset = 0) {
	// Step 1: Select distinct task IDs sent by actor ordered by latest activity
	const taskSubquery = await db
		.select({
			taskId: notifications.taskId,
			latestActivity: max(notifications.createdAt)
		})
		.from(notifications)
		.leftJoin(tasks, eq(tasks.id, notifications.taskId))
		.where(
			and(
				eq(notifications.actorId, actor.id),
				or(isNull(notifications.taskId), isNull(tasks.deletedAt))
			)
		)
		.groupBy(notifications.taskId)
		.orderBy(desc(max(notifications.createdAt)))
		.limit(limit)
		.offset(offset);

	if (taskSubquery.length === 0) return [];

	const targetTaskIds = taskSubquery.map((t) => t.taskId);
	const hasNullTask = targetTaskIds.some((id) => id === null);
	const validTaskIds = targetTaskIds.filter((id): id is string => id !== null);

	const taskConditions = [];
	if (validTaskIds.length > 0) {
		taskConditions.push(inArray(notifications.taskId, validTaskIds));
	}
	if (hasNullTask) {
		taskConditions.push(isNull(notifications.taskId));
	}

	return await db.select({
		id: notifications.id,
		type: notifications.type,
		readAt: notifications.readAt,
		createdAt: notifications.createdAt,
		taskId: notifications.taskId,
		boardId: tasks.boardId,
		taskTitle: tasks.title,
		recipientId: notifications.userId,
		recipientName: users.name
	})
	.from(notifications)
	.leftJoin(tasks, eq(tasks.id, notifications.taskId))
	.leftJoin(users, eq(users.id, notifications.userId))
	.where(
		and(
			eq(notifications.actorId, actor.id),
			or(isNull(notifications.taskId), isNull(tasks.deletedAt)),
			or(...taskConditions)
		)
	)
	.orderBy(desc(notifications.createdAt));
}

export async function markAsRead(actor: Actor, notificationId?: string) {
	if (notificationId && notificationId !== 'all') {
		await db.update(notifications)
			.set({ readAt: new Date() })
			.where(and(eq(notifications.id, notificationId), eq(notifications.userId, actor.id)));
	} else {
		// Mark all as read
		await db.update(notifications)
			.set({ readAt: new Date() })
			.where(and(eq(notifications.userId, actor.id), isNull(notifications.readAt)));
	}
}

/**
 * Automatically fires notifications of type 'comment_added' to the task assignee
 * and the task reporter (creator) when a new comment is posted.
 */
export async function notifyCommentAdded(authorId: string, taskId: string, content?: string): Promise<void> {
	try {
		const [task] = await db.select({
			id: tasks.id,
			title: tasks.title,
			groupId: tasks.groupId,
			assigneeId: tasks.assigneeId,
			customFields: tasks.customFields
		})
		.from(tasks)
		.where(
			and(
				eq(tasks.id, taskId),
				isNull(tasks.deletedAt)
			)
		)
		.limit(1);

		if (!task) return;

		const notifiedUsers = new Set<string>();

		const notifyUser = async (uId: string) => {
			if (uId !== authorId && !notifiedUsers.has(uId)) {
				await createNotification(uId, authorId, 'comment_added', taskId);
				notifiedUsers.add(uId);
			}
		};

		// Parse explicit mentions from content (e.g. data-id="user-id" or plain text @Name)
		const mentionedUserIds = new Set<string>();
		if (content) {
			const mentionMatches = content.matchAll(/data-id="([^"]+)"/gi);
			for (const match of mentionMatches) {
				if (match[1] && match[1] !== authorId) {
					mentionedUserIds.add(match[1]);
				}
			}

			// Fallback: check plain text @UserName for all active users in the group
			const groupUsersList = await db.select({ id: users.id, name: users.name })
				.from(users)
				.where(and(eq(users.groupId, task.groupId), isNull(users.deletedAt)));
			
			const contentLower = content.toLowerCase();
			for (const u of groupUsersList) {
				if (u.id !== authorId && u.name && contentLower.includes(`@${u.name.toLowerCase()}`)) {
					mentionedUserIds.add(u.id);
				}
			}
		}

		// 1. Notify mentioned users with type 'mentioned' and auto-add them as followers
		for (const mId of mentionedUserIds) {
			if (!notifiedUsers.has(mId)) {
				await createNotification(mId, authorId, 'mentioned', taskId);
				notifiedUsers.add(mId);

				// Auto-add mentioned user as a follower if not already following
				const [existingFollower] = await db.select({ taskId: taskFollowers.taskId })
					.from(taskFollowers)
					.where(and(eq(taskFollowers.taskId, taskId), eq(taskFollowers.userId, mId)));
				if (!existingFollower) {
					await db.insert(taskFollowers).values({ taskId, userId: mId }).catch(() => {});
				}
			}
		}

		// 2. Notify assignee
		if (task.assigneeId) {
			await notifyUser(task.assigneeId);
		}

		// 3. Notify reporter
		const customFields = (task.customFields || {}) as { reporterId?: string };
		if (customFields.reporterId) {
			await notifyUser(customFields.reporterId);
		}

		// 4. Notify followers
		const followers = await db.select({ user: users }).from(taskFollowers).innerJoin(users, eq(taskFollowers.userId, users.id)).where(eq(taskFollowers.taskId, taskId));
		
		for (const f of followers) {
			await notifyUser(f.user.id);
		}

		// 4. Dispatch Email Event
		if (content) {
			const [author] = await db.select({ name: users.name }).from(users).where(eq(users.id, authorId));
			globalEventEmitter.emit('comment:created', {
				followers,
				authorName: author?.name || 'Someone',
				taskTitle: task.title,
				content,
				taskId
			});
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


