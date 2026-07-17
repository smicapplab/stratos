import { db } from '../db/db';
import { tasks, stages, users, boards, notifications } from '../db/schema';
import { eq, and, isNull, sql, lt, gt, inArray, desc } from 'drizzle-orm';
import type { Actor } from './users';
import { getCachedDashboardData, setCachedDashboardData } from '../redis';

/**
 * Fetches dashboard KPI counters for a user, using Redis cache.
 */
export async function getDashboardMetrics(actor: Actor, boardId?: string) {
	const cacheKey = boardId 
		? `dashboard:metrics:group:${actor.groupId}:user:${actor.id}:board:${boardId}`
		: `dashboard:metrics:group:${actor.groupId}:user:${actor.id}`;

	const cached = await getCachedDashboardData<any>(cacheKey);
	if (cached) return cached;

	// Base condition: tasks in group, not deleted
	let baseCondition = and(eq(tasks.groupId, actor.groupId), isNull(tasks.deletedAt));
	if (boardId) {
		baseCondition = and(baseCondition, eq(tasks.boardId, boardId));
	}

	// 1. My Open Tasks count
	const openTasksCondition = and(
		baseCondition,
		eq(tasks.assigneeId, actor.id),
		inArray(
			tasks.stageId,
			db.select({ id: stages.id })
				.from(stages)
				.innerJoin(boards, eq(stages.boardId, boards.id))
				.where(
					and(
						eq(stages.isCompleted, false),
						eq(boards.groupId, actor.groupId),
						isNull(stages.deletedAt),
						isNull(boards.deletedAt)
					)
				)
		)
	);
	const [openTasksRes] = await db.select({ count: sql<number>`cast(count(${tasks.id}) as int)` })
		.from(tasks)
		.where(openTasksCondition);

	// 2. My Overdue Tasks count
	const now = new Date();
	const overdueCondition = and(
		openTasksCondition,
		lt(tasks.dueDate, now)
	);
	const [overdueTasksRes] = await db.select({ count: sql<number>`cast(count(${tasks.id}) as int)` })
		.from(tasks)
		.where(overdueCondition);

	// 3. My Completed This Week count
	const oneWeekAgo = new Date();
	oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
	
	const completedThisWeekCondition = and(
		baseCondition,
		eq(tasks.assigneeId, actor.id),
		gt(tasks.updatedAt, oneWeekAgo), // We use updatedAt as a proxy for completed at for now
		inArray(
			tasks.stageId,
			db.select({ id: stages.id })
				.from(stages)
				.innerJoin(boards, eq(stages.boardId, boards.id))
				.where(
					and(
						eq(stages.isCompleted, true),
						eq(boards.groupId, actor.groupId),
						isNull(stages.deletedAt),
						isNull(boards.deletedAt)
					)
				)
		)
	);
	const [completedThisWeekRes] = await db.select({ count: sql<number>`cast(count(${tasks.id}) as int)` })
		.from(tasks)
		.where(completedThisWeekCondition);

	// 4. My Assigned Tickets count
	const [helpdeskBoard] = await db.select({ id: boards.id })
		.from(boards)
		.where(and(
			eq(boards.name, 'Helpdesk Tickets'),
			eq(boards.groupId, actor.groupId),
			isNull(boards.deletedAt)
		))
		.limit(1);

	let myAssignedTickets = 0;
	if (helpdeskBoard) {
		const [assignedTicketsRes] = await db.select({ count: sql<number>`cast(count(${tasks.id}) as int)` })
			.from(tasks)
			.innerJoin(stages, eq(tasks.stageId, stages.id))
			.where(and(
				eq(tasks.boardId, helpdeskBoard.id),
				eq(tasks.assigneeId, actor.id),
				eq(stages.isCompleted, false),
				isNull(tasks.deletedAt)
			));
		myAssignedTickets = assignedTicketsRes?.count || 0;
	}

	// 5. Unread Notifications count
	const [unreadNotificationsRes] = await db.select({ count: sql<number>`cast(count(${notifications.id}) as int)` })
		.from(notifications)
		.where(and(
			eq(notifications.userId, actor.id),
			isNull(notifications.readAt)
		));
	const unreadNotifications = unreadNotificationsRes?.count || 0;

	const result = {
		myOpenTasks: openTasksRes?.count || 0,
		myOverdueTasks: overdueTasksRes?.count || 0,
		myCompletedThisWeek: completedThisWeekRes?.count || 0,
		myAssignedTickets,
		unreadNotifications
	};

	await setCachedDashboardData(cacheKey, result, 300);
	return result;
}

/**
 * Fetches dashboard workload and status distribution charts, cached at the group level.
 */
export async function getDashboardCharts(
	actor: Actor,
	boardId?: string,
	startDate?: Date,
	endDate?: Date
) {
	const startStr = startDate ? startDate.toISOString().split('T')[0] : '';
	const endStr = endDate ? endDate.toISOString().split('T')[0] : '';
	const cacheKey = boardId
		? `dashboard:charts:group:${actor.groupId}:board:${boardId}:start:${startStr}:end:${endStr}`
		: `dashboard:charts:group:${actor.groupId}:start:${startStr}:end:${endStr}`;

	const cached = await getCachedDashboardData<any>(cacheKey);
	if (cached) return cached;

	let baseCondition = and(eq(tasks.groupId, actor.groupId), isNull(tasks.deletedAt));
	if (boardId) {
		baseCondition = and(baseCondition, eq(tasks.boardId, boardId));
	}

	// 1. Workload query (open tasks)
	const workloadQuery = await db.select({
		assigneeId: tasks.assigneeId,
		userName: users.name,
		count: sql<number>`cast(count(${tasks.id}) as int)`
	})
	.from(tasks)
	.leftJoin(users, eq(tasks.assigneeId, users.id))
	.where(and(
		baseCondition,
		inArray(
			tasks.stageId,
			db.select({ id: stages.id })
				.from(stages)
				.innerJoin(boards, eq(stages.boardId, boards.id))
				.where(
					and(
						eq(stages.isCompleted, false),
						eq(boards.groupId, actor.groupId),
						isNull(stages.deletedAt),
						isNull(boards.deletedAt)
					)
				)
		)
	))
	.groupBy(tasks.assigneeId, users.name);

	// 2. Status Distribution query
	const statusQuery = await db.select({
		isCompleted: stages.isCompleted,
		count: sql<number>`cast(count(${tasks.id}) as int)`
	})
	.from(tasks)
	.innerJoin(stages, eq(tasks.stageId, stages.id))
	.innerJoin(boards, eq(stages.boardId, boards.id))
	.where(
		and(
			baseCondition,
			isNull(stages.deletedAt),
			isNull(boards.deletedAt)
		)
	)
	.groupBy(stages.isCompleted);

	// 3. Support Stats query (assigned vs closed) within date range
	const [helpdeskBoard] = await db.select({ id: boards.id })
		.from(boards)
		.where(and(
			eq(boards.name, 'Helpdesk Tickets'),
			eq(boards.groupId, actor.groupId),
			isNull(boards.deletedAt)
		))
		.limit(1);

	let supportStats = { assigned: 0, closed: 0 };
	if (helpdeskBoard) {
		const rangeCondition = and(
			eq(tasks.boardId, helpdeskBoard.id),
			isNull(tasks.deletedAt)
		);

		const start = startDate || new Date(0);
		const end = endDate || new Date();

		const [assignedRes] = await db.select({ count: sql<number>`cast(count(${tasks.id}) as int)` })
			.from(tasks)
			.where(and(
				rangeCondition,
				sql`${tasks.assigneeId} is not null`,
				gt(tasks.createdAt, start),
				lt(tasks.createdAt, end)
			));

		const [closedRes] = await db.select({ count: sql<number>`cast(count(${tasks.id}) as int)` })
			.from(tasks)
			.innerJoin(stages, eq(tasks.stageId, stages.id))
			.where(and(
				rangeCondition,
				eq(stages.isCompleted, true),
				gt(tasks.updatedAt, start),
				lt(tasks.updatedAt, end)
			));

		supportStats = {
			assigned: assignedRes?.count || 0,
			closed: closedRes?.count || 0
		};
	}

	const result = {
		workload: workloadQuery.map(row => ({
			userName: row.userName || 'Unassigned',
			count: row.count
		})),
		statusDistribution: statusQuery.map(row => ({
			status: row.isCompleted ? 'Completed' : 'Open',
			count: row.count
		})),
		supportStats
	};

	await setCachedDashboardData(cacheKey, result, 300);
	return result;
}

/**
 * Fetches user-specific widgets (assigned active tickets and unread notifications), cached at the user level.
 */
export async function getDashboardWidgets(actor: Actor) {
	const cacheKey = `dashboard:widgets:group:${actor.groupId}:user:${actor.id}`;
	const cached = await getCachedDashboardData<any>(cacheKey);
	if (cached) return cached;

	const [helpdeskBoard] = await db.select({ id: boards.id })
		.from(boards)
		.where(and(
			eq(boards.name, 'Helpdesk Tickets'),
			eq(boards.groupId, actor.groupId),
			isNull(boards.deletedAt)
		))
		.limit(1);

	let activeSupportTickets: any[] = [];
	if (helpdeskBoard) {
		activeSupportTickets = await db.select({
			id: tasks.id,
			taskNumber: tasks.number,
			title: tasks.title,
			stageName: stages.name,
			priority: tasks.priority,
			createdAt: tasks.createdAt
		})
		.from(tasks)
		.innerJoin(stages, eq(tasks.stageId, stages.id))
		.where(and(
			eq(tasks.boardId, helpdeskBoard.id),
			eq(tasks.assigneeId, actor.id),
			eq(stages.isCompleted, false),
			isNull(tasks.deletedAt)
		))
		.orderBy(desc(tasks.createdAt))
		.limit(5);
	}

	const unreadNotificationsList = await db.select({
		id: notifications.id,
		type: notifications.type,
		createdAt: notifications.createdAt,
		taskId: notifications.taskId,
		taskTitle: tasks.title,
		actorName: users.name
	})
	.from(notifications)
	.leftJoin(tasks, eq(tasks.id, notifications.taskId))
	.leftJoin(users, eq(users.id, notifications.actorId))
	.where(and(
		eq(notifications.userId, actor.id),
		isNull(notifications.readAt)
	))
	.orderBy(desc(notifications.createdAt))
	.limit(5);

	const result = {
		activeSupportTickets,
		unreadNotificationsList
	};

	await setCachedDashboardData(cacheKey, result, 300);
	return result;
}
