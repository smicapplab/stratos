import { error, fail } from '@sveltejs/kit';
import { getHelpdeskTicket, submitHelpdeskComment } from '$lib/server/services/helpdesk';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const data = await getHelpdeskTicket(locals.user, params.id);
		return {
			ticket: data.task,
			comments: data.comments,
			auditLogs: data.auditLogs
		};
	} catch (err) {
		const e = err as Error;
		if (e.message === 'Ticket not found') {
			throw error(404, 'Ticket not found');
		} else if (e.message === 'Access denied') {
			throw error(403, 'Access denied');
		}
		throw error(500, e.message || 'Failed to load ticket details.');
	}
};

export const actions: Actions = {
	postComment: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const content = data.get('content')?.toString().trim();

		if (!content) {
			return fail(400, { error: 'Comment content cannot be empty.' });
		}

		try {
			await submitHelpdeskComment(locals.user, params.id, content);
			return { success: true };
		} catch (err) {
			const e = err as Error;
			return fail(500, { error: e.message || 'Failed to submit comment.' });
		}
	}
};
