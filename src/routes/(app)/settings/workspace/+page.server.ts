import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'Admin') {
		throw redirect(302, '/dashboard');
	}
	return {
		group: locals.group
	};
};

export const actions: Actions = {
	updateBranding: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Admin') return fail(403);
		if (!locals.group) return fail(400, { message: 'Group not found' });
		
		const data = await request.formData();
		const defaultTheme = data.get('defaultTheme')?.toString();
		const logoUrl = data.get('logoUrl')?.toString() || null;
		const name = data.get('name')?.toString();

		if (!defaultTheme) {
			return fail(400, { message: 'Default theme is required' });
		}
		if (!name || name.trim() === '') {
			return fail(400, { message: 'Workspace name is required' });
		}
		
		await db.update(groups)
			.set({ defaultTheme, logoUrl, name: name.trim() })
			.where(eq(groups.id, locals.group.id));
			
		return { success: true };
	}
};
