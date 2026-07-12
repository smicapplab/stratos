<script lang="ts">
	import TableView from '$lib/components/ui/TableView.svelte';
	import TaskDrawer from '$lib/components/task/TaskDrawer.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Task = PageData['tasks'][number];
	let activeTask = $state<Task | null>(null);

	// Process tasks to attach "stages" based on due date urgency
	let tasks = $derived.by(() => {
		const now = new Date();
		now.setHours(0, 0, 0, 0);

		return data.tasks.map((task) => {
			let stageId = 'no-date';
			if (task.dueDate) {
				const due = new Date(task.dueDate);
				due.setHours(0, 0, 0, 0);
				const diffTime = due.getTime() - now.getTime();
				const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

				if (diffDays < 0) {
					stageId = 'overdue';
				} else if (diffDays === 0) {
					stageId = 'today';
				} else if (diffDays <= 7) {
					stageId = 'this-week';
				} else {
					stageId = 'upcoming';
				}
			}
			return { ...task, stageId };
		});
	});

	const stages = [
		{ id: 'overdue', name: 'Overdue' },
		{ id: 'today', name: 'Today' },
		{ id: 'this-week', name: 'This Week' },
		{ id: 'upcoming', name: 'Upcoming' },
		{ id: 'no-date', name: 'No Date' }
	];

	function handleTaskClick(task: Task) {
		activeTask = task;
	}
</script>

<svelte:head>
	<title>My Tasks | Stratos</title>
</svelte:head>

<div class="h-full flex flex-col">
	<header class="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-[#0c0c0d]/50 backdrop-blur-sm flex items-center px-8 shrink-0">
		<h1 class="text-xl font-bold text-zinc-900 dark:text-zinc-100">My Tasks</h1>
	</header>
	
	<div class="flex-1 overflow-y-auto relative">
		<TableView 
			tasks={tasks}
			stages={stages}
			groupUsers={data.groupUsers}
			onTaskClick={handleTaskClick}
			readOnly={true}
			showBoard={true}
		/>

		{#if activeTask}
			<TaskDrawer 
				bind:task={activeTask} 
				allTasks={data.tasks} 
				groupUsers={data.groupUsers} 
				stages={[]} 
				customFields={[]} 
				onClose={() => { activeTask = null; }} 
			/>
		{/if}
	</div>
</div>
