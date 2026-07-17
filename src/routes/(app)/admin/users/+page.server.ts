import { db } from '$lib/server/db/db';
import { users } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { inviteUser, removeUser, changeUserRole } from '$lib/server/services/users';
import { fail, redirect } from '@sveltejs/kit';

import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const actor = locals.user;
	if (!actor || actor.role !== 'Admin') {
		throw redirect(302, '/');
	}
	
	// Fetch all users for the current group
	const groupUsers = await db.select({
		id: users.id,
		email: users.email,
		name: users.name,
		role: users.role,
		groupId: users.groupId,
		createdAt: users.createdAt
	}).from(users).where(
		and(
			eq(users.groupId, actor.groupId),
			isNull(users.deletedAt)
		)
	);
	
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

		const VALID_ROLES = ['Admin', 'Member', 'Viewer'];
		if (!VALID_ROLES.includes(role)) {
			return fail(400, { error: 'Invalid role selection' });
		}

		try {
			const actor = locals.user;
			if (!actor) return fail(401, { error: 'Unauthorized' });
			await inviteUser(actor, email, role);
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	},

	remove: async ({ request, locals }) => {
		const data = await request.formData();
		const userId = data.get('userId')?.toString();

		if (!userId) return fail(400, { error: 'User ID is required' });

		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(userId)) {
			return fail(400, { error: 'Invalid user ID format' });
		}

		try {
			const actor = locals.user;
			if (!actor) return fail(401, { error: 'Unauthorized' });
			if (userId === actor.id) {
				return fail(400, { error: 'You cannot remove or change your own role' });
			}
			await removeUser(actor, userId);
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	},
	
	updateRole: async ({ request, locals }) => {
		const data = await request.formData();
		const userId = data.get('userId')?.toString();
		const role = data.get('role')?.toString();

		if (!userId || !role) return fail(400, { error: 'User ID and Role are required' });

		const VALID_ROLES = ['Admin', 'Member', 'Viewer'];
		if (!VALID_ROLES.includes(role)) {
			return fail(400, { error: 'Invalid role selection' });
		}

		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(userId)) {
			return fail(400, { error: 'Invalid user ID format' });
		}

		try {
			const actor = locals.user;
			if (!actor) return fail(401, { error: 'Unauthorized' });
			if (userId === actor.id) {
				return fail(400, { error: 'You cannot remove or change your own role' });
			}
			await changeUserRole(actor, userId, role);
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	}
};
