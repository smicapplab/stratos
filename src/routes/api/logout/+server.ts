import { redirect, json } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth/lucia';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (!locals.session) {
		return json({ success: true, message: 'Already logged out' }, { status: 200 });
	}

	await lucia.invalidateSession(locals.session.id);
	const sessionCookie = lucia.createBlankSessionCookie();
	cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '/',
		...sessionCookie.attributes
	});
	throw redirect(303, '/');
};
