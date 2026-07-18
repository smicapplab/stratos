<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { dndzone, dragHandleZone, dragHandle } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { Plus, Settings2, LayoutGrid, CheckCircle2, GripHorizontal } from 'lucide-svelte';
	import { onMount, onDestroy, tick } from 'svelte';
	import TaskDrawer from '$lib/components/task/TaskDrawer.svelte';
	import TaskCard from '$lib/components/ui/TaskCard.svelte';
	import TableView from '$lib/components/ui/TableView.svelte';
	import CalendarView from '$lib/components/ui/CalendarView.svelte';
	import ReportsView from '$lib/components/ui/ReportsView.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { modalStore } from '$lib/stores/ui.svelte';

	let focusedColumnIndex = $state<number | null>(null);
	let focusedTaskIndex = $state<number | null>(null);

	function scrollToColumn(index: number) {
		const colElement = document.getElementById(`column-${index}`);
		if (colElement) colElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
	}

	function scrollToTask(colIndex: number, taskIndex: number | null) {
		if (taskIndex === null) return;
		const taskElement = document.getElementById(`task-${colIndex}-${taskIndex}`);
		if (taskElement) taskElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;
		if (activeView !== 'board' || activeTask || settingsOpen || reorderModalOpen) return;

		if (e.key === 'ArrowRight') {
			e.preventDefault();
			if (focusedColumnIndex === null) {
				focusedColumnIndex = 0;
			} else {
				focusedColumnIndex = Math.min(focusedColumnIndex + 1, columns.length - 1);
			}
			focusedTaskIndex = null;
			scrollToColumn(focusedColumnIndex);
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			if (focusedColumnIndex === null) {
				focusedColumnIndex = 0;
			} else {
				focusedColumnIndex = Math.max(focusedColumnIndex - 1, 0);
			}
			focusedTaskIndex = null;
			scrollToColumn(focusedColumnIndex);
		} else if (e.key === 'ArrowDown') {
			if (focusedColumnIndex === null) focusedColumnIndex = 0;
			const items = columns[focusedColumnIndex]?.items || [];
			if (items.length > 0) {
				e.preventDefault();
				if (focusedTaskIndex === null) {
					focusedTaskIndex = 0;
				} else {
					focusedTaskIndex = Math.min(focusedTaskIndex + 1, items.length - 1);
				}
				scrollToTask(focusedColumnIndex, focusedTaskIndex);
			}
		} else if (e.key === 'ArrowUp') {
			if (focusedColumnIndex === null) focusedColumnIndex = 0;
			const items = columns[focusedColumnIndex]?.items || [];
			if (items.length > 0) {
				e.preventDefault();
				if (focusedTaskIndex === null) {
					focusedTaskIndex = items.length - 1;
				} else {
					focusedTaskIndex = Math.max(focusedTaskIndex - 1, 0);
				}
				scrollToTask(focusedColumnIndex, focusedTaskIndex);
			}
		} else if (e.key === 'c' || e.key === 'C') {
			if (focusedColumnIndex !== null) {
				e.preventDefault();
				activeStageId = columns[focusedColumnIndex].id;
			}
		} else if (e.key === 'Enter') {
			if (focusedColumnIndex !== null && focusedTaskIndex !== null) {
				e.preventDefault();
				activeTask = columns[focusedColumnIndex].items[focusedTaskIndex];
			}
		} else if (e.key === 'Escape') {
			focusedColumnIndex = null;
			focusedTaskIndex = null;
		}
	}

	function handleWheel(e: WheelEvent) {
		if (e.deltaY !== 0 && e.deltaX === 0) {
			const target = e.target as HTMLElement;
			if (!target.closest('.overflow-y-auto')) {
				e.preventDefault();
				const container = e.currentTarget as HTMLElement;
				container.scrollLeft += e.deltaY;
			}
		}
	}

	let { data } = $props();
	let board = $derived(data.board);
	let stages = $derived(data.stages);
	let user = $derived(data.user);
	let tasks = $state<any[]>([]);
	$effect(() => {
		tasks = data.tasks;
	});
	let groupUsers = $derived(data.groupUsers);
	let projects = $derived(data.projects);
	let customFields = $derived(data.customFields);
	
	// Create a reactive local copy of tasks mapped by stageId so we can mutate them on drag/drop
	let columns = $state<{id: string, name: string, isCompleted: boolean, orderIndex: string, dragDisabled?: boolean, items: any[]}[]>([]);

	// Sync server data to local mutable state whenever the server data updates
	$effect(() => {
		const subtaskCounts = new Map<string, number>();
		const taskMap = new Map<string, any>();
		for (const t of tasks) {
			taskMap.set(t.id, t);
			if (t.parentTaskId) {
				subtaskCounts.set(t.parentTaskId, (subtaskCounts.get(t.parentTaskId) || 0) + 1);
			}
		}

		const sortedStages = [...stages].sort((a, b) => {
			if (a.orderIndex < b.orderIndex) return -1;
			if (a.orderIndex > b.orderIndex) return 1;
			return 0;
		});

		columns = sortedStages.map(stage => {
			const stageTasks = tasks.filter(t => t.stageId === stage.id).sort((a, b) => {
				if (a.orderIndex < b.orderIndex) return -1;
				if (a.orderIndex > b.orderIndex) return 1;
				return 0;
			});
			return {
				...stage,
				dragDisabled: user.role !== 'Admin',
				items: stageTasks.map(t => ({ 
					...t, 
					subtaskCount: subtaskCounts.get(t.id) || 0,
					parentTask: t.parentTaskId ? taskMap.get(t.parentTaskId) : null
				}))
			};
		});
	});

	let isTouchDevice = $state(false);
	let eventSource: EventSource | null = null;
	onMount(() => {
		isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		eventSource = new EventSource(`/api/boards/${board.id}/sync`);
		
		eventSource.onmessage = (e) => {
			if (e.data === 'ping') return;
			try {
				const event = JSON.parse(e.data);
				if (event.type === 'task_created') {
					if (!tasks.find(t => t.id === event.payload.task.id)) {
						tasks = [...tasks, event.payload.task];
					}
				} else if (event.type === 'task_moved' || event.type === 'task_updated') {
					const updatedTask = event.payload.task;
					const idx = tasks.findIndex(t => t.id === updatedTask.id);
					if (idx !== -1) {
						tasks[idx] = { ...tasks[idx], ...updatedTask };
					} else {
						tasks = [...tasks, updatedTask];
					}
				} else if (event.type === 'task_deleted') {
					tasks = tasks.filter(t => t.id !== event.payload.taskId);
				} else if (event.type === 'stage_moved') {
					invalidateAll();
				}
			} catch(err) {
				console.error('SSE Error', err);
			}
		};
	});

	onDestroy(() => {
		if (eventSource) {
			eventSource.close();
		}
	});

	const flipDurationMs = 200;

	let isDragging = false;

	function handleDndConsider(e: any, stageIdx: number) {
		isDragging = true;
		columns = columns.map((c, i) => i === stageIdx ? { ...c, items: e.detail.items } : c);
	}

	async function handleDndFinalize(e: any, stageIdx: number) {
		columns = columns.map((c, i) => i === stageIdx ? { ...c, items: e.detail.items } : c);
		setTimeout(() => { isDragging = false; }, 0);
		
		const movedItemId = e.detail.info.id;
		const stageId = columns[stageIdx].id;
		
		// Find where the item was dropped to calculate fractional index
		const newIndex = e.detail.items.findIndex((t: any) => t.id === movedItemId);
		if (newIndex === -1) return; // Item was dragged OUT of this column, handled by the target column's event
		
		const previousIndex = newIndex > 0 ? e.detail.items[newIndex - 1].orderIndex : null;
		const nextIndex = newIndex < e.detail.items.length - 1 ? e.detail.items[newIndex + 1].orderIndex : null;

		const formData = new FormData();
		formData.append('taskId', movedItemId);
		formData.append('stageId', stageId);
		if (previousIndex) formData.append('previousIndex', previousIndex);
		if (nextIndex) formData.append('nextIndex', nextIndex);

		await fetch('?/moveTask', {
			method: 'POST',
			body: formData,
			headers: {
				'x-sveltekit-action': 'true'
			}
		});
		await invalidateAll();
	}

	let moveStageForm = $state<HTMLFormElement | null>(null);
	let movedStageId = $state<string | null>(null);
	let movedPrevIndex = $state<string | null>(null);
	let movedNextIndex = $state<string | null>(null);
	let reorderModalOpen = $state(false);

	function openReorderModal() {
		reorderModalOpen = true;
	}

	function handleColumnConsider(e: any) {
		columns = e.detail.items;
	}

	async function handleColumnFinalize(e: any) {
		console.log('[DEBUG] handleColumnFinalize START');
		console.log('[DEBUG] Original columns order:', columns.map(c => ({ id: c.id, order: c.orderIndex })));
		console.log('[DEBUG] e.detail.items order:', e.detail.items.map((c: any) => ({ id: c.id, order: c.orderIndex })));

		columns = e.detail.items;
		
		const newIndex = columns.findIndex(c => c.id === e.detail.info.id);
		movedStageId = e.detail.info.id;
		movedPrevIndex = newIndex > 0 ? columns[newIndex - 1].orderIndex : null;
		movedNextIndex = newIndex < columns.length - 1 ? columns[newIndex + 1].orderIndex : null;

		// fractional-indexing requires prevIndex < nextIndex (strict ASCII).
		// If we encounter duplicate indices (e.g. bad seed data) or bad sorts, fallback to appending.
		if (movedPrevIndex !== null && movedNextIndex !== null && movedPrevIndex >= movedNextIndex) {
			console.warn('[DEBUG] Invalid indices (prev >= next). Falling back to appending.', movedPrevIndex, movedNextIndex);
			movedNextIndex = null; 
		}

		console.log(`[DEBUG] Column ${movedStageId} moved to index ${newIndex}.`);
		console.log(`[DEBUG] prevIndex: ${movedPrevIndex}, nextIndex: ${movedNextIndex}`);

		await tick();
		console.log('[DEBUG] Submitting form...');
		moveStageForm?.requestSubmit();
	}

	let activeStageId = $state<string | null>(null);
	let activeTask = $state<any | null>(null);

	$effect(() => {
		const taskIdParam = $page.url.searchParams.get('task');
		if (taskIdParam && (!activeTask || activeTask.id !== taskIdParam)) {
			const found = tasks.find(t => t.id === taskIdParam);
			if (found) {
				activeTask = found;
			}
		}
	});

	function closeTaskDrawer() {
		activeTask = null;
		if ($page.url.searchParams.has('task')) {
			const url = new URL($page.url);
			url.searchParams.delete('task');
			goto(url.pathname + url.search, { replaceState: true, noScroll: true, keepFocus: true });
		}
	}
	let activeView = $state<'board' | 'table' | 'calendar' | 'reports'>('board');
	let settingsOpen = $state(false);
	let settingsTab = $state<'general' | 'fields'>('general');

	let showCalendarCreateModal = $state(false);
	let selectedCalendarDate = $state<Date | null>(null);
	let calendarTaskTitle = $state('');
	let selectedCalendarStageId = $state('');
	let selectedCalendarAssigneeId = $state('');

	function handleCalendarAddEvent(date: Date) {
		selectedCalendarDate = date;
		calendarTaskTitle = '';
		selectedCalendarAssigneeId = user?.id || '';
		
		if (stages && stages.length > 0) {
			const sorted = [...stages].sort((a: any, b: any) => a.orderIndex.localeCompare(b.orderIndex));
			selectedCalendarStageId = sorted[0].id;
		} else {
			selectedCalendarStageId = '';
		}
		
		showCalendarCreateModal = true;
	}

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
	
	let newFieldName = $state('');
	let newFieldType = $state('text');
	let newFieldOptions = $state('');

	function confirmDeleteBoard() {
		modalStore.show({
			title: 'Delete Board',
			description: `Are you sure you want to delete "${board.name}"? This action cannot be undone.`,
			confirmText: 'Delete Board',
			destructive: true,
			onConfirm: () => {
				(document.getElementById('delete-board-form') as HTMLFormElement)?.requestSubmit();
			}
		});
		settingsOpen = false;
	}

	$effect(() => {
		const stored = localStorage.getItem(`board-view-${board.id}`);
		if (stored === 'table' || stored === 'calendar' || stored === 'board' || (stored === 'reports' && (user?.role === 'Admin' || user?.role === 'Manager'))) {
			activeView = stored;
		}
	});

	$effect(() => {
		if (activeView) {
			localStorage.setItem(`board-view-${board.id}`, activeView);
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="h-full flex flex-col relative overflow-hidden bg-zinc-50 dark:bg-[#0c0c0d]">
	<!-- Board Header -->
	<div class="px-8 py-5 border-b border-zinc-200/50 dark:border-white/5 bg-white/50 dark:bg-[#121214]/50 backdrop-blur-xl flex items-center justify-between shrink-0 relative z-20">
		<div class="flex items-center gap-4">
			<div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
				<LayoutGrid class="w-5 h-5" />
			</div>
			<div>
				<h1 class="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{board.name}</h1>
				<div class="flex items-center gap-2 mt-0.5">
					<span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded">Board</span>
				</div>
			</div>
		</div>
		
		<div class="flex items-center bg-zinc-100 dark:bg-white/5 p-1 rounded-lg border border-zinc-200 dark:border-white/10">
			<button class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all {activeView === 'board' ? 'bg-white dark:bg-[#27272a] text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}" onclick={() => activeView = 'board'}>Board</button>
			<button class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all {activeView === 'table' ? 'bg-white dark:bg-[#27272a] text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}" onclick={() => activeView = 'table'}>Table</button>
			<button class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all {activeView === 'calendar' ? 'bg-white dark:bg-[#27272a] text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}" onclick={() => activeView = 'calendar'}>Calendar</button>
			{#if user.role === 'Admin' || user.role === 'Manager'}
				<button class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all {activeView === 'reports' ? 'bg-white dark:bg-[#27272a] text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}" onclick={() => activeView = 'reports'}>Reports</button>
			{/if}
		</div>

		<div class="flex items-center gap-3 relative">
			{#if user.role === 'Admin'}
				<button 
					class="lg:hidden p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-lg shadow-sm transition-all hover:bg-zinc-50 dark:hover:bg-white/10"
					onclick={openReorderModal}
					title="Reorder Columns"
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
				</button>
			{/if}

			<button 
				class="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-lg shadow-sm transition-all hover:bg-zinc-50 dark:hover:bg-white/10 {settingsOpen ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white' : ''}"
				onclick={() => { settingsOpen = !settingsOpen; settingsTab = 'general'; }}
				title="Board Settings"
			>
				<Settings2 class="w-4 h-4" />
			</button>

			{#if settingsOpen}
				<!-- Overlay to click away -->
				<div class="fixed inset-0 z-40" onclick={() => settingsOpen = false} onkeydown={(e) => e.key === 'Escape' && (settingsOpen = false)} role="button" tabindex="0" aria-label="Close settings"></div>
				
				<div class="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
					<div class="flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
						<button class="flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider {settingsTab === 'general' ? 'text-zinc-900 dark:text-white border-b-2 border-blue-500 bg-white dark:bg-zinc-800/50' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/30'} transition-colors" onclick={() => settingsTab = 'general'}>General</button>
						<button class="flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider {settingsTab === 'fields' ? 'text-zinc-900 dark:text-white border-b-2 border-blue-500 bg-white dark:bg-zinc-800/50' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/30'} transition-colors" onclick={() => settingsTab = 'fields'}>Custom Fields</button>
					</div>

					{#if settingsTab === 'general'}
						<div class="p-4 overflow-y-auto custom-scrollbar">
							<form method="POST" action="?/updateBoard" use:enhance={() => {
								return async ({ update }) => {
									await update();
									settingsOpen = false;
								}
							}} class="flex flex-col gap-4">
								<div class="flex flex-col gap-1.5">
									<label for="board-name" class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</label>
									<input id="board-name" type="text" name="name" value={board.name} required class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all" />
								</div>
								
								<div class="flex flex-col gap-1.5">
									<label for="board-project" class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Project</label>
									<Select id="board-project" name="projectId">
										{#each projects as project}
											<option value={project.id} selected={project.id === board.projectId}>{project.name}</option>
										{/each}
									</Select>
								</div>

								<button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-md py-2 text-sm font-semibold transition-colors mt-2">
									Save Changes
								</button>
							</form>
						</div>

						{#if user.id === board.creatorId}
							<div class="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-red-50/50 dark:bg-red-950/10 shrink-0">
								<button 
									class="w-full flex items-center justify-center gap-2 text-red-600 dark:text-red-500 text-sm font-semibold py-2 px-3 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
									onclick={confirmDeleteBoard}
								>
									Delete Board
								</button>
							</div>
							<form id="delete-board-form" method="POST" action="?/deleteBoard" class="hidden"></form>
						{/if}
					{:else}
						<div class="p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
							{#if customFields.length > 0}
								<div class="flex flex-col gap-2">
									{#each customFields as field}
										<div class="flex items-center justify-between p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/5">
											<div class="flex flex-col">
												<span class="text-xs font-bold text-zinc-900 dark:text-white">{field.name}</span>
												<span class="text-[10px] text-zinc-500 uppercase font-mono">{field.type}</span>
											</div>
											<form method="POST" action="?/deleteCustomField" use:enhance>
												<input type="hidden" name="fieldId" value={field.id} />
												<button type="submit" class="p-1 text-red-500/70 hover:text-red-500 transition-colors" title="Delete field">
													<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
												</button>
											</form>
										</div>
									{/each}
								</div>
							{:else}
								<div class="text-center p-4 text-sm text-zinc-500 italic">No custom fields yet.</div>
							{/if}

							<div class="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-2">
								<h4 class="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Add New Field</h4>
								<form method="POST" action="?/createCustomField" use:enhance={() => {
									return async ({ update }) => {
										await update();
										newFieldName = '';
										newFieldType = 'text';
										newFieldOptions = '';
									}
								}} class="flex flex-col gap-3">
									<input type="text" name="name" bind:value={newFieldName} placeholder="Field Name (e.g. Priority)" required class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
									
									<Select name="type" bind:value={newFieldType}>
										<option value="text">Text (String)</option>
										<option value="number">Number</option>
										<option value="date">Date</option>
										<option value="select">Select (Dropdown)</option>
									</Select>

									{#if newFieldType === 'select'}
										<input type="text" name="options_raw" bind:value={newFieldOptions} placeholder="Options (comma separated)" required class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
										<input type="hidden" name="options" value={JSON.stringify(newFieldOptions.split(',').map(s => s.trim()).filter(Boolean))} />
									{/if}

									<button type="submit" disabled={!newFieldName} class="w-full bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-md py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 mt-1">
										Create Field
									</button>
								</form>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Board Canvas -->
	{#if activeView === 'board'}
	<div class="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar snap-x snap-mandatory relative scroll-px-8" onwheel={handleWheel}>
		<div class="h-full inline-flex items-start gap-4 p-8">
			
			<form class="hidden" method="POST" action="?/moveStage" use:enhance bind:this={moveStageForm}>
				<input type="hidden" name="stageId" value={movedStageId || ''} />
				<input type="hidden" name="previousIndex" value={movedPrevIndex || ''} />
				<input type="hidden" name="nextIndex" value={movedNextIndex || ''} />
			</form>

			<section 
				use:dragHandleZone={{ items: columns, flipDurationMs, type: 'columns', dropTargetStyle: {}, dragDisabled: isTouchDevice || user.role !== 'Admin' }} 
				onconsider={handleColumnConsider} 
				onfinalize={handleColumnFinalize}
				class="h-full inline-flex items-start gap-4"
			>
			{#each columns as column, stageIdx (column.id)}
				<div animate:flip={{duration: flipDurationMs}} class="h-full max-h-full shrink-0 snap-start" id="column-{stageIdx}">
					<!-- Stage Column -->
					<div class="w-[85vw] lg:w-[320px] flex flex-col max-h-full rounded-2xl bg-zinc-100/50 dark:bg-[#121214] border {focusedColumnIndex === stageIdx && focusedTaskIndex === null ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-zinc-200/50 dark:border-white/5'} shadow-sm">
					
					<!-- Column Header -->
					<div use:dragHandle aria-label="Drag {column.name} column" class="p-4 flex items-center justify-between shrink-0 group {user.role === 'Admin' && !isTouchDevice ? 'cursor-grab active:cursor-grabbing' : ''}">
						<div class="flex items-center gap-2">
							{#if user.role === 'Admin' && !isTouchDevice}
								<div class="column-drag-grip cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 px-1 -ml-1">
									<GripHorizontal class="w-4 h-4" />
								</div>
							{/if}
							<h3 class="text-sm font-bold tracking-tight text-zinc-800 dark:text-zinc-200">{column.name}</h3>
							<span class="px-2 py-0.5 bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 text-xs font-bold rounded-full">{column.items.length}</span>
						</div>
						{#if user.role === 'Admin'}
							<form method="POST" action="?/updateStage" use:enhance={() => { return async ({ update }) => update(); }} class="opacity-0 group-hover:opacity-100 transition-opacity {column.isCompleted ? 'opacity-100' : ''}">
								<input type="hidden" name="stageId" value={column.id} />
								<input type="hidden" name="isCompleted" value={column.isCompleted ? 'false' : 'true'} />
								<button 
									type="submit" 
									class="p-1 rounded transition-colors {column.isCompleted ? 'text-emerald-500' : 'text-zinc-400 hover:text-emerald-500'}"
									title={column.isCompleted ? "Unmark as Done stage" : "Mark as Done stage"}
								>
									<CheckCircle2 class="w-4 h-4" />
								</button>
							</form>
						{:else if column.isCompleted}
							<div class="p-1 text-emerald-500" title="Done stage">
								<CheckCircle2 class="w-4 h-4" />
							</div>
						{/if}
					</div>

					<!-- Drag and Drop Zone -->
					<div 
						use:dndzone={{items: column.items, flipDurationMs, dragDisabled: isTouchDevice, dropTargetStyle: { outline: '2px solid rgba(59, 130, 246, 0.5)', outlineOffset: '-2px', borderRadius: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.05)' }}} 
						onconsider={(e) => handleDndConsider(e, stageIdx)} 
						onfinalize={(e) => handleDndFinalize(e, stageIdx)}
						class="flex-1 overflow-y-auto px-3 pb-3 min-h-[150px] custom-scrollbar flex flex-col gap-2 relative"
					>
						{#each column.items as task, taskIdx (task.id)}
							<div animate:flip={{duration: flipDurationMs}} id="task-{stageIdx}-{taskIdx}">
								<TaskCard {task} {groupUsers} userRole={user.role} focused={focusedColumnIndex === stageIdx && focusedTaskIndex === taskIdx} onClick={() => { if (!isDragging) activeTask = task; }} />
							</div>
						{/each}
						
						{#if column.items.length === 0}
							<div class="absolute inset-0 flex flex-col items-center justify-center opacity-40 pointer-events-none p-4 text-center mt-6">
								<svg class="w-10 h-10 mb-2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
								<span class="text-xs font-semibold text-zinc-500 tracking-wide">Drop tasks here</span>
							</div>
						{/if}
					</div>

					<!-- Column Footer (Add Task) -->
					<div class="p-3 pt-0 shrink-0 mt-2">
						{#if user.role !== 'Viewer'}
							{#if activeStageId === column.id}
								<form method="POST" action="?/createTask" use:enhance={() => {
									return async ({ update }) => {
										activeStageId = null;
										update();
									};
								}} class="bg-white dark:bg-[#18181b] p-3 rounded-lg border border-blue-500 shadow-lg shadow-blue-500/10">
									<input type="hidden" name="stageId" value={column.id} />
									{#if column.items.length > 0}
										<input type="hidden" name="previousIndex" value={column.items[column.items.length - 1].orderIndex} />
									{/if}
									<!-- svelte-ignore a11y_autofocus -->
									<textarea name="title" placeholder="What needs to be done?" required autofocus class="w-full bg-transparent text-sm resize-none border-none focus:ring-0 focus:outline-none dark:text-white placeholder:text-zinc-400 p-0" rows="2"></textarea>
									<div class="flex items-center gap-2 mt-3">
										<button type="submit" class="px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">Add Task</button>
										<button type="button" class="px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors" onclick={() => activeStageId = null}>Cancel</button>
									</div>
								</form>
							{:else}
								<button 
									class="flex items-center gap-2 w-full p-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-white/5 rounded-lg transition-colors group"
									onclick={() => activeStageId = column.id}
								>
									<Plus class="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
									New Issue
								</button>
							{/if}
						{/if}
					</div>
				</div>
				</div>
			{/each}
			</section>

			<!-- Add Stage Column -->
			{#if user.role === 'Admin'}
				<div class="w-[85vw] lg:w-[320px] snap-start shrink-0">
					<form method="POST" action="?/createStage" use:enhance class="flex items-center p-2 bg-transparent rounded-2xl border border-dashed border-zinc-300 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/20 transition-colors focus-within:border-zinc-500 focus-within:bg-zinc-50 dark:focus-within:bg-[#121214]">
						{#if columns.length > 0}
							<input type="hidden" name="previousIndex" value={(columns[columns.length - 1] as any).orderIndex} />
						{/if}
						<Plus class="w-5 h-5 text-zinc-400 ml-2" />
						<input type="text" name="name" placeholder="Add a new stage..." required class="w-full bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-0 border-none dark:text-white placeholder:text-zinc-500 font-semibold" />
					</form>
				</div>
			{/if}
			
		</div>
	</div>
	{:else if activeView === 'table'}
	<div class="flex-1 overflow-auto custom-scrollbar">
		<TableView {tasks} {stages} {groupUsers} {customFields} onTaskClick={(t: any) => activeTask = t} />
	</div>
	{:else if activeView === 'calendar'}
	<div class="flex-1 overflow-auto custom-scrollbar">
		<CalendarView 
			{tasks} 
			onTaskClick={(t: any) => activeTask = t} 
			onReschedule={handleReschedule}
			onAddEvent={handleCalendarAddEvent}
		/>
	</div>
	{:else if activeView === 'reports' && (user.role === 'Admin' || user.role === 'Manager')}
	<div class="flex-1 overflow-auto custom-scrollbar bg-zinc-50 dark:bg-[#09090b]">
		<ReportsView boardId={board.id} onTaskClick={(t: any) => activeTask = t} />
	</div>
	{/if}

	<!-- Task Edit Side Panel -->
	{#if activeTask}
		<TaskDrawer bind:task={activeTask} groupUsers={groupUsers} allTasks={tasks} stages={stages} customFields={customFields} projectTags={data.projectTags} projectId={data.board.projectId} onClose={closeTaskDrawer} />
	{/if}

	{#if reorderModalOpen}

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onclick={() => reorderModalOpen = false}>
		<div class="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800" onclick={e => e.stopPropagation()}>
			<div class="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
				<h3 class="font-bold text-zinc-900 dark:text-white">Reorder Columns</h3>
				<button 
					class="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 min-h-[44px] min-w-[44px] flex items-center justify-center" 
					onclick={() => reorderModalOpen = false}
					aria-label="Close modal"
					title="Close modal"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>
			<div class="p-4 max-h-[60vh] overflow-y-auto">
				<section 
					use:dndzone={{ items: columns, flipDurationMs, type: 'columns' }} 
					onconsider={handleColumnConsider} 
					onfinalize={handleColumnFinalize}
					class="flex flex-col gap-2"
				>
					{#each columns as column (column.id)}
						<div animate:flip={{duration: flipDurationMs}} class="flex items-center gap-3 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-white/5 shadow-sm">
							<svg class="w-4 h-4 text-zinc-400 cursor-grab" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" /></svg>
							<span class="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{column.name}</span>
						</div>
					{/each}
				</section>
			</div>
			<div class="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
				<button class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors" onclick={() => reorderModalOpen = false}>Done</button>
			</div>
		</div>
	</div>
{/if}

	{#if showCalendarCreateModal && selectedCalendarDate}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onclick={() => showCalendarCreateModal = false}>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 w-[450px] max-w-full space-y-5" onclick={e => e.stopPropagation()}>
				<div>
					<h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Schedule New Task</h3>
					<p class="text-xs text-zinc-500 mt-1">Add a task on {selectedCalendarDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
				</div>

				<form 
					method="POST" 
					action="?/createTask" 
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								showCalendarCreateModal = false;
								await invalidateAll();
							}
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="dueDate" value={selectedCalendarDate.toISOString()} />

					<!-- Title -->
					<div class="space-y-1.5">
						<label for="board-calendar-task-title" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Task Title</label>
						<input 
							id="board-calendar-task-title"
							type="text" 
							name="title" 
							bind:value={calendarTaskTitle}
							placeholder="What needs to be done?" 
							required 
							class="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
						/>
					</div>

					<!-- Stage Select -->
					<div class="space-y-1.5">
						<label for="board-calendar-stage-select" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Stage</label>
						<select 
							id="board-calendar-stage-select"
							name="stageId"
							bind:value={selectedCalendarStageId}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-900 dark:text-zinc-100 min-h-[40px]"
						>
							{#each stages as stage}
								<option value={stage.id}>{stage.name}</option>
							{/each}
						</select>
					</div>

					<!-- Assignee Select -->
					<div class="space-y-1.5">
						<label for="board-calendar-assignee-select" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Assignee</label>
						<select 
							id="board-calendar-assignee-select"
							name="assigneeId"
							bind:value={selectedCalendarAssigneeId}
							class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-900 dark:text-zinc-100 min-h-[40px]"
						>
							<option value="">Unassigned</option>
							{#each groupUsers as gu}
								<option value={gu.id}>{gu.name}</option>
							{/each}
						</select>
					</div>

					<!-- Actions -->
					<div class="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
						<button 
							type="button" 
							class="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all min-h-[40px]"
							onclick={() => showCalendarCreateModal = false}
						>
							Cancel
						</button>
						<button 
							type="submit" 
							disabled={!selectedCalendarStageId || !calendarTaskTitle}
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
