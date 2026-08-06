import { db } from '../db/db';
import { dailyStandups, projects, projectMembers, users, tasks, stages } from '../db/schema';
import { eq, and, inArray, isNull, desc, gte, lte } from 'drizzle-orm';
import type { Actor } from './users';

export interface StandupPayload {
	dateStr?: string;
	morningIntent?: string;
	morningTaskIds?: string[];
	eveningOutcome?: string;
	eveningTaskIds?: string[];
	blockers?: string;
}

export function getTodayDateString(): string {
	const now = new Date();
	const yyyy = now.getFullYear();
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const dd = String(now.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

export function generateDateRangeStrings(startDateStr: string, endDateStr: string): string[] {
	const dates: string[] = [];
	const start = new Date(startDateStr);
	const end = new Date(endDateStr);

	if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
		return [getTodayDateString()];
	}

	const curr = new Date(start);
	while (curr <= end) {
		const yyyy = curr.getFullYear();
		const mm = String(curr.getMonth() + 1).padStart(2, '0');
		const dd = String(curr.getDate()).padStart(2, '0');
		dates.push(`${yyyy}-${mm}-${dd}`);
		curr.setDate(curr.getDate() + 1);
	}

	return dates;
}

export async function getTodayStandup(actor: Actor, projectId: string, dateStr?: string) {
	const targetDate = dateStr || getTodayDateString();

	const [existing] = await db
		.select()
		.from(dailyStandups)
		.where(
			and(
				eq(dailyStandups.groupId, actor.groupId),
				eq(dailyStandups.projectId, projectId),
				eq(dailyStandups.userId, actor.id),
				eq(dailyStandups.date, targetDate)
			)
		)
		.limit(1);

	return (
		existing || {
			id: null,
			groupId: actor.groupId,
			projectId,
			userId: actor.id,
			date: targetDate,
			morningIntent: null,
			morningLoggedAt: null,
			morningTaskIds: [],
			eveningOutcome: null,
			eveningLoggedAt: null,
			eveningTaskIds: [],
			blockers: null,
			status: 'PENDING'
		}
	);
}

export async function upsertStandup(actor: Actor, projectId: string, payload: StandupPayload) {
	const targetDate = payload.dateStr || getTodayDateString();

	// Verify project access
	const [project] = await db
		.select({ id: projects.id, enableStandups: projects.enableStandups })
		.from(projects)
		.where(
			and(
				eq(projects.id, projectId),
				eq(projects.groupId, actor.groupId),
				isNull(projects.deletedAt)
			)
		)
		.limit(1);

	if (!project) {
		throw new Error('Project not found or access denied');
	}

	const [existing] = await db
		.select()
		.from(dailyStandups)
		.where(
			and(
				eq(dailyStandups.groupId, actor.groupId),
				eq(dailyStandups.projectId, projectId),
				eq(dailyStandups.userId, actor.id),
				eq(dailyStandups.date, targetDate)
			)
		)
		.limit(1);

	const morningIntent = payload.morningIntent !== undefined ? payload.morningIntent : existing?.morningIntent || null;
	const eveningOutcome = payload.eveningOutcome !== undefined ? payload.eveningOutcome : existing?.eveningOutcome || null;
	const blockers = payload.blockers !== undefined ? payload.blockers : existing?.blockers || null;

	const morningTaskIds = payload.morningTaskIds !== undefined ? payload.morningTaskIds : existing?.morningTaskIds || [];
	const eveningTaskIds = payload.eveningTaskIds !== undefined ? payload.eveningTaskIds : existing?.eveningTaskIds || [];

	const morningLoggedAt = morningIntent
		? existing?.morningLoggedAt || new Date()
		: null;

	const eveningLoggedAt = eveningOutcome
		? existing?.eveningLoggedAt || new Date()
		: null;

	let status: 'PENDING' | 'CHECKED_IN' | 'COMPLETED' | 'CHECKED_OUT_DIRECTLY' = 'PENDING';
	if (morningIntent && eveningOutcome) {
		status = 'COMPLETED';
	} else if (morningIntent) {
		status = 'CHECKED_IN';
	} else if (eveningOutcome) {
		status = 'CHECKED_OUT_DIRECTLY';
	}

	if (existing) {
		const [updated] = await db
			.update(dailyStandups)
			.set({
				morningIntent,
				morningLoggedAt,
				morningTaskIds,
				eveningOutcome,
				eveningLoggedAt,
				eveningTaskIds,
				blockers,
				status,
				updatedAt: new Date()
			})
			.where(eq(dailyStandups.id, existing.id))
			.returning();

		return updated;
	} else {
		const [inserted] = await db
			.insert(dailyStandups)
			.values({
				groupId: actor.groupId,
				projectId,
				userId: actor.id,
				date: targetDate,
				morningIntent,
				morningLoggedAt,
				morningTaskIds,
				eveningOutcome,
				eveningLoggedAt,
				eveningTaskIds,
				blockers,
				status
			})
			.returning();

		return inserted;
	}
}

export async function getProjectStandupGrid(actor: Actor, projectId: string, dateStrings: string[]) {
	// 1. Fetch explicit project members
	const projectMemberUsers = await db
		.select({
			userId: users.id,
			name: users.name,
			email: users.email,
			avatarUrl: users.avatarUrl
		})
		.from(projectMembers)
		.innerJoin(users, eq(users.id, projectMembers.userId))
		.where(
			and(
				eq(projectMembers.projectId, projectId),
				eq(users.groupId, actor.groupId),
				isNull(users.deletedAt)
			)
		);

	// 2. Fetch actor user details so the current user is ALWAYS guaranteed to be in the matrix
	const [actorUser] = await db
		.select({
			userId: users.id,
			name: users.name,
			email: users.email,
			avatarUrl: users.avatarUrl
		})
		.from(users)
		.where(
			and(
				eq(users.id, actor.id),
				eq(users.groupId, actor.groupId),
				isNull(users.deletedAt)
			)
		)
		.limit(1);

	// 3. Also fetch any users who have existing standup records for this project
	const existingStandupUsers = await db
		.select({
			userId: users.id,
			name: users.name,
			email: users.email,
			avatarUrl: users.avatarUrl
		})
		.from(dailyStandups)
		.innerJoin(users, eq(users.id, dailyStandups.userId))
		.where(
			and(
				eq(dailyStandups.projectId, projectId),
				eq(users.groupId, actor.groupId),
				isNull(users.deletedAt)
			)
		);

	const memberMap = new Map<string, { userId: string; name: string; email: string; avatarUrl: string | null }>();
	for (const m of projectMemberUsers) {
		memberMap.set(m.userId, m);
	}
	for (const m of existingStandupUsers) {
		memberMap.set(m.userId, m);
	}
	if (actorUser && !memberMap.has(actorUser.userId)) {
		memberMap.set(actorUser.userId, actorUser);
	}

	const members = Array.from(memberMap.values());

	if (members.length === 0 || dateStrings.length === 0) {
		return { members: [], standupsMap: {}, stats: { totalSubmitted: 0, completionRate: 0, totalBlockers: 0 } };
	}

	const records = await db
		.select()
		.from(dailyStandups)
		.where(
			and(
				eq(dailyStandups.groupId, actor.groupId),
				eq(dailyStandups.projectId, projectId),
				inArray(dailyStandups.date, dateStrings)
			)
		);

	const standupsMap: Record<string, Record<string, any>> = {};
	let totalSubmitted = 0;
	let totalBlockers = 0;

	for (const r of records) {
		const key = `${r.userId}_${r.date}`;
		standupsMap[key] = r;
		if (r.status !== 'PENDING') {
			totalSubmitted++;
		}
		if (r.blockers && r.blockers.trim().length > 0) {
			totalBlockers++;
		}
	}

	// Calculate completion rate based on weekdays in date range
	const weekdayCount = dateStrings.filter((d) => {
		const day = new Date(d).getDay();
		return day !== 0 && day !== 6;
	}).length;

	const totalExpected = members.length * (weekdayCount || 1);
	const completionRate = totalExpected > 0 ? Math.min(100, Math.round((totalSubmitted / totalExpected) * 100)) : 0;

	return {
		members,
		standupsMap,
		stats: {
			totalSubmitted,
			completionRate,
			totalBlockers
		}
	};
}

export async function getStandupReportData(actor: Actor, projectId: string, startDateStr: string, endDateStr: string) {
	const dateStrings = generateDateRangeStrings(startDateStr, endDateStr);
	const grid = await getProjectStandupGrid(actor, projectId, dateStrings);

	const records = await db
		.select({
			id: dailyStandups.id,
			date: dailyStandups.date,
			userId: dailyStandups.userId,
			userName: users.name,
			userEmail: users.email,
			status: dailyStandups.status,
			morningIntent: dailyStandups.morningIntent,
			eveningOutcome: dailyStandups.eveningOutcome,
			blockers: dailyStandups.blockers,
			morningLoggedAt: dailyStandups.morningLoggedAt,
			eveningLoggedAt: dailyStandups.eveningLoggedAt,
			createdAt: dailyStandups.createdAt
		})
		.from(dailyStandups)
		.innerJoin(users, eq(users.id, dailyStandups.userId))
		.where(
			and(
				eq(dailyStandups.groupId, actor.groupId),
				eq(dailyStandups.projectId, projectId),
				gte(dailyStandups.date, startDateStr),
				lte(dailyStandups.date, endDateStr)
			)
		)
		.orderBy(desc(dailyStandups.date));

	return {
		dateStrings,
		records,
		grid
	};
}

export async function getTaskSuggestionsForUser(actor: Actor, projectId: string) {
	const userTasks = await db
		.select({
			id: tasks.id,
			title: tasks.title,
			boardId: tasks.boardId,
			stageName: stages.name,
			isCompleted: stages.isCompleted
		})
		.from(tasks)
		.leftJoin(stages, eq(stages.id, tasks.stageId))
		.where(
			and(
				eq(tasks.groupId, actor.groupId),
				eq(tasks.projectId, projectId),
				eq(tasks.assigneeId, actor.id),
				isNull(tasks.deletedAt)
			)
		)
		.orderBy(desc(tasks.updatedAt));

	const inProgressTasks = userTasks.filter((t) => !t.isCompleted);
	const completedTasks = userTasks.filter((t) => t.isCompleted);

	return {
		inProgressTasks,
		completedTasks
	};
}
