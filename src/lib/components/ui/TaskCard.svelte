<script lang="ts">
	import { CheckSquare, Trash2, Calendar, GripVertical, User, ListTree } from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { enhance } from '$app/forms';
	import { modalStore } from '$lib/stores/ui.svelte';
	import { getTaskIdentifier } from '$lib/utils';

	let { task, groupUsers, userRole, onClick, focused = false } = $props();

	let assignee = $derived((() => {
		if (!task.assigneeId) return null;
		return groupUsers.find((u: any) => u.id === task.assigneeId);
	})());

	let isOverdue = $derived((() => {
		if (!task.dueDate) return false;
		return new Date(task.dueDate) < new Date();
	})());
	
	let isDueSoon = $derived((() => {
		if (!task.dueDate) return false;
		const diff = new Date(task.dueDate).getTime() - new Date().getTime();
		return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000; // less than 3 days
	})());

	function getPriorityColor(p: string) {
		if (p === 'Urgent') return 'bg-red-500';
		if (p === 'High') return 'bg-orange-500';
		if (p === 'Medium') return 'bg-yellow-500';
		return 'bg-blue-500';
	}

	let showAssigneePopover = $state(false);
	let popoverStyles = $state('');

	function handleAvatarClick(e: MouseEvent) {
		if (userRole === 'Viewer') return;
		e.stopPropagation();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		if (spaceBelow < 250) {
			popoverStyles = `bottom: ${window.innerHeight - rect.top + 4}px; left: ${rect.left - 180}px;`;
		} else {
			popoverStyles = `top: ${rect.bottom + 4}px; left: ${rect.left - 180}px;`;
		}
		showAssigneePopover = true;
	}

	function handleAssign(userId: string | null) {
		showAssigneePopover = false;
		task.assigneeId = userId;
		setTimeout(() => {
			if (typeof document !== 'undefined') {
				(document.getElementById(`form-assign-${task.id}`) as HTMLFormElement)?.requestSubmit();
			}
		}, 10);
	}

	function handleDeleteClick(e: MouseEvent) {
		e.stopPropagation();
		modalStore.show({
			title: 'Delete Task',
			description: 'Are you sure you want to delete this task? This action cannot be undone.',
			confirmText: 'Delete Task',
			destructive: true,
			onConfirm: () => {
				const form = document.getElementById(`form-delete-${task.id}`) as HTMLFormElement;
				if (form) form.requestSubmit();
			}
		});
	}
</script>

<form method="POST" action="?/updateTask" id="form-assign-{task.id}" use:enhance={() => {
	return async ({ update }) => {
		update({ reset: false });
	};
}} class="hidden">
	<input type="hidden" name="taskId" value={task.id} />
	<input type="hidden" name="title" value={task.title} />
	<input type="hidden" name="assigneeId" value={task.assigneeId || ''} />
	<input type="hidden" name="priority" value={task.priority} />
	<input type="hidden" name="stageId" value={task.stageId} />
</form>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
	role="button"
	tabindex="0"
	onclick={(e) => {
		if ((e.target as HTMLElement).closest('.drag-handle')) return;
		onClick();
	}}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onClick();
		}
	}}
	class="group p-3 rounded-lg shadow-sm border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg relative flex flex-col gap-3 overflow-hidden {focused ? 'ring-2 ring-blue-500 border-transparent' : ''} {task.parentTaskId ? 'bg-zinc-50 dark:bg-[#18181b]/80 border-dashed border-zinc-300 dark:border-white/10 hover:border-zinc-400 dark:hover:border-zinc-600' : 'bg-white dark:bg-[#18181b] border-zinc-200/80 dark:border-white/5 hover:border-zinc-400 dark:hover:border-zinc-600'}"
>
	<!-- Priority Left Border Stripe -->
	<div class="absolute left-0 top-0 bottom-0 w-1 {getPriorityColor(task.priority)}"></div>

	<!-- Drag Handle Area -->
	<div 
		role="button"
		tabindex="0"
		class="drag-handle absolute top-2 left-2 text-zinc-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
		onmousedown={() => { task.dragDisabled = false; }}
		ontouchstart={() => { task.dragDisabled = false; }}
	>
		<GripVertical class="w-4 h-4 cursor-grab active:cursor-grabbing" />
	</div>

	<!-- Top Row: ID, Actions -->
	<div class="flex items-center justify-between pl-5">
		<div class="flex items-center gap-2">
			<span class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">{getTaskIdentifier(task)}</span>
			{#if task.parentTask}
				<div class="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-200/50 dark:bg-white/10 rounded-sm text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">
					<ListTree class="w-3 h-3" />
					Parent: {getTaskIdentifier(task.parentTask)}
				</div>
			{/if}
		</div>
		
		<div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-[#18181b] shadow-sm rounded-md border border-zinc-100 dark:border-zinc-800 absolute top-2 right-2 z-10">
			{#if userRole !== 'Viewer'}
				<form id="form-delete-{task.id}" method="POST" action="?/softDeleteTask" use:enhance={() => {
					return async ({ update }) => update();
				}} class="hidden">
					<input type="hidden" name="taskId" value={task.id} />
				</form>
				<button type="button" class="p-1 text-zinc-400 hover:text-red-500 transition-colors" title="Delete Task" onmousedown={(e) => e.stopPropagation()} onclick={handleDeleteClick}>
					<Trash2 class="w-3.5 h-3.5" />
				</button>
			{/if}
		</div>
	</div>

	<!-- Title -->
	<h4 class="text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100 pl-5 pr-6 break-words">{task.title}</h4>
	
	<!-- Tags -->
	{#if task.tags && task.tags.length > 0}
		<div class="flex flex-wrap gap-1 px-5 mt-0.5">
			{#each task.tags as tag}
				<div class="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-{tag.color}-500/10 text-{tag.color}-600 dark:text-{tag.color}-400 border border-{tag.color}-500/20 max-w-[150px] truncate">
					{tag.name}
				</div>
			{/each}
		</div>
	{/if}
	
	<!-- Bottom Row: Meta -->
	<div class="flex items-center justify-between mt-1 pl-5">
		<div class="flex items-center gap-2.5">
			{#if task.dueDate}
				<div class="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md border {isOverdue ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50' : isDueSoon ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/50' : 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-white/5 dark:text-zinc-400 dark:border-white/5'}">
					<Calendar class="w-3 h-3" />
					<span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
				</div>
			{/if}

			{#if task.checklists && Array.isArray(task.checklists) && task.checklists.length > 0}
				{@const completed = task.checklists.filter((c: any) => c.done).length}
				{@const total = task.checklists.length}
				<div class="flex items-center gap-1 text-[11px] font-semibold {completed === total ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/50' : 'text-zinc-500 dark:text-zinc-400'}">
					<CheckSquare class="w-3 h-3" />
					<span>{completed}/{total}</span>
				</div>
			{/if}
			
			{#if task.subtaskCount > 0}
				<div class="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-white/5 px-1.5 py-0.5 rounded-md border border-zinc-200 dark:border-white/5">
					<ListTree class="w-3 h-3" />
					<span>{task.subtaskCount}</span>
				</div>
			{/if}
		</div>
		
		<button type="button" class="hover:opacity-80 transition-opacity" onclick={handleAvatarClick}>
			{#if assignee}
				<Avatar name={assignee.name} size="sm" />
			{:else}
				<div class="w-6 h-6 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center shrink-0 bg-zinc-50 dark:bg-zinc-900/50">
					<User class="w-3 h-3 text-zinc-400" />
				</div>
			{/if}
		</button>
	</div>
</div>

{#if showAssigneePopover}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div role="presentation" class="fixed inset-0 z-40" onclick={(e) => { e.stopPropagation(); showAssigneePopover = false; }}></div>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div role="presentation" class="fixed z-50 w-56 bg-white dark:bg-[#18181b] shadow-xl border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden" style={popoverStyles} onclick={(e) => e.stopPropagation()}>
		<div class="p-1.5 flex flex-col gap-0.5 max-h-60 overflow-y-auto custom-scrollbar">
			<button type="button" class="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors text-left" onclick={() => handleAssign(null)}>
				<div class="w-6 h-6 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center shrink-0 bg-zinc-50 dark:bg-zinc-900/50">
					<User class="w-3 h-3 text-zinc-400" />
				</div>
				<span class="text-sm font-medium text-zinc-900 dark:text-zinc-100">Unassigned</span>
			</button>
			{#each groupUsers as user}
				<button type="button" class="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors text-left" onclick={() => handleAssign(user.id)}>
					<Avatar name={user.name} size="sm" />
					<span class="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{user.name}</span>
				</button>
			{/each}
		</div>
	</div>
{/if}
