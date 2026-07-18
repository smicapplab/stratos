import { json } from '@sveltejs/kit';
import { markAsRead } from '$lib/server/services/notifications';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const data = await request.json();
		const notificationId = data.notificationId;
		if (notificationId === undefined || typeof notificationId !== 'string' || !notificationId.trim()) {
			return json({ error: 'notificationId is required and must be a non-empty string' }, { status: 400 });
		}
		await markAsRead(locals.user, notificationId);
		return json({ success: true });
	} catch (e) {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}
};
