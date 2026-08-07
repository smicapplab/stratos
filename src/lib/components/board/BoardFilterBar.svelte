<script lang="ts">
	import type { BoardFilterState } from '$lib/utils/boardFilters';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import PriorityBadge from '$lib/components/ui/PriorityBadge.svelte';
	import BoardFilterDrawer from '$lib/components/board/BoardFilterDrawer.svelte';
	import {
		Search,
		X,
		Filter,
		UserCheck,
		ChevronDown,
		Check,
		RotateCcw,
		Calendar,
		User
	} from 'lucide-svelte';

	let {
		filterState = $bindable(),
		groupUsers = [],
		activeFilterCount,
		onClear
	}: {
		filterState: BoardFilterState;
		groupUsers?: Array<{ id: string; name: string | null; email?: string | null; photo?: string | null; avatarUrl?: string | null }>;
		activeFilterCount?: number;
		onClear?: () => void;
	} = $props();

	let showMobileDrawer = $state(false);
	let activeDropdown = $state<'assignees' | 'priority' | 'date' | null>(null);

	// Compute active filter count if not explicitly passed
	let computedCount = $derived((() => {
		let count = 0;
		if (filterState.searchQuery && filterState.searchQuery.trim() !== '') count++;
		if (filterState.assignedToMe) count++;
		if (filterState.assigneeIds && filterState.assigneeIds.length > 0) count += filterState.assigneeIds.length;
		if (filterState.priorities && filterState.priorities.length > 0) count += filterState.priorities.length;
		if (filterState.dateFilter && filterState.dateFilter !== 'all') count++;
		return count;
	})());

	let totalActiveFilters = $derived(
		activeFilterCount !== undefined && activeFilterCount !== null && activeFilterCount > 0
			? activeFilterCount
			: computedCount
	);

	function toggleDropdown(name: 'assignees' | 'priority' | 'date') {
		if (activeDropdown === name) {
			activeDropdown = null;
		} else {
			activeDropdown = name;
		}
	}

	function closeDropdowns() {
		activeDropdown = null;
	}

	function handleWindowClick(e: MouseEvent) {
		if (activeDropdown !== null) {
			const target = e.target as HTMLElement;
			if (!target.closest('.board-filter-dropdown-container')) {
				closeDropdowns();
			}
		}
	}

	function handleClear() {
		filterState.searchQuery = '';
		filterState.assigneeIds = [];
		filterState.assignedToMe = false;
		filterState.priorities = [];
		filterState.dateFilter = 'all';
		filterState.tagIds = [];
		filterState.hierarchy = 'all';
		activeDropdown = null;
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

	const dateLabels: Record<BoardFilterState['dateFilter'], string> = {
		all: 'All Dates',
		overdue: 'Overdue',
		today: 'Due Today',
		this_week: 'Due This Week',
		no_date: 'No Due Date'
	};

	const priorities = ['Urgent', 'High', 'Medium', 'Low'];
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && closeDropdowns()} onclick={handleWindowClick} />

<div class="relative z-40 px-6 py-2.5 bg-white/60 dark:bg-zinc-900/40 border-b border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
	<!-- Desktop Filter Bar (>= 768px) -->
	<div class="hidden md:flex items-center gap-2.5 flex-wrap flex-1 board-filter-dropdown-container">
		<!-- Search Input -->
		<div class="relative min-w-[200px] max-w-xs">
			<Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
			<input
				type="text"
				placeholder="Filter by keyword..."
				bind:value={filterState.searchQuery}
				class="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[36px]"
			/>
			{#if filterState.searchQuery}
				<button
					type="button"
					onclick={() => (filterState.searchQuery = '')}
					class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full"
				>
					<X class="w-3.5 h-3.5" />
				</button>
			{/if}
		</div>

		<!-- Assigned to me Pill Toggle -->
		<button
			type="button"
			onclick={() => (filterState.assignedToMe = !filterState.assignedToMe)}
			class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all min-h-[36px] {filterState.assignedToMe
				? 'bg-brand-primary border-brand-primary text-white shadow-xs'
				: 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200/70 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}"
		>
			<UserCheck class="w-3.5 h-3.5" />
			<span>Assigned to me</span>
		</button>

		<!-- Assignees Multi-select Dropdown -->
		<div class="relative">
			<button
				type="button"
				onclick={() => toggleDropdown('assignees')}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all min-h-[36px] {filterState.assigneeIds.length > 0
					? 'bg-brand-primary/10 border-brand-primary/40 text-brand-primary dark:bg-brand-primary/20'
					: 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200/70 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}"
			>
				<User class="w-3.5 h-3.5" />
				<span>Assignee</span>
				{#if filterState.assigneeIds.length > 0}
					<span class="px-1.5 py-0.2 text-[10px] font-extrabold rounded-full bg-brand-primary text-white">
						{filterState.assigneeIds.length}
					</span>
				{/if}
				<ChevronDown class="w-3.5 h-3.5 ml-0.5 opacity-60" />
			</button>

			{#if activeDropdown === 'assignees'}
				<div class="absolute left-0 top-full mt-1.5 z-50 w-56 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-2 space-y-1">
					<div class="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
						<span>Assignees</span>
						{#if filterState.assigneeIds.length > 0}
							<button type="button" onclick={() => (filterState.assigneeIds = [])} class="text-brand-primary hover:underline font-normal text-[10px]">Clear</button>
						{/if}
					</div>

					<button
						type="button"
						onclick={() => toggleAssignee('unassigned')}
						class="w-full px-2.5 py-2 text-xs rounded-xl flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors {filterState.assigneeIds.includes('unassigned') ? 'bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary font-semibold' : 'text-zinc-700 dark:text-zinc-300'}"
					>
						<div class="flex items-center gap-2">
							<div class="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[9px] text-zinc-500 font-bold">?</div>
							<span>Unassigned</span>
						</div>
						{#if filterState.assigneeIds.includes('unassigned')}
							<Check class="w-4 h-4 text-brand-primary" />
						{/if}
					</button>

					<div class="h-px bg-zinc-200/60 dark:bg-zinc-800 my-1"></div>

					<!-- Group Users -->
					{#each groupUsers as user}
						{@const isSelected = filterState.assigneeIds.includes(user.id)}
						<button
							type="button"
							onclick={() => toggleAssignee(user.id)}
							class="w-full px-2.5 py-2 text-xs rounded-xl flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors {isSelected ? 'bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary font-semibold' : 'text-zinc-700 dark:text-zinc-300'}"
						>
							<div class="flex items-center gap-2 truncate">
								<Avatar name={user.name || 'User'} email={user.email} photo={user.photo || user.avatarUrl} size="xs" />
								<span class="truncate max-w-[130px]">{user.name || user.email || 'User'}</span>
							</div>
							{#if isSelected}
								<Check class="w-4 h-4 text-brand-primary shrink-0" />
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Priority Multi-select Dropdown -->
		<div class="relative">
			<button
				type="button"
				onclick={() => toggleDropdown('priority')}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all min-h-[36px] {filterState.priorities.length > 0
					? 'bg-brand-primary/10 border-brand-primary/40 text-brand-primary dark:bg-brand-primary/20'
					: 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200/70 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}"
			>
				<span>Priority</span>
				{#if filterState.priorities.length > 0}
					<span class="px-1.5 py-0.2 text-[10px] font-extrabold rounded-full bg-brand-primary text-white">
						{filterState.priorities.length}
					</span>
				{/if}
				<ChevronDown class="w-3.5 h-3.5 ml-0.5 opacity-60" />
			</button>

			{#if activeDropdown === 'priority'}
				<div class="absolute left-0 top-full mt-1.5 z-50 w-48 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-2 space-y-1">
					<div class="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
						<span>Priority</span>
						{#if filterState.priorities.length > 0}
							<button type="button" onclick={() => (filterState.priorities = [])} class="text-brand-primary hover:underline font-normal text-[10px]">Clear</button>
						{/if}
					</div>

					{#each priorities as p}
						{@const isSelected = filterState.priorities.includes(p)}
						<button
							type="button"
							onclick={() => togglePriority(p)}
							class="w-full px-2.5 py-2 text-xs rounded-xl flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors {isSelected ? 'bg-brand-primary/10 dark:bg-brand-primary/20 font-semibold' : ''}"
						>
							<PriorityBadge priority={p} />
							{#if isSelected}
								<Check class="w-4 h-4 text-brand-primary" />
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Date Filter Dropdown -->
		<div class="relative">
			<button
				type="button"
				onclick={() => toggleDropdown('date')}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all min-h-[36px] {filterState.dateFilter !== 'all'
					? 'bg-brand-primary/10 border-brand-primary/40 text-brand-primary dark:bg-brand-primary/20'
					: 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200/70 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}"
			>
				<Calendar class="w-3.5 h-3.5" />
				<span>{dateLabels[filterState.dateFilter]}</span>
				<ChevronDown class="w-3.5 h-3.5 ml-0.5 opacity-60" />
			</button>

			{#if activeDropdown === 'date'}
				<div class="absolute left-0 top-full mt-1.5 z-50 w-48 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-2 space-y-1">
					{#each Object.entries(dateLabels) as [val, label]}
						<button
							type="button"
							onclick={() => {
								filterState.dateFilter = val as BoardFilterState['dateFilter'];
								activeDropdown = null;
							}}
							class="w-full px-2.5 py-2 text-xs rounded-xl flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors {filterState.dateFilter === val ? 'bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary font-semibold' : 'text-zinc-700 dark:text-zinc-300'}"
						>
							<span>{label}</span>
							{#if filterState.dateFilter === val}
								<Check class="w-4 h-4 text-brand-primary" />
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Clear Filters Action -->
		{#if totalActiveFilters > 0}
			<button
				type="button"
				onclick={handleClear}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all min-h-[36px] ml-auto"
			>
				<RotateCcw class="w-3.5 h-3.5" />
				<span>Clear filters</span>
			</button>
		{/if}
	</div>

	<!-- Mobile Filter Toolbar (< 768px) -->
	<div class="flex md:hidden items-center gap-2 w-full">
		<div class="relative flex-1">
			<Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
			<input
				type="text"
				placeholder="Search tasks..."
				bind:value={filterState.searchQuery}
				class="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[44px]"
			/>
			{#if filterState.searchQuery}
				<button
					type="button"
					onclick={() => (filterState.searchQuery = '')}
					class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full"
				>
					<X class="w-4 h-4" />
				</button>
			{/if}
		</div>

		<button
			type="button"
			onclick={() => (showMobileDrawer = true)}
			class="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl border transition-all min-h-[44px] shrink-0 {totalActiveFilters > 0
				? 'bg-brand-primary text-white border-brand-primary shadow-xs'
				: 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'}"
		>
			<Filter class="w-4 h-4" />
			<span>Filter</span>
			{#if totalActiveFilters > 0}
				<span class="px-1.5 py-0.2 text-[10px] font-extrabold rounded-full bg-white text-brand-primary">
					{totalActiveFilters}
				</span>
			{/if}
		</button>
	</div>
</div>

<!-- Mobile Drawer Modal -->
<BoardFilterDrawer
	bind:open={showMobileDrawer}
	bind:filterState
	{groupUsers}
	activeFilterCount={totalActiveFilters}
	{onClear}
/>
