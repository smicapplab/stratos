import { db } from '../db/db';
import { users, auditLogs } from '../db/schema';
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

import * as argon2 from 'argon2';
import crypto from 'node:crypto';

export function generateTempPassword(): string {
	const randomHex = crypto.randomBytes(3).toString('hex'); // 6 chars
	return `Str@${randomHex}!9`; // Complies with min 8, Upper, Lower, Number, Special
}

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
		groupId: users.groupId,
		deletedAt: users.deletedAt
	}).from(users).where(eq(users.email, email)).limit(1);

	let invitedUser;
	let isNewUser = false;
	let tempPassword: string | undefined;

	if (existingUser) {
		if (existingUser.groupId !== actor.groupId) {
			throw new Error('EmailBelongsToAnotherGroup');
		}
		if (existingUser.deletedAt === null) {
			invitedUser = existingUser;
		} else {
			// Safe same-group re-invite path
			const [updatedUser] = await db.update(users).set({
				deletedAt: null,
				name: 'Pending Invite',
				role: role
			}).where(eq(users.id, existingUser.id)).returning();
			invitedUser = updatedUser;
		}
	} else {
		isNewUser = true;
		tempPassword = generateTempPassword();
		const hashedTempPassword = await argon2.hash(tempPassword);

		const [newUser] = await db.insert(users).values({
			email,
			name: 'Pending Invite',
			groupId: actor.groupId,
			role,
			hashedPassword: hashedTempPassword,
			mustChangePassword: true,
		}).returning();
		invitedUser = newUser;
	}

	const [group] = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, actor.groupId));
	
	// Ensure actor has a name in their db row. We'll fallback to "An Admin" if not available in this minimal context
	const [actorRow] = await db.select({ name: users.name }).from(users).where(eq(users.id, actor.id));

	await db.insert(auditLogs).values({
		groupId: actor.groupId,
		userId: actor.id,
		actionType: 'user_invited',
		details: { email, role }
	});

	await sendGroupInviteEmail(email, group?.name || 'Your Workspace', actorRow?.name || 'An Admin', isNewUser, tempPassword);

	return invitedUser;
}

import { invalidateTokenCache } from './apiTokens';

export async function removeUser(actor: Actor, targetUserId: string) {
	if (actor.role !== 'Admin') {
		throw new Error('Unauthorized: Only Admins can remove users.');
	}
	if (actor.id === targetUserId) {
		throw new Error('CannotDeleteSelf');
	}

	const [targetUser] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, targetUserId));

	await db.update(users)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(users.id, targetUserId),
				eq(users.groupId, actor.groupId)
			)
		);

	await db.insert(auditLogs).values({
		groupId: actor.groupId,
		userId: actor.id,
		actionType: 'user_removed',
		details: { targetUserId, targetName: targetUser?.name || 'User', email: targetUser?.email }
	});

	await invalidateTokenCache(targetUserId);
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

	await invalidateTokenCache(targetUserId);
}
