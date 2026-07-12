<script lang="ts">
	import { ChevronDown } from 'lucide-svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { twMerge } from 'tailwind-merge';

	let { 
		value = $bindable(), 
		class: className = '',
		children,
		...rest 
	}: HTMLSelectAttributes & { value?: any } = $props();
</script>

<div class="relative w-full">
	<select
		bind:value
		class={twMerge(
			"w-full appearance-none bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-zinc-900 dark:text-zinc-100 cursor-pointer",
			className as string
		)}
		{...rest}
	>
		{@render children?.()}
	</select>
	<div class="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-500 dark:text-zinc-400">
		<ChevronDown class="w-4 h-4" />
	</div>
</div>
