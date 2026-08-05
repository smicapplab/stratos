<script lang="ts">
	import { enhance } from '$app/forms';
	import { X } from 'lucide-svelte';

	let { isOpen = $bindable(false), previousStageId = '' }: { isOpen: boolean; previousStageId?: string } = $props();

	let stageName = $state('');
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
		onclick={(e) => { if (e.target === e.currentTarget) isOpen = false; }}
		onkeydown={(e) => { if (e.key === 'Escape') isOpen = false; }}
	>
		<div class="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
			<div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
				<h3 class="text-base font-bold text-zinc-900 dark:text-white">Add New Stage Column</h3>
				<button
					type="button"
					onclick={() => isOpen = false}
					class="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<form
				method="POST"
				action="?/createStage"
				use:enhance={() => {
					return async ({ update }) => {
						stageName = '';
						isOpen = false;
						await update();
					};
				}}
				class="p-6 space-y-4"
			>
				{#if previousStageId}
					<input type="hidden" name="previousStageId" value={previousStageId} />
				{/if}

				<div class="space-y-1.5">
					<label for="stage-name-input" class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
						Column Name
					</label>
					<input
						type="text"
						id="stage-name-input"
						name="name"
						bind:value={stageName}
						placeholder="e.g. In Review"
						required
						class="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 min-h-[44px]"
					/>
				</div>

				<div class="flex justify-end gap-3 pt-2">
					<button
						type="button"
						onclick={() => isOpen = false}
						class="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs font-bold rounded-xl transition-colors min-h-[44px]"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!stageName.trim()}
						class="px-5 py-2.5 bg-brand-primary hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors min-h-[44px]"
					>
						Create Column
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
