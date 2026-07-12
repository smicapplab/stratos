<script lang="ts">
	import { ArrowUp, ArrowRight, ArrowDown, AlertCircle } from 'lucide-svelte';

	let { priority = 'Medium', showLabel = true } = $props();

	let config = $derived((() => {
		switch (priority) {
			case 'Urgent':
				return { bg: 'bg-red-500/10 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400', icon: AlertCircle };
			case 'High':
				return { bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-400', icon: ArrowUp };
			case 'Low':
				return { bg: 'bg-zinc-500/10 dark:bg-zinc-500/20', text: 'text-zinc-600 dark:text-zinc-400', icon: ArrowDown };
			default:
				return { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400', icon: ArrowRight };
		}
	})());
	let Icon = $derived(config.icon);
</script>

<div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider {config.bg} {config.text}">
	<Icon class="w-3 h-3" strokeWidth={3} />
	{#if showLabel}
		<span>{priority}</span>
	{/if}
</div>
