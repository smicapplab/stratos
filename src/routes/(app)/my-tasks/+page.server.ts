import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { tasks, boards, taskTags, tags, taskFollowers } from '$lib/server/db/schema';
import { eq, isNull, and, or, sql, inArray } from 'drizzle-orm';
import { getGroupStages } from '$lib/server/services/stages';
import { getGroupUsers } from '$lib/server/services/users';

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
		projectId: sql<string | null>`COALESCE(${tasks.projectId}, ${boards.projectId})`,
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
		isNull(tasks.deletedAt),
		or(isNull(tasks.boardId), isNull(boards.deletedAt))
	));

	const taskIds = userTasks.map((t) => t.id);
	
	let fetchedTags: any[] = [];
	let fetchedFollowers: any[] = [];

	if (taskIds.length > 0) {
		[fetchedTags, fetchedFollowers] = await Promise.all([
			db.select({
				taskId: taskTags.taskId,
				id: tags.id,
				name: tags.name,
				color: tags.color
			}).from(taskTags)
			.innerJoin(tags, eq(taskTags.tagId, tags.id))
			.where(and(inArray(taskTags.taskId, taskIds), isNull(tags.deletedAt))),

			db.select({
				taskId: taskFollowers.taskId,
				userId: taskFollowers.userId
			}).from(taskFollowers).where(inArray(taskFollowers.taskId, taskIds))
		]);
	}

	const tagsMap: Record<string, { id: string; name: string; color: string }[]> = {};
	for (const tag of fetchedTags) {
		if (!tagsMap[tag.taskId]) tagsMap[tag.taskId] = [];
		tagsMap[tag.taskId].push({
			id: tag.id,
			name: tag.name,
			color: tag.color
		});
	}

	const followersMap: Record<string, { userId: string }[]> = {};
	for (const f of fetchedFollowers) {
		if (!followersMap[f.taskId]) followersMap[f.taskId] = [];
		followersMap[f.taskId].push({ userId: f.userId });
	}

	const fullUserTasks = userTasks.map((t) => ({
		...t,
		tags: tagsMap[t.id] || [],
		followers: followersMap[t.id] || []
	}));

	const [groupUsers, allStages] = await Promise.all([
		getGroupUsers(locals.user),
		getGroupStages(locals.user)
	]);

	return {
		user: locals.user,
		tasks: fullUserTasks,
		groupUsers,
		stages: allStages
	};
};

import { taskActions } from '$lib/server/actions/tasks';
import type { Actions } from './$types';

export const actions: Actions = {
	...taskActions
};
