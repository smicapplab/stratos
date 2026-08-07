<script lang="ts">
	import { Plus, Settings2, GripHorizontal, GanttChartSquare } from 'lucide-svelte';
	import DynamicIcon from '$lib/components/ui/DynamicIcon.svelte';

	let {
		board,
		userRole,
		activeView = $bindable('board'),
		showEpicsOnly = $bindable(false),
		onOpenSettings,
		onOpenReorderModal,
		onOpenCreateStageModal
	}: {
		board: any;
		userRole: string;
		activeView: string;
		showEpicsOnly: boolean;
		onOpenSettings: () => void;
		onOpenReorderModal: () => void;
		onOpenCreateStageModal: () => void;
	} = $props();
</script>

<div class="px-6 py-4 border-b border-zinc-200/60 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/30 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shrink-0">
	<!-- Left: Board Icon, Title, and View Mode Tabs -->
	<div class="flex items-center gap-4">
		<div class="flex items-center gap-3">
			<div class="p-2 rounded-xl bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary">
				<DynamicIcon name={board.icon || 'SquareKanban'} class="w-5 h-5" />
			</div>
			<div>
				<h1 class="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{board.name}</h1>
			</div>
		</div>

		<div class="h-6 w-px bg-zinc-200 dark:border-zinc-800 mx-2 hidden sm:block"></div>

		<!-- View Switcher -->
		<div class="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200/50 dark:border-zinc-800/50">
			<button
				onclick={() => activeView = 'board'}
				class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] {activeView === 'board' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
			>
				Board
			</button>
			<button
				onclick={() => activeView = 'table'}
				class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] {activeView === 'table' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
			>
				Table
			</button>
			<button
				onclick={() => activeView = 'calendar'}
				class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] {activeView === 'calendar' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
			>
				Calendar
			</button>
			<button
				onclick={() => activeView = 'gantt'}
				class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] flex items-center gap-1.5 {activeView === 'gantt' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
			>
				<GanttChartSquare class="w-3.5 h-3.5" />
				<span>Gantt</span>
			</button>
			<button
				onclick={() => activeView = 'reports'}
				class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] {activeView === 'reports' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
			>
				Analytics
			</button>
		</div>
	</div>

	<!-- Right: Filter Toggles & Action Buttons -->
	<div class="flex items-center gap-3">
		<!-- Epics Only Filter Toggle -->
		<label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-600 dark:text-zinc-400 min-h-[44px]">
			<input
				type="checkbox"
				bind:checked={showEpicsOnly}
				class="w-4 h-4 rounded-md border-zinc-300 text-brand-primary focus:ring-brand-primary"
			/>
			<span>Epics Only</span>
		</label>

		{#if userRole === 'Admin'}
			<button
				onclick={onOpenReorderModal}
				class="inline-flex items-center gap-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all min-h-[44px]"
				title="Reorder Columns"
			>
				<GripHorizontal class="w-4 h-4" />
				<span class="hidden sm:inline">Reorder</span>
			</button>

			<button
				onclick={onOpenCreateStageModal}
				class="inline-flex items-center gap-2 px-3 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-bold rounded-xl transition-all min-h-[44px]"
			>
				<Plus class="w-4 h-4" />
				<span>Add Column</span>
			</button>
		{/if}

		<button
			onclick={onOpenSettings}
			class="p-2.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
			title="Board Settings"
		>
			<Settings2 class="w-4.5 h-4.5" />
		</button>
	</div>
</div>
