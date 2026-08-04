<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/stores/ui.svelte';

	let { 
		isOpen = $bindable(false)
	} = $props<{
		isOpen: boolean
	}>();
	
	let newProjectName = $state('');
	
	function close() {
		isOpen = false;
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in duration-200">
		<div role="dialog" aria-modal="true" aria-labelledby="modal-title" class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
			<div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
				<h2 id="modal-title" class="text-xl font-semibold text-zinc-900 dark:text-white">Create a New Project</h2>
				<button type="button" aria-label="Close modal" onclick={close} class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
					✕
				</button>
			</div>
			
			<form method="POST" action="/projects?/create" use:enhance={() => {
				return async ({ update, result }) => {
					if (result.type === 'success') {
						isOpen = false;
						newProjectName = '';
						toastStore?.success('Project created successfully');
					} else if (result.type === 'failure') {
						const errorMsg = result.data && typeof result.data.error === 'string' 
							? result.data.error 
							: 'Failed to create project';
						toastStore?.error(errorMsg);
					}
					await update({ reset: false });
				};
			}} class="p-6 space-y-5">
				<div class="space-y-2">
					<label for="name" class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Project Name</label>
					<input type="text" name="name" id="name" required placeholder="e.g. Marketing Site Redesign" bind:value={newProjectName} class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all text-zinc-900 dark:text-white" />
				</div>
				
				<div class="space-y-2">
					<label for="visibility" class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Visibility</label>
					<select name="visibility" id="visibility" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all text-zinc-900 dark:text-white">
						<option value="Public">Public - Visible to everyone in the workspace</option>
						<option value="Private">Private - Only visible to invited members</option>
					</select>
				</div>
				
				<div class="space-y-2">
					<label for="icon" class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Icon</label>
					<select name="icon" id="icon" class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all text-zinc-900 dark:text-white">
						{#each ['Folder', 'Code', 'Briefcase', 'Layers', 'Rocket', 'Star', 'Heart', 'Zap', 'Box', 'Compass', 'Laptop', 'Database', 'Globe', 'Hash'] as iconName}
							<option value={iconName}>{iconName}</option>
						{/each}
					</select>
				</div>
				
				<div class="pt-4 flex justify-end gap-3">
					<button type="button" onclick={close} class="px-5 py-2 text-zinc-600 dark:text-zinc-400 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
						Cancel
					</button>
					<button type="submit" class="px-6 py-2 bg-brand-primary hover:opacity-90 text-white rounded-lg font-medium transition-colors">
						Create Project
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
