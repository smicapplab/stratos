import { json } from '@sveltejs/kit';
import { markAsRead } from '$lib/server/services/notifications';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	let data;
	try {
		data = await request.json();
	} catch (e) {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const notificationId = data.notificationId;
	if (notificationId === undefined || typeof notificationId !== 'string' || !notificationId.trim()) {
		return json({ error: 'notificationId is required and must be a non-empty string' }, { status: 400 });
	}

	try {
		await markAsRead(locals.user, notificationId);
		return json({ success: true });
	} catch (e) {
		console.error('Failed to update notifications:', e);
		return json({ error: 'Failed to update notifications' }, { status: 500 });
	}
};
