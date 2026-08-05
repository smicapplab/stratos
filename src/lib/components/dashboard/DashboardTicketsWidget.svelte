<script lang="ts">
	import { LifeBuoy, ArrowRight } from 'lucide-svelte';

	let { widgetsPromise }: { widgetsPromise: Promise<any> } = $props();

	function getPriorityColor(priority: string) {
		switch (priority) {
			case 'High': return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/50';
			case 'Medium': return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/50';
			default: return 'bg-zinc-50 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400 border-zinc-200/50';
		}
	}
</script>

<div class="bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col min-h-[350px]">
	<div class="flex justify-between items-center mb-6">
		<div>
			<h3 class="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
				<LifeBuoy class="w-4 h-4 text-indigo-500" />
				My Support Workload
			</h3>
			<p class="text-xs text-zinc-500 mt-0.5">Tickets requiring your response.</p>
		</div>
		<a href="/helpdesk/tickets" class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 min-h-[36px]">
			All Tickets
			<ArrowRight class="w-3 h-3" />
		</a>
	</div>

	{#await widgetsPromise}
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
