import { fail, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { users } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}
	const [user] = await db.select().from(users).where(
		and(eq(users.id, locals.user.id), isNull(users.deletedAt))
	);
	if (!user) {
		throw error(404, 'User not found');
	}
	return { profileUser: user };
};

export const actions: Actions = {
	updatePreferences: async ({ request, locals }) => {
		const actor = locals.user;
		if (!actor) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const theme = data.get('theme')?.toString();

		if (!theme || !['light', 'dark', 'system'].includes(theme)) {
			return fail(400, { error: 'Invalid theme' });
		}

		try {
			await db.update(users)
				.set({ theme })
				.where(and(eq(users.id, actor.id), isNull(users.deletedAt)));
			return { success: true };
		} catch (e: unknown) {
			console.error('[Update Preferences Action] Error:', e);
			return fail(500, { error: 'Failed to update preferences' });
		}
	}
};
