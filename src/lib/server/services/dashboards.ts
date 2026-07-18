import { db } from '../db/db';
import { tasks, stages, users, boards, notifications, projects, projectMembers, auditLogs } from '../db/schema';
import { eq, and, isNull, sql, lt, gt, inArray, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
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

export interface BoardReports {
	velocity: {
		assigneeId: string | null;
		assigneeName: string | null;
		currentCount: number;
		priorCount: number;
	}[];
	reopenedRate: number;
	reopenedRateColor: 'green' | 'amber' | 'red';
	reopenedTasks: {
		taskId: string | null;
		taskTitle: string;
		taskNumber: number;
		reopenedBy: string;
		oldStageName: string;
		newStageName: string;
		reopenedAt: Date;
	}[];
	cycleTime: {
		globalAverageDays: number;
		priorityAverages: {
			Low: number;
			Medium: number;
			High: number;
			Urgent: number;
		};
	};
	bottlenecks: {
		stageId: string;
		stageName: string;
		count: number;
	}[];
	risks: {
		overdue: {
			id: string;
			title: string;
			number: number;
			dueDate: Date | null;
			assigneeName: string | null;
		}[];
		stale: {
			id: string;
			title: string;
			number: number;
			updatedAt: Date;
			assigneeName: string | null;
		}[];
	};
}

export async function getBoardReports(
	actor: Actor,
	boardId: string,
	startDate: Date,
	endDate: Date
): Promise<BoardReports> {
	const startStr = startDate.toISOString().split('T')[0];
	const endStr = endDate.toISOString().split('T')[0];
	const cacheKey = `dashboard:reports:group:${actor.groupId}:board:${boardId}:start:${startStr}:end:${endStr}`;

	const cached = await getCachedDashboardData<BoardReports>(cacheKey);
	if (cached) return cached;

	// Verify project access first (security guard)
	const [board] = await db.select({ projectId: boards.projectId, groupId: boards.groupId })
		.from(boards)
		.where(and(eq(boards.id, boardId), isNull(boards.deletedAt)))
		.limit(1);

	if (!board) {
		throw new Error('Board not found');
	}

	if (board.groupId !== actor.groupId) {
		throw new Error('Unauthorized');
	}

	if (actor.role !== 'Admin') {
		const [project] = await db.select({ visibility: projects.visibility })
			.from(projects)
			.where(and(eq(projects.id, board.projectId), isNull(projects.deletedAt)))
			.limit(1);
			
		if (!project) throw new Error('Project not found');
		
		if (project.visibility !== 'Public') {
			const [member] = await db.select({ role: projectMembers.role })
				.from(projectMembers)
				.where(and(eq(projectMembers.projectId, board.projectId), eq(projectMembers.userId, actor.id)))
				.limit(1);
			if (!member) {
				throw new Error('Unauthorized');
			}
		}
	}

	const duration = endDate.getTime() - startDate.getTime();
	const priorStart = new Date(startDate.getTime() - duration);
	const priorEnd = startDate;

	// 1. Current Completed Tasks (Velocity)
	const currentCompleted = await db.select({
		assigneeId: tasks.assigneeId,
		assigneeName: users.name,
		count: sql<number>`cast(count(${tasks.id}) as int)`
	})
	.from(tasks)
	.innerJoin(stages, eq(tasks.stageId, stages.id))
	.leftJoin(users, eq(tasks.assigneeId, users.id))
	.where(
		and(
			eq(tasks.groupId, actor.groupId),
			eq(tasks.boardId, boardId),
			isNull(tasks.deletedAt),
			eq(stages.isCompleted, true),
			gt(tasks.updatedAt, startDate),
			lt(tasks.updatedAt, endDate)
		)
	)
	.groupBy(tasks.assigneeId, users.name);

	// 2. Prior Completed Tasks (Velocity)
	const priorCompleted = await db.select({
		assigneeId: tasks.assigneeId,
		count: sql<number>`cast(count(${tasks.id}) as int)`
	})
	.from(tasks)
	.innerJoin(stages, eq(tasks.stageId, stages.id))
	.where(
		and(
			eq(tasks.groupId, actor.groupId),
			eq(tasks.boardId, boardId),
			isNull(tasks.deletedAt),
			eq(stages.isCompleted, true),
			gt(tasks.updatedAt, priorStart),
			lt(tasks.updatedAt, priorEnd)
		)
	)
	.groupBy(tasks.assigneeId);

	// Merge Current & Prior counts per assignee
	const priorMap = new Map<string | null, number>();
	for (const row of priorCompleted) {
		priorMap.set(row.assigneeId, row.count);
	}

	const velocity = currentCompleted.map(row => ({
		assigneeId: row.assigneeId,
		assigneeName: row.assigneeName || 'Unassigned',
		currentCount: row.count,
		priorCount: priorMap.get(row.assigneeId) || 0
	}));

	// 3. Reopened Tasks
	const oldStage = alias(stages, 'old_stage');
	const newStage = alias(stages, 'new_stage');

	const reopenedRows = await db.select({
		taskId: auditLogs.taskId,
		taskTitle: tasks.title,
		taskNumber: tasks.number,
		reopenedBy: users.name,
		oldStageName: oldStage.name,
		newStageName: newStage.name,
		reopenedAt: auditLogs.createdAt
	})
	.from(auditLogs)
	.innerJoin(tasks, eq(auditLogs.taskId, tasks.id))
	.innerJoin(users, eq(auditLogs.userId, users.id))
	.innerJoin(oldStage, eq(sql`cast(${oldStage.id} as text)`, auditLogs.oldValue))
	.innerJoin(newStage, eq(sql`cast(${newStage.id} as text)`, auditLogs.newValue))
	.where(
		and(
			eq(auditLogs.groupId, actor.groupId),
			eq(tasks.boardId, boardId),
			eq(auditLogs.actionType, 'stage_change'),
			eq(oldStage.isCompleted, true),
			eq(newStage.isCompleted, false),
			gt(auditLogs.createdAt, startDate),
			lt(auditLogs.createdAt, endDate)
		)
	);

	const totalCompletedCount = currentCompleted.reduce((acc, row) => acc + row.count, 0);
	const reopenedCount = reopenedRows.length;
	const reopenedRate = (totalCompletedCount + reopenedCount) > 0
		? (reopenedCount / (totalCompletedCount + reopenedCount)) * 100
		: 0;

	let reopenedRateColor: 'green' | 'amber' | 'red' = 'green';
	if (reopenedRate > 25) {
		reopenedRateColor = 'red';
	} else if (reopenedRate >= 10) {
		reopenedRateColor = 'amber';
	}

	const reopenedTasks = reopenedRows.map(row => ({
		taskId: row.taskId,
		taskTitle: row.taskTitle || 'Untitled Task',
		taskNumber: row.taskNumber || 0,
		reopenedBy: row.reopenedBy || 'System',
		oldStageName: row.oldStageName,
		newStageName: row.newStageName,
		reopenedAt: row.reopenedAt
	}));

	// 4. Cycle Time (Time-to-Resolution)
	// Get completed stage IDs for this board
	const boardStages = await db.select({
		id: stages.id,
		orderIndex: stages.orderIndex,
		isCompleted: stages.isCompleted,
		name: stages.name
	})
	.from(stages)
	.where(and(eq(stages.boardId, boardId), isNull(stages.deletedAt)))
	.orderBy(stages.orderIndex);

	const completedStageIds = boardStages.filter(s => s.isCompleted).map(s => s.id);
	const activeStageIds = boardStages.filter(s => !s.isCompleted).map(s => s.id);
	const initialStageId = boardStages[0]?.id;

	let cycleTime = {
		globalAverageDays: 0,
		priorityAverages: { Low: 0, Medium: 0, High: 0, Urgent: 0 }
	};

	if (completedStageIds.length > 0) {
		const completedLogs = await db.select({
			taskId: auditLogs.taskId,
			completedAt: auditLogs.createdAt,
			taskCreatedAt: tasks.createdAt,
			priority: tasks.priority
		})
		.from(auditLogs)
		.innerJoin(tasks, eq(auditLogs.taskId, tasks.id))
		.where(
			and(
				eq(auditLogs.groupId, actor.groupId),
				eq(tasks.boardId, boardId),
				isNull(tasks.deletedAt),
				eq(auditLogs.actionType, 'stage_change'),
				inArray(auditLogs.newValue, completedStageIds.map(id => id.toString())),
				gt(auditLogs.createdAt, startDate),
				lt(auditLogs.createdAt, endDate)
			)
		)
		.orderBy(desc(auditLogs.createdAt));

		// Find the latest completed transition per unique task
		const latestCompletionPerTask = new Map<string, { completedAt: Date; taskCreatedAt: Date; priority: string }>();
		for (const log of completedLogs) {
			if (log.taskId && !latestCompletionPerTask.has(log.taskId)) {
				latestCompletionPerTask.set(log.taskId, {
					completedAt: log.completedAt,
					taskCreatedAt: log.taskCreatedAt,
					priority: log.priority
				});
			}
		}

		let totalDurationMs = 0;
		let count = 0;
		const priorityDurations: Record<string, { totalMs: number; count: number }> = {
			Low: { totalMs: 0, count: 0 },
			Medium: { totalMs: 0, count: 0 },
			High: { totalMs: 0, count: 0 },
			Urgent: { totalMs: 0, count: 0 }
		};

		for (const [_, info] of latestCompletionPerTask) {
			const durationMs = info.completedAt.getTime() - info.taskCreatedAt.getTime();
			totalDurationMs += durationMs;
			count++;

			const prio = info.priority;
			if (priorityDurations[prio] !== undefined) {
				priorityDurations[prio].totalMs += durationMs;
				priorityDurations[prio].count++;
			}
		}

		cycleTime = {
			globalAverageDays: count > 0 ? (totalDurationMs / count) / (1000 * 60 * 60 * 24) : 0,
			priorityAverages: {
				Low: priorityDurations.Low.count > 0 ? (priorityDurations.Low.totalMs / priorityDurations.Low.count) / (1000 * 60 * 60 * 24) : 0,
				Medium: priorityDurations.Medium.count > 0 ? (priorityDurations.Medium.totalMs / priorityDurations.Medium.count) / (1000 * 60 * 60 * 24) : 0,
				High: priorityDurations.High.count > 0 ? (priorityDurations.High.totalMs / priorityDurations.High.count) / (1000 * 60 * 60 * 24) : 0,
				Urgent: priorityDurations.Urgent.count > 0 ? (priorityDurations.Urgent.totalMs / priorityDurations.Urgent.count) / (1000 * 60 * 60 * 24) : 0
			}
		};
	}

	// 5. Bottlenecks (WIP / Stage Distribution)
	const bottlenecks = await db.select({
		stageId: tasks.stageId,
		stageName: stages.name,
		count: sql<number>`cast(count(${tasks.id}) as int)`
	})
	.from(tasks)
	.innerJoin(stages, eq(tasks.stageId, stages.id))
	.where(
		and(
			eq(tasks.groupId, actor.groupId),
			eq(tasks.boardId, boardId),
			isNull(tasks.deletedAt),
			eq(stages.isCompleted, false),
			isNull(stages.deletedAt)
		)
	)
	.groupBy(tasks.stageId, stages.name);

	// 6. Risks (Overdue & Stale)
	let overdue: any[] = [];
	if (activeStageIds.length > 0) {
		overdue = await db.select({
			id: tasks.id,
			title: tasks.title,
			number: tasks.number,
			dueDate: tasks.dueDate,
			assigneeName: users.name
		})
		.from(tasks)
		.leftJoin(users, eq(tasks.assigneeId, users.id))
		.where(
			and(
				eq(tasks.groupId, actor.groupId),
				eq(tasks.boardId, boardId),
				isNull(tasks.deletedAt),
				inArray(tasks.stageId, activeStageIds),
				lt(tasks.dueDate, new Date())
			)
		);
	}

	const staleCutoff = new Date();
	staleCutoff.setDate(staleCutoff.getDate() - 14);

	const inProgressStageIds = activeStageIds.filter(id => id !== initialStageId);
	let stale: any[] = [];
	if (inProgressStageIds.length > 0) {
		stale = await db.select({
			id: tasks.id,
			title: tasks.title,
			number: tasks.number,
			updatedAt: tasks.updatedAt,
			assigneeName: users.name
		})
		.from(tasks)
		.leftJoin(users, eq(tasks.assigneeId, users.id))
		.where(
			and(
				eq(tasks.groupId, actor.groupId),
				eq(tasks.boardId, boardId),
				isNull(tasks.deletedAt),
				inArray(tasks.stageId, inProgressStageIds),
				lt(tasks.updatedAt, staleCutoff)
			)
		);
	}

	const result: BoardReports = {
		velocity,
		reopenedRate,
		reopenedRateColor,
		reopenedTasks,
		cycleTime,
		bottlenecks,
		risks: {
			overdue,
			stale
		}
	};

	await setCachedDashboardData(cacheKey, result, 300);
	return result;
}
