import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { tasks, boards, projects } from '$lib/server/db/schema';
import { eq, ilike, and, isNull, or, sql } from 'drizzle-orm';
import { escapeLikePattern } from '$lib/utils';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const query = url.searchParams.get('q');
	if (!query || query.length < 2) {
		return json({ tasks: [], boards: [], projects: [] });
	}

	if (query.length > 200) {
		return json({ tasks: [], boards: [], projects: [] });
	}

	const searchPattern = `%${escapeLikePattern(query)}%`;
	const groupId = locals.user.groupId;

	const ftsResults = await db.select({
		id: tasks.id,
		title: tasks.title,
		boardId: tasks.boardId,
		number: tasks.number,
		boardPrefix: boards.prefix,
		parentTaskId: tasks.parentTaskId
	}).from(tasks)
	.leftJoin(boards, eq(tasks.boardId, boards.id))
	.where(and(
		eq(tasks.groupId, groupId), 
		isNull(tasks.deletedAt),
		or(isNull(tasks.boardId), isNull(boards.deletedAt)),
		sql`${tasks.searchVector} @@ websearch_to_tsquery('english', ${query})`
	)).limit(10);

	let matchingTasks = ftsResults;

	// Only perform key identifier scan if query contains hyphens/digits to avoid sequential scans on text queries
	if (/[-\d]/.test(query)) {
		const keyResults = await db.select({
			id: tasks.id,
			title: tasks.title,
			boardId: tasks.boardId,
			number: tasks.number,
			boardPrefix: boards.prefix,
			parentTaskId: tasks.parentTaskId
		}).from(tasks)
		.leftJoin(boards, eq(tasks.boardId, boards.id))
		.where(and(
			eq(tasks.groupId, groupId), 
			isNull(tasks.deletedAt),
			or(isNull(tasks.boardId), isNull(boards.deletedAt)),
			ilike(sql`concat(${boards.prefix}, '-', ${tasks.number})`, searchPattern)
		)).limit(10);

		const existingIds = new Set(matchingTasks.map(t => t.id));
		for (const task of keyResults) {
			if (!existingIds.has(task.id)) {
				matchingTasks.push(task);
			}
		}
		matchingTasks = matchingTasks.slice(0, 10);
	}

	const matchingBoards = await db.select({
		id: boards.id,
		name: boards.name
	}).from(boards).where(
		and(
			eq(boards.groupId, groupId),
			isNull(boards.deletedAt),
			ilike(boards.name, searchPattern)
		)
	).limit(5);

	const matchingProjects = await db.select({
		id: projects.id,
		name: projects.name
	}).from(projects).where(
		and(
			eq(projects.groupId, groupId),
			isNull(projects.deletedAt),
			ilike(projects.name, searchPattern)
		)
	).limit(5);

	return json({
		tasks: matchingTasks,
		boards: matchingBoards,
		projects: matchingProjects
	});
}
