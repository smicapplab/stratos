<script lang="ts">
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

	let { chartsPromise }: { chartsPromise: Promise<any> } = $props();
</script>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
	{#await chartsPromise}
		<WidgetCard title="Workload by Assignee" loading={true} />
		<WidgetCard title="Task Status Distribution" loading={true} />
		<WidgetCard title="Support Workload" loading={true} />
	{:then charts}
		<!-- Workload Bar Chart -->
		<WidgetCard title="Workload by Assignee">
			<div class="w-full h-64 p-2 relative flex items-center justify-center">
				{#if charts.workload.length === 0}
					<span class="text-zinc-400 text-sm">No open tasks to display</span>
				{:else}
					<Bar 
						data={{
							labels: charts.workload.map((w: { userName: string; count: number }) => w.userName),
							datasets: [{
								label: 'Open Tasks',
								data: charts.workload.map((w: { userName: string; count: number }) => w.count),
								backgroundColor: 'rgba(59, 130, 246, 0.8)',
								borderRadius: 6
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

		<!-- Status Distribution Doughnut Chart -->
		<WidgetCard title="General Task Status">
			<div class="w-full h-64 p-2 relative flex items-center justify-center">
				{#if charts.statusDistribution.reduce((acc: number, curr: { status: string; count: number }) => acc + curr.count, 0) === 0}
					<span class="text-zinc-400 text-sm">No tasks</span>
				{:else}
					<Doughnut
						data={{
							labels: charts.statusDistribution.map((s: { status: string; count: number }) => s.status),
							datasets: [{
								data: charts.statusDistribution.map((s: { status: string; count: number }) => s.count),
								backgroundColor: [
									'rgba(16, 185, 129, 0.8)', // Completed: Green
									'rgba(59, 130, 246, 0.8)'  // Open: Blue
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

		<!-- Support Assigned vs Closed Doughnut Chart -->
		<WidgetCard title="Support Workload (Open vs Closed)">
			<div class="w-full h-64 p-2 relative flex items-center justify-center">
				{#if charts.supportStats.assigned === 0 && charts.supportStats.closed === 0}
					<div class="flex flex-col items-center justify-center text-center">
						<span class="text-zinc-400 text-sm">No ticket activity</span>
						<span class="text-[10px] text-zinc-400 mt-1">within the selected timeframe</span>
					</div>
				{:else}
					<Doughnut
						data={{
							labels: ['Assigned (Open)', 'Resolved (Closed)'],
							datasets: [{
								data: [charts.supportStats.assigned, charts.supportStats.closed],
								backgroundColor: [
									'rgba(99, 102, 241, 0.8)', // Assigned: Indigo
									'rgba(16, 185, 129, 0.8)'  // Resolved: Green
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
	{/await}
</div>
