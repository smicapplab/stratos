<script lang="ts">
	import { ArrowUp, ArrowRight, ArrowDown, AlertCircle } from 'lucide-svelte';

	let { priority = 'Medium', showLabel = true } = $props();

	let config = $derived((() => {
		switch (priority) {
			case 'Urgent':
				return { bg: 'bg-red-500/10 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400', icon: AlertCircle };
			case 'High':
				return { bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', icon: ArrowUp };
			case 'Low':
				return { bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', icon: ArrowDown };
			default:
				return { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', icon: ArrowRight };
		}
	})());
	let Icon = $derived(config.icon);
</script>

<div class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider {config.bg} {config.text}">
	<Icon class="w-3 h-3 shrink-0" strokeWidth={2.5} />
	{#if showLabel}
		<span>{priority}</span>
	{/if}
</div>
