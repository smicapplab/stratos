<script lang="ts">
	import type { PageData } from './$types';
	import DashboardHeader from '$lib/components/dashboard/DashboardHeader.svelte';
	import DashboardMetricsGrid from '$lib/components/dashboard/DashboardMetricsGrid.svelte';
	import DashboardCharts from '$lib/components/dashboard/DashboardCharts.svelte';
	import DashboardTicketsWidget from '$lib/components/dashboard/DashboardTicketsWidget.svelte';
	import DashboardActivityWidget from '$lib/components/dashboard/DashboardActivityWidget.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Dashboard - Stratos</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-4 lg:p-8 space-y-8">
	<!-- Header & Date Range Controls -->
	<DashboardHeader 
		selectedRange={data.selectedRange} 
		selectedStart={data.selectedStart || ''} 
		selectedEnd={data.selectedEnd || ''} 
	/>

	<!-- Key Metric KPI Cards (5 Cards) -->
	<DashboardMetricsGrid metricsPromise={data.metricsPromise} />

	<!-- Data Charts (Workload, Task Status, Support Workload) -->
	<DashboardCharts chartsPromise={data.chartsPromise} />

	<!-- Active Support Tickets & Recent Inbox Alerts Widgets -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<DashboardTicketsWidget widgetsPromise={data.widgetsPromise} />
		<DashboardActivityWidget widgetsPromise={data.widgetsPromise} />
	</div>
</div>
