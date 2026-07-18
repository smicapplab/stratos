import { db } from '../db/db';
import { users } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export interface Actor {
	id: string;
	role: 'Admin' | 'Manager' | 'Member' | 'Viewer';
	groupId: string;
}

export async function getGroupUsers(actor: Actor) {
	return await db.select({
		id: users.id,
		name: users.name,
		email: users.email,
		role: users.role,
		createdAt: users.createdAt,
	}).from(users).where(
		and(
			eq(users.groupId, actor.groupId),
			isNull(users.deletedAt)
		)
	);
}

import { sendGroupInviteEmail } from './email';
import { groups } from '../db/schema';

export async function inviteUser(actor: Actor, email: string, role: string) {
	if (actor.role !== 'Admin') {
		throw new Error('Unauthorized: Only Admins can invite users.');
	}

	const VALID_ROLES = ['Admin', 'Manager', 'Member', 'Viewer'];
	if (!VALID_ROLES.includes(role)) {
		throw new Error('InvalidRoleSelection');
	}

	// Prevent cross-tenant user hijacking: Check if email already exists
	const [existingUser] = await db.select({
		id: users.id,
		groupId: users.groupId
	}).from(users).where(eq(users.email, email)).limit(1);

	let invitedUser;

	if (existingUser) {
		if (existingUser.groupId !== actor.groupId) {
			throw new Error('EmailBelongsToAnotherGroup');
		}
		// Safe same-group re-invite path
		const [updatedUser] = await db.update(users).set({
			deletedAt: null,
			name: 'Pending Invite',
			role: role
		}).where(eq(users.id, existingUser.id)).returning();
		invitedUser = updatedUser;
	} else {
		const [newUser] = await db.insert(users).values({
			email,
			name: 'Pending Invite',
			groupId: actor.groupId,
			role,
		}).returning();
		invitedUser = newUser;
	}

	const [group] = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, actor.groupId));
	
	// Ensure actor has a name in their db row. We'll fallback to "An Admin" if not available in this minimal context
	const [actorRow] = await db.select({ name: users.name }).from(users).where(eq(users.id, actor.id));

	await sendGroupInviteEmail(email, group?.name || 'Your Workspace', actorRow?.name || 'An Admin');

	return invitedUser;
}

export async function removeUser(actor: Actor, targetUserId: string) {
	if (actor.role !== 'Admin') {
		throw new Error('Unauthorized: Only Admins can remove users.');
	}
	if (actor.id === targetUserId) {
		throw new Error('CannotDeleteSelf');
	}

	// Make sure they can only remove users from their OWN group
	await db.update(users)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(users.id, targetUserId),
				eq(users.groupId, actor.groupId)
			)
		);
}

export async function changeUserRole(actor: Actor, targetUserId: string, newRole: string) {
	if (actor.role !== 'Admin') {
		throw new Error('Unauthorized: Only Admins can change user roles.');
	}

	const VALID_ROLES = ['Admin', 'Manager', 'Member', 'Viewer'];
	if (!VALID_ROLES.includes(newRole)) {
		throw new Error('InvalidRoleSelection');
	}

	// Make sure they can only update users in their OWN group
	await db.update(users).set({ role: newRole }).where(
		and(
			eq(users.id, targetUserId),
			eq(users.groupId, actor.groupId)
		)
	);
}
