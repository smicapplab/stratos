<script lang="ts">
	import { onDestroy } from 'svelte';
	import { exportToExcel } from '$lib/utils/exportExcel';
	import { FileSpreadsheet, AlertTriangle, Clock, RefreshCcw, CheckCircle, BarChart3, ChevronUp, ChevronDown } from 'lucide-svelte';

	let { boardId, onTaskClick } = $props<{
		boardId: string;
		onTaskClick: (task: any) => void;
	}>();

	let rangeType = $state<'7d' | '30d' | '60d' | 'custom'>('30d');
	let customStart = $state('');
	let customEnd = $state('');
	let loading = $state(true);
	let error = $state<string | null>(null);
	let reportsData = $state<any>(null);

	// Get calculated dates based on rangeType
	let dateRange = $derived.by(() => {
		const end = new Date();
		let start = new Date();
		if (rangeType === '7d') {
			start.setDate(end.getDate() - 7);
		} else if (rangeType === '30d') {
			start.setDate(end.getDate() - 30);
		} else if (rangeType === '60d') {
			start.setDate(end.getDate() - 60);
		} else if (rangeType === 'custom') {
			const s = customStart ? new Date(customStart) : new Date(Date.now() - 30 * 86400000);
			const e = customEnd ? new Date(customEnd) : new Date();
			s.setHours(0, 0, 0, 0);
			e.setHours(23, 59, 59, 999);
			return { start: s, end: e };
		}
		start.setHours(0, 0, 0, 0);
		end.setHours(23, 59, 59, 999);
		return { start, end };
	});

	// Dynamic Chart references and instances
	let canvasAssignee = $state<HTMLCanvasElement>();
	let canvasStage = $state<HTMLCanvasElement>();
	let canvasPriority = $state<HTMLCanvasElement>();

	let chartAssigneeInstance: any = null;
	let chartStageInstance: any = null;
	let chartPriorityInstance: any = null;

	function destroyCharts() {
		if (chartAssigneeInstance) {
			chartAssigneeInstance.destroy();
			chartAssigneeInstance = null;
		}
		if (chartStageInstance) {
			chartStageInstance.destroy();
			chartStageInstance = null;
		}
		if (chartPriorityInstance) {
			chartPriorityInstance.destroy();
			chartPriorityInstance = null;
		}
	}

	async function fetchReports() {
		loading = true;
		error = null;
		destroyCharts();

		try {
			const startStr = dateRange.start.toISOString();
			const endStr = dateRange.end.toISOString();
			const res = await fetch(`/api/boards/${boardId}/reports?start=${startStr}&end=${endStr}`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || 'Failed to load reports');
			}
			reportsData = await res.json();
			
			// Initialize charts after data loads and DOM updates
			setTimeout(initCharts, 50);
		} catch (err: any) {
			error = err.message || 'An unexpected error occurred';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function initCharts() {
		if (!reportsData) return;

		try {
			const { Chart, registerables } = await import('chart.js');
			Chart.register(...registerables);

			const isDark = document.documentElement.classList.contains('dark');
			const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
			const textColor = isDark ? '#a1a1aa' : '#71717a';

			// Chart 1: Assignee Velocity
			if (canvasAssignee && reportsData.velocity) {
				const labels = reportsData.velocity.map((v: any) => v.assigneeName || 'Unassigned');
				const currentData = reportsData.velocity.map((v: any) => v.currentCount);
				const priorData = reportsData.velocity.map((v: any) => v.priorCount);

				chartAssigneeInstance = new Chart(canvasAssignee, {
					type: 'bar',
					data: {
						labels,
						datasets: [
							{
								label: 'Current Period',
								data: currentData,
								backgroundColor: 'rgba(59, 130, 246, 0.85)',
								borderRadius: 6
							},
							{
								label: 'Prior Period',
								data: priorData,
								backgroundColor: 'rgba(156, 163, 175, 0.35)',
								borderRadius: 6
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: {
								labels: { color: textColor, font: { family: 'Outfit, sans-serif', size: 11 } }
							}
						},
						scales: {
							x: {
								grid: { display: false },
								ticks: { color: textColor, font: { family: 'Outfit, sans-serif' } }
							},
							y: {
								grid: { color: gridColor },
								ticks: { color: textColor, stepSize: 1, font: { family: 'Outfit, sans-serif' } }
							}
						}
					}
				});
			}

			// Chart 2: Stage Bottlenecks
			if (canvasStage && reportsData.bottlenecks) {
				const labels = reportsData.bottlenecks.map((b: any) => b.stageName);
				const counts = reportsData.bottlenecks.map((b: any) => b.count);

				chartStageInstance = new Chart(canvasStage, {
					type: 'doughnut',
					data: {
						labels,
						datasets: [{
							data: counts,
							backgroundColor: [
								'rgba(59, 130, 246, 0.8)',
								'rgba(168, 85, 247, 0.8)',
								'rgba(236, 72, 153, 0.8)',
								'rgba(249, 115, 22, 0.8)',
								'rgba(16, 185, 129, 0.8)'
							],
							borderWidth: isDark ? 2 : 1,
							borderColor: isDark ? '#18181b' : '#ffffff'
						}]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: {
								position: 'bottom',
								labels: { color: textColor, font: { family: 'Outfit, sans-serif', size: 10 } }
							}
						}
					}
				});
			}

			// Chart 3: Cycle Time by Priority
			if (canvasPriority && reportsData.cycleTime?.priorityAverages) {
				const priorities = ['Low', 'Medium', 'High', 'Urgent'];
				const averages = priorities.map(p => reportsData.cycleTime.priorityAverages[p] || 0);

				chartPriorityInstance = new Chart(canvasPriority, {
					type: 'bar',
					data: {
						labels: priorities,
						datasets: [{
							label: 'Avg Cycle Time (Days)',
							data: averages,
							backgroundColor: [
								'rgba(16, 185, 129, 0.75)',
								'rgba(59, 130, 246, 0.75)',
								'rgba(249, 115, 22, 0.75)',
								'rgba(239, 68, 68, 0.75)'
							],
							borderRadius: 6
						}]
					},
					options: {
						indexAxis: 'y',
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: { display: false }
						},
						scales: {
							x: {
								grid: { color: gridColor },
								ticks: { color: textColor, font: { family: 'Outfit, sans-serif' } },
								title: { display: true, text: 'Days', color: textColor, font: { family: 'Outfit, sans-serif' } }
							},
							y: {
								grid: { display: false },
								ticks: { color: textColor, font: { family: 'Outfit, sans-serif' } }
							}
						}
					}
				});
			}
		} catch (err) {
			console.error('Failed to initialize Chart.js dynamically:', err);
		}
	}

	// Trigger refetch when dates update
	$effect(() => {
		if (dateRange.start && dateRange.end) {
			fetchReports();
		}
	});

	onDestroy(() => {
		destroyCharts();
	});

	// Excel Export wrappers
	async function exportReopens() {
		if (!reportsData?.reopenedTasks) return;
		const rows = reportsData.reopenedTasks.map((t: any) => ({
			'Task #': t.taskNumber,
			'Title': t.taskTitle,
			'Reopened By': t.reopenedBy,
			'From Stage': t.oldStageName,
			'To Stage': t.newStageName,
			'Date': new Date(t.reopenedAt).toLocaleString()
		}));
		await exportToExcel(`board-reopens-${boardId}.xlsx`, rows);
	}

	async function exportRisks() {
		if (!reportsData?.risks) return;
		const rows: any[] = [];
		reportsData.risks.overdue.forEach((t: any) => {
			rows.push({
				'Task #': t.number,
				'Title': t.title,
				'Risk Type': 'Overdue',
				'Due/Last Active Date': t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A',
				'Assignee': t.assigneeName || 'Unassigned'
			});
		});
		reportsData.risks.stale.forEach((t: any) => {
			rows.push({
				'Task #': t.number,
				'Title': t.title,
				'Risk Type': 'Stale',
				'Due/Last Active Date': new Date(t.updatedAt).toLocaleDateString(),
				'Assignee': t.assigneeName || 'Unassigned'
			});
		});
		await exportToExcel(`board-risks-${boardId}.xlsx`, rows);
	}

	const totalCompleted = $derived(
		reportsData?.velocity?.reduce((acc: number, v: any) => acc + v.currentCount, 0) || 0
	);

	const totalPriorCompleted = $derived(
		reportsData?.velocity?.reduce((acc: number, v: any) => acc + v.priorCount, 0) || 0
	);

	const velocityDelta = $derived(totalCompleted - totalPriorCompleted);
</script>

<div class="p-8 max-w-7xl mx-auto space-y-8 pb-20">
	<!-- Control Panel -->
	<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 rounded-2xl border border-zinc-200/50 dark:border-white/5 shadow-sm">
		<div>
			<h2 class="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
				<BarChart3 class="w-5 h-5 text-blue-500" />
				Manager Dashboard Reports
			</h2>
			<p class="text-xs text-zinc-500 mt-0.5">Scoping metrics for active Kanban board cycles</p>
		</div>

		<div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
			<div class="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-lg border border-zinc-200/50 dark:border-white/5">
				<button class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all {rangeType === '7d' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}" onclick={() => rangeType = '7d'}>7 Days</button>
				<button class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all {rangeType === '30d' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}" onclick={() => rangeType = '30d'}>30 Days</button>
				<button class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all {rangeType === '60d' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}" onclick={() => rangeType = '60d'}>60 Days</button>
				<button class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all {rangeType === 'custom' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}" onclick={() => rangeType = 'custom'}>Custom</button>
			</div>

			{#if rangeType === 'custom'}
				<div class="flex items-center gap-2">
					<input type="date" bind:value={customStart} class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
					<span class="text-zinc-400 text-xs">to</span>
					<input type="date" bind:value={customEnd} class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
				</div>
			{/if}
		</div>
	</div>

	<!-- Loading & Error States -->
	{#if loading}
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			{#each Array(3) as _}
				<div class="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 h-28 rounded-2xl animate-pulse p-6 space-y-3">
					<div class="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3"></div>
					<div class="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3"></div>
				</div>
			{/each}
		</div>
		<div class="h-96 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 rounded-2xl animate-pulse flex items-center justify-center">
			<span class="text-sm text-zinc-400">Loading metrics and graph assets...</span>
		</div>
	{:else if error}
		<div class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-8 rounded-2xl text-center max-w-lg mx-auto space-y-4">
			<AlertTriangle class="w-12 h-12 text-red-500 mx-auto" />
			<div>
				<h3 class="font-bold text-red-900 dark:text-red-400 text-base">Failed to fetch report metrics</h3>
				<p class="text-xs text-red-700 dark:text-red-500 mt-1">{error}</p>
			</div>
			<button onclick={fetchReports} class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-md">
				Retry
			</button>
		</div>
	{:else if reportsData}
		<!-- KPI Row -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- KPI 1: Velocity -->
			<div class="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
				<div class="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.06] group-hover:scale-110 transition-transform">
					<CheckCircle class="w-28 h-28 text-blue-500" />
				</div>
				<div class="flex items-center gap-2">
					<div class="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
						<CheckCircle class="w-4 h-4" />
					</div>
					<span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total Completed</span>
				</div>
				<div class="mt-4 flex items-baseline gap-3">
					<span class="text-3xl font-extrabold dark:text-white">{totalCompleted}</span>
					<span class="text-xs font-bold flex items-center px-1.5 py-0.5 rounded {velocityDelta >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-500' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-500'}">
						{#if velocityDelta >= 0}
							<ChevronUp class="w-3.5 h-3.5 mr-0.5" />
							+{velocityDelta}
						{:else}
							<ChevronDown class="w-3.5 h-3.5 mr-0.5" />
							{velocityDelta}
						{/if}
						vs prior period
					</span>
				</div>
			</div>

			<!-- KPI 2: Cycle Time -->
			<div class="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
				<div class="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.06] group-hover:scale-110 transition-transform">
					<Clock class="w-28 h-28 text-purple-500" />
				</div>
				<div class="flex items-center gap-2">
					<div class="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
						<Clock class="w-4 h-4" />
					</div>
					<span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Avg Cycle Time</span>
				</div>
				<div class="mt-4 flex items-baseline gap-2">
					<span class="text-3xl font-extrabold dark:text-white">
						{reportsData.cycleTime?.globalAverageDays?.toFixed(1) || '0.0'}
					</span>
					<span class="text-xs font-semibold text-zinc-400">days per task</span>
				</div>
			</div>

			<!-- KPI 3: Reopens -->
			<div class="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group border-l-4 border-l-{reportsData.reopenedRateColor === 'green' ? 'emerald-500' : reportsData.reopenedRateColor === 'amber' ? 'amber-500' : 'rose-500'}">
				<div class="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.06] group-hover:scale-110 transition-transform">
					<RefreshCcw class="w-28 h-28 text-orange-500" />
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg">
							<RefreshCcw class="w-4 h-4" />
						</div>
						<span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Quality Reopen Rate</span>
					</div>
					<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider {reportsData.reopenedRateColor === 'green' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600' : reportsData.reopenedRateColor === 'amber' ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600'}">
						{reportsData.reopenedRateColor === 'green' ? 'Healthy' : reportsData.reopenedRateColor === 'amber' ? 'Attention' : 'Crisis'}
					</span>
				</div>
				<div class="mt-4 flex items-baseline gap-2">
					<span class="text-3xl font-extrabold dark:text-white">
						{reportsData.reopenedRate?.toFixed(1) || '0.0'}%
					</span>
					<span class="text-xs font-semibold text-zinc-400">reopen incidence</span>
				</div>
			</div>
		</div>

		<!-- Charts Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Chart 1: Assignee Velocity -->
			<div class="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-[340px]">
				<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center justify-between">
					Task Completion Velocity
					<span class="text-[10px] font-semibold text-zinc-400 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded">Assignee Compare</span>
				</h3>
				<div class="flex-1 mt-4 relative">
					<canvas bind:this={canvasAssignee}></canvas>
				</div>
			</div>

			<!-- Chart 2: Bottlenecks -->
			<div class="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-[340px]">
				<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center justify-between">
					Active Stage Distribution
					<span class="text-[10px] font-semibold text-zinc-400 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded">Bottlenecks</span>
				</h3>
				<div class="flex-1 mt-4 relative">
					<canvas bind:this={canvasStage}></canvas>
				</div>
			</div>

			<!-- Chart 3: Cycle Time by Priority -->
			<div class="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-[340px]">
				<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center justify-between">
					Cycle Time by Priority
					<span class="text-[10px] font-semibold text-zinc-400 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded">Efficiency</span>
				</h3>
				<div class="flex-1 mt-4 relative">
					<canvas bind:this={canvasPriority}></canvas>
				</div>
			</div>
		</div>

		<!-- Reopens Ledger Table -->
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
			<div class="px-6 py-5 border-b border-zinc-200/50 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
				<div>
					<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-50">Task Reopen Ledger</h3>
					<p class="text-[11px] text-zinc-500 mt-0.5">Tasks reverted from completed back to active stages</p>
				</div>
				<button 
					onclick={exportReopens}
					disabled={!reportsData.reopenedTasks || reportsData.reopenedTasks.length === 0}
					class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<FileSpreadsheet class="w-3.5 h-3.5" />
					Export Ledger
				</button>
			</div>
			
			<div class="overflow-x-auto min-h-[120px]">
				<table class="w-full text-left text-xs border-collapse">
					<thead>
						<tr class="bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 font-bold border-b border-zinc-200/50 dark:border-white/5">
							<th class="px-6 py-3">Task ID</th>
							<th class="px-6 py-3">Task Title</th>
							<th class="px-6 py-3">Reopened By</th>
							<th class="px-6 py-3">From Stage</th>
							<th class="px-6 py-3">To Stage</th>
							<th class="px-6 py-3">Date & Time</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-200/50 dark:divide-white/5">
						{#if !reportsData.reopenedTasks || reportsData.reopenedTasks.length === 0}
							<tr>
								<td colspan="6" class="px-6 py-8 text-center text-zinc-400">No reopen occurrences logged in this date range.</td>
							</tr>
						{:else}
							{#each reportsData.reopenedTasks as t}
								<tr class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
									<td class="px-6 py-3 font-mono font-bold text-zinc-400">#{t.taskNumber}</td>
									<td class="px-6 py-3">
										<button onclick={() => onTaskClick({ id: t.taskId })} class="font-bold text-blue-600 dark:text-blue-400 hover:underline text-left">
											{t.taskTitle}
										</button>
									</td>
									<td class="px-6 py-3 text-zinc-700 dark:text-zinc-300 font-medium">{t.reopenedBy}</td>
									<td class="px-6 py-3">
										<span class="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-500 font-medium text-[10px]">
											{t.oldStageName}
										</span>
									</td>
									<td class="px-6 py-3">
										<span class="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 font-medium text-[10px]">
											{t.newStageName}
										</span>
									</td>
									<td class="px-6 py-3 text-zinc-500">{new Date(t.reopenedAt).toLocaleString()}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Risks Ledger Table -->
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
			<div class="px-6 py-5 border-b border-zinc-200/50 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
				<div>
					<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-50">Task Risk & Health Ledger</h3>
					<p class="text-[11px] text-zinc-500 mt-0.5">Tasks classified as Overdue or Stale (>14 days inactive)</p>
				</div>
				<button 
					onclick={exportRisks}
					disabled={(!reportsData.risks?.overdue || reportsData.risks.overdue.length === 0) && (!reportsData.risks?.stale || reportsData.risks.stale.length === 0)}
					class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<FileSpreadsheet class="w-3.5 h-3.5" />
					Export Ledger
				</button>
			</div>

			<div class="overflow-x-auto min-h-[120px]">
				<table class="w-full text-left text-xs border-collapse">
					<thead>
						<tr class="bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 font-bold border-b border-zinc-200/50 dark:border-white/5">
							<th class="px-6 py-3">Task ID</th>
							<th class="px-6 py-3">Task Title</th>
							<th class="px-6 py-3">Risk Level</th>
							<th class="px-6 py-3">Threshold Metric</th>
							<th class="px-6 py-3">Assignee</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-200/50 dark:divide-white/5">
						{#if (!reportsData.risks?.overdue || reportsData.risks.overdue.length === 0) && (!reportsData.risks?.stale || reportsData.risks.stale.length === 0)}
							<tr>
								<td colspan="5" class="px-6 py-8 text-center text-zinc-400">All tasks on this board comply with cycle thresholds.</td>
							</tr>
						{:else}
							<!-- Overdue Tasks -->
							{#if reportsData.risks?.overdue}
								{#each reportsData.risks.overdue as t}
									<tr class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
										<td class="px-6 py-3 font-mono font-bold text-zinc-400">#{t.number}</td>
										<td class="px-6 py-3">
											<button onclick={() => onTaskClick({ id: t.id })} class="font-bold text-blue-600 dark:text-blue-400 hover:underline text-left">
												{t.title}
											</button>
										</td>
										<td class="px-6 py-3">
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-500 font-extrabold text-[10px] uppercase tracking-wider">
												Overdue
											</span>
										</td>
										<td class="px-6 py-3 font-semibold text-rose-600 dark:text-rose-400">
											Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}
										</td>
										<td class="px-6 py-3 text-zinc-700 dark:text-zinc-300 font-medium">{t.assigneeName || 'Unassigned'}</td>
									</tr>
								{/each}
							{/if}

							<!-- Stale Tasks -->
							{#if reportsData.risks?.stale}
								{#each reportsData.risks.stale as t}
									<tr class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
										<td class="px-6 py-3 font-mono font-bold text-zinc-400">#{t.number}</td>
										<td class="px-6 py-3">
											<button onclick={() => onTaskClick({ id: t.id })} class="font-bold text-blue-600 dark:text-blue-400 hover:underline text-left">
												{t.title}
											</button>
										</td>
										<td class="px-6 py-3">
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-500 font-extrabold text-[10px] uppercase tracking-wider">
												Stale (14d)
											</span>
										</td>
										<td class="px-6 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
											Last Active: {new Date(t.updatedAt).toLocaleDateString()}
										</td>
										<td class="px-6 py-3 text-zinc-700 dark:text-zinc-300 font-medium">{t.assigneeName || 'Unassigned'}</td>
									</tr>
								{/each}
							{/if}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
