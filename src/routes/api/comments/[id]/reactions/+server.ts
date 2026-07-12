import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { commentReactions, comments, tasks } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const commentId = params.id;
		const body = await request.json();
		const { emoji } = body;

		if (!emoji || typeof emoji !== 'string') {
			return json({ error: 'Valid emoji is required' }, { status: 400 });
		}

		// Verify the comment belongs to a task in the user's group
		const [existing] = await db.select({ id: comments.id })
			.from(comments)
			.innerJoin(tasks, eq(comments.taskId, tasks.id))
			.where(and(eq(comments.id, commentId), eq(tasks.groupId, locals.user.groupId)));
		if (!existing) return json({ error: 'Comment not found' }, { status: 404 });

		const existingReaction = await db.select({
			id: commentReactions.id,
			commentId: commentReactions.commentId,
			userId: commentReactions.userId,
			emoji: commentReactions.emoji
		}).from(commentReactions).where(and(
			eq(commentReactions.commentId, commentId),
			eq(commentReactions.userId, locals.user.id),
			eq(commentReactions.emoji, emoji)
		));

		if (existingReaction.length > 0) {
			await db.delete(commentReactions).where(eq(commentReactions.id, existingReaction[0].id));
			return json({ success: true, action: 'removed' });
		} else {
			await db.insert(commentReactions).values({
				commentId,
				userId: locals.user.id,
				emoji
			});
			return json({ success: true, action: 'added' });
		}

	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : 'Internal server error';
		return json({ error: message }, { status: 500 });
	}
}
