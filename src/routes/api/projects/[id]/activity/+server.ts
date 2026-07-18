import { json } from '@sveltejs/kit';
import { getProjectActivity } from '$lib/server/services/projects';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let offset = parseInt(url.searchParams.get('offset') || '0', 10);
	if (isNaN(offset) || offset < 0) {
		offset = 0;
	}

	let limit = parseInt(url.searchParams.get('limit') || '15', 10);
	if (isNaN(limit) || limit < 1) {
		limit = 15;
	}
	const safeLimit = Math.min(limit, 50);

	try {
		const activity = await getProjectActivity(locals.user, params.id, safeLimit, offset);
		return json({ activity });
	} catch (e: unknown) {
		const err = e instanceof Error ? e.message : 'Unknown error';
		if (err === 'Project not found') {
			return json({ error: 'Project not found' }, { status: 404 });
		} else if (err === 'Unauthorized') {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		console.error('[Project Activity API] Error fetching activity:', e);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};
