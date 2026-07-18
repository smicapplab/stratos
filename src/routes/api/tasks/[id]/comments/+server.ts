import { db } from '$lib/server/db/db';
import { comments, tasks } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
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
	
	let body;
	try {
		body = await request.json();
	} catch (e) {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const content = body.content?.toString().trim();
	if (!content) return json({ error: 'Content required' }, { status: 400 });
	if (content.length > 50000) return json({ error: 'Comment too long' }, { status: 400 });

	// Verify the task belongs to the user's group and is not deleted
	const [task] = await db.select({ id: tasks.id })
		.from(tasks)
		.where(and(eq(tasks.id, taskId), eq(tasks.groupId, locals.user.groupId), isNull(tasks.deletedAt)));
	if (!task) return json({ error: 'Task not found' }, { status: 404 });

	const [newComment] = await db.insert(comments).values({
		taskId,
		authorId: locals.user.id,
		content,
		parentCommentId: body.parentCommentId || null
	}).returning();

	await notifyCommentAdded(locals.user.id, taskId);

	return json(newComment);
}
