import { db } from '../db/db';
import { apiTokens, users } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { redis } from '../redis';
import type { Actor } from './users';

export interface TokenValidationResult {
	isValid: boolean;
	user: import('lucia').User | null;
	tokenId: string | null;
	groupId: string | null;
}

/**
 * Generates a cryptographically secure API token and its hash.
 * Returns the plaintext token (only shown once to the user) and the hashed representation to store.
 */
export function generateTokenPair(): { token: string; hash: string } {
	const bytes = randomBytes(32);
	const token = 'stratos_tok_' + bytes.toString('base64url');
	const hash = hashToken(token);
	return { token, hash };
}

/**
 * Hashes a token using SHA-256.
 */
export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

/**
 * Validates a Bearer token, leveraging Redis cache with db fallback.
 */
export async function validateApiToken(token: string): Promise<TokenValidationResult> {
	try {
		const hash = hashToken(token);
		const cacheKey = `apitoken:${hash}`;

		// 1. Check Redis Cache
		const cached = await redis.get(cacheKey);
		if (cached) {
			const parsed = JSON.parse(cached);
			return {
				isValid: true,
				user: parsed.user,
				tokenId: parsed.tokenId,
				groupId: parsed.groupId
			};
		}

		// 2. Query Postgres joined with active users
		const [result] = await db.select({
			tokenId: apiTokens.id,
			groupId: apiTokens.groupId,
			userId: apiTokens.userId,
			userName: users.name,
			userEmail: users.email,
			userRole: users.role,
			userJobTitle: users.jobTitle,
			userAvatarUrl: users.avatarUrl,
			userTheme: users.theme
		})
		.from(apiTokens)
		.innerJoin(users, eq(apiTokens.userId, users.id))
		.where(
			and(
				eq(apiTokens.tokenHash, hash),
				isNull(users.deletedAt)
			)
		)
		.limit(1);

		if (!result) {
			return { isValid: false, user: null, tokenId: null, groupId: null };
		}

		const user: import('lucia').User = {
			id: result.userId,
			name: result.userName,
			email: result.userEmail,
			groupId: result.groupId,
			role: result.userRole as 'Admin' | 'Manager' | 'Member' | 'Viewer',
			jobTitle: result.userJobTitle,
			avatarUrl: result.userAvatarUrl,
			theme: result.userTheme
		};

		const validationData = {
			user,
			tokenId: result.tokenId,
			groupId: result.groupId
		};

		// 3. Cache in Redis for 5 minutes (300s)
		await redis.set(cacheKey, JSON.stringify(validationData), 'EX', 300);

		// Update lastUsedAt in background
		db.update(apiTokens)
			.set({ lastUsedAt: new Date() })
			.where(eq(apiTokens.id, result.tokenId))
			.catch(err => console.error('Failed to update token lastUsedAt:', err));

		return {
			isValid: true,
			user,
			tokenId: result.tokenId,
			groupId: result.groupId
		};
	} catch (err) {
		console.error('Error validating API token:', err);
		return { isValid: false, user: null, tokenId: null, groupId: null };
	}
}

/**
 * Creates a new API token for a user.
 */
export async function createApiToken(actor: Actor, name: string): Promise<{ id: string; token: string }> {
	if (actor.role !== 'Admin' && actor.role !== 'Manager') {
		throw new Error('Unauthorized: Only Admins and Managers can create API tokens.');
	}

	const { token, hash } = generateTokenPair();

	const [newToken] = await db.insert(apiTokens).values({
		name,
		tokenHash: hash,
		groupId: actor.groupId,
		userId: actor.id
	}).returning();

	return {
		id: newToken.id,
		token
	};
}

/**
 * Lists API tokens in the group, enforcing role access rules.
 * Admins see all, Managers see only their own.
 */
export async function listApiTokens(actor: Actor) {
	if (actor.role !== 'Admin' && actor.role !== 'Manager') {
		throw new Error('Unauthorized: Only Admins and Managers can view API tokens.');
	}

	// innerJoin on users already excludes tokens where the user row doesn't exist;
	// the isNull filter additionally excludes soft-deleted user accounts.
	const baseQuery = db.select({
		id: apiTokens.id,
		name: apiTokens.name,
		userId: apiTokens.userId,
		userName: users.name,
		createdAt: apiTokens.createdAt,
		lastUsedAt: apiTokens.lastUsedAt
	})
	.from(apiTokens)
	.innerJoin(users, and(eq(apiTokens.userId, users.id), isNull(users.deletedAt)));

	if (actor.role === 'Admin') {
		return await baseQuery.where(eq(apiTokens.groupId, actor.groupId));
	}

	// Managers only see their own
	return await baseQuery.where(
		and(
			eq(apiTokens.groupId, actor.groupId),
			eq(apiTokens.userId, actor.id)
		)
	);
}

/**
 * Revokes a token by deleting it from the DB and removing it from the Redis cache immediately.
 */
export async function revokeApiToken(actor: Actor, tokenId: string): Promise<void> {
	if (actor.role !== 'Admin' && actor.role !== 'Manager') {
		throw new Error('Unauthorized: Only Admins and Managers can revoke API tokens.');
	}

	// Verify existence and fetch hash for cache clearing
	const [token] = await db.select({
		id: apiTokens.id,
		tokenHash: apiTokens.tokenHash,
		userId: apiTokens.userId
	})
	.from(apiTokens)
	.where(
		and(
			eq(apiTokens.id, tokenId),
			eq(apiTokens.groupId, actor.groupId)
		)
	)
	.limit(1);

	if (!token) {
		throw new Error('Token not found');
	}

	// Enforce manager check (Managers can only delete their own)
	if (actor.role === 'Manager' && token.userId !== actor.id) {
		throw new Error('Unauthorized: Managers can only revoke their own tokens.');
	}

	// Delete from Postgres and Redis synchronously
	await db.delete(apiTokens).where(eq(apiTokens.id, tokenId));
	
	const cacheKey = `apitoken:${token.tokenHash}`;
	await redis.del(cacheKey);
}
