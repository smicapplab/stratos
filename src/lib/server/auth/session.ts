import { db } from '../db/db';
import { sessions, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { dev } from '$app/environment';
import crypto from 'node:crypto';

export interface SessionUser {
	id: string;
	email: string;
	name: string;
	role: 'Admin' | 'Manager' | 'Member' | 'Viewer';
	groupId: string;
	jobTitle: string | null;
	avatarUrl: string | null;
	theme: string;
}

const VALID_ROLES = new Set<SessionUser['role']>(['Admin', 'Manager', 'Member', 'Viewer']);

export function toValidRole(role: string | null | undefined): SessionUser['role'] {
	if (role && VALID_ROLES.has(role as SessionUser['role'])) {
		return role as SessionUser['role'];
	}
	return 'Member';
}

export interface Session {
	id: string;
	userId: string;
	expiresAt: Date;
	userAgent: string | null;
	ipAddress: string | null;
	fresh?: boolean;
}

const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

export function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	let result = '';
	let buffer = 0;
	let bits = 0;
	for (let i = 0; i < bytes.length; i++) {
		buffer = (buffer << 8) | bytes[i];
		bits += 8;
		while (bits >= 5) {
			bits -= 5;
			const index = (buffer >> bits) & 0x1f;
			result += BASE32_ALPHABET[index];
		}
	}
	return result;
}

export function hashToken(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(
	token: string,
	userId: string,
	metadata?: { userAgent?: string | null; ipAddress?: string | null }
): Promise<Session> {
	const sessionId = hashToken(token);
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

	const newSession: Session = {
		id: sessionId,
		userId,
		expiresAt,
		userAgent: metadata?.userAgent || null,
		ipAddress: metadata?.ipAddress || null,
		fresh: true
	};

	await db.insert(sessions).values({
		id: newSession.id,
		userId: newSession.userId,
		userAgent: newSession.userAgent,
		ipAddress: newSession.ipAddress,
		expiresAt: newSession.expiresAt
	});

	return newSession;
}

export async function validateSessionToken(
	token: string
): Promise<{ session: Session | null; user: SessionUser | null }> {
	const sessionId = hashToken(token);

	const result = await db
		.select({
			session: sessions,
			user: {
				id: users.id,
				email: users.email,
				name: users.name,
				role: users.role,
				groupId: users.groupId,
				jobTitle: users.jobTitle,
				avatarUrl: users.avatarUrl,
				theme: users.theme,
				deletedAt: users.deletedAt
			}
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, sessionId))
		.limit(1);

	if (result.length === 0) {
		return { session: null, user: null };
	}

	const { session: dbSession, user: dbUser } = result[0];

	if (dbUser.deletedAt !== null) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		return { session: null, user: null };
	}

	const now = Date.now();
	if (now >= dbSession.expiresAt.getTime()) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		return { session: null, user: null };
	}

	// Sliding renewal window: extend if under 15 days remaining
	let fresh = false;
	const fifteenDaysMs = 1000 * 60 * 60 * 24 * 15;
	if (dbSession.expiresAt.getTime() - now < fifteenDaysMs) {
		dbSession.expiresAt = new Date(now + 1000 * 60 * 60 * 24 * 30);
		await db
			.update(sessions)
			.set({ expiresAt: dbSession.expiresAt })
			.where(eq(sessions.id, dbSession.id));
		fresh = true;
	}

	const user: SessionUser = {
		id: dbUser.id,
		email: dbUser.email,
		name: dbUser.name,
		role: toValidRole(dbUser.role),
		groupId: dbUser.groupId,
		jobTitle: dbUser.jobTitle,
		avatarUrl: dbUser.avatarUrl,
		theme: dbUser.theme
	};

	const session: Session = {
		id: dbSession.id,
		userId: dbSession.userId,
		expiresAt: dbSession.expiresAt,
		userAgent: dbSession.userAgent,
		ipAddress: dbSession.ipAddress,
		fresh
	};

	return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export function setSessionTokenCookie(
	eventOrCookies: { cookies: { set: (name: string, value: string, opts?: any) => void } } | { set: (name: string, value: string, opts?: any) => void },
	token: string,
	expiresAt: Date
): void {
	const cookies = 'cookies' in eventOrCookies ? eventOrCookies.cookies : eventOrCookies;
	cookies.set('auth_session', token, {
		httpOnly: true,
		sameSite: 'lax',
		expires: expiresAt,
		path: '/',
		secure: !dev
	});
}

export function deleteSessionTokenCookie(
	eventOrCookies: { cookies: { set: (name: string, value: string, opts?: any) => void } } | { set: (name: string, value: string, opts?: any) => void }
): void {
	const cookies = 'cookies' in eventOrCookies ? eventOrCookies.cookies : eventOrCookies;
	cookies.set('auth_session', '', {
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 0,
		path: '/',
		secure: !dev
	});
}
