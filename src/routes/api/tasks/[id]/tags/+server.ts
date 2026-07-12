import { json } from '@sveltejs/kit';
import { attachTagToTask, detachTagFromTask } from '$lib/server/services/tags';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/db';
import { taskTags, tags, tasks } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	try {
		// Just a direct db fetch for simplicity. Technically should go through service if we want auth isolation
		const assignedTags = await db.select({
			id: tags.id,
			name: tags.name,
			color: tags.color,
			deletedAt: tags.deletedAt
		}).from(taskTags)
		  .innerJoin(tags, eq(taskTags.tagId, tags.id))
		  .innerJoin(tasks, eq(taskTags.taskId, tasks.id))
		  .where(and(eq(taskTags.taskId, params.id), eq(tasks.groupId, locals.user.groupId)));
		  
		return json(assignedTags);
	} catch (e: any) {
		return json({ error: e.message }, { status: 400 });
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const { tagId } = await request.json();
	if (!tagId) return json({ error: 'Missing tagId' }, { status: 400 });

	try {
		await attachTagToTask(locals.user, params.id, tagId);
		return json({ success: true });
	} catch (e: any) {
		return json({ error: e.message }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const { tagId } = await request.json();
	if (!tagId) return json({ error: 'Missing tagId' }, { status: 400 });

	try {
		await detachTagFromTask(locals.user, params.id, tagId);
		return json({ success: true });
	} catch (e: any) {
		return json({ error: e.message }, { status: 400 });
	}
};
