<script lang="ts">
	import { enhance } from '$app/forms';
	import { Settings } from 'lucide-svelte';

	let { project, isProjectAdmin }: { project: any; isProjectAdmin: boolean } = $props();
</script>

<section class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-5 sm:p-6">
	<h3 class="text-sm font-bold flex items-center gap-2 mb-4 text-zinc-900 dark:text-zinc-100">
		<Settings class="w-4 h-4 text-zinc-400" />
		Project Profile
	</h3>

	<form
		method="POST"
		action="?/updateProjectSettings"
		use:enhance
		class="space-y-4"
	>
		<div>
			<label
				for="name"
				class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5"
			>
				Project Name
			</label>
			<input
				type="text"
				id="name"
				name="name"
				value={project.name}
				disabled={!isProjectAdmin}
				required
				class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 disabled:opacity-50 min-h-[44px]"
			/>
		</div>

		<div>
			<label
				for="icon"
				class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5"
			>
				Project Icon
			</label>
			<div class="relative">
				<select
					id="icon"
					name="icon"
					disabled={!isProjectAdmin}
					class="w-full appearance-none bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
				>
					{#each ['Folder', 'Code', 'Briefcase', 'Layers', 'Rocket', 'Star', 'Heart', 'Zap', 'Box', 'Compass', 'Laptop', 'Database', 'Globe', 'Hash'] as iconName}
						<option value={iconName} selected={project.icon === iconName}>
							{iconName}
						</option>
					{/each}
				</select>
				<div class="absolute inset-y-0 right-2 flex items-center pointer-events-none text-zinc-500">
					<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="m6 9 6 6 6-6" />
					</svg>
				</div>
			</div>
		</div>

		{#if isProjectAdmin}
			<button
				type="submit"
				class="px-5 py-2.5 bg-brand-primary hover:opacity-90 text-white text-sm font-semibold rounded-xl transition-colors mt-4 min-h-[44px]"
			>
				Save Profile
			</button>
		{/if}
	</form>
</section>
