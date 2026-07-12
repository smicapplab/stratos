import { fail } from '@sveltejs/kit';
import { createProject } from '$lib/server/services/projects';
import type { Actions } from './$types';

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString();

		if (!name) {
			return fail(400, { error: 'Name is required' });
		}

		try {
			await createProject(locals.user!, name, 'Public');
			// Since we just created it, it's public by default.
			// It will naturally appear in the layout.
			return { success: true };
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	}
};
