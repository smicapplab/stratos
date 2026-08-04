import { redirect } from '@sveltejs/kit';
import { getNotifications, getSentNotifications } from '$lib/server/services/notifications';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const [notifications, sentNotifications] = await Promise.all([
		getNotifications(locals.user),
		getSentNotifications(locals.user)
	]);

	return {
		notifications,
		sentNotifications
	};
};
