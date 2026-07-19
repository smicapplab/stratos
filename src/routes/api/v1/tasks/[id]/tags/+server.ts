import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { attachTagToTask, detachTagFromTask } from '$lib/server/services/tags';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const taskId = params.id;
		const body = await request.json();
		const tagId = body.tagId;

		if (!tagId) {
			return json({ error: 'tagId is required' }, { status: 400 });
		}

		await attachTagToTask(user, taskId, tagId);

		return json({ success: true }, { status: 201 });
	} catch (err: any) {
		console.error('Failed to attach tag:', err);
		return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, url, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const taskId = params.id;
		const tagId = url.searchParams.get('tagId');

		if (!tagId) {
			return json({ error: 'tagId query parameter is required' }, { status: 400 });
		}

		await detachTagFromTask(user, taskId, tagId);

		return new Response(null, { status: 204 });
	} catch (err: any) {
		console.error('Failed to detach tag:', err);
		return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
	}
};
