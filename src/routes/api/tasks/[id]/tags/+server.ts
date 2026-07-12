import { json } from '@sveltejs/kit';
import { attachTagToTask, detachTagFromTask } from '$lib/server/services/tags';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/db';
import { taskTags, tags } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	try {
		// Just a direct db fetch for simplicity. Technically should go through service if we want auth isolation
		const assignedTags = await db.select({
			id: tags.id,
			name: tags.name,
			color: tags.color,
			isDeleted: tags.isDeleted
		}).from(taskTags)
		  .innerJoin(tags, eq(taskTags.tagId, tags.id))
		  .where(eq(taskTags.taskId, params.id));
		  
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
