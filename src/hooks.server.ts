import { lucia } from '$lib/server/auth/lucia';
import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { users, groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { validateApiToken } from '$lib/server/services/apiTokens';

const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

import { globalEventEmitter } from '$lib/server/services/events';
import { sendEmail } from '$lib/server/services/email';

// Handle background email dispatch for new comments
globalEventEmitter.on('comment:created', (data) => {
	const { followers, authorName, taskTitle, content } = data;
	
	followers.forEach(async (f: any) => {
		try {
			// Anti-spam: Only email if the user is explicitly @mentioned in the rich text
			const isMentioned = content.includes(`data-id="${f.user.id}"`);
			if (!isMentioned) return;

			await sendEmail({
				to: f.user.email,
				subject: `You were mentioned in a Task: ${taskTitle}`,
				html: `<p><b>${authorName}</b> mentioned you in a comment.</p><p>"${content}"</p>`
			});
		} catch (e) {
			console.error("Background email dispatch failed", e);
		}
	});
});

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize locals
	event.locals.apiToken = null;
	event.locals.user = null;
	event.locals.session = null;
	event.locals.group = null;

	const authHeader = event.request.headers.get('Authorization');

	// 1. Intercept Bearer Token Auth for REST Endpoints (/api/v1/*)
	if (event.url.pathname.startsWith('/api/v1/')) {
		if (authHeader && authHeader.startsWith('Bearer ')) {
			const token = authHeader.substring(7);
			const validation = await validateApiToken(token);

			if (validation.isValid && validation.user && validation.tokenId && validation.groupId) {
				// Rate Limiting Check
				const { checkRateLimits } = await import('$lib/server/rateLimiter');
				const rateCheck = await checkRateLimits(validation.tokenId, validation.groupId);
				if (!rateCheck.allowed) {
					return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
						status: 429,
						headers: {
							'Content-Type': 'application/json',
							'Retry-After': String(rateCheck.retryAfter || 60)
						}
					});
				}

				event.locals.user = validation.user;
				event.locals.apiToken = {
					tokenId: validation.tokenId,
					groupId: validation.groupId
				};

				const groupData = await db.select({
					id: groups.id,
					name: groups.name,
					logoUrl: groups.logoUrl,
					showWorkspaceName: groups.showWorkspaceName,
					defaultTheme: groups.defaultTheme
				}).from(groups).where(eq(groups.id, validation.user.groupId)).limit(1).then(res => res[0]);

				event.locals.group = groupData || null;

				// Bypass CSRF checks for Bearer-authenticated API calls by returning resolving directly
				// SvelteKit CSRF checking is bypassed here since we skip cookies.
				return resolve(event);
			} else {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		// API routes require bearer token. If missing, block immediately.
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// 2. Fallback to standard Session Cookie Auth for UI routes
	const sessionId = event.cookies.get(lucia.sessionCookieName);
	if (!sessionId) {
		return resolve(event);
	}

	const { session, user } = await lucia.validateSession(sessionId);
	if (user) {
		const [dbUser] = await db.select({ deletedAt: users.deletedAt })
			.from(users)
			.where(eq(users.id, user.id))
			.limit(1);

		if (!dbUser || dbUser.deletedAt) {
			await lucia.invalidateSession(sessionId);
			const sessionCookie = lucia.createBlankSessionCookie();
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '/',
				...sessionCookie.attributes
			});
			return resolve(event);
		}
	}

	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});
	}
	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});
	}
	
	event.locals.user = user;
	event.locals.session = session;
	
	if (user) {
		const groupData = await db.select({
			id: groups.id,
			name: groups.name,
			logoUrl: groups.logoUrl,
			showWorkspaceName: groups.showWorkspaceName,
			defaultTheme: groups.defaultTheme
		}).from(groups).where(eq(groups.id, user.groupId)).limit(1).then(res => res[0]);

		event.locals.group = groupData || null;
	}
	
	return resolve(event);
};

