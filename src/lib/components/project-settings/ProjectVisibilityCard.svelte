<script lang="ts">
	import { enhance } from '$app/forms';
	import { ShieldAlert } from 'lucide-svelte';

	let { project, isProjectAdmin }: { project: any; isProjectAdmin: boolean } = $props();
</script>

<section class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-5 sm:p-6">
	<h3 class="text-sm font-bold flex items-center gap-2 mb-4 text-zinc-900 dark:text-zinc-100">
		<ShieldAlert class="w-4 h-4 text-zinc-400" />
		Project Visibility
	</h3>

	<form
		method="POST"
		action="?/updateVisibility"
		use:enhance
		class="space-y-4"
	>
		<div class="space-y-3">
			<label class="flex items-start gap-3 cursor-pointer group p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
				<div class="flex items-center h-5 mt-0.5">
					<input
						type="radio"
						name="visibility"
						value="Public"
						checked={project.visibility === "Public"}
						disabled={!isProjectAdmin}
						class="w-4 h-4 text-brand-primary border-zinc-300 focus:ring-brand-primary disabled:opacity-50"
					/>
				</div>
				<div>
					<div class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-brand-primary transition-colors">
						Public to Group
					</div>
					<div class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
						Everyone in the workspace group can view tasks and boards.
					</div>
				</div>
			</label>

			<label class="flex items-start gap-3 cursor-pointer group p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
				<div class="flex items-center h-5 mt-0.5">
					<input
						type="radio"
						name="visibility"
						value="Private"
						checked={project.visibility === "Private"}
						disabled={!isProjectAdmin}
						class="w-4 h-4 text-brand-primary border-zinc-300 focus:ring-brand-primary disabled:opacity-50"
					/>
				</div>
				<div>
					<div class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-brand-primary transition-colors">
						Private to Members
					</div>
					<div class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
						Only explicitly invited team members can view this project.
					</div>
				</div>
			</label>
		</div>

		{#if isProjectAdmin}
			<button
				type="submit"
				class="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm font-semibold rounded-xl transition-colors mt-4 min-h-[44px]"
			>
				Save Visibility
			</button>
		{/if}
	</form>
</section>
