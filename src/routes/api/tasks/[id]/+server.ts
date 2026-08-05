import { db } from '$lib/server/db/db';
import { tasks, boards, taskTags, tags, taskFollowers } from '$lib/server/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const [task] = await db.select({
		id: tasks.id,
		title: tasks.title,
		description: tasks.description,
		checklists: tasks.checklists,
		assigneeId: tasks.assigneeId,
		priority: tasks.priority,
		dueDate: tasks.dueDate,
		parentTaskId: tasks.parentTaskId,
		stageId: tasks.stageId,
		boardId: tasks.boardId,
		projectId: sql<string | null>`COALESCE(${tasks.projectId}, ${boards.projectId})`,
		boardName: boards.name,
		boardPrefix: boards.prefix,
		number: tasks.number,
		orderIndex: tasks.orderIndex,
		customFields: tasks.customFields
	})
	.from(tasks)
	.leftJoin(boards, eq(tasks.boardId, boards.id))
	.where(
		and(
			eq(tasks.id, params.id),
			eq(tasks.groupId, locals.user.groupId),
			isNull(tasks.deletedAt)
		)
	);

	if (!task) return json({ error: 'Task not found' }, { status: 404 });

	const [fetchedTags, fetchedFollowers] = await Promise.all([
		db.select({
			id: tags.id,
			name: tags.name,
			color: tags.color
		}).from(taskTags)
		.innerJoin(tags, eq(taskTags.tagId, tags.id))
		.where(and(eq(taskTags.taskId, task.id), isNull(tags.deletedAt))),

		db.select({
			userId: taskFollowers.userId
		}).from(taskFollowers).where(eq(taskFollowers.taskId, task.id))
	]);

	return json({
		...task,
		tags: fetchedTags,
		followers: fetchedFollowers
	});
};
