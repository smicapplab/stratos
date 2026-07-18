<script lang="ts">
	import { 
		LifeBuoy, 
		Plus, 
		Clock, 
		Play, 
		CheckCircle, 
		ChevronRight, 
		Search
	} from 'lucide-svelte';

	let { data } = $props();
	let tickets = $derived(data.tickets || []);

	// Metric calculations
	let pendingCount = $derived(tickets.filter(t => t.stageName === 'Incoming').length);
	let activeCount = $derived(tickets.filter(t => t.stageName === 'In Progress').length);
	let resolvedCount = $derived(tickets.filter(t => t.stageName === 'Resolved').length);

	// Filtering / Search state
	let searchQuery = $state('');
	let filterType = $state<'all' | 'Incoming' | 'In Progress' | 'Resolved'>('all');

	let filteredTickets = $derived(
		tickets.filter(t => {
			const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
								  t.number.toString().includes(searchQuery);
			const matchesFilter = filterType === 'all' || t.stageName === filterType;
			return matchesSearch && matchesFilter;
		})
	);

	function formatDate(dateVal: Date | string) {
		const date = new Date(dateVal);
		return date.toLocaleDateString(undefined, { 
			month: 'short', 
			day: 'numeric', 
			year: 'numeric' 
		});
	}

	function getStatusClass(stageName: string) {
		switch (stageName) {
			case 'Incoming':
				return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50';
			case 'In Progress':
				return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
			case 'Resolved':
				return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
			default:
				return 'bg-zinc-50 dark:bg-zinc-800/20 text-zinc-700 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800/50';
		}
	}
</script>

<div class="space-y-8 p-6 sm:p-8 max-w-7xl mx-auto">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-6">
		<div class="space-y-1">
			<div class="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
				<LifeBuoy class="w-4 h-4" />
				<span class="text-xs font-semibold uppercase tracking-wider">Support</span>
			</div>
			<h1 class="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Support Dashboard</h1>
			<p class="text-sm text-zinc-500 dark:text-zinc-400">Track, follow up, and file helpdesk requests for your team.</p>
		</div>
		<div>
			<a 
				href="/helpdesk/new" 
				class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm rounded-xl shadow-md transition-all duration-200 min-h-[44px]"
			>
				<Plus class="w-4 h-4" />
				Submit a Ticket
			</a>
		</div>
	</div>

	<!-- Metrics Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
		<!-- Card: Pending Review -->
		<button 
			onclick={() => filterType = 'Incoming'}
			class="flex items-center gap-4 p-5 bg-white dark:bg-zinc-900 rounded-2xl border text-left transition-all duration-200 hover:shadow-md cursor-pointer
			{filterType === 'Incoming' ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-zinc-200/80 dark:border-zinc-800/80'}"
		>
			<div class="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
				<Clock class="w-5 h-5" />
			</div>
			<div>
				<div class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{pendingCount}</div>
				<div class="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Pending Review</div>
			</div>
		</button>

		<!-- Card: Active -->
		<button 
			onclick={() => filterType = 'In Progress'}
			class="flex items-center gap-4 p-5 bg-white dark:bg-zinc-900 rounded-2xl border text-left transition-all duration-200 hover:shadow-md cursor-pointer
			{filterType === 'In Progress' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-zinc-200/80 dark:border-zinc-800/80'}"
		>
			<div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
				<Play class="w-5 h-5" />
			</div>
			<div>
				<div class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{activeCount}</div>
				<div class="text-xs text-zinc-500 dark:text-zinc-400 font-medium">In Progress</div>
			</div>
		</button>

		<!-- Card: Resolved -->
		<button 
			onclick={() => filterType = 'Resolved'}
			class="flex items-center gap-4 p-5 bg-white dark:bg-zinc-900 rounded-2xl border text-left transition-all duration-200 hover:shadow-md cursor-pointer
			{filterType === 'Resolved' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-zinc-200/80 dark:border-zinc-800/80'}"
		>
			<div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
				<CheckCircle class="w-5 h-5" />
			</div>
			<div>
				<div class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{resolvedCount}</div>
				<div class="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Resolved</div>
			</div>
		</button>
	</div>

	<!-- Filters & Actions Area -->
	<div class="flex flex-col sm:flex-row items-center gap-3 bg-zinc-100/50 dark:bg-zinc-900/30 p-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60">
		<!-- Search input -->
		<div class="relative flex-1 w-full">
			<Search class="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
			<input 
				type="text"
				bind:value={searchQuery}
				placeholder="Search tickets by title or number..."
				class="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[44px]"
			/>
		</div>
		
		<!-- Type Filter Select Button -->
		<div class="flex items-center gap-1.5 w-full sm:w-auto">
			<button 
				onclick={() => filterType = 'all'} 
				class="px-4 py-2 text-xs font-semibold rounded-xl border transition-all min-h-[44px]
				{filterType === 'all' 
					? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-50' 
					: 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'}"
			>
				All
			</button>
		</div>
	</div>

	<!-- Tickets Table / List -->
	{#if filteredTickets.length === 0}
		<div class="flex flex-col items-center justify-center p-12 py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 text-center space-y-6">
			<div class="relative w-20 h-20 flex items-center justify-center">
				<!-- Calming halo -->
				<div class="absolute inset-0 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full calm-pulse"></div>
				<div class="absolute inset-1.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-full border border-indigo-100 dark:border-indigo-800/25"></div>
				
				<!-- Animated support icon -->
				<div class="relative calm-float p-3 text-indigo-600 dark:text-indigo-400">
					<LifeBuoy class="w-8 h-8 animate-spin" style="animation-duration: 25s;" />
				</div>
			</div>
			<div class="max-w-md space-y-2">
				<h3 class="font-bold text-zinc-900 dark:text-zinc-100 text-lg tracking-tight">
					{searchQuery || filterType !== 'all' ? 'No matching tickets' : 'All clear! 🌟'}
				</h3>
				<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
					{searchQuery || filterType !== 'all' 
						? 'We couldn\'t find any tickets matching your search query or selected status filters.' 
						: 'No active support tickets currently require your attention. Need help? You can file a new support request below.'}
				</p>
			</div>
			{#if !searchQuery && filterType === 'all'}
				<a 
					href="/helpdesk/new" 
					class="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm rounded-xl shadow-md transition-colors min-h-[44px]"
				>
					<Plus class="w-4 h-4" />
					Submit a support ticket
				</a>
			{/if}
		</div>
	{:else}
		<!-- Table Container -->
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-left text-sm">
					<thead>
						<tr class="bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-200/80 dark:border-zinc-800/80 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
							<th class="px-6 py-4">Ticket</th>
							<th class="px-6 py-4">Subject</th>
							<th class="px-6 py-4">Status</th>
							<th class="px-6 py-4">Created</th>
							<th class="px-6 py-4">Last Update</th>
							<th class="px-6 py-4"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
						{#each filteredTickets as ticket (ticket.id)}
							<tr class="hover:bg-zinc-50/40 dark:hover:bg-zinc-800/10 transition-colors group">
								<!-- ID -->
								<td class="px-6 py-4 whitespace-nowrap font-semibold text-zinc-900 dark:text-zinc-200">
									TIC-{ticket.number}
								</td>
								<!-- Subject -->
								<td class="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 max-w-[280px] sm:max-w-md truncate">
									{ticket.title}
								</td>
								<!-- Status -->
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border {getStatusClass(ticket.stageName)}">
										{ticket.stageName === 'Incoming' ? 'Pending Review' : ticket.stageName}
									</span>
								</td>
								<!-- Created -->
								<td class="px-6 py-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400 text-xs">
									{formatDate(ticket.createdAt)}
								</td>
								<!-- Last Updated -->
								<td class="px-6 py-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400 text-xs">
									{formatDate(ticket.updatedAt)}
								</td>
								<!-- Link Action -->
								<td class="px-6 py-4 whitespace-nowrap text-right">
									<a 
										href="/helpdesk/tickets/{ticket.id}" 
										class="inline-flex items-center justify-center p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all min-w-[44px] min-h-[44px]"
										title="View Details"
									>
										<ChevronRight class="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<style>
	@keyframes floatCalm {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6px); }
	}
	@keyframes pulseCalm {
		0%, 100% { transform: scale(1); opacity: 0.15; }
		50% { transform: scale(1.08); opacity: 0.3; }
	}
	.calm-float {
		animation: floatCalm 4s ease-in-out infinite;
	}
	.calm-pulse {
		animation: pulseCalm 3s ease-in-out infinite;
	}
</style>
