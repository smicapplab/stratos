import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAccessibleProjects } from '$lib/server/services/projects';
import { getStandupReportData, getTodayDateString } from '$lib/server/services/standups';
import * as XLSX from 'xlsx';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const projectId = params.id;
	const accessible = await getAccessibleProjects(locals.user);
	const project = accessible.find((p) => p.id === projectId);

	if (!project) {
		throw error(404, 'Project not found or access denied');
	}

	const todayStr = getTodayDateString();
	const startDate = url.searchParams.get('startDate') || todayStr;
	const endDate = url.searchParams.get('endDate') || todayStr;

	const report = await getStandupReportData(locals.user, projectId, startDate, endDate);

	// Create a new XLSX workbook
	const wb = XLSX.utils.book_new();

	// Sheet 1: Executive Summary
	const summaryData = [
		['STRATOS DAILY STANDUP EXECUTIVE SUMMARY'],
		[],
		['Project Name:', project.name],
		['Report Period:', `${startDate} to ${endDate}`],
		['Generated At:', new Date().toISOString()],
		[],
		['SUMMARY METRICS'],
		['Completion Rate:', `${report.grid.stats.completionRate}%`],
		['Total Standups Submitted:', report.grid.stats.totalSubmitted],
		['Total Blockers Reported:', report.grid.stats.totalBlockers],
		['Total Team Members:', report.grid.members.length],
		[],
		['TEAM MEMBERS'],
		['Name', 'Email']
	];

	for (const m of report.grid.members) {
		summaryData.push([m.name, m.email]);
	}

	const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
	XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

	// Sheet 2: Detailed Standup Logs
	const logHeaders = [
		'Date',
		'Member Name',
		'Member Email',
		'Status',
		'Morning Focus & Intent',
		'Evening Accomplishments & Outcome',
		'Blockers & Dependencies',
		'Morning Logged At',
		'Evening Logged At'
	];

	const logData: any[][] = [logHeaders];

	for (const r of report.records) {
		logData.push([
			r.date,
			r.userName,
			r.userEmail,
			r.status,
			r.morningIntent || '',
			r.eveningOutcome || '',
			r.blockers || '',
			r.morningLoggedAt ? new Date(r.morningLoggedAt).toLocaleString() : '',
			r.eveningLoggedAt ? new Date(r.eveningLoggedAt).toLocaleString() : ''
		]);
	}

	const wsLogs = XLSX.utils.aoa_to_sheet(logData);

	// Set column widths for clean Excel layout
	wsLogs['!cols'] = [
		{ wch: 12 }, // Date
		{ wch: 22 }, // Name
		{ wch: 28 }, // Email
		{ wch: 18 }, // Status
		{ wch: 45 }, // Morning Focus
		{ wch: 45 }, // Evening Accomplishments
		{ wch: 35 }, // Blockers
		{ wch: 22 }, // Morning Logged At
		{ wch: 22 }  // Evening Logged At
	];

	XLSX.utils.book_append_sheet(wb, wsLogs, 'Detailed Check-in Logs');

	// Sheet 3: Ongoing Tasks Progress
	const taskHeaders = [
		'Task ID',
		'Task Title',
		'Assignee Name',
		'Assignee Email',
		'Stage / Status',
		'Estimate',
		'Latest Logged Progress %'
	];

	const taskData: any[][] = [taskHeaders];

	if (Array.isArray(report.ongoingTasks)) {
		for (const t of report.ongoingTasks) {
			taskData.push([
				t.taskIdDisplay,
				t.title,
				t.assigneeName,
				t.assigneeEmail,
				t.stageName,
				t.estimate,
				t.progress
			]);
		}
	}

	const wsTasks = XLSX.utils.aoa_to_sheet(taskData);
	wsTasks['!cols'] = [
		{ wch: 12 }, // Task ID
		{ wch: 40 }, // Task Title
		{ wch: 22 }, // Assignee Name
		{ wch: 28 }, // Assignee Email
		{ wch: 18 }, // Stage / Status
		{ wch: 14 }, // Estimate
		{ wch: 25 }  // Latest Logged Progress %
	];

	XLSX.utils.book_append_sheet(wb, wsTasks, 'Ongoing Tasks Progress');

	// Write buffer to native .xlsx format
	const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
	const filename = `Standup-Report-${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${startDate}-to-${endDate}.xlsx`;

	return new Response(excelBuffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
