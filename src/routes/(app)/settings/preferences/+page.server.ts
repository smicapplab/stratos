import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [user] = await db.select().from(users).where(eq(users.id, locals.user!.id));
	return { profileUser: user };
};

export const actions: Actions = {
	updatePreferences: async ({ request, locals }) => {
		const data = await request.formData();
		const theme = data.get('theme')?.toString();

		if (!theme || !['light', 'dark', 'system'].includes(theme)) {
			return fail(400, { error: 'Invalid theme' });
		}

		try {
			await db.update(users).set({ theme }).where(eq(users.id, locals.user!.id));
			return { success: true };
		} catch (e: any) {
			return fail(500, { error: 'Failed to update preferences' });
		}
	}
};
