<script lang="ts">
	import { 
		Clock, Check, ChevronDown, ChevronUp, ExternalLink
	} from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import {
		getNotificationIcon,
		getNotificationText,
		type TaskNotificationGroup
	} from '$lib/utils/notifications';

	let {
		group,
		isSent = false,
		onOpenTask,
		onMarkGroupRead,
		onMarkSingleRead
	}: {
		group: TaskNotificationGroup;
		isSent?: boolean;
		onOpenTask: (taskId: string | null, notifId?: string) => void;
		onMarkGroupRead: (taskId: string) => void;
		onMarkSingleRead: (notifId: string) => void;
	} = $props();

	let isExpanded = $state(false);

	function formatTime(dateVal: string | Date) {
		return new Date(dateVal).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function handleTaskClick(taskId: string | null) {
		if (taskId && !isSent && group.unreadCount > 0) {
			onMarkGroupRead(taskId);
		}
		onOpenTask(taskId);
	}
</script>

<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden transition-all hover:border-zinc-300 dark:hover:border-zinc-700/80">
	<!-- Task Group Header -->
	<div class="p-4 sm:p-5 flex items-center justify-between gap-4 bg-zinc-50/50 dark:bg-white/[0.01] border-b border-zinc-100 dark:border-zinc-800/50">
		<div class="flex items-center gap-3 min-w-0 flex-1">
			<button
				type="button"
				onclick={() => handleTaskClick(group.taskId)}
				class="text-left flex items-center gap-2.5 min-w-0 group/title py-1"
			>
				<h3 class="font-bold text-base text-zinc-900 dark:text-zinc-100 truncate group-hover/title:text-brand-primary transition-colors">
					{group.taskTitle}
				</h3>
				{#if group.taskId}
					<ExternalLink class="w-4 h-4 text-zinc-400 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
				{/if}
			</button>

			{#if !isSent}
				{#if group.unreadCount > 0}
					<span class="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5 shrink-0">
						<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
						{group.unreadCount} Unread
					</span>
				{:else}
					<span class="bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700/60 flex items-center gap-1 shrink-0">
						<Check class="w-3.5 h-3.5 text-emerald-500" />
						Read
					</span>
				{/if}
			{/if}
		</div>

		<div class="flex items-center gap-2 shrink-0">
			{#if !isSent && group.unreadCount > 0 && group.taskId}
				<button
					type="button"
					onclick={() => onMarkGroupRead(group.taskId!)}
					class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700/80 transition-colors min-h-[36px]"
					title="Mark all notifications for this task as read"
				>
					<Check class="w-3.5 h-3.5" />
					<span class="hidden sm:inline">Mark group read</span>
				</button>
			{/if}

			{#if group.notifications.length > 1}
				<button
					type="button"
					onclick={() => isExpanded = !isExpanded}
					class="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
					aria-label={isExpanded ? 'Collapse activity' : 'Expand activity'}
				>
					{#if isExpanded}
						<ChevronUp class="w-4 h-4" />
					{:else}
						<ChevronDown class="w-4 h-4" />
					{/if}
				</button>
			{/if}
		</div>
	</div>

	<!-- Activity Items -->
	<div class="divide-y divide-zinc-100 dark:divide-white/5">
		{#each isExpanded ? group.notifications : group.notifications.slice(0, 1) as notif (notif.id)}
			{@const IconInfo = getNotificationIcon(notif.type)}
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				role="button"
				tabindex="0"
				onclick={() => {
					if (!isSent && !notif.readAt) {
						onMarkSingleRead(notif.id);
					}
					onOpenTask(notif.taskId, notif.id);
				}}
				onkeydown={(e) => { 
					if (e.key === 'Enter' || e.key === ' ') {
						if (!isSent && !notif.readAt) onMarkSingleRead(notif.id);
						onOpenTask(notif.taskId, notif.id);
					}
				}}
				class="w-full text-left flex items-start gap-4 p-4 sm:p-5 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.02] relative cursor-pointer {notif.readAt ? 'opacity-65' : ''}"
			>
				{#if !notif.readAt && !isSent}
					<div class="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary"></div>
				{/if}

				<div class="shrink-0 relative mt-0.5">
					<Avatar name={isSent ? (notif.recipientName || "Team Member") : (notif.actorName || "System")} size="md" />
					<div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 border border-white dark:border-[#09090b] shadow-sm flex items-center justify-center {IconInfo.color}">
						<IconInfo.icon class="w-2.5 h-2.5" />
					</div>
				</div>

				<div class="flex-1 min-w-0">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
						<p class="text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
							{#if isSent}
								<span class="font-bold">You</span> {getNotificationText(notif.type, true)} <span class="font-bold">{notif.recipientName || 'a team member'}</span>
							{:else}
								<span class="font-bold">{notif.actorName || 'Someone'}</span> {getNotificationText(notif.type)}
							{/if}
						</p>
						<div class="shrink-0 flex items-center gap-2">
							{#if !isSent}
								{#if notif.readAt}
									<span class="bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 text-[11px] font-medium px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
										READ
									</span>
								{:else}
									<span class="bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[11px] font-bold px-2 py-0.5 rounded border border-amber-500/30">
										UNREAD
									</span>
								{/if}
							{/if}
							<span class="flex items-center gap-1 text-xs text-zinc-400">
								<Clock class="w-3.5 h-3.5" />
								{formatTime(notif.createdAt)}
							</span>
						</div>
					</div>

					{#if !isSent && !notif.readAt}
						<div class="mt-2">
							<button
								type="button"
								onclick={(e) => { e.stopPropagation(); onMarkSingleRead(notif.id); }}
								class="inline-flex items-center text-xs font-bold uppercase tracking-wider text-brand-primary hover:underline cursor-pointer py-1 min-h-[36px]"
							>
								Mark as Read
							</button>
						</div>
					{/if}
				</div>
			</div>
		{/each}

		{#if !isExpanded && group.notifications.length > 1}
			<button
				type="button"
				onclick={() => isExpanded = true}
				class="w-full py-2.5 px-4 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 bg-zinc-50/40 dark:bg-white/[0.01] hover:bg-zinc-100/60 dark:hover:bg-white/[0.03] transition-colors text-center min-h-[44px]"
			>
				+ {group.notifications.length - 1} more activity updates for this task
			</button>
		{/if}
	</div>
</div>
