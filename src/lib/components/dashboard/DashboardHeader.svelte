<script lang="ts">
	import { goto } from '$app/navigation';

	let { selectedRange = '1w', selectedStart = '', selectedEnd = '' }: { selectedRange: string; selectedStart: string; selectedEnd: string } = $props();

	let customStart = $state('');
	let customEnd = $state('');

	$effect(() => {
		customStart = selectedStart || '';
		customEnd = selectedEnd || '';
	});

	function selectRange(range: string) {
		goto(`/dashboard?range=${range}`);
	}

	function applyCustomRange(e: SubmitEvent) {
		e.preventDefault();
		if (!customStart || !customEnd) return;
		goto(`/dashboard?range=custom&start=${customStart}&end=${customEnd}`);
	}
</script>

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
				class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] {selectedRange === '1w' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
			>
				1 Week
			</button>
			<button 
				onclick={() => selectRange('30d')}
				class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] {selectedRange === '30d' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
			>
				30 Days
			</button>
			<button 
				onclick={() => selectRange('60d')}
				class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] {selectedRange === '60d' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
			>
				60 Days
			</button>
			<button 
				onclick={() => selectRange('custom')} 
				class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] {selectedRange === 'custom' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 dark:text-zinc-400'}"
			>
				Custom
			</button>
		</div>
		
		{#if selectedRange === 'custom'}
			<form onsubmit={applyCustomRange} class="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80">
				<input 
					type="date" 
					bind:value={customStart} 
					required 
					class="bg-transparent text-xs font-medium text-zinc-700 dark:text-zinc-300 border-0 outline-none p-1 focus:ring-0 min-h-[36px]"
				/>
				<span class="text-zinc-400 text-xs">to</span>
				<input 
					type="date" 
					bind:value={customEnd} 
					required 
					class="bg-transparent text-xs font-medium text-zinc-700 dark:text-zinc-300 border-0 outline-none p-1 focus:ring-0 min-h-[36px]"
				/>
				<button 
					type="submit" 
					class="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold rounded-lg shadow-xs transition-all min-h-[36px]"
				>
					Apply
				</button>
			</form>
		{/if}
	</div>
</div>
