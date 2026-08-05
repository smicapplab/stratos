<script lang="ts">
	let {
		isOpen = $bindable(false),
		notifications = $bindable([]),
		onMarkRead,
		onMarkAllRead
	}: {
		isOpen: boolean;
		notifications: any[];
		onMarkRead: (id: string) => void;
		onMarkAllRead: () => void;
	} = $props();

	let unreadCount = $derived(notifications.filter((n) => !n.readAt).length);
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div 
		class="fixed inset-0 z-40" 
		onclick={() => isOpen = false}
		onkeydown={(e) => { if (e.key === 'Escape') isOpen = false; }}
	></div>

	<div class="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden max-h-[60vh] flex flex-col">
		<div class="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
			<h3 class="text-sm font-bold text-zinc-900 dark:text-white">
				Notifications
			</h3>
			{#if unreadCount > 0}
				<button
					class="text-xs font-medium text-brand-primary hover:text-brand-primary dark:text-brand-primary min-h-[36px]"
					onclick={onMarkAllRead}
				>
					Mark all read
				</button>
			{/if}
		</div>
		<div class="overflow-y-auto flex-1">
			{#if notifications.length === 0}
				<div class="p-6 text-center text-sm text-zinc-500">
					No notifications yet
				</div>
			{:else}
				{#each notifications.slice(0, 20) as notif (notif.id)}
					{@const taskUrl = notif.boardId ? `/boards/${notif.boardId}?task=${notif.taskId}` : `/tasks/${notif.taskId}`}
					<a
						href={taskUrl}
						class="w-full text-left px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors block {notif.readAt ? 'opacity-60' : ''}"
						onclick={() => {
							onMarkRead(notif.id);
							isOpen = false;
						}}
					>
						<div class="flex items-start gap-2">
							{#if !notif.readAt}
								<div class="w-2 h-2 rounded-full bg-brand-primary/100 mt-1.5 flex-shrink-0"></div>
							{:else}
								<div class="w-2 h-2 flex-shrink-0"></div>
							{/if}
							<div class="flex-1 min-w-0">
								<p class="text-xs font-medium text-zinc-900 dark:text-white truncate">
									{notif.type === 'assigned'
										? 'You were assigned to'
										: notif.type === 'mentioned'
											? 'You were mentioned in'
											: 'Status changed on'}
									<span class="font-semibold">{notif.taskTitle || 'a task'}</span>
								</p>
							</div>
						</div>
					</a>
				{/each}
			{/if}
		</div>
	</div>
{/if}
