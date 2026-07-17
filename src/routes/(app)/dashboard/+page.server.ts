import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDashboardMetrics, getDashboardCharts, getDashboardWidgets } from '$lib/server/services/dashboards';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	let startDate: Date;
	let endDate: Date = new Date();

	const range = url.searchParams.get('range') || '1w';

	if (range === '1w') {
		startDate = new Date();
		startDate.setDate(endDate.getDate() - 7);
	} else if (range === '30d') {
		startDate = new Date();
		startDate.setDate(endDate.getDate() - 30);
	} else if (range === '60d') {
		startDate = new Date();
		startDate.setDate(endDate.getDate() - 60);
	} else if (range === 'custom') {
		const startParam = url.searchParams.get('start');
		const endParam = url.searchParams.get('end');
		
		// Validate YYYY-MM-DD pattern
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (!startParam || !endParam || !dateRegex.test(startParam) || !dateRegex.test(endParam)) {
			// Fallback to default 1w
			startDate = new Date();
			startDate.setDate(endDate.getDate() - 7);
		} else {
			startDate = new Date(startParam);
			endDate = new Date(endParam);
			
			// Prevent negative ranges
			if (startDate > endDate) {
				const temp = startDate;
				startDate = endDate;
				endDate = temp;
			}
			
			// Cap at 365 days range
			const diffDays = Math.ceil(Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
			if (diffDays > 365) {
				startDate = new Date(endDate);
				startDate.setDate(endDate.getDate() - 365);
			}
		}
	} else {
		// Fallback for invalid preset string
		startDate = new Date();
		startDate.setDate(endDate.getDate() - 7);
	}

	return {
		metricsPromise: getDashboardMetrics(locals.user),
		chartsPromise: getDashboardCharts(locals.user, undefined, startDate, endDate),
		widgetsPromise: getDashboardWidgets(locals.user),
		selectedRange: range,
		selectedStart: startDate.toISOString().split('T')[0],
		selectedEnd: endDate.toISOString().split('T')[0]
	};
};
