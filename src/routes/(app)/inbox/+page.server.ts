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
		getNotifications(locals.user),
		getSentNotifications(locals.user),
		getGroupUsers(locals.user),
		getGroupStages(locals.user)
	]);

	return {
		notifications,
		sentNotifications,
		groupUsers,
		stages
	};
};

export const actions: Actions = {
	...taskActions
};
