import { redirect } from '@sveltejs/kit';
import { getNotifications, getSentNotifications } from '$lib/server/services/notifications';
import { getGroupStages } from '$lib/server/services/stages';
import { getGroupUsers } from '$lib/server/services/users';
import { taskActions } from '$lib/server/actions/tasks';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const [notifications, sentNotifications, groupUsers, stages] = await Promise.all([
		getNotifications(locals.user, 20, 0),
		getSentNotifications(locals.user, 20, 0),
		getGroupUsers(locals.user),
		getGroupStages(locals.user)
	]);

	return {
		notifications,
		hasMoreReceived: notifications.length > 0,
		sentNotifications,
		hasMoreSent: sentNotifications.length > 0,
		groupUsers,
		stages
	};
};

export const actions: Actions = {
	...taskActions
};
