<script lang="ts">
	import { enhance } from '$app/forms';


	let { 
		isOpen = $bindable(false),
		projects = [],
		selectedProjectId = null
	} = $props<{
		isOpen: boolean,
		projects: Array<{id: string, name: string}>,
		selectedProjectId?: string | null
	}>();

	import { toastStore } from '$lib/stores/ui.svelte';
	
	let newBoardName = $state('');
	let newBoardPrefix = $state('');
	let prefixTouched = $state(false);
	
	// When opened, if a selectedProjectId is passed, we update it via effect
	let currentProjectId = $state('');

	$effect(() => {
		if (isOpen) {
			if (selectedProjectId) currentProjectId = selectedProjectId;
		}
	});

	function handleNameChange(e: Event) {
		const target = e.target as HTMLInputElement;
		newBoardName = target.value;
		if (!prefixTouched) {
			const words = newBoardName.split(/[^a-zA-Z0-9]/).filter(w => w.length > 0);
			if (words.length >= 3) {
				newBoardPrefix = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
			} else if (words.length === 2) {
				newBoardPrefix = (words[0][0] + words[1][0] + (words[1][1] || words[0][1] || 'X')).toUpperCase();
			} else if (words.length === 1) {
				newBoardPrefix = words[0].substring(0, 3).toUpperCase();
			} else {
				newBoardPrefix = '';
			}
		}
	}

	function handlePrefixInput(e: Event) {
		const target = e.target as HTMLInputElement;
		newBoardPrefix = target.value.toUpperCase();
		prefixTouched = true;
	}
	
	function close() {
		isOpen = false;
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in duration-200">
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
			<div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
				<h2 class="text-xl font-semibold text-zinc-900 dark:text-white">Create a New Board</h2>
				<button type="button" onclick={close} class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
					✕
				</button>
			</div>
			
			<form method="POST" action="/boards?/create" use:enhance={() => {
				return async ({ update, result }) => {
					if (result.type === 'success') {
						isOpen = false;
						newBoardName = '';
						newBoardPrefix = '';
						prefixTouched = false;
						currentProjectId = '';
						toastStore?.success('Board created successfully');
					} else if (result.type === 'failure') {
						toastStore?.error((result.data as any)?.error || 'Failed to create board');
					}
					update({ reset: false });
				};
			}} class="p-6 space-y-5">
				<div class="space-y-2">
					<label for="name" class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Board Name</label>
					<input type="text" name="name" id="name" required placeholder="e.g. Q3 Sprint Planning" bind:value={newBoardName} oninput={handleNameChange} class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-900 dark:text-white" />
				</div>
				
				<div class="flex gap-4">
					<div class="flex-1 space-y-2">
						<label for="projectId" class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Assign to Project</label>
						<select name="projectId" id="projectId" bind:value={currentProjectId} class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-900 dark:text-white" required>
							<option value="" disabled selected>Select a project...</option>
							{#each projects as project}
								<option value={project.id}>{project.name}</option>
							{/each}
						</select>
					</div>
					<div class="w-28 space-y-2">
						<label for="prefix" class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Prefix</label>
						<input type="text" name="prefix" id="prefix" required maxlength="10" placeholder="e.g. HRP" value={newBoardPrefix} oninput={handlePrefixInput} class="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 focus:ring-blue-500 focus:border-blue-500 rounded-lg focus:outline-none focus:ring-2 transition-all uppercase text-zinc-900 dark:text-white font-mono" />
					</div>
				</div>
				
				<div class="pt-4 flex justify-end gap-3">
					<button type="button" onclick={close} class="px-5 py-2 text-zinc-600 dark:text-zinc-400 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
						Cancel
					</button>
					<button type="submit" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
						Create Board
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
