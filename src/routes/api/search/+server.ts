import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { tasks, boards, projects } from '$lib/server/db/schema';
import { eq, ilike, and, isNull, or, sql } from 'drizzle-orm';
import { escapeLikePattern } from '$lib/utils';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const query = url.searchParams.get('q');
		if (!query || query.trim().length < 1) {
			return json({ tasks: [], boards: [], projects: [] });
		}

		if (query.length > 200) {
			return json({ tasks: [], boards: [], projects: [] });
		}

		const projectIdParam = url.searchParams.get('projectId');
		const boardIdParam = url.searchParams.get('boardId');

		const groupId = locals.user.groupId;
		const trimmedQuery = query.trim();
		const rawClean = trimmedQuery.replace(/^#/, '').trim();
		const searchPattern = `%${escapeLikePattern(trimmedQuery)}%`;
		const cleanPattern = `%${escapeLikePattern(rawClean)}%`;

		// Extract suffix after hyphen if query looks like "TSK-7992" or "STR-123"
		const hyphenMatch = rawClean.match(/^([a-zA-Z0-9]+)-(.*)$/);
		const suffixPart = hyphenMatch ? hyphenMatch[2] : rawClean;
		const suffixPattern = `%${escapeLikePattern(suffixPart)}%`;

		const parsedNum = parseInt(suffixPart, 10);
		const isNumber = !isNaN(parsedNum) && String(parsedNum) === suffixPart;

		const taskConditions = [
			// 1. Full text search vector
			sql`${tasks.searchVector} @@ websearch_to_tsquery('english', ${trimmedQuery})`,
			// 2. Title matching
			ilike(tasks.title, searchPattern),
			ilike(tasks.title, cleanPattern),
			// 3. Formatted identifier e.g. TSK-7992 or STR-12 (uppercase and lowercase)
			ilike(sql`concat(COALESCE(${boards.prefix}, 'TSK'), '-', COALESCE(CAST(${tasks.number} AS TEXT), UPPER(SUBSTRING(CAST(${tasks.id} AS TEXT) FROM 1 FOR 4))))`, cleanPattern),
			ilike(sql`concat(COALESCE(${boards.prefix}, 'TSK'), '-', COALESCE(CAST(${tasks.number} AS TEXT), SUBSTRING(CAST(${tasks.id} AS TEXT) FROM 1 FOR 4)))`, cleanPattern),
			// 4. Formatted identifier without hyphen e.g. TSK7992 or STR12
			ilike(sql`concat(COALESCE(${boards.prefix}, 'TSK'), COALESCE(CAST(${tasks.number} AS TEXT), SUBSTRING(CAST(${tasks.id} AS TEXT) FROM 1 FOR 4)))`, cleanPattern),
			// 5. Match task number as text
			ilike(sql`CAST(${tasks.number} AS TEXT)`, suffixPattern),
			// 6. Match UUID prefix or substring
			ilike(sql`CAST(${tasks.id} AS TEXT)`, suffixPattern)
		];

		if (isNumber) {
			taskConditions.push(eq(tasks.number, parsedNum));
		}

		const baseTaskFilters = [
			eq(tasks.groupId, groupId), 
			isNull(tasks.deletedAt),
			or(isNull(tasks.boardId), isNull(boards.deletedAt)),
			or(isNull(projects.id), isNull(projects.deletedAt)),
			or(...taskConditions)
		];

		if (projectIdParam) {
			baseTaskFilters.push(or(eq(tasks.projectId, projectIdParam), eq(boards.projectId, projectIdParam)) as any);
		}
		if (boardIdParam) {
			baseTaskFilters.push(eq(tasks.boardId, boardIdParam));
		}

		const matchingTasks = await db.select({
			id: tasks.id,
			title: tasks.title,
			boardId: tasks.boardId,
			number: tasks.number,
			boardPrefix: boards.prefix,
			parentTaskId: tasks.parentTaskId
		}).from(tasks)
		.leftJoin(boards, eq(tasks.boardId, boards.id))
		.leftJoin(projects, or(eq(tasks.projectId, projects.id), eq(boards.projectId, projects.id)))
		.where(and(...baseTaskFilters)).limit(15);

		const matchingBoards = await db.select({
			id: boards.id,
			name: boards.name
		}).from(boards)
		.innerJoin(projects, eq(boards.projectId, projects.id))
		.where(
			and(
				eq(boards.groupId, groupId),
				isNull(boards.deletedAt),
				isNull(projects.deletedAt),
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
	} catch (error) {
		console.error('API Error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
