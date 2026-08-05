<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { modalStore } from '$lib/stores/ui.svelte';

	let { project }: { project: any } = $props();
</script>

<section class="bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-2xl overflow-hidden">
	<div class="px-6 py-4 border-b border-red-200 dark:border-red-900/30 flex items-center gap-3">
		<div class="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
			<svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
			</svg>
		</div>
		<div>
			<h3 class="text-base font-semibold text-red-900 dark:text-red-400">
				Danger Zone
			</h3>
			<p class="text-xs text-red-700 dark:text-red-500 mt-0.5">
				Irreversible actions for this project.
			</p>
		</div>
	</div>

	<div class="p-6">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div>
				<h4 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
					Delete Project
				</h4>
				<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
					This will permanently hide the project and all its boards and tasks. You will be able to reuse this project name again.
				</p>
			</div>

			<form
				method="POST"
				action="?/delete"
				id="delete-project-form"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'redirect') {
							await goto(result.location, { invalidateAll: true });
						} else {
							await update();
						}
					};
				}}
			>
				<button
					type="button"
					class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors whitespace-nowrap min-h-[44px]"
					onclick={() => {
						modalStore.show({
							title: 'Delete Project',
							description: `Are you sure you want to delete "${project.name}"? This will permanently hide the project and all its boards. You will be able to reuse this project name later.`,
							confirmText: 'Delete Project',
							destructive: true,
							onConfirm: () => {
								(document.getElementById('delete-project-form') as HTMLFormElement)?.requestSubmit();
							}
						});
					}}
				>
					Delete Project
				</button>
			</form>
		</div>
	</div>
</section>
