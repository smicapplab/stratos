<script lang="ts">
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import PriorityBadge from '$lib/components/ui/PriorityBadge.svelte';
	import { getTaskIdentifier } from '$lib/utils';
	
	let { 
		tasks, 
		onTaskClick, 
		onReschedule = undefined, 
		onAddEvent = undefined 
	} = $props<{
		tasks: any[];
		onTaskClick: (task: any) => void;
		onReschedule?: (task: any, date: Date) => Promise<void> | void;
		onAddEvent?: (date: Date) => void;
	}>();

	let currentDate = $state(new Date());
	
	let monthName = $derived(currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }));

	function prevMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
	}
	function nextMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
	}

	let calendarCells = $derived((() => {
		const cells = [];
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		
		const start = new Date(year, month, 1);
		const startDay = start.getDay();
		start.setDate(1 - startDay); // Shift back to the first Sunday
		
		for (let i = 0; i < 42; i++) {
			cells.push(new Date(start.getTime()));
			start.setDate(start.getDate() + 1);
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

	let draggedTask = $state<any>(null);

	function handleDragStart(e: DragEvent, task: any) {
		draggedTask = task;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', task.id);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
	}

	async function handleDrop(e: DragEvent, date: Date) {
		e.preventDefault();
		if (draggedTask) {
			const task = draggedTask;
			draggedTask = null;
			if (onReschedule) {
				await onReschedule(task, date);
			}
		}
	}
</script>

<div class="h-full flex flex-col lg:flex-row p-4 lg:p-8 gap-4 lg:gap-6 overflow-y-auto lg:overflow-hidden bg-zinc-50 dark:bg-[#09090b]">
	<!-- Main Calendar -->
	<div class="flex-1 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
		<!-- Header -->
		<div class="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
			<h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{monthName}</h2>
			<div class="flex items-center gap-1">
				<button class="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" onclick={prevMonth}><ChevronLeft class="w-4.5 h-4.5 text-zinc-500" /></button>
				<button class="px-3 py-1 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" onclick={() => currentDate = new Date()}>Today</button>
				<button class="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" onclick={nextMonth}><ChevronRight class="w-4.5 h-4.5 text-zinc-500" /></button>
			</div>
		</div>

		<!-- Days row -->
		<div class="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0c0c0d]">
			{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
				<div class="p-2 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-400">{day}</div>
			{/each}
		</div>

		<!-- Grid -->
		<div class="flex-1 grid grid-cols-7 auto-rows-fr">
			{#each calendarCells as date}
				{@const dateTasks = getTasksForDate(date)}
				{@const isToday = date.toDateString() === new Date().toDateString()}
				{@const isCurrentMonth = date.getMonth() === currentDate.getMonth()}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div 
					class="border-r border-b border-zinc-100 dark:border-zinc-800/50 p-1 flex flex-col gap-1 min-h-[100px] transition-colors relative group/cell {isCurrentMonth ? 'bg-white dark:bg-[#121214]' : 'bg-zinc-50/40 dark:bg-white/[0.01]'}"
					ondragover={handleDragOver}
					ondrop={(e) => handleDrop(e, date)}
				>
					<div class="flex items-center justify-between p-0.5">
						<button 
							type="button" 
							class="opacity-0 group-hover/cell:opacity-100 focus:opacity-100 px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-all flex items-center gap-1 shadow-sm"
							onclick={() => onAddEvent?.(date)}
							title="Create task on this date"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5v14"/></svg>
							<span>Task</span>
						</button>
						<span class="text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full {isToday ? 'bg-blue-600 text-white font-bold' : (isCurrentMonth ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-600')}">{date.getDate()}</span>
					</div>
					<div class="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 px-1">
						{#each dateTasks as task}
							{@const parentTask = task.parentTaskId ? tasks.find((t: any) => t.id === task.parentTaskId) : null}
							<button 
								type="button" 
								draggable="true"
								ondragstart={(e) => handleDragStart(e, task)}
								class="w-full text-left flex flex-col text-[11px] font-semibold px-1.5 py-1 rounded border cursor-grab active:cursor-grabbing hover:opacity-85 transition-opacity {getPriorityColor(task.priority)} {parentTask ? 'border-dashed' : ''}" 
								onclick={() => onTaskClick(task)}
							>
								<div class="truncate">{getTaskIdentifier(task)} {task.title}</div>
								{#if parentTask}
									<div class="text-[9px] text-black/50 dark:text-white/50 truncate mt-0.5">↳ {getTaskIdentifier(parentTask)}</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
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
				<div 
					draggable="true"
					ondragstart={(e) => handleDragStart(e, task)}
					class="p-2.5 bg-white dark:bg-[#18181b] border {parentTask ? 'border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-[#18181b]/50' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors" 
					onclick={() => onTaskClick(task)}
				>
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
