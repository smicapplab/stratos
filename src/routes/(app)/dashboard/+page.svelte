<script lang="ts">
	import type { PageData } from './$types';
	import WidgetCard from '$lib/components/ui/WidgetCard.svelte';
	import { Bar, Doughnut } from 'svelte-chartjs';
	import {
		Chart as ChartJS,
		Title,
		Tooltip,
		Legend,
		BarElement,
		CategoryScale,
		LinearScale,
		ArcElement
	} from 'chart.js';

	ChartJS.register(
		Title,
		Tooltip,
		Legend,
		BarElement,
		CategoryScale,
		LinearScale,
		ArcElement
	);

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Dashboard - Stratos</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-4 lg:p-8 space-y-6">
	<div class="mb-8">
		<h1 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Group Dashboard</h1>
		<p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">At-a-glance metrics and workload distribution.</p>
	</div>

	<!-- KPIs row -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		{#await data.metricsPromise}
			<WidgetCard title="My Open Tasks" loading={true} />
			<WidgetCard title="My Overdue Tasks" loading={true} />
			<WidgetCard title="Completed This Week" loading={true} />
		{:then metrics}
			<WidgetCard title="My Open Tasks">
				<div class="flex items-center justify-center h-full">
					<span class="text-4xl font-bold text-blue-600 dark:text-blue-500">{metrics.myOpenTasks}</span>
				</div>
			</WidgetCard>
			<WidgetCard title="My Overdue Tasks">
				<div class="flex items-center justify-center h-full">
					<span class="text-4xl font-bold {metrics.myOverdueTasks > 0 ? 'text-red-500' : 'text-zinc-400'}">{metrics.myOverdueTasks}</span>
				</div>
			</WidgetCard>
			<WidgetCard title="Completed This Week">
				<div class="flex items-center justify-center h-full">
					<span class="text-4xl font-bold text-emerald-500">{metrics.myCompletedThisWeek}</span>
				</div>
			</WidgetCard>
		{/await}
	</div>

	<!-- Charts row -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		{#await data.chartsPromise}
			<div class="lg:col-span-2">
				<WidgetCard title="Workload by Assignee" loading={true} />
			</div>
			<div class="lg:col-span-1">
				<WidgetCard title="Task Status Distribution" loading={true} />
			</div>
		{:then charts}
			<!-- Workload Bar Chart -->
			<div class="lg:col-span-2">
				<WidgetCard title="Workload by Assignee">
					<div class="w-full h-64 p-2 relative flex items-center justify-center">
						{#if charts.workload.length === 0}
							<span class="text-zinc-400 text-sm">No open tasks to display</span>
						{:else}
							<Bar 
								data={{
									labels: charts.workload.map(w => w.userName),
									datasets: [{
										label: 'Open Tasks',
										data: charts.workload.map(w => w.count),
										backgroundColor: 'rgba(59, 130, 246, 0.8)',
										borderRadius: 4
									}]
								}}
								options={{
									responsive: true,
									maintainAspectRatio: false,
									plugins: { legend: { display: false } },
									scales: { 
										y: { beginAtZero: true, ticks: { stepSize: 1 } },
										x: { grid: { display: false } }
									}
								}}
							/>
						{/if}
					</div>
				</WidgetCard>
			</div>

			<!-- Status Distribution Donut Chart -->
			<div class="lg:col-span-1">
				<WidgetCard title="Task Status Distribution">
					<div class="w-full h-64 p-2 relative flex items-center justify-center">
						{#if charts.statusDistribution.reduce((acc, curr) => acc + curr.count, 0) === 0}
							<span class="text-zinc-400 text-sm">No tasks</span>
						{:else}
							<Doughnut
								data={{
									labels: charts.statusDistribution.map(s => s.status),
									datasets: [{
										data: charts.statusDistribution.map(s => s.count),
										backgroundColor: [
											'rgba(59, 130, 246, 0.8)', // Open: Blue
											'rgba(16, 185, 129, 0.8)'  // Completed: Green
										],
										borderWidth: 0
									}]
								}}
								options={{
									responsive: true,
									maintainAspectRatio: false,
									cutout: '70%',
									plugins: {
										legend: { position: 'bottom' }
									}
								}}
							/>
						{/if}
					</div>
				</WidgetCard>
			</div>
		{/await}
	</div>
</div>
