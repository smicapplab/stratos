import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAccessibleProjects } from '$lib/server/services/projects';

export const GET: RequestHandler = async ({ locals }) => {
	// Locals are populated by hooks.server.ts
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const projectsList = await getAccessibleProjects(user);
		return json(projectsList);
	} catch (err: any) {
		console.error('Failed to get projects:', err);
		return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
	}
};
