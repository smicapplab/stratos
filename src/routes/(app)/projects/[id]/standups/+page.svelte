<script lang="ts">
	import { 
		CalendarDays, Sun, Settings, Sparkles, FileSpreadsheet, Printer, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Filter
	} from 'lucide-svelte';
	import DynamicIcon from '$lib/components/ui/DynamicIcon.svelte';
	import StandupCheckInModal from '$lib/components/standup/StandupCheckInModal.svelte';
	import StandupGridMatrix from '$lib/components/standup/StandupGridMatrix.svelte';
	import { toastStore } from '$lib/stores/ui.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let isCheckInOpen = $state(false);
	let modalTargetDate = $state<string | undefined>(undefined);
	let modalStandupData = $state<any | null>(null);

	let preset = $state('this_week');
	let startDate = $state('');
	let endDate = $state('');

	$effect(() => {
		preset = data.preset || 'this_week';
		startDate = data.startDate || '';
		endDate = data.endDate || '';
	});

	function openCheckInForDate(dateStr: string, existingData?: any) {
		modalTargetDate = dateStr || data.todayStandup?.date;
		modalStandupData = existingData ? { ...existingData } : { date: modalTargetDate, morningIntent: '', eveningOutcome: '', blockers: '' };
		isCheckInOpen = true;
	}

	async function handleSaveStandup(payload: { dateStr?: string; morningIntent?: string; eveningOutcome?: string; blockers?: string }) {
		const formData = new FormData();
		if (payload.dateStr) formData.append('dateStr', payload.dateStr);
		if (payload.morningIntent) formData.append('morningIntent', payload.morningIntent);
		if (payload.eveningOutcome) formData.append('eveningOutcome', payload.eveningOutcome);
		if (payload.blockers) formData.append('blockers', payload.blockers);

		try {
			const res = await fetch('?/saveStandup', {
				method: 'POST',
				body: formData
			});
			if (res.ok) {
				toastStore.success('Standup check-in saved!');
				window.location.reload();
			} else {
				toastStore.error('Failed to save standup check-in.');
			}
		} catch (err) {
			toastStore.error('Failed to save standup check-in.');
		}
	}

	function handlePresetChange(newPreset: string) {
		preset = newPreset;
		if (newPreset !== 'custom') {
			const url = new URL(window.location.href);
			url.searchParams.set('preset', newPreset);
			url.searchParams.delete('startDate');
			url.searchParams.delete('endDate');
			goto(url.toString());
		}
	}

	function applyCustomDateRange() {
		if (!startDate || !endDate) return;
		const url = new URL(window.location.href);
		url.searchParams.set('preset', 'custom');
		url.searchParams.set('startDate', startDate);
		url.searchParams.set('endDate', endDate);
		goto(url.toString());
	}

	let dateRangeDays = $derived(
		(() => {
			if (!startDate || !endDate) return 7;
			const start = new Date(startDate);
			const end = new Date(endDate);
			const diffTime = Math.abs(end.getTime() - start.getTime());
			return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
		})()
	);

	let navTooltipPrev = $derived(
		preset === 'this_month' || preset === 'last_month'
			? 'Previous Month'
			: preset === 'this_week'
			? 'Previous Week'
			: `Previous ${dateRangeDays} Days`
	);

	let navTooltipNext = $derived(
		preset === 'this_month' || preset === 'last_month'
			? 'Next Month'
			: preset === 'this_week'
			? 'Next Week'
			: `Next ${dateRangeDays} Days`
	);

	function navigateRange(direction: -1 | 1) {
		const url = new URL(window.location.href);

		if (preset === 'this_month' || preset === 'last_month') {
			const currentStart = new Date(startDate || Date.now());
			const targetMonth = new Date(currentStart.getFullYear(), currentStart.getMonth() + direction, 1);
			const yyyy = targetMonth.getFullYear();
			const mm = String(targetMonth.getMonth() + 1).padStart(2, '0');
			const newStart = `${yyyy}-${mm}-01`;
			const lastDay = new Date(yyyy, targetMonth.getMonth() + 1, 0).getDate();
			const newEnd = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;

			url.searchParams.set('preset', preset);
			url.searchParams.set('startDate', newStart);
			url.searchParams.set('endDate', newEnd);
		} else if (preset === 'this_week') {
			const currentStart = new Date(startDate || Date.now());
			currentStart.setDate(currentStart.getDate() + direction * 7);
			const currentEnd = new Date(currentStart);
			currentEnd.setDate(currentStart.getDate() + 4);

			url.searchParams.set('preset', 'this_week');
			url.searchParams.set('startDate', currentStart.toISOString().slice(0, 10));
			url.searchParams.set('endDate', currentEnd.toISOString().slice(0, 10));
		} else {
			const days = dateRangeDays || 7;
			const currentStart = new Date(startDate || Date.now());
			currentStart.setDate(currentStart.getDate() + direction * days);
			const currentEnd = new Date(endDate || Date.now());
			currentEnd.setDate(currentEnd.getDate() + direction * days);

			url.searchParams.set('preset', preset);
			url.searchParams.set('startDate', currentStart.toISOString().slice(0, 10));
			url.searchParams.set('endDate', currentEnd.toISOString().slice(0, 10));
		}

		goto(url.toString());
	}
</script>

<svelte:head>
	<title>Daily Standup - {data.project?.name || 'Project'} - Stratos</title>
</svelte:head>

<div class="h-full flex flex-col bg-transparent relative overflow-y-auto custom-scrollbar">
	<header class="shrink-0 px-6 sm:px-10 py-8 max-w-6xl w-full mx-auto flex flex-col gap-6">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<div class="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shadow-sm shrink-0">
					<DynamicIcon name={data.project?.icon || 'Folder'} class="w-6 h-6" />
				</div>
				<div>
					<div class="flex items-center gap-2">
						<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
							{data.project?.name} Standups
						</h1>
					</div>
					<p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Asynchronous daily intent & outcome reports.</p>
				</div>
			</div>

			{#if data.enabled}
				<div class="flex items-center gap-3 print:hidden">
					<button
						type="button"
						onclick={() => window.print()}
						class="flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl shadow-xs transition-all min-h-[44px]"
						title="Print or Save as PDF"
					>
						<Printer class="w-4 h-4 text-zinc-500" />
						<span class="hidden sm:inline">Print / PDF</span>
					</button>

					<a
						href="/api/projects/{data.project?.id}/standups/export?startDate={data.startDate}&endDate={data.endDate}"
						download
						class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl shadow-xs transition-all min-h-[44px]"
					>
						<FileSpreadsheet class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
						<span>Export Excel</span>
					</a>

					<button
						type="button"
						onclick={() => openCheckInForDate(data.todayStandup?.date || '', data.todayStandup)}
						class="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-xl shadow-md transition-all min-h-[44px]"
					>
						<Sparkles class="w-4 h-4" />
						<span>Log Today's Standup</span>
					</button>
				</div>
			{/if}
		</div>

		{#if data.enabled}
			<!-- Filter & Date Controls Bar -->
			<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-xs print:hidden">
				<div class="flex items-center gap-2 w-full lg:w-auto">
					<div class="flex items-center gap-1.5 text-xs font-bold text-zinc-400 uppercase tracking-wider mr-2">
						<Filter class="w-3.5 h-3.5" /> Range:
					</div>
					
					<select
						bind:value={preset}
						onchange={(e) => handlePresetChange((e.currentTarget as HTMLSelectElement).value)}
						class="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-brand-primary min-h-[38px] cursor-pointer"
					>
						<option value="this_week">This Week (Mon–Fri)</option>
						<option value="this_month">This Month</option>
						<option value="last_month">Last Month</option>
						<option value="last_30_days">Last 30 Days</option>
						<option value="custom">Custom Date Range</option>
					</select>

					<div class="flex items-center gap-1 ml-2">
						<button
							type="button"
							onclick={() => navigateRange(-1)}
							class="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
							title={navTooltipPrev}
						>
							<ChevronLeft class="w-4 h-4" />
						</button>
						<span class="text-xs font-medium text-zinc-600 dark:text-zinc-400 px-1">
							{data.startDate} to {data.endDate}
						</span>
						<button
							type="button"
							onclick={() => navigateRange(1)}
							class="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
							title={navTooltipNext}
						>
							<ChevronRight class="w-4 h-4" />
						</button>
					</div>
				</div>

				{#if preset === 'custom'}
					<div class="flex items-center gap-2 w-full lg:w-auto">
						<input
							type="date"
							bind:value={startDate}
							class="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-brand-primary min-h-[38px]"
						/>
						<span class="text-xs text-zinc-400">to</span>
						<input
							type="date"
							bind:value={endDate}
							class="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-brand-primary min-h-[38px]"
						/>
						<button
							type="button"
							onclick={applyCustomDateRange}
							class="px-3 py-1.5 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-xl transition-colors min-h-[38px]"
						>
							Apply
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</header>

	<main class="flex-1 px-6 sm:px-10 pb-20 max-w-6xl w-full mx-auto space-y-8">
		{#if !data.enabled}
			<!-- Disabled State Card -->
			<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-10 text-center space-y-6 max-w-xl mx-auto shadow-sm my-12">
				<div class="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
					<CalendarDays class="w-8 h-8" />
				</div>
				<div class="space-y-2">
					<h3 class="text-xl font-bold text-zinc-900 dark:text-zinc-100">Daily Standups are Disabled</h3>
					<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
						Daily Standup check-ins are currently toggled off for this project. Enable it in Project Settings to start logging morning intent and team lead matrix reports.
					</p>
				</div>
				<div>
					<a
						href="/projects/{data.project?.id}/settings"
						class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors min-h-[44px]"
					>
						<Settings class="w-4 h-4" />
						<span>Open Project Settings</span>
					</a>
				</div>
			</div>
		{:else}
			<!-- Summary Metrics Cards -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
					<div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
						<CheckCircle2 class="w-5 h-5" />
					</div>
					<div>
						<div class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{data.grid?.stats?.completionRate || 0}%</div>
						<div class="text-xs text-zinc-400">Completion Rate</div>
					</div>
				</div>

				<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
					<div class="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
						<Sun class="w-5 h-5" />
					</div>
					<div>
						<div class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{data.grid?.stats?.totalSubmitted || 0}</div>
						<div class="text-xs text-zinc-400">Standups Submitted</div>
					</div>
				</div>

				<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
					<div class="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
						<AlertTriangle class="w-5 h-5" />
					</div>
					<div>
						<div class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{data.grid?.stats?.totalBlockers || 0}</div>
						<div class="text-xs text-zinc-400">Blockers Reported</div>
					</div>
				</div>
			</div>

			<!-- Team Matrix View -->
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
						<CalendarDays class="w-5 h-5 text-brand-primary" />
						Team Standup Matrix ({data.startDate} to {data.endDate})
					</h3>
					<span class="text-xs text-zinc-400">Click any date cell to log or edit standup</span>
				</div>

				<StandupGridMatrix
					members={data.grid?.members || []}
					dateStrings={data.dateStrings || []}
					standupsMap={data.grid?.standupsMap || {}}
					currentUserId={data.currentUser?.id}
					onOpenCheckInForDate={openCheckInForDate}
				/>
			</div>
		{/if}
	</main>

	<!-- Check-in Modal -->
	<StandupCheckInModal
		bind:isOpen={isCheckInOpen}
		todayStandup={modalStandupData}
		targetDateStr={modalTargetDate}
		inProgressTasks={data.taskSuggestions?.inProgressTasks || []}
		completedTasks={data.taskSuggestions?.completedTasks || []}
		onSave={handleSaveStandup}
		onClose={() => isCheckInOpen = false}
	/>
</div>
