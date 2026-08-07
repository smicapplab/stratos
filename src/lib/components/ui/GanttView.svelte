<script lang="ts">
	import type { Board, Stage, User } from '$lib/types';
	import { getTaskIdentifier } from '$lib/utils';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import PriorityBadge from '$lib/components/ui/PriorityBadge.svelte';
	import {
		GanttChartSquare,
		User as UserIcon,
		Target,
		AlertCircle,
		ArrowUp,
		ArrowRight,
		ArrowDown
	} from 'lucide-svelte';

	export interface GanttTaskItem {
		id: string;
		title: string;
		number?: number;
		boardPrefix?: string | null;
		priority?: string | null;
		stageId: string;
		stageName?: string;
		assigneeId?: string | null;
		assignee?: { id?: string; name?: string; email?: string | null; photo?: string | null } | null;
		startDate?: string | Date | null;
		dueDate?: string | Date | null;
		createdAt?: string | Date;
	}

	let {
		board,
		tasks = [],
		stages = [],
		groupUsers = [],
		onTaskClick
	}: {
		board?: Partial<Board> & { name?: string; prefix?: string };
		tasks: GanttTaskItem[];
		stages?: Partial<Stage>[];
		groupUsers?: Partial<User>[];
		onTaskClick?: (task: GanttTaskItem) => void;
	} = $props();

	const columnWidth = 48;
	let sidebarWidth = $state(520);
	let isResizing = $state(false);

	function handlePointerDown(e: MouseEvent | TouchEvent) {
		e.preventDefault();
		isResizing = true;
		const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const startWidth = sidebarWidth;

		function onPointerMove(moveEvent: MouseEvent | TouchEvent) {
			const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
			const deltaX = currentX - startX;
			sidebarWidth = Math.max(340, Math.min(900, startWidth + deltaX));
		}

		function onPointerUp() {
			isResizing = false;
			window.removeEventListener('mousemove', onPointerMove);
			window.removeEventListener('mouseup', onPointerUp);
			window.removeEventListener('touchmove', onPointerMove);
			window.removeEventListener('touchend', onPointerUp);
		}

		window.addEventListener('mousemove', onPointerMove);
		window.addEventListener('mouseup', onPointerUp);
		window.addEventListener('touchmove', onPointerMove, { passive: false });
		window.addEventListener('touchend', onPointerUp);
	}

	// Excel-style Double Click Auto-Fit based on task title lengths
	function autoFitSidebarWidth() {
		if (tasks.length === 0) {
			sidebarWidth = 440;
			return;
		}

		let maxTitleLength = 10;
		for (const t of tasks) {
			if (t.title && t.title.length > maxTitleLength) {
				maxTitleLength = t.title.length;
			}
		}

		// Calculate required width: title char length * ~7.5px + fixed column padding (300px)
		const calculatedWidth = Math.min(900, Math.max(360, maxTitleLength * 7.5 + 300));
		sidebarWidth = Math.round(calculatedWidth);
	}

	// Process tasks to ensure valid parsedStart and parsedEnd dates
	let processedTasks = $derived(
		tasks.map((task) => {
			const startRaw = task.startDate || task.createdAt;
			const start = startRaw ? new Date(startRaw) : new Date();
			const validStart = isNaN(start.getTime()) ? new Date() : start;

			let end: Date;
			if (task.dueDate) {
				const parsedDue = new Date(task.dueDate);
				if (!isNaN(parsedDue.getTime()) && parsedDue >= validStart) {
					end = parsedDue;
				} else {
					end = new Date(validStart.getTime() + 24 * 60 * 60 * 1000);
				}
			} else {
				// Task has startDate but no dueDate: render 1-day span default
				end = new Date(validStart.getTime() + 24 * 60 * 60 * 1000);
			}

			return {
				...task,
				parsedStart: validStart,
				parsedEnd: end
			};
		})
	);

	// Derive overall timeline bounds
	let timelineRange = $derived((() => {
		if (processedTasks.length === 0) {
			const now = new Date();
			const start = new Date(now);
			start.setDate(start.getDate() - 7);
			start.setHours(0, 0, 0, 0);

			const end = new Date(now);
			end.setDate(end.getDate() + 14);
			end.setHours(23, 59, 59, 999);
			return { start, end };
		}

		let minMs = Infinity;
		let maxMs = -Infinity;

		for (const t of processedTasks) {
			const sMs = t.parsedStart.getTime();
			const eMs = t.parsedEnd.getTime();
			if (sMs < minMs) minMs = sMs;
			if (eMs > maxMs) maxMs = eMs;
		}

		const start = new Date(minMs);
		start.setDate(start.getDate() - 2);
		start.setHours(0, 0, 0, 0);

		const end = new Date(maxMs);
		end.setDate(end.getDate() + 3);
		end.setHours(23, 59, 59, 999);

		const diffMs = end.getTime() - start.getTime();
		const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
		if (diffDays < 14) {
			end.setDate(start.getDate() + 14);
		}

		return { start, end };
	})());

	interface DayCol {
		date: Date;
		dateStr: string;
		dayName: string;
		dayNum: number;
		monthName: string;
		year: number;
		isWeekend: boolean;
		isToday: boolean;
	}

	let days = $derived((() => {
		const result: DayCol[] = [];
		const curr = new Date(timelineRange.start);
		const todayStr = new Date().toDateString();

		while (curr <= timelineRange.end) {
			const dayOfWeek = curr.getDay();
			result.push({
				date: new Date(curr),
				dateStr: curr.toDateString(),
				dayName: curr.toLocaleDateString(undefined, { weekday: 'short' }),
				dayNum: curr.getDate(),
				monthName: curr.toLocaleDateString(undefined, { month: 'short' }),
				year: curr.getFullYear(),
				isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
				isToday: curr.toDateString() === todayStr
			});
			curr.setDate(curr.getDate() + 1);
		}

		return result;
	})());

	let monthGroups = $derived((() => {
		const groups: Array<{ label: string; count: number }> = [];
		for (const day of days) {
			const label = `${day.monthName} ${day.year}`;
			const lastGroup = groups[groups.length - 1];
			if (lastGroup && lastGroup.label === label) {
				lastGroup.count++;
			} else {
				groups.push({ label, count: 1 });
			}
		}
		return groups;
	})());

	let totalMs = $derived(Math.max(1, timelineRange.end.getTime() - timelineRange.start.getTime()));
	let timelinePixelWidth = $derived(days.length * columnWidth);

	let taskTimelineBars = $derived(
		processedTasks.map((t) => {
			const startMs = t.parsedStart.getTime();
			const endMs = t.parsedEnd.getTime();

			const leftPercent = Math.max(0, Math.min(100, ((startMs - timelineRange.start.getTime()) / totalMs) * 100));
			const widthPercent = Math.max(0.8, Math.min(100 - leftPercent, ((endMs - startMs) / totalMs) * 100));

			return {
				...t,
				leftPercent,
				widthPercent
			};
		})
	);

	function getPriorityColor(priority?: string | null) {
		switch (priority) {
			case 'Urgent':
				return 'bg-red-500 hover:bg-red-600 border-red-600 text-white shadow-xs shadow-red-500/20';
			case 'High':
				return 'bg-orange-500 hover:bg-orange-600 border-orange-600 text-white shadow-xs shadow-orange-500/20';
			case 'Medium':
				return 'bg-blue-500 hover:bg-blue-600 border-blue-600 text-white shadow-xs shadow-blue-500/20';
			case 'Low':
				return 'bg-slate-500 hover:bg-slate-600 border-slate-600 text-white shadow-xs shadow-slate-500/20';
			default:
				return 'bg-blue-500 hover:bg-blue-600 border-blue-600 text-white shadow-xs shadow-blue-500/20';
		}
	}

	function getStageName(stageId: string, taskStageName?: string) {
		if (taskStageName) return taskStageName;
		if (!stageId) return 'To Do';
		const found = stages.find((s) => s.id === stageId);
		return found?.name || 'Stage';
	}

	function getAssignee(assigneeId?: string | null, taskAssignee?: any) {
		if (taskAssignee?.name) return taskAssignee;
		if (!assigneeId) return null;
		const found = groupUsers.find((u) => u.id === assigneeId);
		return found || null;
	}

	function formatDate(d?: Date | string | null) {
		if (!d) return '—';
		const dateObj = typeof d === 'string' ? new Date(d) : d;
		if (isNaN(dateObj.getTime())) return '—';
		return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	let timelineContainer = $state<HTMLDivElement | null>(null);

	function scrollToToday() {
		if (!timelineContainer) return;
		const todayEl = timelineContainer.querySelector('[data-today="true"]');
		if (todayEl) {
			todayEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
		}
	}
</script>

<div class="p-6 space-y-4">
	<!-- Gantt Controls Header -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
				<GanttChartSquare class="w-5 h-5" />
			</div>
			<div>
				<h2 class="text-base font-bold text-zinc-900 dark:text-white">Gantt Timeline — {board?.name || 'Board'}</h2>
				<p class="text-xs text-zinc-500 dark:text-zinc-400">
					{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} scheduled across {days.length} days
				</p>
			</div>
		</div>

		<!-- Priority Legend (Icon + Text matching PriorityBadge colors) & Controls -->
		<div class="flex flex-wrap items-center gap-3">
			<div class="flex items-center gap-3 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/60 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px]">
				<span class="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Priority:</span>
				<div class="flex items-center gap-1.5" title="Urgent Priority">
					<AlertCircle class="w-3.5 h-3.5 text-red-500" />
					<span class="text-zinc-700 dark:text-zinc-300 font-semibold">Urgent</span>
				</div>
				<div class="flex items-center gap-1.5" title="High Priority">
					<ArrowUp class="w-3.5 h-3.5 text-orange-500" />
					<span class="text-zinc-700 dark:text-zinc-300 font-semibold">High</span>
				</div>
				<div class="flex items-center gap-1.5" title="Medium Priority">
					<ArrowRight class="w-3.5 h-3.5 text-blue-500" />
					<span class="text-zinc-700 dark:text-zinc-300 font-semibold">Medium</span>
				</div>
				<div class="flex items-center gap-1.5" title="Low Priority">
					<ArrowDown class="w-3.5 h-3.5 text-slate-500" />
					<span class="text-zinc-700 dark:text-zinc-300 font-semibold">Low</span>
				</div>
			</div>

			{#if tasks.length > 0}
				<button
					type="button"
					onclick={scrollToToday}
					class="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold rounded-lg transition-colors shadow-xs"
				>
					<Target class="w-3.5 h-3.5" />
					<span>Jump to Today</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Empty State -->
	{#if tasks.length === 0}
		<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-xs min-h-[350px]">
			<div class="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-400 mb-4 shadow-inner">
				<GanttChartSquare class="w-6 h-6" />
			</div>
			<h3 class="text-base font-bold text-zinc-900 dark:text-white">No Tasks Available</h3>
			<p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
				There are no tasks on this board to display in the Gantt chart timeline. Create tasks with start or due dates to visualize your project schedule.
			</p>
		</div>
	{:else}
		<!-- Main Split Layout Container -->
		<div class="w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto min-w-[700px] shadow-xs flex {isResizing ? 'select-none cursor-col-resize' : ''}">
			
			<!-- Left Sidebar: Task List (Touch/Mouse Resizable & Double-click Auto-Fit) -->
			<div
				style="width: {sidebarWidth}px;"
				class="shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] flex flex-col relative transition-none"
			>
				<!-- Header Row (56px matching Right Panel Month+Day header height) -->
				<div class="h-14 grid grid-cols-[60px_1fr_32px_32px_90px_50px_50px] gap-1 px-3 items-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0c0c0d] text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0">
					<div>ID</div>
					<div>Task Title</div>
					<div class="text-center">Who</div>
					<div class="text-center" title="Priority">Prio</div>
					<div>Stage</div>
					<div>Start</div>
					<div>Due</div>
				</div>

				<!-- Task Rows -->
				<div class="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/50">
					{#each taskTimelineBars as task (task.id)}
						{@const assignee = getAssignee(task.assigneeId, task.assignee)}
						{@const stageName = getStageName(task.stageId, task.stageName)}
						<button
							type="button"
							onclick={() => onTaskClick?.(task)}
							class="h-12 min-h-[44px] grid grid-cols-[60px_1fr_32px_32px_90px_50px_50px] gap-1 px-3 items-center text-left hover:bg-zinc-50 dark:hover:bg-[#18181b] transition-colors group text-xs"
						>
							<!-- Task Number -->
							<span class="font-mono text-[11px] font-bold text-zinc-400 dark:text-zinc-500 truncate group-hover:text-zinc-700 dark:group-hover:text-zinc-300">
								{getTaskIdentifier(task)}
							</span>

							<!-- Task Title -->
							<span class="font-medium text-zinc-900 dark:text-zinc-100 truncate pr-1" title={task.title}>
								{task.title}
							</span>

							<!-- Assignee Avatar -->
							<div class="flex justify-center">
								{#if assignee}
									<Avatar name={assignee.name || 'User'} photo={assignee.photo} size="xs" />
								{:else}
									<div class="w-5 h-5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center shrink-0">
										<UserIcon class="w-3 h-3 text-zinc-400" />
									</div>
								{/if}
							</div>

							<!-- Priority Icon Only -->
							<div class="flex justify-center" title="Priority: {task.priority || 'Medium'}">
								<PriorityBadge priority={task.priority || 'Medium'} showLabel={false} />
							</div>

							<!-- Stage Name Badge -->
							<div class="truncate">
								<span
									class="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-zinc-100 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/60 truncate block text-center"
									title={stageName}
								>
									{stageName}
								</span>
							</div>

							<!-- Start Date -->
							<span class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
								{formatDate(task.parsedStart)}
							</span>

							<!-- Due Date -->
							<span class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
								{formatDate(task.dueDate)}
							</span>
						</button>
					{/each}
				</div>

				<!-- Excel-style Interactive Resizer Handle (Touch + Mouse Drag + Double-click Auto-Fit) -->
				<button
					type="button"
					aria-label="Drag or double-click to resize task column"
					class="absolute -right-1.5 top-0 bottom-0 w-3 z-30 cursor-col-resize flex items-center justify-center group touch-none bg-transparent border-0 p-0"
					onmousedown={handlePointerDown}
					ontouchstart={handlePointerDown}
					ondblclick={autoFitSidebarWidth}
					title="Drag to resize column width, or double-click to auto-fit task titles"
				>
					<div class="w-0.5 h-full bg-zinc-200 dark:bg-zinc-800 group-hover:bg-brand-primary group-active:bg-brand-primary transition-colors flex items-center justify-center pointer-events-none">
						<!-- Visual Drag Handle Grip Indicator -->
						<div class="w-1.5 h-10 rounded-full bg-brand-primary/80 group-hover:bg-brand-primary group-active:bg-brand-primary shadow-xs opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
							<div class="w-0.5 h-4 bg-white rounded-full"></div>
						</div>
					</div>
				</button>
			</div>

			<!-- Right Panel: Horizontal Timeline Grid -->
			<div
				bind:this={timelineContainer}
				class="flex-1 overflow-x-auto relative bg-zinc-50/50 dark:bg-[#0b0b0c]"
			>
				<div style="width: {timelinePixelWidth}px;" class="relative min-h-full">
					<!-- Month Headers (Top Row: 28px) -->
					<div class="h-7 border-b border-zinc-200 dark:border-zinc-800 flex bg-zinc-100/80 dark:bg-[#141417]">
						{#each monthGroups as m}
							<div
								style="width: {m.count * columnWidth}px;"
								class="h-full border-r border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider truncate px-1"
							>
								{m.label}
							</div>
						{/each}
					</div>

					<!-- Day Headers (Bottom Header Row: 28px) -->
					<div class="h-7 border-b border-zinc-200 dark:border-zinc-800 flex bg-zinc-50 dark:bg-[#0f0f12]">
						{#each days as d}
							<div
								style="width: {columnWidth}px;"
								data-today={d.isToday}
								class="h-full border-r border-zinc-200/60 dark:border-zinc-800/80 flex flex-col items-center justify-center text-[10px] shrink-0 {d.isToday
									? 'bg-brand-primary/10 text-brand-primary font-bold'
									: d.isWeekend
										? 'bg-zinc-100/50 dark:bg-zinc-900/40 text-zinc-400 dark:text-zinc-600'
										: 'text-zinc-500 dark:text-zinc-400'}"
							>
								<span class="text-[9px] uppercase leading-none">{d.dayName}</span>
								<span class="font-bold leading-tight">{d.dayNum}</span>
							</div>
						{/each}
					</div>

					<!-- Vertical Background Grid Lines -->
					<div class="absolute top-14 bottom-0 left-0 right-0 flex pointer-events-none">
						{#each days as d}
							<div
								style="width: {columnWidth}px;"
								class="h-full border-r border-zinc-200/40 dark:border-zinc-800/40 shrink-0 {d.isToday
									? 'bg-brand-primary/5 border-r-brand-primary/30'
									: d.isWeekend
										? 'bg-zinc-100/30 dark:bg-zinc-900/20'
										: ''}"
							></div>
						{/each}
					</div>

					<!-- Task Bars Stack -->
					<div class="relative z-10 pt-0">
						{#each taskTimelineBars as task (task.id)}
							<div class="h-12 flex items-center px-1 relative">
								<!-- Timeline Bar -->
								<button
									type="button"
									onclick={() => onTaskClick?.(task)}
									style="left: {task.leftPercent}%; width: {task.widthPercent}%;"
									class="absolute h-8 rounded-lg border flex items-center px-2.5 transition-all cursor-pointer group shadow-xs hover:scale-[1.01] hover:z-20 {getPriorityColor(
										task.priority
									)}"
									title="{getTaskIdentifier(task)} — {task.title} ({formatDate(task.parsedStart)} → {formatDate(task.dueDate || task.parsedEnd)})"
								>
									<!-- Bar Content Label -->
									<span class="text-xs font-semibold truncate drop-shadow-xs">
										{task.title}
									</span>

									{#if !task.dueDate}
										<span class="ml-1.5 px-1 py-0.2 text-[9px] font-bold rounded bg-white/20 text-white shrink-0">
											No Due Date
										</span>
									{/if}
								</button>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
