import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGroupUsers } from '$lib/server/services/users';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const usersList = await getGroupUsers(user);
		return json(usersList);
	} catch (err: any) {
		console.error('Failed to get group users:', err);
		return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
	}
};
