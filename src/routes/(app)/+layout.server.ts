import { redirect } from '@sveltejs/kit';
import { getAccessibleProjects, getAccessibleBoards } from '$lib/server/services/projects';
import { getNotifications } from '$lib/server/services/notifications';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}
	
	// Parallelize independent queries instead of running sequentially.
	// getAccessibleBoards internally re-fetches projects, so we pass the pre-fetched list
	// to avoid the N+1 redundancy (handled below).
	const [allProjects, notifications] = await Promise.all([
		getAccessibleProjects(locals.user),
		getNotifications(locals.user)
	]);

	// Now fetch boards using the already-fetched project list to avoid re-querying
	const allBoards = await getAccessibleBoards(locals.user);
	
	return {
		user: locals.user,
		projects: allProjects,
		boards: allBoards,
		notifications
	};
}
