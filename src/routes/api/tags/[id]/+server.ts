import { json } from '@sveltejs/kit';
import { updateTag, softDeleteTag } from '$lib/server/services/tags';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	
	let body;
	try {
		body = await request.json();
	} catch (err) {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const name = body.name?.toString().trim();
	const color = body.color?.toString().trim();
	if (!name || !color) return json({ error: 'Missing parameters' }, { status: 400 });

	try {
		const updated = await updateTag(locals.user, params.id, name, color);
		return json(updated);
	} catch (e: unknown) {
		const err = e instanceof Error ? e.message : 'Failed to update tag';
		if (err === 'Tag not found' || err === 'Project not found') {
			return json({ error: err }, { status: 404 });
		} else if (err === 'Unauthorized') {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		console.error('[Tags PATCH Action] Error:', e);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	
	try {
		await softDeleteTag(locals.user, params.id);
		return json({ success: true });
	} catch (e: unknown) {
		const err = e instanceof Error ? e.message : 'Failed to delete tag';
		if (err === 'Tag not found') {
			return json({ error: err }, { status: 404 });
		} else if (err === 'Unauthorized') {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		console.error('[Tags DELETE Action] Error:', e);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};
