import { json } from '@sveltejs/kit';
import { getProjectActivity } from '$lib/server/services/projects';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const offset = parseInt(url.searchParams.get('offset') || '0', 10);
	const limit = parseInt(url.searchParams.get('limit') || '15', 10);

	try {
		const activity = await getProjectActivity(locals.user, params.id, limit, offset);
		return json({ activity });
	} catch (e: any) {
		return json({ error: e.message }, { status: 403 });
	}
};
