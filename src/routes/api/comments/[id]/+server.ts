import { db } from '$lib/server/db/db';
import { comments, tasks } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const commentId = params.id;
	
	let body;
	try {
		body = await request.json();
	} catch (e) {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const content = body.content?.toString().trim();
	if (!content) return json({ error: 'Content required' }, { status: 400 });
	if (content.length > 50000) return json({ error: 'Comment too long' }, { status: 400 });

	const [existing] = await db
		.select({ comment: comments, task: tasks })
		.from(comments)
		.innerJoin(tasks, and(eq(comments.taskId, tasks.id), isNull(tasks.deletedAt)))
		.where(eq(comments.id, commentId));

	if (!existing) return json({ error: 'Comment not found' }, { status: 404 });
	if (existing.task.groupId !== locals.user.groupId) return json({ error: 'Forbidden' }, { status: 403 });
	if (existing.comment.authorId !== locals.user.id) return json({ error: 'Forbidden' }, { status: 403 });

	const [updatedComment] = await db.update(comments)
		.set({ content, updatedAt: new Date() })
		.where(eq(comments.id, commentId))
		.returning();

	return json(updatedComment);
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const commentId = params.id;

	const [existing] = await db
		.select({ comment: comments, task: tasks })
		.from(comments)
		.innerJoin(tasks, and(eq(comments.taskId, tasks.id), isNull(tasks.deletedAt)))
		.where(eq(comments.id, commentId));

	if (!existing) return json({ error: 'Comment not found' }, { status: 404 });
	if (existing.task.groupId !== locals.user.groupId) return json({ error: 'Forbidden' }, { status: 403 });
	if (existing.comment.authorId !== locals.user.id) return json({ error: 'Forbidden' }, { status: 403 });

	await db.delete(comments).where(eq(comments.id, commentId));

	return json({ success: true });
}
