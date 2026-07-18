import { json } from '@sveltejs/kit';
import { getBoardReports } from '$lib/server/services/dashboards';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const actor = locals.user;
	if (!actor) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (actor.role !== 'Admin' && actor.role !== 'Manager') {
		return json({ error: 'Forbidden: Only Admins and Managers have access to reports.' }, { status: 403 });
	}

	const boardId = params.id;
	if (!boardId) {
		return json({ error: 'Board ID is required' }, { status: 400 });
	}

	const startParam = url.searchParams.get('start');
	const endParam = url.searchParams.get('end');

	if (!startParam || !endParam) {
		return json({ error: 'Missing start or end date parameter' }, { status: 400 });
	}

	const startDate = new Date(startParam);
	const endDate = new Date(endParam);

	if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
		return json({ error: 'Invalid date parameters' }, { status: 400 });
	}

	try {
		const reports = await getBoardReports(actor, boardId, startDate, endDate);
		return json(reports);
	} catch (err) {
		const error = err as Error;
		if (error.message === 'Board not found') {
			return json({ error: 'Board not found' }, { status: 404 });
		} else if (error.message === 'Unauthorized') {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		// Avoid leaking internal database or query errors in production HTTP 500 response
		console.error('[Reports API] Error fetching reports:', error);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};
