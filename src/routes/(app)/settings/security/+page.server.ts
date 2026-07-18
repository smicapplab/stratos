import { fail, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { users, sessions } from '$lib/server/db/schema';
import { eq, ne, and, isNull } from 'drizzle-orm';
import * as argon2 from 'argon2';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.session) {
		throw error(401, 'Unauthorized');
	}
	const [user] = await db.select().from(users).where(
		and(eq(users.id, locals.user.id), isNull(users.deletedAt))
	);
	if (!user) {
		throw error(404, 'User not found');
	}
	const userSessions = await db.select().from(sessions).where(eq(sessions.userId, locals.user.id));

	return { 
		profileUser: user,
		activeSessions: userSessions,
		currentSessionId: locals.session.id
	};
};

export const actions: Actions = {
	updatePassword: async ({ request, locals }) => {
		const actor = locals.user;
		if (!actor) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const currentPassword = data.get('currentPassword')?.toString();
		const newPassword = data.get('newPassword')?.toString();
		const confirmPassword = data.get('confirmPassword')?.toString();

		if (!newPassword || !confirmPassword) {
			return fail(400, { error: 'New password and confirmation are required' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'New passwords do not match' });
		}

		if (newPassword.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters long' });
		}

		const [user] = await db.select().from(users).where(
			and(eq(users.id, actor.id), isNull(users.deletedAt))
		);
		if (!user) {
			return fail(404, { error: 'User not found' });
		}
		
		// If user already has a password, verify the current one
		if (user.hashedPassword) {
			if (!currentPassword) {
				return fail(400, { error: 'Current password is required to set a new one' });
			}
			const valid = await argon2.verify(user.hashedPassword, currentPassword);
			if (!valid) {
				return fail(400, { error: 'Incorrect current password' });
			}
		}

		const newHashed = await argon2.hash(newPassword);

		try {
			await db.update(users)
				.set({ hashedPassword: newHashed })
				.where(and(eq(users.id, actor.id), isNull(users.deletedAt)));
			return { success: true };
		} catch (e: unknown) {
			console.error('[Update Password Action] Error:', e);
			return fail(500, { error: 'Failed to update password' });
		}
	},
	
	logoutOtherDevices: async ({ locals }) => {
		const actor = locals.user;
		const session = locals.session;
		if (!actor || !session) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			await db.delete(sessions).where(
				and(
					eq(sessions.userId, actor.id),
					ne(sessions.id, session.id)
				)
			);
			return { success: true };
		} catch (e: unknown) {
			console.error('[Logout Other Devices Action] Error:', e);
			return fail(500, { error: 'Failed to clear sessions' });
		}
	}
};
