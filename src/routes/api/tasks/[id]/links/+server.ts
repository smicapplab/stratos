import { json } from '@sveltejs/kit';
import { getTaskLinks, linkTasks, removeTaskLink } from '$lib/server/services/tasks';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	try {
		const links = await getTaskLinks(locals.user, params.id);
		return json(links);
	} catch (e: any) {
		return json({ error: e.message }, { status: 400 });
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const { targetTaskId, linkType } = await request.json();
	if (!targetTaskId || !linkType) return json({ error: 'Missing parameters' }, { status: 400 });

	try {
		await linkTasks(locals.user, params.id, targetTaskId, linkType);
		return json({ success: true });
	} catch (e: any) {
		return json({ error: e.message }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const { linkId } = await request.json();
	if (!linkId) return json({ error: 'Missing parameters' }, { status: 400 });

	try {
		await removeTaskLink(locals.user, linkId);
		return json({ success: true });
	} catch (e: any) {
		return json({ error: e.message }, { status: 400 });
	}
};
