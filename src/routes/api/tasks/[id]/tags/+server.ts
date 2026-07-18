import { json } from '@sveltejs/kit';
import { attachTagToTask, detachTagFromTask } from '$lib/server/services/tags';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/db';
import { taskTags, tags, tasks } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	try {
		// Just a direct db fetch for simplicity.
		const assignedTags = await db.select({
			id: tags.id,
			name: tags.name,
			color: tags.color,
			deletedAt: tags.deletedAt
		}).from(taskTags)
		  .innerJoin(tags, eq(taskTags.tagId, tags.id))
		  .innerJoin(tasks, eq(taskTags.taskId, tasks.id))
		  .where(and(
			eq(taskTags.taskId, params.id),
			eq(tasks.groupId, locals.user.groupId),
			isNull(tasks.deletedAt),
			isNull(tags.deletedAt)
		  ));
		  
		return json(assignedTags);
	} catch (e: unknown) {
		console.error('[Task Tags GET Action] Error:', e);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	
	let body;
	try {
		body = await request.json();
	} catch (err) {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const tagId = body.tagId?.toString().trim();
	if (!tagId) return json({ error: 'Missing tagId' }, { status: 400 });

	try {
		await attachTagToTask(locals.user, params.id, tagId);
		return json({ success: true });
	} catch (e: unknown) {
		const err = e instanceof Error ? e.message : 'Failed to attach tag';
		if (err === 'Tag not found' || err === 'Task not found') {
			return json({ error: err }, { status: 404 });
		} else if (err === 'Unauthorized') {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		console.error('[Task Tags POST Action] Error:', e);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	
	let body;
	try {
		body = await request.json();
	} catch (err) {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const tagId = body.tagId?.toString().trim();
	if (!tagId) return json({ error: 'Missing tagId' }, { status: 400 });

	try {
		await detachTagFromTask(locals.user, params.id, tagId);
		return json({ success: true });
	} catch (e: unknown) {
		const err = e instanceof Error ? e.message : 'Failed to detach tag';
		if (err === 'Tag not found' || err === 'Task not found') {
			return json({ error: err }, { status: 404 });
		} else if (err === 'Unauthorized') {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		console.error('[Task Tags DELETE Action] Error:', e);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};
