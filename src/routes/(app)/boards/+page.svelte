<script lang="ts">
	import { enhance } from '$app/forms';
	import { KanbanSquare, Trash2, FolderOpen, Plus } from 'lucide-svelte';

	let { data } = $props();
	let boards = $derived(data.boards);
	let projects = $derived(data.projects);
	let user = $derived(data.user);

	import CreateBoardModal from '$lib/components/boards/CreateBoardModal.svelte';
	
	let isCreating = $state(false);
</script>

<CreateBoardModal bind:isOpen={isCreating} projects={projects} />

<div class="p-8 max-w-7xl mx-auto space-y-8">
	
	<!-- Header -->
	<div class="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
		<div>
			<h1 class="text-3xl font-semibold tracking-tight">Boards</h1>
			<p class="text-zinc-500 dark:text-zinc-400 mt-1">Kanban views for your active projects.</p>
		</div>
		
		{#if user.role === 'Admin'}
			<button 
				class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-medium transition-all transform hover:scale-[1.02] active:scale-95 flex items-center gap-2"
				onclick={() => isCreating = true}
			>
				<Plus class="w-4 h-4" />
				New Board
			</button>
		{/if}
	</div>

	<!-- Boards Grid -->
	{#if boards.length === 0}
		<div class="flex flex-col items-center justify-center py-24 px-8 mt-12 bg-zinc-50/50 dark:bg-zinc-900/20 backdrop-blur-sm border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center">
			<div class="w-16 h-16 bg-white dark:bg-zinc-800 shadow-sm rounded-2xl flex items-center justify-center mb-6 border border-zinc-100 dark:border-zinc-700">
				<KanbanSquare class="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
			</div>
			<h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">No boards yet</h3>
			<p class="text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm leading-relaxed">
				Boards organize your tasks and streamline your workflow. 
				{#if user.role === 'Admin'}<br/>Create your first board above to get started.{/if}
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each boards as board}
				<div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all hover:border-blue-500/30 dark:hover:border-blue-400/30 flex flex-col h-[200px]">
					
					<div class="flex items-start justify-between">
						<div class="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shrink-0">
							<KanbanSquare class="w-6 h-6" />
						</div>
						
						{#if user.role === 'Admin'}
							<form method="POST" action="?/delete" use:enhance class="opacity-0 group-hover:opacity-100 transition-opacity">
								<input type="hidden" name="boardId" value={board.id} />
								<button type="submit" class="p-2 text-zinc-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete Board">
									<Trash2 class="w-4 h-4" />
								</button>
							</form>
						{/if}
					</div>
					
					<a href="/boards/{board.id}" class="flex-1 block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md">
						<h3 class="text-lg font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{board.name}</h3>
						<div class="flex items-center gap-2 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
							<FolderOpen class="w-4 h-4" />
							<span>{board.projectName}</span>
						</div>
					</a>
				</div>
			{/each}
		</div>
	{/if}

</div>
