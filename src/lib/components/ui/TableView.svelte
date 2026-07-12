<script lang="ts">
	import { ChevronDown, ChevronRight, CheckSquare, User, AlignLeft, Plus } from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import PriorityBadge from '$lib/components/ui/PriorityBadge.svelte';
	import { slide } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { getTaskIdentifier } from '$lib/utils';

	let { tasks, stages, groupUsers, customFields = [], onTaskClick, readOnly = false, showBoard = false } = $props();

	let gridCols = $derived(`minmax(300px, 1fr) 120px 150px 120px ${showBoard ? '150px ' : ''}${customFields.map(() => '120px').join(' ')}`);

	let groupedTasks = $derived(stages.map((stage: any) => ({
		...stage,
		tasks: tasks.filter((t: any) => t.stageId === stage.id).sort((a: any, b: any) => {
			if (a.orderIndex < b.orderIndex) return -1;
			if (a.orderIndex > b.orderIndex) return 1;
			return 0;
		}).map((t: any) => ({
			...t,
			parentTask: t.parentTaskId ? tasks.find((pt: any) => pt.id === t.parentTaskId) : null
		}))
	})));

	let collapsedStages = $state<Record<string, boolean>>({});
	let addingStageId = $state<string | null>(null);

	function toggleStage(stageId: string) {
		collapsedStages[stageId] = !collapsedStages[stageId];
	}

	function getAssignee(id: string) {
		return groupUsers.find((u: any) => u.id === id);
	}
</script>

<div class="p-8">
	<div class="w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
		<!-- Table Header -->
		<div class="grid gap-4 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0c0c0d] text-xs font-semibold text-zinc-500 tracking-wider" style="grid-template-columns: {gridCols}">
			<div>Task Name</div>
			<div>Assignee</div>
			<div>Due Date</div>
			<div>Priority</div>
			{#if showBoard}<div>Board</div>{/if}
			{#each customFields as field}
				<div class="truncate" title={field.name}>{field.name}</div>
			{/each}
		</div>

		<!-- Groups -->
		<div class="flex flex-col">
			{#each groupedTasks as group}
				<!-- Group Header -->
				<button class="flex items-center gap-2 px-4 py-3 bg-zinc-50/50 dark:bg-white/5 border-b border-zinc-200 dark:border-zinc-800 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors w-full text-left" onclick={() => toggleStage(group.id)}>
					{#if collapsedStages[group.id]}
						<ChevronRight class="w-4 h-4 text-zinc-400" />
					{:else}
						<ChevronDown class="w-4 h-4 text-zinc-400" />
					{/if}
					{group.name} 
					<span class="text-xs font-medium text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{group.tasks.length}</span>
				</button>

				<!-- Tasks List -->
				{#if !collapsedStages[group.id]}
					<div transition:slide={{duration: 200}} class="flex flex-col border-b border-zinc-200 dark:border-zinc-800 last:border-none">
						{#each group.tasks as task (task.id)}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div class="grid gap-4 px-6 py-3 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-[#18181b] transition-colors cursor-pointer group/row" style="grid-template-columns: {gridCols}" onclick={() => onTaskClick(task)}>
								<!-- Title -->
								<div class="flex items-center gap-3">
									<div class="flex flex-col">
										<span class="text-[14px] font-medium text-zinc-900 dark:text-zinc-100"><span class="text-zinc-500 mr-1.5 text-xs font-semibold">{getTaskIdentifier(task)}</span>{task.title}</span>
										<div class="flex items-center gap-3 mt-1 h-3 opacity-0 group-hover/row:opacity-100 transition-opacity">
											{#if task.parentTask}
												<div class="flex items-center gap-1 text-[10px] text-zinc-500 font-semibold bg-zinc-100 dark:bg-white/10 px-1 rounded-sm">
													Parent: {getTaskIdentifier(task.parentTask)}
												</div>
											{/if}
											{#if task.description}
												<AlignLeft class="w-3 h-3 text-zinc-400" />
											{/if}
											{#if task.checklists && task.checklists.length > 0}
												<div class="flex items-center gap-1 text-[10px] text-zinc-500">
													<CheckSquare class="w-3 h-3" />
													<span>{task.checklists.filter((c: any) => c.done).length}/{task.checklists.length}</span>
												</div>
											{/if}
										</div>
									</div>
								</div>
								
								<!-- Assignee -->
								<div class="flex items-center">
									{#if task.assigneeId}
										{@const u = getAssignee(task.assigneeId)}
										{#if u}
											<div class="flex items-center gap-2">
												<Avatar name={u.name} size="xs" />
												<span class="text-xs font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-[80px]">{u.name}</span>
											</div>
										{/if}
									{:else}
										<div class="w-5 h-5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center shrink-0">
											<User class="w-3 h-3 text-zinc-400" />
										</div>
									{/if}
								</div>

								<!-- Due Date -->
								<div class="flex items-center">
									{#if task.dueDate}
										{@const isOverdue = new Date(task.dueDate) < new Date()}
										<span class="text-[13px] font-medium {isOverdue ? 'text-red-600 dark:text-red-400' : 'text-zinc-600 dark:text-zinc-400'}">{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
									{:else}
										<span class="text-xs text-zinc-400">—</span>
									{/if}
								</div>

								<!-- Priority -->
								<div class="flex items-center">
									<PriorityBadge priority={task.priority} />
								</div>
								
								<!-- Board Column (Optional) -->
								{#if showBoard}
									<div class="flex items-center">
										<span class="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Board {task.boardId?.substring(0,8)}</span>
									</div>
								{/if}

								<!-- Custom Fields -->
								{#each customFields as field}
									<div class="flex items-center">
										<span class="text-[13px] font-medium text-zinc-600 dark:text-zinc-400 truncate">
											{#if !task.customFields || task.customFields[field.id] === undefined || task.customFields[field.id] === '' || task.customFields[field.id] === null}
												<span class="text-zinc-300 dark:text-zinc-700">-</span>
											{:else}
												{task.customFields[field.id]}
											{/if}
										</span>
									</div>
								{/each}
							</div>
						{/each}
						{#if !readOnly}
							<!-- Add Task Row -->
							<div class="px-6 py-2 bg-transparent hover:bg-zinc-50 dark:hover:bg-[#18181b] transition-colors border-b border-zinc-100 dark:border-zinc-800/50 last:border-none">
								{#if addingStageId === group.id}
									<form method="POST" action="?/createTask" use:enhance={() => {
										return async ({ update }) => {
											addingStageId = null;
											update();
										};
									}} class="flex items-center gap-3">
										<input type="hidden" name="stageId" value={group.id} />
										{#if group.tasks.length > 0}
											<input type="hidden" name="previousIndex" value={group.tasks[group.tasks.length - 1].orderIndex} />
										{/if}
										<!-- svelte-ignore a11y_autofocus -->
										<input type="text" name="title" placeholder="What needs to be done?" required autofocus class="flex-1 bg-transparent border-none text-[14px] focus:ring-0 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 py-1" />
										<button type="submit" class="px-3 py-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">Add</button>
										<button type="button" class="px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors" onclick={() => addingStageId = null}>Cancel</button>
									</form>
								{:else}
									<button class="flex items-center gap-2 text-[13px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors w-full text-left py-1" onclick={() => addingStageId = group.id}>
										<Plus class="w-3.5 h-3.5" /> New Task
									</button>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>
