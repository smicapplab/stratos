<script lang="ts">
	import WidgetCard from '$lib/components/ui/WidgetCard.svelte';
	import { Clock, CheckCircle2, LifeBuoy, Bell } from 'lucide-svelte';

	let { metricsPromise }: { metricsPromise: Promise<any> } = $props();
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
	{#await metricsPromise}
		<WidgetCard title="My Open Tasks" loading={true} />
		<WidgetCard title="My Overdue Tasks" loading={true} />
		<WidgetCard title="Completed This Week" loading={true} />
		<WidgetCard title="My Assigned Tickets" loading={true} />
		<WidgetCard title="Unread Activity" loading={true} />
	{:then metrics}
		<WidgetCard title="My Open Tasks">
			<div class="flex items-center justify-between mt-2">
				<span class="text-3xl font-bold text-zinc-900 dark:text-white">{metrics.myOpenTasks}</span>
				<div class="p-2 rounded-xl bg-brand-primary/10 dark:bg-brand-primary/10 text-brand-primary">
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
