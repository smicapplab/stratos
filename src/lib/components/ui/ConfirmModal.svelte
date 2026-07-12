<script lang="ts">
	import { modalStore } from '$lib/stores/ui.svelte';
	import { fade, scale } from 'svelte/transition';

	function handleConfirm() {
		const action = modalStore.activeModal?.onConfirm;
		modalStore.close();
		if (action) action();
	}

	function handleCancel() {
		const action = modalStore.activeModal?.onCancel;
		modalStore.close();
		if (action) action();
	}
</script>

{#if modalStore.activeModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div transition:fade={{ duration: 150 }} class="fixed inset-0 z-[110] bg-black/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onclick={handleCancel}>
		<div transition:scale={{ duration: 150, start: 0.95 }} class="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onclick={e => e.stopPropagation()}>
			<div class="p-6">
				<h2 class="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{modalStore.activeModal.title}</h2>
				<p class="text-sm text-zinc-600 dark:text-zinc-400 mb-8">{modalStore.activeModal.description}</p>
				
				<div class="flex items-center justify-end gap-3">
					<button onclick={handleCancel} class="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
						{modalStore.activeModal.cancelText || 'Cancel'}
					</button>
					<button onclick={handleConfirm} class="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors {modalStore.activeModal.destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}">
						{modalStore.activeModal.confirmText || 'Confirm'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
