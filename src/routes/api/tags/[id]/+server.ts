import { json } from '@sveltejs/kit';
import { updateTag, softDeleteTag } from '$lib/server/services/tags';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const { name, color } = await request.json();
	if (!name || !color) return json({ error: 'Missing parameters' }, { status: 400 });

	try {
		const updated = await updateTag(locals.user, params.id, name, color);
		return json(updated);
	} catch (e: any) {
		return json({ error: e.message }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	
	try {
		await softDeleteTag(locals.user, params.id);
		return json({ success: true });
	} catch (e: any) {
		return json({ error: e.message }, { status: 400 });
	}
};
