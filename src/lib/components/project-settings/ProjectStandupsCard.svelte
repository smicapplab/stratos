<script lang="ts">
	import { enhance } from '$app/forms';
	import { CalendarDays } from 'lucide-svelte';
	import { toastStore } from '$lib/stores/ui.svelte';

	let { project, isProjectAdmin }: { project: any; isProjectAdmin: boolean } = $props();

	let enableStandups = $state(false);

	$effect(() => {
		enableStandups = !!project.enableStandups;
	});
</script>

<section class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-5 sm:p-6">
	<h3 class="text-sm font-bold flex items-center gap-2 mb-2 text-zinc-900 dark:text-zinc-100">
		<CalendarDays class="w-4 h-4 text-brand-primary" />
		Daily Standups Feature
	</h3>
	<p class="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
		Enable asynchronous morning focus and evening outcome check-ins for team members on this project. When enabled, a "Daily Standup" menu item will appear at the bottom of the project sidebar.
	</p>

	<form
		method="POST"
		action="?/updateStandupsToggle"
		use:enhance={() => {
			return async ({ update, result }) => {
				await update({ reset: false });
				if (result.type === 'success') {
					toastStore.success('Daily Standup settings updated');
				} else if (result.type === 'failure') {
					toastStore.error((result.data as any)?.error || 'Failed to update settings');
				}
			};
		}}
		class="flex items-center justify-between gap-4 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40"
	>
		<div>
			<span class="block text-sm font-bold text-zinc-900 dark:text-zinc-100">Enable Daily Standup</span>
			<span class="block text-xs text-zinc-500 dark:text-zinc-400">Opt-in feature for team lead matrix reports and activity check-ins.</span>
		</div>

		<label class="relative inline-flex items-center cursor-pointer shrink-0 min-h-[44px] min-w-[44px]">
			<input
				type="checkbox"
				name="enableStandups"
				bind:checked={enableStandups}
				disabled={!isProjectAdmin}
				onchange={(e) => (e.currentTarget.form as HTMLFormElement)?.requestSubmit()}
				class="sr-only peer"
			/>
			<div class="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-zinc-600 peer-checked:bg-brand-primary"></div>
		</label>
	</form>
</section>
