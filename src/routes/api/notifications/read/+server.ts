import { json } from '@sveltejs/kit';
import { markAsRead, markTaskNotificationsAsRead } from '$lib/server/services/notifications';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	let data: any = {};
	try {
		data = await request.json();
	} catch (e) {
		// Allow empty body to mean mark all read
	}

	try {
		if (data.taskId) {
			await markTaskNotificationsAsRead(locals.user, data.taskId);
		} else {
			const notificationId = data.notificationId || data.id;
			const targetId = (!notificationId || notificationId === 'all' || data.markAll) ? undefined : notificationId;
			await markAsRead(locals.user, targetId);
		}
		return json({ success: true });
	} catch (e) {
		console.error('Failed to update notifications:', e);
		return json({ error: 'Failed to update notifications' }, { status: 500 });
	}
};
