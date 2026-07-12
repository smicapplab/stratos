import { db } from '../db/db';
import { users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export interface Actor {
	id: string;
	role: string;
	groupId: string;
}

export async function getGroupUsers(actor: Actor) {
	return await db.select({
		id: users.id,
		name: users.name,
		email: users.email,
		role: users.role,
		createdAt: users.createdAt,
	}).from(users).where(eq(users.groupId, actor.groupId));
}

import { sendGroupInviteEmail } from './email';
import { groups } from '../db/schema';

export async function inviteUser(actor: Actor, email: string, role: string) {
	if (actor.role !== 'Admin') {
		throw new Error('Unauthorized: Only Admins can invite users.');
	}

	const [newUser] = await db.insert(users).values({
		email,
		name: 'Pending Invite', // Placeholder until they set up
		groupId: actor.groupId,
		role,
	}).returning();

	const [group] = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, actor.groupId));
	
	// Ensure actor has a name in their db row. We'll fallback to "An Admin" if not available in this minimal context
	const [actorRow] = await db.select({ name: users.name }).from(users).where(eq(users.id, actor.id));

	await sendGroupInviteEmail(email, group?.name || 'Your Workspace', actorRow?.name || 'An Admin');

	return newUser;
}

export async function removeUser(actor: Actor, targetUserId: string) {
	if (actor.role !== 'Admin') {
		throw new Error('Unauthorized: Only Admins can remove users.');
	}

	// Make sure they can only remove users from their OWN group
	await db.delete(users).where(
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

	// Make sure they can only update users in their OWN group
	await db.update(users).set({ role: newRole }).where(
		and(
			eq(users.id, targetUserId),
			eq(users.groupId, actor.groupId)
		)
	);
}
