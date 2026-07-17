<script lang="ts">
	import type { PageData } from './$types';
	import WidgetCard from '$lib/components/ui/WidgetCard.svelte';
	import { Bar, Doughnut } from 'svelte-chartjs';
	import { goto } from '$app/navigation';
	import { 
		LifeBuoy, Bell, UserPlus, AtSign, CheckCircle2, MessageSquare, Clock, ArrowRight, Check
	} from 'lucide-svelte';
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

	// Custom dates inputs binding
	let customStart = $state('');
	let customEnd = $state('');

	$effect(() => {
		customStart = data.selectedStart || '';
		customEnd = data.selectedEnd || '';
	});

	// Trigger navigation when user selects preset
	function selectRange(range: string) {
		if (range === 'custom') return;
		goto(`/dashboard?range=${range}`);
	}

	// Trigger navigation when user applies custom dates
	function applyCustomRange(e: SubmitEvent) {
		e.preventDefault();
		if (!customStart || !customEnd) return;
		goto(`/dashboard?range=custom&start=${customStart}&end=${customEnd}`);
	}

	// Local notifications state to support optimistic UI updates when marking read
	let localNotifications = $state<any[]>([]);
	$effect(() => {
		// Sync local notifications list once the widgets promise resolves
		data.widgetsPromise.then((widgets: any) => {
			localNotifications = widgets.unreadNotificationsList || [];
		});
	});

	async function markRead(id: string) {
		// Optimistic update
		localNotifications = localNotifications.filter(n => n.id !== id);
		try {
			await fetch('/api/notifications/read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
		} catch (err) {
			console.error('Failed to mark notification read:', err);
		}
	}

	function getNotificationIcon(type: string) {
		switch (type) {
			case 'assigned': return { icon: UserPlus, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' };
			case 'mentioned': return { icon: AtSign, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' };
			case 'status_changed': return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' };
			case 'comment_added': return { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' };
			default: return { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' };
		}
	}

	function getNotificationText(type: string) {
		switch (type) {
			case 'assigned': return 'assigned you a task';
			case 'mentioned': return 'mentioned you in a task';
			case 'status_changed': return 'changed status of a task';
			case 'comment_added': return 'commented on a task';
			default: return 'notified you';
		}
	}

	// Priority colors mapping for support tickets list
	function getPriorityColor(priority: string) {
		switch (priority) {
			case 'High': return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/50';
			case 'Medium': return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/50';
			default: return 'bg-zinc-50 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400 border-zinc-200/50';
		}
	}
</script>

<svelte:head>
	<title>Dashboard - Stratos</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-4 lg:p-8 space-y-8">
	<!-- Header & Date Controls -->
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200/60 dark:border-zinc-800/80 pb-6">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Command Dashboard</h1>
			<p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Real-time metrics, workload distribution, and support tickets.</p>
		</div>

		<!-- Date range preset and picker controls -->
		<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
			<div class="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200/50 dark:border-zinc-800/50">
				<button 
					onclick={() => selectRange('1w')}
					class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all {data.selectedRange === '1w' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
				>
					1 Week
				</button>
				<button 
					onclick={() => selectRange('30d')}
					class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all {data.selectedRange === '30d' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
				>
					30 Days
				</button>
				<button 
					onclick={() => selectRange('60d')}
					class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all {data.selectedRange === '60d' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
				>
					60 Days
				</button>
				<button 
					onclick={() => {}} 
					class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all {data.selectedRange === 'custom' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}"
				>
					Custom
				</button>
			</div>
			
			{#if data.selectedRange === 'custom'}
				<form onsubmit={applyCustomRange} class="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80">
					<input 
						type="date" 
						bind:value={customStart} 
						required 
						class="bg-transparent text-xs font-medium text-zinc-700 dark:text-zinc-300 border-0 outline-none p-1 focus:ring-0"
					/>
					<span class="text-zinc-400 text-xs">to</span>
					<input 
						type="date" 
						bind:value={customEnd} 
						required 
						class="bg-transparent text-xs font-medium text-zinc-700 dark:text-zinc-300 border-0 outline-none p-1 focus:ring-0"
					/>
					<button 
						type="submit" 
						class="px-3 py-1 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold rounded-lg shadow-sm transition-all"
					>
						Apply
					</button>
				</form>
			{/if}
		</div>
	</div>

	<!-- KPIs row (5 cards) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
		{#await data.metricsPromise}
			<WidgetCard title="My Open Tasks" loading={true} />
			<WidgetCard title="My Overdue Tasks" loading={true} />
			<WidgetCard title="Completed This Week" loading={true} />
			<WidgetCard title="My Assigned Tickets" loading={true} />
			<WidgetCard title="Unread Activity" loading={true} />
		{:then metrics}
			<WidgetCard title="My Open Tasks">
				<div class="flex items-center justify-between mt-2">
					<span class="text-3xl font-bold text-zinc-900 dark:text-white">{metrics.myOpenTasks}</span>
					<div class="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600">
						<Clock class="w-5 h-5" />
					</div>
				</div>
			</WidgetCard>
			<WidgetCard title="My Overdue Tasks">
				<div class="flex items-center justify-between mt-2">
					<span class="text-3xl font-bold {metrics.myOverdueTasks > 0 ? 'text-red-500' : 'text-zinc-400'}">{metrics.myOverdueTasks}</span>
					<div class="p-2 rounded-xl {metrics.myOverdueTasks > 0 ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400'}">
						<Clock class="w-5 h-5" />
					</div>
				</div>
			</WidgetCard>
			<WidgetCard title="Completed This Week">
				<div class="flex items-center justify-between mt-2">
					<span class="text-3xl font-bold text-emerald-500">{metrics.myCompletedThisWeek}</span>
					<div class="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
						<CheckCircle2 class="w-5 h-5" />
					</div>
				</div>
			</WidgetCard>
			<a href="/helpdesk/tickets" class="block group transition-transform hover:-translate-y-0.5">
				<WidgetCard title="My Assigned Tickets">
					<div class="flex items-center justify-between mt-2">
						<span class="text-3xl font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-500">{metrics.myAssignedTickets}</span>
						<div class="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500">
							<LifeBuoy class="w-5 h-5" />
						</div>
					</div>
				</WidgetCard>
			</a>
			<a href="/inbox" class="block group transition-transform hover:-translate-y-0.5">
				<WidgetCard title="Unread Activity">
					<div class="flex items-center justify-between mt-2">
						<span class="text-3xl font-bold {metrics.unreadNotifications > 0 ? 'text-amber-500' : 'text-zinc-400'}">{metrics.unreadNotifications}</span>
						<div class="p-2 rounded-xl {metrics.unreadNotifications > 0 ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500 animate-pulse' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400'}">
							<Bell class="w-5 h-5" />
						</div>
					</div>
				</WidgetCard>
			</a>
		{/await}
	</div>

	<!-- Charts row (3 charts) -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		{#await data.chartsPromise}
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

	<!-- Bottom Row: Widgets Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Left: My Active Support Tickets list -->
		<div class="bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col min-h-[350px]">
			<div class="flex justify-between items-center mb-6">
				<div>
					<h3 class="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
						<LifeBuoy class="w-4 h-4 text-indigo-500" />
						My Support Workload
					</h3>
					<p class="text-xs text-zinc-500 mt-0.5">Tickets requiring your response.</p>
				</div>
				<a href="/helpdesk/tickets" class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
					All Tickets
					<ArrowRight class="w-3 h-3" />
				</a>
			</div>

			{#await data.widgetsPromise}
				<div class="flex-1 flex items-center justify-center">
					<div class="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
				</div>
			{:then widgets}
				{#if widgets.activeSupportTickets.length === 0}
					<div class="flex-1 flex flex-col items-center justify-center text-center p-6 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
						<LifeBuoy class="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
						<h4 class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Clean Queue!</h4>
						<p class="text-xs text-zinc-400 mt-1 max-w-[200px]">You have no active support tickets assigned to you.</p>
					</div>
				{:else}
					<div class="flex-1 overflow-x-auto">
						<table class="w-full text-left border-collapse">
							<thead>
								<tr class="border-b border-zinc-100 dark:border-zinc-800/50 pb-2">
									<th class="text-xs font-semibold text-zinc-400 pb-2">Ticket</th>
									<th class="text-xs font-semibold text-zinc-400 pb-2">Stage</th>
									<th class="text-xs font-semibold text-zinc-400 pb-2 text-right">Priority</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/40">
								{#each widgets.activeSupportTickets as ticket}
									<tr class="hover:bg-zinc-50/30 dark:hover:bg-white/[0.01] transition-colors">
										<td class="py-3 pr-4 max-w-[200px] truncate">
											<a href="/helpdesk/tickets/{ticket.id}" class="group">
												<span class="text-xs font-bold text-zinc-400 dark:text-zinc-500">TIC-{ticket.taskNumber}</span>
												<p class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate mt-0.5">{ticket.title}</p>
											</a>
										</td>
										<td class="py-3">
											<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
												{ticket.stageName}
											</span>
										</td>
										<td class="py-3 text-right">
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border {getPriorityColor(ticket.priority)}">
												{ticket.priority || 'Low'}
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			{/await}
		</div>

		<!-- Right: Recent Inbox Alerts list -->
		<div class="bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col min-h-[350px]">
			<div class="flex justify-between items-center mb-6">
				<div>
					<h3 class="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
						<Bell class="w-4 h-4 text-amber-500" />
						Inbox Alerts
					</h3>
					<p class="text-xs text-zinc-500 mt-0.5">Your most recent unread activities.</p>
				</div>
				<a href="/inbox" class="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
					Full Inbox
					<ArrowRight class="w-3 h-3" />
				</a>
			</div>

			{#await data.widgetsPromise}
				<div class="flex-1 flex items-center justify-center">
					<div class="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
				</div>
			{:then}
				{#if localNotifications.length === 0}
					<div class="flex-1 flex flex-col items-center justify-center text-center p-6 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
						<CheckCircle2 class="w-8 h-8 text-emerald-500 mb-2" />
						<h4 class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No Unread Alerts</h4>
						<p class="text-xs text-zinc-400 mt-1 max-w-[200px]">You are fully caught up with all notifications.</p>
					</div>
				{:else}
					<div class="flex-1 flex flex-col gap-3">
						{#each localNotifications as notif}
							{@const IconInfo = getNotificationIcon(notif.type)}
							<div class="flex items-start justify-between gap-4 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/40 hover:border-zinc-200/50 dark:hover:border-zinc-800/80 transition-colors bg-zinc-50/30 dark:bg-zinc-900/10">
								<div class="flex items-start gap-3 min-w-0">
									<div class="p-2 rounded-xl shrink-0 mt-0.5 {IconInfo.bg} {IconInfo.color}">
										<IconInfo.icon class="w-4 h-4" />
									</div>
									<div class="min-w-0">
										<p class="text-xs text-zinc-800 dark:text-zinc-200 font-medium">
											<span class="font-bold">{notif.actorName || 'Someone'}</span> {getNotificationText(notif.type)}
										</p>
										{#if notif.taskTitle}
											<p class="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold truncate mt-0.5">"{notif.taskTitle}"</p>
										{/if}
										<div class="flex items-center gap-1 text-[10px] text-zinc-400 mt-1">
											<Clock class="w-3 h-3" />
											{new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
										</div>
									</div>
								</div>

								<button 
									onclick={() => markRead(notif.id)}
									title="Mark read"
									class="p-1.5 rounded-lg border border-zinc-100 hover:border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-emerald-500 transition-all shrink-0"
								>
									<Check class="w-3.5 h-3.5" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			{/await}
		</div>
	</div>
</div>
