<script lang="ts">
	import CalendarView from '$lib/components/ui/CalendarView.svelte';
	import TaskDrawer from '$lib/components/task/TaskDrawer.svelte';

	let { data } = $props();

	let activeTask = $state(null);

	function handleTaskClick(task: any) {
		activeTask = task;
	}
</script>

<svelte:head>
	<title>My Calendar | Stratos</title>
</svelte:head>

<div class="h-full flex flex-col">
	<header class="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-[#0c0c0d]/50 backdrop-blur-sm flex items-center px-8 shrink-0">
		<h1 class="text-xl font-bold text-zinc-900 dark:text-zinc-100">My Calendar</h1>
	</header>
	
	<div class="flex-1 overflow-y-auto overflow-x-hidden relative">
		<CalendarView 
			tasks={data.tasks}
			onTaskClick={handleTaskClick}
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
