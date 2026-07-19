import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/db';
import { comments, tasks } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getTaskActivity } from '$lib/server/services/tasks';
import { notifyCommentAdded } from '$lib/server/services/notifications';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const taskId = params.id;
		const activity = await getTaskActivity(taskId, user);
		return json(activity);
	} catch (err: any) {
		console.error('Failed to get comment list:', err);
		return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const taskId = params.id;
		const body = await request.json();

		const content = body.content?.toString().trim();
		if (!content) {
			return json({ error: 'Content required' }, { status: 400 });
		}
		if (content.length > 50000) {
			return json({ error: 'Comment too long' }, { status: 400 });
		}

		// Verify task exists and belongs to the user's group
		const [task] = await db.select({ id: tasks.id })
			.from(tasks)
			.where(
				and(
					eq(tasks.id, taskId),
					eq(tasks.groupId, user.groupId),
					isNull(tasks.deletedAt)
				)
			)
			.limit(1);

		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		const [newComment] = await db.insert(comments).values({
			taskId,
			authorId: user.id,
			content,
			parentCommentId: body.parentCommentId || null
		}).returning();

		await notifyCommentAdded(user.id, taskId);

		return json(newComment, { status: 201 });
	} catch (err: any) {
		console.error('Failed to create comment:', err);
		return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
	}
};
