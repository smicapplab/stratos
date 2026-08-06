import { validateSessionToken, setSessionTokenCookie, deleteSessionTokenCookie } from '$lib/server/auth/session';
import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { validateApiToken } from '$lib/server/services/apiTokens';

const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

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

				try {
					const groupData = await db.select({
						id: groups.id,
						name: groups.name,
						logoUrl: groups.logoUrl,
						showWorkspaceName: groups.showWorkspaceName,
						defaultTheme: groups.defaultTheme
					}).from(groups).where(eq(groups.id, validation.user.groupId)).limit(1).then(res => res[0]);

					event.locals.group = groupData || null;
				} catch (err) {
					event.locals.group = null;
				}

				// Bypass CSRF checks for Bearer-authenticated API calls by returning resolving directly
				// SvelteKit CSRF checking is bypassed here since we skip cookies.
				const response = await resolve(event);
				response.headers.set('X-Content-Type-Options', 'nosniff');
				response.headers.set('X-Frame-Options', 'DENY');
				response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
				response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
				response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
				response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none';");
				return response;
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
	const token = event.cookies.get('auth_session');
	if (token) {
		const { session, user } = await validateSessionToken(token);

		if (!session || !user) {
			deleteSessionTokenCookie(event);
		} else {
			if (session.fresh) {
				setSessionTokenCookie(event, token, session.expiresAt);
			}

			event.locals.user = user;
			event.locals.session = session;

			try {
				const groupData = await db.select({
					id: groups.id,
					name: groups.name,
					logoUrl: groups.logoUrl,
					showWorkspaceName: groups.showWorkspaceName,
					defaultTheme: groups.defaultTheme
				}).from(groups).where(eq(groups.id, user.groupId)).limit(1).then(res => res[0]);

				event.locals.group = groupData || null;
			} catch (err) {
				event.locals.group = null;
			}

			if (user.mustChangePassword) {
				const pathname = event.url.pathname;
				const isAllowed = pathname.startsWith('/settings/security') || 
					pathname.startsWith('/logout') || 
					pathname.startsWith('/api/');
					
				if (!isAllowed) {
					const { redirect } = await import('@sveltejs/kit');
					throw redirect(303, '/settings/security?forced=true');
				}
			}
		}
	}

	if (event.request.method !== 'GET' && event.url.pathname.startsWith('/api/') && !event.url.pathname.startsWith('/api/v1/')) {
		const origin = event.request.headers.get('origin');
		const host = event.request.headers.get('host');
		if (origin && host) {
			try {
				const originUrl = new URL(origin);
				if (originUrl.host !== host) {
					return new Response(JSON.stringify({ error: 'CSRF origin mismatch' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
				}
			} catch {
				return new Response(JSON.stringify({ error: 'Invalid origin header' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
			}
		}
	}

	const response = await resolve(event);
	
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none';");

	return response;
};

