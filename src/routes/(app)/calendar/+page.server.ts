import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { tasks, users, boards, stages, customFieldDefinitions } from '$lib/server/db/schema';
import { eq, isNull, and, inArray } from 'drizzle-orm';
import { getAccessibleProjects, getAccessibleBoards } from '$lib/server/services/projects';
import { createTask, updateTask } from '$lib/server/services/tasks';
import { taskActions } from '$lib/server/actions/tasks';

import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const actor = locals.user;

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
		eq(tasks.groupId, actor.groupId),
		eq(tasks.assigneeId, actor.id),
		isNull(tasks.deletedAt)
	));

	const groupUsers = await db.select({
		id: users.id,
		name: users.name,
		role: users.role
	}).from(users).where(
		and(
			eq(users.groupId, actor.groupId),
			isNull(users.deletedAt)
		)
	);

	const accessibleProjects = await getAccessibleProjects(actor);
	const accessibleBoards = await getAccessibleBoards(actor);
	const boardIds = accessibleBoards.map(b => b.id);

	const groupStages = boardIds.length > 0 ? await db.select({
		id: stages.id,
		name: stages.name,
		boardId: stages.boardId,
		orderIndex: stages.orderIndex,
		isCompleted: stages.isCompleted
	})
	.from(stages)
	.where(and(
		isNull(stages.deletedAt),
		inArray(stages.boardId, boardIds)
	)) : [];

	const groupCustomFields = await db.select({
		id: customFieldDefinitions.id,
		groupId: customFieldDefinitions.groupId,
		boardId: customFieldDefinitions.boardId,
		name: customFieldDefinitions.name,
		type: customFieldDefinitions.type,
		options: customFieldDefinitions.options,
		createdAt: customFieldDefinitions.createdAt
	})
	.from(customFieldDefinitions)
	.where(and(
		eq(customFieldDefinitions.groupId, actor.groupId),
		isNull(customFieldDefinitions.deletedAt)
	));

	return {
		tasks: userTasks,
		groupUsers,
		projects: accessibleProjects,
		boards: accessibleBoards,
		stages: groupStages,
		customFields: groupCustomFields
	};
};

export const actions: Actions = {
	...taskActions,
	createCalendarTask: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const stageId = data.get('stageId')?.toString();
		const dueDateStr = data.get('dueDate')?.toString();
		const assigneeId = data.get('assigneeId')?.toString() || null;

		if (!title || !stageId) {
			return fail(400, { error: 'Title and Stage are required' });
		}

		try {
			const newTask = await createTask(locals.user, stageId, title);
			
			const updatePayload: any = {};
			if (dueDateStr) {
				updatePayload.dueDate = new Date(dueDateStr);
			}
			if (assigneeId) {
				updatePayload.assigneeId = assigneeId;
			}
			
			if (Object.keys(updatePayload).length > 0) {
				await updateTask(locals.user, newTask.id, updatePayload);
			}
			
			return { success: true };
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	}
};
