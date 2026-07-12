import { json } from '@sveltejs/kit';
import { getProjectTags, createTag } from '$lib/server/services/tags';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	try {
		const tags = await getProjectTags(locals.user, params.id);
		return json(tags);
	} catch (e: any) {
		return json({ error: e.message }, { status: 400 });
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const { name, color } = await request.json();
	if (!name) return json({ error: 'Missing tag name' }, { status: 400 });

	try {
		const newTag = await createTag(locals.user, params.id, name, color);
		return json(newTag);
	} catch (e: any) {
		return json({ error: e.message }, { status: 400 });
	}
};
