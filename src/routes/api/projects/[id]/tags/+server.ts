import { json } from '@sveltejs/kit';
import { getProjectTags, createTag } from '$lib/server/services/tags';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	try {
		const tags = await getProjectTags(locals.user, params.id);
		return json(tags);
	} catch (e: unknown) {
		const err = e instanceof Error ? e.message : 'Failed to retrieve project tags';
		if (err === 'Project not found') {
			return json({ error: err }, { status: 404 });
		} else if (err === 'Unauthorized') {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		console.error('[Project Tags GET Action] Error:', e);
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

	const name = body.name?.toString().trim();
	const color = body.color?.toString().trim();
	if (!name) return json({ error: 'Missing tag name' }, { status: 400 });

	try {
		const newTag = await createTag(locals.user, params.id, name, color);
		return json(newTag);
	} catch (e: unknown) {
		const err = e instanceof Error ? e.message : 'Failed to create tag';
		if (err === 'Project not found') {
			return json({ error: err }, { status: 404 });
		} else if (err === 'Unauthorized') {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		console.error('[Project Tags POST Action] Error:', e);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};
