<script lang="ts">
	import { Search, FolderKanban, KanbanSquare, CheckSquare } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { getTaskIdentifier } from '$lib/utils';
	
	let isOpen = $state(false);
	let searchQuery = $state('');
	
	let results = $state<{tasks: any[], boards: any[], projects: any[]}>({ tasks: [], boards: [], projects: [] });
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			isOpen = !isOpen;
			if (isOpen) {
				setTimeout(() => {
					document.getElementById('cmd-palette-input')?.focus();
				}, 50);
			}
		} else if (e.key === 'Escape' && isOpen) {
			isOpen = false;
			searchQuery = '';
			results = { tasks: [], boards: [], projects: [] };
		}
	}
	
	$effect(() => {
		if (searchQuery.length >= 2) {
			fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
				.then(r => r.json())
				.then(data => {
					results = data;
				});
		} else {
			results = { tasks: [], boards: [], projects: [] };
		}
	});

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

{#if isOpen}
	<div class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick={() => isOpen = false}></div>
		
		<div class="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden relative z-10 border border-zinc-200 dark:border-zinc-800 flex flex-col mx-4 origin-top animate-in fade-in zoom-in-95 duration-200">
			<div class="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
				<Search class="w-5 h-5 text-zinc-400" />
				<!-- svelte-ignore a11y_autofocus -->
				<input id="cmd-palette-input" type="text" bind:value={searchQuery} placeholder="Search tasks, boards, or projects..." class="flex-1 bg-transparent outline-none text-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500" autocomplete="off" spellcheck="false" />
			</div>
			
			<div class="max-h-[60vh] overflow-y-auto custom-scrollbar">
				{#if searchQuery.length < 2}
					<div class="p-8 text-center text-zinc-500 text-sm">
						Type at least 2 characters to search...
					</div>
				{:else if results.tasks.length === 0 && results.boards.length === 0 && results.projects.length === 0}
					<div class="p-8 text-center text-zinc-500 text-sm">
						No results found for "{searchQuery}"
					</div>
				{:else}
					<div class="p-2 space-y-4">
						{#if results.projects.length > 0}
							<div>
								<div class="px-3 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Projects</div>
								<div class="mt-1 space-y-1">
									{#each results.projects as project}
										<a href="/projects" onclick={() => isOpen = false} class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors">
											<FolderKanban class="w-4 h-4 text-zinc-400" />
											<span class="font-medium">{project.name}</span>
										</a>
									{/each}
								</div>
							</div>
						{/if}
						
						{#if results.boards.length > 0}
							<div>
								<div class="px-3 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Boards</div>
								<div class="mt-1 space-y-1">
									{#each results.boards as board}
										<a href="/boards/{board.id}" onclick={() => isOpen = false} class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors">
											<KanbanSquare class="w-4 h-4 text-zinc-400" />
											<span class="font-medium">{board.name}</span>
										</a>
									{/each}
								</div>
							</div>
						{/if}

						{#if results.tasks.length > 0}
							<div>
								<div class="px-3 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tasks</div>
								<div class="mt-1 space-y-1">
									{#each results.tasks as task}
										<a href="/boards/{task.boardId}?task={task.id}" onclick={() => isOpen = false} class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors">
											<CheckSquare class="w-4 h-4 text-zinc-400 shrink-0" />
											<div class="flex flex-col min-w-0">
												<span class="font-medium truncate"><span class="text-zinc-500 mr-1.5 text-xs">{getTaskIdentifier(task)}</span>{task.title}</span>
											</div>
										</a>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
			
			<div class="p-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
				<div class="flex items-center gap-4 text-xs text-zinc-500">
					<span class="flex items-center gap-1"><kbd class="px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-sans shadow-sm text-[10px]">↵</kbd> to select</span>
					<span class="flex items-center gap-1"><kbd class="px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-sans shadow-sm text-[10px]">ESC</kbd> to close</span>
				</div>
			</div>
		</div>
	</div>
{/if}
