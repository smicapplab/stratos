<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title = '',
		loading = false,
		children,
		headerAction
	}: {
		title?: string;
		loading?: boolean;
		children?: Snippet;
		headerAction?: Snippet;
	} = $props();
</script>

<div class="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col h-full overflow-hidden transition-all duration-200 hover:shadow-md">
	{#if title || headerAction}
		<div class="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
			<h3 class="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h3>
			{#if headerAction}
				<div class="flex items-center">
					{@render headerAction()}
				</div>
			{/if}
		</div>
	{/if}
	
	<div class="p-4 flex-1 flex flex-col min-h-0 relative">
		{#if loading}
			<div class="absolute inset-0 z-10 flex flex-col p-4 space-y-3 bg-white dark:bg-zinc-950">
				<div class="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 animate-pulse"></div>
				<div class="h-20 bg-zinc-200 dark:bg-zinc-800 rounded w-full animate-pulse"></div>
				<div class="h-20 bg-zinc-200 dark:bg-zinc-800 rounded w-full animate-pulse"></div>
			</div>
		{/if}
		
		<div class="flex-1 flex flex-col {loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300">
			{#if children}
				{@render children()}
			{/if}
		</div>
	</div>
</div>
