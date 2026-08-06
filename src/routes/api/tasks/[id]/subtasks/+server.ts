import { db } from '$lib/server/db/db';
import { tasks, boards } from '$lib/server/db/schema';
import { eq, and, isNull, asc, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const parentTasks = alias(tasks, 'parent_tasks');
	const parentBoards = alias(boards, 'parent_boards');

	const subtasksList = await db.select({
		id: tasks.id,
		title: tasks.title,
		description: tasks.description,
		checklists: tasks.checklists,
		assigneeId: tasks.assigneeId,
		priority: tasks.priority,
		dueDate: tasks.dueDate,
		parentTaskId: tasks.parentTaskId,
		stageId: tasks.stageId,
		boardId: sql<string | null>`COALESCE(${tasks.boardId}, ${parentTasks.boardId})`,
		boardName: sql<string | null>`COALESCE(${boards.name}, ${parentBoards.name})`,
		boardPrefix: sql<string | null>`COALESCE(${boards.prefix}, ${parentBoards.prefix})`,
		number: tasks.number,
		orderIndex: tasks.orderIndex,
		customFields: tasks.customFields
	})
	.from(tasks)
	.leftJoin(boards, eq(tasks.boardId, boards.id))
	.leftJoin(parentTasks, eq(tasks.parentTaskId, parentTasks.id))
	.leftJoin(parentBoards, eq(parentTasks.boardId, parentBoards.id))
	.where(
		and(
			eq(tasks.parentTaskId, params.id),
			eq(tasks.groupId, locals.user.groupId),
			isNull(tasks.deletedAt)
		)
	)
	.orderBy(asc(tasks.createdAt), asc(tasks.id));

	return json(subtasksList);
};
