import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { tasks, boards, projects } from '$lib/server/db/schema';
import { eq, ilike, and, isNull, or, sql } from 'drizzle-orm';
import { escapeLikePattern } from '$lib/utils';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const query = url.searchParams.get('q');
	if (!query || query.length < 2) {
		return json({ tasks: [], boards: [], projects: [] });
	}

	const searchPattern = `%${escapeLikePattern(query)}%`;
	const groupId = locals.user.groupId;

	const matchingTasks = await db.select({
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
		or(
			ilike(tasks.title, searchPattern),
			ilike(sql`concat(${boards.prefix}, '-', ${tasks.number})`, searchPattern)
		)
	)).limit(10);

	const matchingBoards = await db.select({
		id: boards.id,
		name: boards.name
	}).from(boards).where(and(eq(boards.groupId, groupId), ilike(boards.name, searchPattern))).limit(5);

	const matchingProjects = await db.select({
		id: projects.id,
		name: projects.name
	}).from(projects).where(and(eq(projects.groupId, groupId), ilike(projects.name, searchPattern))).limit(5);

	return json({
		tasks: matchingTasks,
		boards: matchingBoards,
		projects: matchingProjects
	});
}
