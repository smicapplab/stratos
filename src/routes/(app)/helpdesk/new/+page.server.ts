import { error, fail, redirect } from '@sveltejs/kit';
import { createHelpdeskTicket } from '$lib/server/services/helpdesk';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}
	return {};
};

export const actions: Actions = {
	submitTicket: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const description = data.get('description')?.toString().trim() || '';
		const type = data.get('type')?.toString() as 'Bug' | 'Feature' | 'Support';

		if (!title) {
			return fail(400, { error: 'Title is required.' });
		}

		const validTypes = ['Bug', 'Feature', 'Support'];
		if (!type || !validTypes.includes(type)) {
			return fail(400, { error: 'Invalid ticket category.' });
		}

		try {
			await createHelpdeskTicket(locals.user, type, title, description);
			// Redirect back to the dashboard once submitted
			throw redirect(303, '/helpdesk/tickets');
		} catch (err) {
			// SvelteKit redirect uses a special error/response structure
			if (err && typeof err === 'object' && 'status' in err) throw err;
			const e = err as Error;
			return fail(500, { error: e.message || 'Failed to submit ticket.' });
		}
	}
};
