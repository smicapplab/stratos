import { db } from '../db/db';
import { tasks, stages, users, boards } from '../db/schema';
import { eq, and, isNull, sql, lt, gt, inArray } from 'drizzle-orm';
import type { Actor } from './users';

export async function getDashboardMetrics(actor: Actor, boardId?: string) {
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

	return {
		myOpenTasks: openTasksRes?.count || 0,
		myOverdueTasks: overdueTasksRes?.count || 0,
		myCompletedThisWeek: completedThisWeekRes?.count || 0
	};
}

export async function getDashboardCharts(actor: Actor, boardId?: string) {
	let baseCondition = and(eq(tasks.groupId, actor.groupId), isNull(tasks.deletedAt));
	if (boardId) {
		baseCondition = and(baseCondition, eq(tasks.boardId, boardId));
	}

	// Workload by Assignee (open tasks)
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

	// Status Distribution (To Do vs Done)
	// We can group by stage name, but stages vary by board. 
	// For MVP group by is_completed status
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

	return {
		workload: workloadQuery.map(row => ({
			userName: row.userName || 'Unassigned',
			count: row.count
		})),
		statusDistribution: statusQuery.map(row => ({
			status: row.isCompleted ? 'Completed' : 'Open',
			count: row.count
		}))
	};
}
