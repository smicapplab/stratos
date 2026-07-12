import { db } from '$lib/server/db/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { inviteUser, removeUser, changeUserRole } from '$lib/server/services/users';
import { fail, redirect } from '@sveltejs/kit';

import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const actor = locals.user;
	if (!actor) throw redirect(302, '/');
	
	// Fetch all users for the current group
	const groupUsers = await db.select({
		id: users.id,
		email: users.email,
		name: users.name,
		role: users.role,
		groupId: users.groupId,
		createdAt: users.createdAt
	}).from(users).where(eq(users.groupId, actor.groupId));
	
	return {
		users: groupUsers,
		currentUser: actor
	};
}

export const actions: Actions = {
	invite: async ({ request, locals }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString();
		const role = data.get('role')?.toString();

		if (!email || !role) {
			return fail(400, { error: 'Email and Role are required' });
		}

		try {
			const actor = locals.user;
			if (!actor) return fail(401, { error: 'Unauthorized' });
			await inviteUser(actor, email, role);
			return { success: true };
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	},

	remove: async ({ request, locals }) => {
		const data = await request.formData();
		const userId = data.get('userId')?.toString();

		if (!userId) return fail(400, { error: 'User ID is required' });

		try {
			const actor = locals.user;
			if (!actor) return fail(401, { error: 'Unauthorized' });
			await removeUser(actor, userId);
			return { success: true };
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	},
	
	updateRole: async ({ request, locals }) => {
		const data = await request.formData();
		const userId = data.get('userId')?.toString();
		const role = data.get('role')?.toString();

		if (!userId || !role) return fail(400, { error: 'User ID and Role are required' });

		try {
			const actor = locals.user;
			if (!actor) return fail(401, { error: 'Unauthorized' });
			await changeUserRole(actor, userId, role);
			return { success: true };
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	}
};
