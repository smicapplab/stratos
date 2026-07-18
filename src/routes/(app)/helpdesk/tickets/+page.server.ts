import { error } from '@sveltejs/kit';
import { getUserHelpdeskTickets } from '$lib/server/services/helpdesk';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const tickets = await getUserHelpdeskTickets(locals.user);
		return {
			tickets
		};
	} catch (err) {
		const e = err as Error;
		console.error('[Helpdesk Tickets List Loader] Error:', e);
		throw error(500, 'An unexpected error occurred');
	}
};
