import { error, redirect, fail } from '@sveltejs/kit';
import { getAccessibleProjects } from '$lib/server/services/projects';
import {
	getTodayStandup,
	getProjectStandupGrid,
	getTaskSuggestionsForUser,
	upsertStandup,
	getTodayDateString,
	generateDateRangeStrings
} from '$lib/server/services/standups';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	if (!locals.user) throw redirect(302, '/');
	const projectId = params.id;

	const accessible = await getAccessibleProjects(locals.user);
	const project = accessible.find((p) => p.id === projectId);

	if (!project) {
		throw error(404, 'Project not found or access denied');
	}

	if (!project.enableStandups) {
		return {
			project,
			enabled: false,
			todayStandup: null,
			grid: { members: [], standupsMap: {}, stats: { totalSubmitted: 0, completionRate: 0, totalBlockers: 0 } },
			taskSuggestions: { inProgressTasks: [], completedTasks: [] },
			dateStrings: [],
			startDate: '',
			endDate: '',
			preset: 'this_week'
		};
	}

	const todayStr = getTodayDateString();
	const preset = url.searchParams.get('preset') || 'this_week';
	let startDate = url.searchParams.get('startDate') || '';
	let endDate = url.searchParams.get('endDate') || '';

	const now = new Date();

	if (!startDate || !endDate) {
		if (preset === 'this_month') {
			const yyyy = now.getFullYear();
			const mm = String(now.getMonth() + 1).padStart(2, '0');
			startDate = `${yyyy}-${mm}-01`;
			const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();
			endDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
		} else if (preset === 'last_month') {
			const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			const yyyy = prev.getFullYear();
			const mm = String(prev.getMonth() + 1).padStart(2, '0');
			startDate = `${yyyy}-${mm}-01`;
			const lastDay = new Date(yyyy, prev.getMonth() + 1, 0).getDate();
			endDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
		} else if (preset === 'last_30_days') {
			const past = new Date(now);
			past.setDate(now.getDate() - 30);
			startDate = past.toISOString().slice(0, 10);
			endDate = now.toISOString().slice(0, 10);
		} else {
			// Default to current week (Mon-Fri)
			const dayOfWeek = now.getDay();
			const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			const monday = new Date(now);
			monday.setDate(now.getDate() + distanceToMon);
			const friday = new Date(monday);
			friday.setDate(monday.getDate() + 4);

			startDate = monday.toISOString().slice(0, 10);
			endDate = friday.toISOString().slice(0, 10);
		}
	}

	const dateStrings = generateDateRangeStrings(startDate, endDate);

	const [todayStandup, grid, taskSuggestions] = await Promise.all([
		getTodayStandup(locals.user, projectId, todayStr),
		getProjectStandupGrid(locals.user, projectId, dateStrings),
		getTaskSuggestionsForUser(locals.user, projectId)
	]);

	return {
		project,
		enabled: true,
		todayStandup,
		grid,
		taskSuggestions,
		dateStrings,
		startDate,
		endDate,
		preset,
		currentUser: locals.user
	};
};

export const actions: Actions = {
	saveStandup: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const morningIntent = data.get('morningIntent')?.toString();
		const eveningOutcome = data.get('eveningOutcome')?.toString();
		const blockers = data.get('blockers')?.toString();
		const dateStr = data.get('dateStr')?.toString();

		try {
			const updated = await upsertStandup(locals.user, params.id, {
				dateStr,
				morningIntent,
				eveningOutcome,
				blockers
			});
			return { success: true, standup: updated };
		} catch (err) {
			const errorObj = err as Error;
			return fail(400, { error: errorObj.message });
		}
	}
};
