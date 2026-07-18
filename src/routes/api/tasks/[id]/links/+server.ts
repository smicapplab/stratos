import { json } from '@sveltejs/kit';
import { getTaskLinks, linkTasks, removeTaskLink } from '$lib/server/services/tasks';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	try {
		const links = await getTaskLinks(locals.user, params.id);
		return json(links);
	} catch (e: unknown) {
		const err = e instanceof Error ? e.message : 'Failed to retrieve task links';
		if (err === 'Task not found') {
			return json({ error: err }, { status: 404 });
		} else if (err === 'Unauthorized') {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		console.error('[Task Links GET Action] Error:', e);
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

	const targetTaskId = body.targetTaskId?.toString().trim();
	const linkType = body.linkType?.toString().trim();
	if (!targetTaskId || !linkType) return json({ error: 'Missing parameters' }, { status: 400 });

	try {
		await linkTasks(locals.user, params.id, targetTaskId, linkType);
		return json({ success: true });
	} catch (e: unknown) {
		const err = e instanceof Error ? e.message : 'Failed to link tasks';
		if (err === 'Task not found') {
			return json({ error: err }, { status: 404 });
		} else if (err === 'Unauthorized') {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		console.error('[Task Links POST Action] Error:', e);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	
	let body;
	try {
		body = await request.json();
	} catch (err) {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const linkId = body.linkId?.toString().trim();
	if (!linkId) return json({ error: 'Missing parameters' }, { status: 400 });

	try {
		await removeTaskLink(locals.user, linkId);
		return json({ success: true });
	} catch (e: unknown) {
		const err = e instanceof Error ? e.message : 'Failed to remove task link';
		if (err === 'Link not found') {
			return json({ error: err }, { status: 404 });
		} else if (err === 'Unauthorized') {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		console.error('[Task Links DELETE Action] Error:', e);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};
