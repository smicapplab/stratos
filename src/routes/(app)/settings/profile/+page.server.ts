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
	updateProfile: async ({ request, locals }) => {
		const actor = locals.user;
		if (!actor) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const name = data.get('name')?.toString();
		const jobTitle = data.get('jobTitle')?.toString() || null;

		if (!name) {
			return fail(400, { error: 'Name is required' });
		}

		try {
			await db.update(users)
				.set({ name, jobTitle })
				.where(and(eq(users.id, actor.id), isNull(users.deletedAt)));
			
			return { success: true };
		} catch (e: unknown) {
			console.error('[Update Profile Action] Error:', e);
			return fail(500, { error: 'An error occurred while updating your profile' });
		}
	}
};
