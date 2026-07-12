<script lang="ts">
	import { toastStore } from '$lib/stores/ui.svelte';
	import { CheckCircle2, AlertCircle, Info, X } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
</script>

<div class="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
	{#each toastStore.toasts as toast (toast.id)}
		<div transition:slide={{ duration: 200 }} class="pointer-events-auto flex items-center gap-3 w-80 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-xl">
			{#if toast.type === 'success'}
				<CheckCircle2 class="w-5 h-5 text-green-500 shrink-0" />
			{:else if toast.type === 'error'}
				<AlertCircle class="w-5 h-5 text-red-500 shrink-0" />
			{:else}
				<Info class="w-5 h-5 text-blue-500 shrink-0" />
			{/if}
			<p class="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{toast.message}</p>
			<button onclick={() => toastStore.remove(toast.id)} class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
				<X class="w-4 h-4" />
			</button>
		</div>
	{/each}
</div>
