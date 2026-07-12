import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDashboardMetrics, getDashboardCharts } from '$lib/server/services/dashboards';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// We return the queries as unawaited promises to allow the page to render 
	// immediately and stream the heavy aggregations in via Svelte 5 snippets/await blocks.
	return {
		metricsPromise: getDashboardMetrics(locals.user),
		chartsPromise: getDashboardCharts(locals.user)
	};
};
