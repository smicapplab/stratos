import { json } from '@sveltejs/kit';
import { markAsRead } from '$lib/server/services/notifications';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const data = await request.json();
		await markAsRead(locals.user, data.notificationId);
		return json({ success: true });
	} catch (e) {
		return json({ error: 'Failed' }, { status: 500 });
	}
};
