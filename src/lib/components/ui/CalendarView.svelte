<script lang="ts">
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import PriorityBadge from '$lib/components/ui/PriorityBadge.svelte';
	import { getTaskIdentifier } from '$lib/utils';
	
	let { tasks, onTaskClick } = $props();

	let currentDate = $state(new Date());
	
	let daysInMonth = $derived(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate());
	let firstDayOfMonth = $derived(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay());
	
	let monthName = $derived(currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }));

	function prevMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
	}
	function nextMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
	}

	let calendarCells = $derived((() => {
		const cells = [];
		for (let i = 0; i < firstDayOfMonth; i++) {
			cells.push(null);
		}
		for (let i = 1; i <= daysInMonth; i++) {
			cells.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
		}
		return cells;
	})());

	let undatedTasks = $derived(tasks.filter((t: any) => !t.dueDate));

	function getTasksForDate(date: Date) {
		return tasks.filter((t: any) => {
			if (!t.dueDate) return false;
			const td = new Date(t.dueDate);
			return td.getFullYear() === date.getFullYear() && td.getMonth() === date.getMonth() && td.getDate() === date.getDate();
		});
	}

	function getPriorityColor(priority: string) {
		switch (priority) {
			case 'Low': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
			case 'Medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
			case 'High': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
			case 'Urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
			default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
		}
	}
</script>

<div class="h-full flex flex-col lg:flex-row p-4 lg:p-8 gap-4 lg:gap-6 overflow-y-auto lg:overflow-hidden">
	<!-- Main Calendar -->
	<div class="flex-1 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
		<!-- Header -->
		<div class="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
			<h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-100">{monthName}</h2>
			<div class="flex items-center gap-1">
				<button class="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" onclick={prevMonth}><ChevronLeft class="w-5 h-5 text-zinc-500" /></button>
				<button class="px-3 py-1 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" onclick={() => currentDate = new Date()}>Today</button>
				<button class="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" onclick={nextMonth}><ChevronRight class="w-5 h-5 text-zinc-500" /></button>
			</div>
		</div>

		<!-- Days row -->
		<div class="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0c0c0d]">
			{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
				<div class="p-2 text-center text-xs font-semibold tracking-wider text-zinc-500">{day}</div>
			{/each}
		</div>

		<!-- Grid -->
		<div class="flex-1 grid grid-cols-7 auto-rows-fr">
			{#each calendarCells as date}
				{#if date === null}
					<div class="border-r border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-white/5"></div>
				{:else}
					{@const dateTasks = getTasksForDate(date)}
					{@const isToday = date.toDateString() === new Date().toDateString()}
					<div class="border-r border-b border-zinc-100 dark:border-zinc-800/50 p-1 flex flex-col gap-1 min-h-[100px]">
						<div class="text-right p-1">
							<span class="text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full {isToday ? 'bg-blue-600 text-white' : 'text-zinc-600 dark:text-zinc-400'}">{date.getDate()}</span>
						</div>
						<div class="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 px-1">
							{#each dateTasks as task}
								{@const parentTask = task.parentTaskId ? tasks.find((t: any) => t.id === task.parentTaskId) : null}
								<button type="button" class="w-full text-left flex flex-col text-[11px] font-semibold px-1.5 py-0.5 rounded border cursor-pointer hover:opacity-80 transition-opacity {getPriorityColor(task.priority)} {parentTask ? 'border-dashed' : ''}" onclick={() => onTaskClick(task)}>
									<div class="truncate">{getTaskIdentifier(task)} {task.title}</div>
									{#if parentTask}
										<div class="text-[9px] text-black/50 dark:text-white/50 truncate mt-0.5">↳ {getTaskIdentifier(parentTask)}</div>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Undated Tasks Rail -->
	<div class="w-full lg:w-72 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col shrink-0 min-h-[300px] lg:min-h-0 mb-20 lg:mb-0">
		<div class="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
			<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">Undated Tasks</h3>
			<span class="text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">{undatedTasks.length}</span>
		</div>
		<div class="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar bg-zinc-50 dark:bg-[#09090b]">
			{#each undatedTasks as task}
				{@const parentTask = task.parentTaskId ? tasks.find((t: any) => t.id === task.parentTaskId) : null}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="p-2.5 bg-white dark:bg-[#18181b] border {parentTask ? 'border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-[#18181b]/50' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg shadow-sm cursor-pointer hover:border-blue-500 transition-colors" onclick={() => onTaskClick(task)}>
					<div class="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 mb-2"><span class="text-zinc-500 mr-1.5 text-xs font-semibold">{getTaskIdentifier(task)}</span>{task.title}</div>
					<div class="flex items-center justify-between">
						<PriorityBadge priority={task.priority} />
						{#if parentTask}
							<div class="text-[10px] text-zinc-500 font-bold bg-zinc-100 dark:bg-white/5 px-1.5 py-0.5 rounded-sm">
								↳ {getTaskIdentifier(parentTask)}
							</div>
						{/if}
					</div>
				</div>
			{/each}
			{#if undatedTasks.length === 0}
				<div class="text-center p-6 text-sm text-zinc-400">All tasks are scheduled!</div>
			{/if}
		</div>
	</div>
</div>
