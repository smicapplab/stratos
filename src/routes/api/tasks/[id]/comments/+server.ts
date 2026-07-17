import { db } from '$lib/server/db/db';
import { comments, tasks } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { getTaskActivity } from '$lib/server/services/tasks';
import { notifyCommentAdded } from '$lib/server/services/notifications';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const taskId = params.id;
	const activity = await getTaskActivity(taskId, locals.user);
	
	return json(activity);
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const taskId = params.id;
	const body = await request.json();

	if (!body.content) return json({ error: 'Content required' }, { status: 400 });

	// Verify the task belongs to the user's group
	const [task] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.groupId, locals.user.groupId)));
	if (!task) return json({ error: 'Task not found' }, { status: 404 });

	const [newComment] = await db.insert(comments).values({
		taskId,
		authorId: locals.user.id,
		content: body.content,
		parentCommentId: body.parentCommentId || null
	}).returning();

	await notifyCommentAdded(locals.user.id, taskId);

	return json(newComment);
}
