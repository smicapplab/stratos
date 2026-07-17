import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { tasks, users, boards } from '$lib/server/db/schema';
import { eq, isNull, and } from 'drizzle-orm';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	// Fetch all tasks for the current user in this group
	const userTasks = await db.select({
		id: tasks.id,
		title: tasks.title,
		description: tasks.description,
		parentTaskId: tasks.parentTaskId,
		priority: tasks.priority,
		dueDate: tasks.dueDate,
		assigneeId: tasks.assigneeId,
		stageId: tasks.stageId,
		boardId: tasks.boardId,
		boardName: boards.name,
		boardPrefix: boards.prefix,
		number: tasks.number,
		orderIndex: tasks.orderIndex,
		checklists: tasks.checklists
	})
	.from(tasks)
	.leftJoin(boards, eq(tasks.boardId, boards.id))
	.where(and(
		eq(tasks.groupId, locals.user.groupId),
		eq(tasks.assigneeId, locals.user.id),
		isNull(tasks.deletedAt)
	));

	const groupUsers = await db.select({
		id: users.id,
		name: users.name,
		role: users.role
	}).from(users).where(
		and(
			eq(users.groupId, locals.user.groupId),
			isNull(users.deletedAt)
		)
	);

	return {
		tasks: userTasks,
		groupUsers
	};
}

import { taskActions } from '$lib/server/actions/tasks';
import type { Actions } from './$types';

export const actions: Actions = {
	...taskActions
};
