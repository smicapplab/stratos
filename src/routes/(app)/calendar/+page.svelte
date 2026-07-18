<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import CalendarView from '$lib/components/ui/CalendarView.svelte';
	import TaskDrawer from '$lib/components/task/TaskDrawer.svelte';

	let { data } = $props();

	let activeTask = $state(null);
	let showCreateModal = $state(false);
	let selectedDate = $state<Date | null>(null);

	let taskTitle = $state('');
	let selectedProjectId = $state('');
	let selectedBoardId = $state('');
	let selectedAssigneeId = $state('');

	// Derives boards list matching the selected project
	let filteredBoards = $derived(
		data.boards.filter((b: any) => b.projectId === selectedProjectId)
	);

	// Derives the first stage of the selected board to submit the task to
	let selectedStageId = $derived((() => {
		if (!selectedBoardId) return '';
		const boardStages = data.stages.filter((s: any) => s.boardId === selectedBoardId);
		if (boardStages.length === 0) return '';
		const sorted = [...boardStages].sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));
		return sorted[0].id;
	})());

	function handleTaskClick(task: any) {
		activeTask = task;
	}

	function handleAddEvent(date: Date) {
		selectedDate = date;
		taskTitle = '';
		selectedAssigneeId = data.user?.id || '';
		
		if (data.projects && data.projects.length > 0) {
			selectedProjectId = data.projects[0].id;
		} else {
			selectedProjectId = '';
		}
		
		showCreateModal = true;
	}

	// Svelte 5 effect to automatically sync default board selection when filteredBoards changes
	$effect(() => {
		if (filteredBoards.length > 0) {
			if (!filteredBoards.some((b: any) => b.id === selectedBoardId)) {
				selectedBoardId = filteredBoards[0].id;
			}
		} else {
			selectedBoardId = '';
		}
	});

	async function handleReschedule(task: any, targetDate: Date) {
		const oldDate = task.dueDate;
		
		// Optimistic update
		task.dueDate = targetDate.toISOString();
		
		const formData = new FormData();
		formData.append('taskId', task.id);
		formData.append('title', task.title);
		formData.append('description', task.description || '');
		formData.append('priority', task.priority || 'Medium');
		formData.append('assigneeId', task.assigneeId || '');
		formData.append('dueDate', targetDate.toISOString());
		
		try {
			const res = await fetch('?/updateTask', {
				method: 'POST',
				body: formData
			});
			if (!res.ok) {
				task.dueDate = oldDate;
			}
			await invalidateAll();
		} catch (err) {
			task.dueDate = oldDate;
		}
	}
</script>

<svelte:head>
	<title>My Calendar | Stratos</title>
</svelte:head>

<div class="h-full flex flex-col relative">
	<header class="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-[#0c0c0d]/50 backdrop-blur-sm flex items-center px-8 shrink-0">
		<h1 class="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">My Calendar</h1>
	</header>
	
	<div class="flex-1 overflow-y-auto overflow-x-hidden relative bg-zinc-50 dark:bg-[#09090b]">
		<CalendarView 
			tasks={data.tasks}
			onTaskClick={handleTaskClick}
			onReschedule={handleReschedule}
			onAddEvent={handleAddEvent}
		/>

		{#if activeTask}
			<TaskDrawer 
				bind:task={activeTask} 
				allTasks={data.tasks} 
				groupUsers={data.groupUsers} 
				stages={data.stages} 
				customFields={data.customFields} 
				onClose={() => { activeTask = null; }} 
			/>
		{/if}
	</div>

	<!-- Quick Create Modal (Stratos premium overlay standard) -->
	{#if showCreateModal && selectedDate}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
			<div class="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 w-[450px] max-w-full space-y-5">
				<div>
					<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Schedule New Task</h3>
					<p class="text-xs text-zinc-500 mt-1">Add a task on {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
				</div>

				<form 
					method="POST" 
					action="?/createCalendarTask" 
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								showCreateModal = false;
								await invalidateAll();
							}
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="dueDate" value={selectedDate.toISOString()} />
					<input type="hidden" name="stageId" value={selectedStageId} />

					<!-- Title -->
					<div class="space-y-1.5">
						<label for="task-title" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Task Title</label>
						<input 
							id="task-title"
							type="text" 
							name="title" 
							bind:value={taskTitle}
							placeholder="What needs to be done?" 
							required 
							class="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
						/>
					</div>

					<!-- Project Select -->
					<div class="space-y-1.5">
						<label for="project-select" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Project</label>
						<select 
							id="project-select"
							bind:value={selectedProjectId}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-900 dark:text-zinc-100 min-h-[40px]"
						>
							{#each data.projects as project}
								<option value={project.id}>{project.name}</option>
							{/each}
						</select>
					</div>

					<!-- Board Select -->
					<div class="space-y-1.5">
						<label for="board-select" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Board</label>
						<select 
							id="board-select"
							bind:value={selectedBoardId}
							disabled={filteredBoards.length === 0}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-900 dark:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
						>
							{#each filteredBoards as board}
								<option value={board.id}>{board.name}</option>
							{:else}
								<option value="">No boards available</option>
							{/each}
						</select>
					</div>

					<!-- Assignee Select -->
					<div class="space-y-1.5">
						<label for="assignee-select" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Assignee</label>
						<select 
							id="assignee-select"
							name="assigneeId"
							bind:value={selectedAssigneeId}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-900 dark:text-zinc-100 min-h-[40px]"
						>
							<option value="">Unassigned</option>
							{#each data.groupUsers as user}
								<option value={user.id}>{user.name}</option>
							{/each}
						</select>
					</div>

					<!-- Actions -->
					<div class="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
						<button 
							type="button" 
							class="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all min-h-[40px]"
							onclick={() => showCreateModal = false}
						>
							Cancel
						</button>
						<button 
							type="submit" 
							disabled={!selectedStageId || !taskTitle}
							class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all transform hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
						>
							Create Task
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
