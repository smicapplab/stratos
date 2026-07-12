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
	updateProfile: async ({ request, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const jobTitle = data.get('jobTitle')?.toString() || null;

		if (!name) {
			return fail(400, { error: 'Name is required' });
		}

		try {
			await db.update(users)
				.set({ name, jobTitle })
				.where(eq(users.id, locals.user!.id));
			
			return { success: true };
		} catch (e: any) {
			return fail(500, { error: 'An error occurred while updating your profile' });
		}
	}
};
