import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { lucia } from '$lib/server/auth/lucia';

import type { PageServerLoad, Actions } from './$types';

// Simple in-memory rate limiter for login attempts (per-IP, sliding window)
const LOGIN_WINDOW_MS = 60_000; // 60 seconds
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const entry = loginAttempts.get(ip);
	if (!entry || now - entry.firstAttempt > LOGIN_WINDOW_MS) {
		loginAttempts.set(ip, { count: 1, firstAttempt: now });
		return true;
	}
	entry.count++;
	return entry.count <= LOGIN_MAX_ATTEMPTS;
}

// Periodic cleanup to prevent unbounded memory growth
setInterval(() => {
	const now = Date.now();
	for (const [ip, entry] of loginAttempts) {
		if (now - entry.firstAttempt > LOGIN_WINDOW_MS) {
			loginAttempts.delete(ip);
		}
	}
}, LOGIN_WINDOW_MS);

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.session) {
		throw redirect(302, '/admin/users'); // Redirect to dashboard if logged in
	}
	return {};
}

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const clientIp = getClientAddress();
		if (!checkRateLimit(clientIp)) {
			return fail(429, { error: 'Too many login attempts. Please try again later.' });
		}

		const data = await request.formData();
		const email = data.get('email')?.toString();
		const password = data.get('password')?.toString();

		if (!email || !password) {
			return fail(400, { error: 'Invalid email or password' });
		}

		// Look up user
		const [user] = await db.select({
			id: users.id,
			hashedPassword: users.hashedPassword
		}).from(users).where(eq(users.email, email));
		if (!user || !user.hashedPassword) {
			// Do not leak if user exists or not, standard security practice
			return fail(400, { error: 'Invalid email or password' });
		}

		// Verify password
		const validPassword = await argon2.verify(user.hashedPassword, password);
		if (!validPassword) {
			return fail(400, { error: 'Invalid email or password' });
		}

		const userAgent = request.headers.get('user-agent') || null;
		
		// Create Lucia session
		const session = await lucia.createSession(user.id, {
			userAgent,
			ipAddress: clientIp
		});
		const sessionCookie = lucia.createSessionCookie(session.id);
		
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});

		throw redirect(302, '/admin/users');
	}
};
