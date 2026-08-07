<script lang="ts">
	import type { BoardFilterState } from '$lib/utils/boardFilters';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import PriorityBadge from '$lib/components/ui/PriorityBadge.svelte';
	import { Search, X, Check, Filter, UserCheck, Calendar, RotateCcw } from 'lucide-svelte';

	let {
		open = $bindable(false),
		filterState = $bindable(),
		groupUsers = [],
		activeFilterCount = 0,
		onClear
	}: {
		open: boolean;
		filterState: BoardFilterState;
		groupUsers?: Array<{ id: string; name: string | null; email?: string | null; photo?: string | null; avatarUrl?: string | null }>;
		activeFilterCount?: number;
		onClear?: () => void;
	} = $props();

	function close() {
		open = false;
	}

	function handleClear() {
		filterState.searchQuery = '';
		filterState.assigneeIds = [];
		filterState.assignedToMe = false;
		filterState.priorities = [];
		filterState.dateFilter = 'all';
		filterState.tagIds = [];
		filterState.hierarchy = 'all';
		if (onClear) onClear();
	}

	function toggleAssignee(id: string) {
		if (filterState.assigneeIds.includes(id)) {
			filterState.assigneeIds = filterState.assigneeIds.filter((a) => a !== id);
		} else {
			filterState.assigneeIds = [...filterState.assigneeIds, id];
		}
	}

	function togglePriority(priority: string) {
		if (filterState.priorities.includes(priority)) {
			filterState.priorities = filterState.priorities.filter((p) => p !== priority);
		} else {
			filterState.priorities = [...filterState.priorities, priority];
		}
	}

	const dateOptions = [
		{ value: 'all', label: 'All Dates' },
		{ value: 'overdue', label: 'Overdue' },
		{ value: 'today', label: 'Due Today' },
		{ value: 'this_week', label: 'Due This Week' },
		{ value: 'no_date', label: 'No Due Date' }
	] as const;

	const priorities = ['Urgent', 'High', 'Medium', 'Low'];
</script>

{#if open}
	<!-- Backdrop Overlay -->
	<div
		tabindex="-1"
		role="button"
		aria-label="Close filter drawer backdrop"
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity"
		onclick={close}
		onkeydown={(e) => e.key === 'Escape' && close()}
	></div>

	<!-- Bottom Sheet Drawer -->
	<div
		class="fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[88vh] rounded-t-3xl bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shadow-2xl transition-transform duration-300 overflow-hidden"
	>
		<!-- Handle Bar -->
		<div class="flex justify-center pt-3 pb-1 shrink-0">
			<div class="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
		</div>

		<!-- Sticky Top Header -->
		<div class="px-5 py-3 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between shrink-0">
			<div class="flex items-center gap-2">
				<Filter class="w-5 h-5 text-brand-primary" />
				<h2 class="text-lg font-bold text-zinc-900 dark:text-white">Filter Tasks</h2>
				{#if activeFilterCount > 0}
					<span class="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-brand-primary text-white">
						{activeFilterCount}
					</span>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				{#if activeFilterCount > 0}
					<button
						type="button"
						onclick={handleClear}
						class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all min-h-[44px]"
					>
						<RotateCcw class="w-3.5 h-3.5" />
						<span>Reset</span>
					</button>
				{/if}
				<button
					type="button"
					onclick={close}
					class="p-2.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
					aria-label="Close filters"
				>
					<X class="w-5 h-5" />
				</button>
			</div>
		</div>

		<!-- Drawer Scrollable Content -->
		<div class="px-5 py-4 space-y-6 overflow-y-auto flex-1 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
			<!-- 1. Search Query -->
			<div class="space-y-2">
				<label for="mobile-filter-search" class="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Search</label>
				<div class="relative">
					<Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
					<input
						id="mobile-filter-search"
						type="text"
						placeholder="Search by title, description, #..."
						bind:value={filterState.searchQuery}
						class="w-full pl-10 pr-10 py-3 text-sm rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[44px]"
					/>
					{#if filterState.searchQuery}
						<button
							type="button"
							onclick={() => (filterState.searchQuery = '')}
							class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
						>
							<X class="w-4 h-4" />
						</button>
					{/if}
				</div>
			</div>

			<!-- 2. Quick Toggles (Assigned to Me) -->
			<div class="space-y-2">
				<span class="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Quick Filters</span>
				<button
					type="button"
					onclick={() => (filterState.assignedToMe = !filterState.assignedToMe)}
					class="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all min-h-[44px] {filterState.assignedToMe
						? 'bg-brand-primary/10 border-brand-primary text-brand-primary dark:bg-brand-primary/20'
						: 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/70 text-zinc-700 dark:text-zinc-300'}"
				>
					<div class="flex items-center gap-3">
						<UserCheck class="w-4 h-4" />
						<span>Assigned to me</span>
					</div>
					{#if filterState.assignedToMe}
						<Check class="w-4 h-4 text-brand-primary" />
					{/if}
				</button>
			</div>

			<!-- 3. Due Date Options -->
			<div class="space-y-2">
				<div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
					<Calendar class="w-3.5 h-3.5" />
					<span>Due Date</span>
				</div>
				<div class="grid grid-cols-2 gap-2">
					{#each dateOptions as opt}
						<button
							type="button"
							onclick={() => (filterState.dateFilter = opt.value)}
							class="py-3 px-3 text-xs font-semibold rounded-xl border text-left flex items-center justify-between transition-all min-h-[44px] {filterState.dateFilter === opt.value
								? 'bg-brand-primary text-white border-brand-primary shadow-xs'
								: 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'}"
						>
							<span>{opt.label}</span>
							{#if filterState.dateFilter === opt.value}
								<Check class="w-4 h-4 text-white" />
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<!-- 4. Priorities -->
			<div class="space-y-2">
				<span class="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Priority</span>
				<div class="grid grid-cols-2 gap-2">
					{#each priorities as p}
						{@const isSelected = filterState.priorities.includes(p)}
						<button
							type="button"
							onclick={() => togglePriority(p)}
							class="py-3 px-3 text-xs font-semibold rounded-xl border text-left flex items-center justify-between transition-all min-h-[44px] {isSelected
								? 'bg-brand-primary/10 border-brand-primary text-brand-primary dark:bg-brand-primary/20 font-bold'
								: 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'}"
						>
							<PriorityBadge priority={p} />
							{#if isSelected}
								<Check class="w-4 h-4 text-brand-primary" />
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<!-- 5. Assignees -->
			{#if groupUsers && groupUsers.length > 0}
				<div class="space-y-2">
					<span class="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Assignees</span>
					<div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
						<!-- Unassigned -->
						<button
							type="button"
							onclick={() => toggleAssignee('unassigned')}
							class="w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all min-h-[44px] {filterState.assigneeIds.includes('unassigned')
								? 'bg-brand-primary/10 border-brand-primary text-brand-primary dark:bg-brand-primary/20 font-semibold'
								: 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'}"
						>
							<div class="flex items-center gap-2.5">
								<div class="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-500 font-bold">?</div>
								<span>Unassigned</span>
							</div>
							{#if filterState.assigneeIds.includes('unassigned')}
								<Check class="w-4 h-4 text-brand-primary" />
							{/if}
						</button>

						<!-- Team Members -->
						{#each groupUsers as user}
							{@const isSelected = filterState.assigneeIds.includes(user.id)}
							<button
								type="button"
								onclick={() => toggleAssignee(user.id)}
								class="w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all min-h-[44px] {isSelected
									? 'bg-brand-primary/10 border-brand-primary text-brand-primary dark:bg-brand-primary/20 font-semibold'
									: 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'}"
							>
								<div class="flex items-center gap-2.5 truncate">
									<Avatar name={user.name || 'User'} email={user.email} photo={user.photo || user.avatarUrl} size="xs" />
									<span class="truncate">{user.name || user.email || 'User'}</span>
								</div>
								{#if isSelected}
									<Check class="w-4 h-4 text-brand-primary shrink-0" />
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Sticky Apply Footer -->
		<div class="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 shrink-0">
			<button
				type="button"
				onclick={close}
				class="w-full py-3 px-4 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-sm rounded-xl shadow-md transition-all min-h-[44px] flex items-center justify-center"
			>
				Done
			</button>
		</div>
	</div>
{/if}
