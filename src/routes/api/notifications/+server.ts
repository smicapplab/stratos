import { json } from '@sveltejs/kit';
import { getNotifications, getSentNotifications } from '$lib/server/services/notifications';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const rawLimit = parseInt(url.searchParams.get('limit') || '20', 10);
	const rawOffset = parseInt(url.searchParams.get('offset') || '0', 10);
	const tab = url.searchParams.get('tab') || 'received';

	const limit = Math.min(Math.max(isNaN(rawLimit) ? 20 : rawLimit, 1), 50);
	const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0);

	try {
		const items = tab === 'sent'
			? await getSentNotifications(locals.user, limit, offset)
			: await getNotifications(locals.user, limit, offset);

		return json({
			notifications: items,
			hasMore: items.length > 0
		});
	} catch (e) {
		console.error('Failed to fetch notifications page:', e);
		return json({ error: 'Failed to fetch notifications' }, { status: 500 });
	}
};
