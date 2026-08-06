<script lang="ts">
	import { 
		Inbox, Check, Send, Loader2
	} from 'lucide-svelte';
	import TaskDrawer from '$lib/components/task/TaskDrawer.svelte';
	import InboxTaskGroupCard from '$lib/components/inbox/InboxTaskGroupCard.svelte';
	import { toastStore } from '$lib/stores/ui.svelte';
	import {
		groupNotificationsByTask,
		markNotificationAsRead,
		markTaskNotificationsAsRead,
		markAllNotificationsAsRead
	} from '$lib/utils/notifications';

	let { data } = $props();

	let activeTab = $state<'received' | 'sent'>('received');
	let readFilter = $state<'all' | 'unread'>('all');

	let rawReceivedNotifications = $state<any[]>([]);
	let hasMoreReceived = $state(false);

	let rawSentNotifications = $state<any[]>([]);
	let hasMoreSent = $state(false);

	let isLoadingMore = $state(false);

	$effect(() => {
		rawReceivedNotifications = data.notifications || [];
		hasMoreReceived = !!data.hasMoreReceived;
		rawSentNotifications = data.sentNotifications || [];
		hasMoreSent = !!data.hasMoreSent;
	});

	let receivedGroups = $derived(groupNotificationsByTask(rawReceivedNotifications));
	let sentGroups = $derived(groupNotificationsByTask(rawSentNotifications));

	let filteredReceivedGroups = $derived(
		readFilter === 'unread' 
			? receivedGroups.filter((g) => g.unreadCount > 0)
			: receivedGroups
	);

	let unreadCount = $derived(rawReceivedNotifications.filter((n: any) => !n.readAt).length);

	// Task drawer state
	let activeTask = $state<any | null>(null);
	let isLoadingTask = $state(false);

	async function openTask(taskId: string | null, notifId?: string) {
		if (!taskId) return;

		// Optimistically mark notification as read
		if (notifId) {
			const idx = rawReceivedNotifications.findIndex((n: any) => n.id === notifId);
			if (idx > -1 && !rawReceivedNotifications[idx].readAt) {
				rawReceivedNotifications[idx].readAt = new Date();
				markNotificationAsRead(notifId);
			}
		}

		isLoadingTask = true;
		try {
			const res = await fetch(`/api/tasks/${taskId}`);
			if (!res.ok) {
				toastStore.error('Failed to load task. It may have been deleted.');
				return;
			}
			activeTask = await res.json();
		} catch (err) {
			toastStore.error('Failed to load task.');
		} finally {
			isLoadingTask = false;
		}
	}

	async function handleMarkSingleRead(notifId: string) {
		const idx = rawReceivedNotifications.findIndex((n: any) => n.id === notifId);
		if (idx > -1 && !rawReceivedNotifications[idx].readAt) {
			rawReceivedNotifications[idx].readAt = new Date();
			await markNotificationAsRead(notifId);
		}
	}

	async function handleMarkGroupRead(taskId: string) {
		let updatedCount = 0;
		for (const n of rawReceivedNotifications) {
			if (n.taskId === taskId && !n.readAt) {
				n.readAt = new Date();
				updatedCount++;
			}
		}
		if (updatedCount > 0) {
			await markTaskNotificationsAsRead(taskId);
		}
	}

	async function handleMarkAllAsRead() {
		const unread = rawReceivedNotifications.filter((n: any) => !n.readAt);
		if (unread.length === 0) {
			toastStore.success('All notifications are already marked as read');
			return;
		}

		for (const n of unread) {
			n.readAt = new Date();
		}

		await markAllNotificationsAsRead();
		toastStore.success('Marked all notifications as read');
	}

	// Infinite Scroll Load More (by Distinct Task Offset)
	async function loadMore() {
		if (isLoadingMore) return;
		const currentGroups = activeTab === 'received' ? receivedGroups : sentGroups;
		const canLoadMore = activeTab === 'received' ? hasMoreReceived : hasMoreSent;

		if (!canLoadMore) return;

		isLoadingMore = true;
		try {
			const taskOffset = currentGroups.length;
			const res = await fetch(`/api/notifications?limit=20&offset=${taskOffset}&tab=${activeTab}`);
			if (res.ok) {
				const resData = await res.json();
				const fetched = resData.notifications || [];
				if (fetched.length === 0) {
					if (activeTab === 'received') hasMoreReceived = false;
					else hasMoreSent = false;
				} else {
					if (activeTab === 'received') {
						rawReceivedNotifications = [...rawReceivedNotifications, ...fetched];
						hasMoreReceived = resData.hasMore;
					} else {
						rawSentNotifications = [...rawSentNotifications, ...fetched];
						hasMoreSent = resData.hasMore;
					}
				}
			}
		} catch (err) {
			console.error('Failed to load more notifications:', err);
		} finally {
			isLoadingMore = false;
		}
	}

	function handleScroll(e: Event) {
		const target = e.target as HTMLElement;
		if (!target) return;
		const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
		if (scrollBottom < 200) {
			loadMore();
		}
	}
</script>

<svelte:head>
	<title>Inbox - Stratos</title>
</svelte:head>

<div class="h-full flex flex-col bg-transparent relative">
	<header class="shrink-0 px-6 sm:px-10 py-8 max-w-6xl w-full mx-auto flex flex-col gap-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-3">
					Inbox 
					{#if unreadCount > 0}
						<span class="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} unread</span>
					{/if}
				</h1>
				<p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Catch up on your latest task activity across all company boards.</p>
			</div>

			{#if activeTab === 'received' && rawReceivedNotifications.length > 0}
				<button 
					type="button"
					onclick={handleMarkAllAsRead}
					class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all min-h-[44px] shadow-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-brand-primary/60 hover:text-brand-primary text-zinc-800 dark:text-zinc-200"
				>
					<Check class="w-4 h-4 text-emerald-500" />
					<span>Mark all as read</span>
				</button>
			{/if}
		</div>

		<!-- Navigation Tabs & Filter Toggle -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 gap-4">
			<div class="flex items-center gap-6">
				<button 
					type="button"
					class="pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 min-h-[44px] {activeTab === 'received' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
					onclick={() => activeTab = 'received'}
				>
					<Inbox class="w-4 h-4" />
					Received ({receivedGroups.length} tasks)
				</button>

				<button 
					type="button"
					class="pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 min-h-[44px] {activeTab === 'sent' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
					onclick={() => activeTab = 'sent'}
				>
					<Send class="w-4 h-4" />
					Sent / Outgoing ({sentGroups.length} tasks)
				</button>
			</div>

			{#if activeTab === 'received'}
				<div class="pb-3 flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-xl shrink-0 self-start sm:self-auto">
					<button
						type="button"
						onclick={() => readFilter = 'all'}
						class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] {readFilter === 'all' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
					>
						All Tasks ({receivedGroups.length})
					</button>
					<button
						type="button"
						onclick={() => readFilter = 'unread'}
						class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] flex items-center gap-1.5 {readFilter === 'unread' ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
					>
						<span>Unread Only</span>
						{#if unreadCount > 0}
							<span class="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
								{unreadCount}
							</span>
						{/if}
					</button>
				</div>
			{/if}
		</div>
	</header>

	<div 
		class="flex-1 overflow-y-auto px-6 sm:px-10 pb-20 custom-scrollbar"
		onscroll={handleScroll}
	>
		<div class="max-w-6xl w-full mx-auto space-y-4">
			{#if activeTab === 'received'}
				{#if filteredReceivedGroups.length === 0}
					<div class="flex flex-col items-center justify-center py-28 px-4 text-center space-y-6">
						<div class="relative w-24 h-24 flex items-center justify-center">
							<div class="absolute inset-0 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full calm-pulse"></div>
							<div class="absolute inset-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-full border border-emerald-100 dark:border-emerald-800/25"></div>

							<div class="relative calm-float p-4 text-emerald-600 dark:text-emerald-400">
								<Inbox class="w-10 h-10" />
							</div>
						</div>
						<div class="max-w-md space-y-2">
							<h3 class="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
								{readFilter === 'unread' ? 'No unread notifications! 🎉' : 'All caught up! 🌿'}
							</h3>
							<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
								{readFilter === 'unread' 
									? 'You have read all your latest notifications.'
									: 'Your inbox is clear and peaceful. No new activities require your response.'}
							</p>
						</div>
					</div>
				{:else}
					{#each filteredReceivedGroups as group (group.taskId || 'system')}
						<InboxTaskGroupCard
							{group}
							isSent={false}
							onOpenTask={openTask}
							onMarkGroupRead={handleMarkGroupRead}
							onMarkSingleRead={handleMarkSingleRead}
						/>
					{/each}
				{/if}
			{:else}
				<!-- Sent Tab -->
				{#if sentGroups.length === 0}
					<div class="flex flex-col items-center justify-center py-28 px-4 text-center space-y-6">
						<div class="relative w-24 h-24 flex items-center justify-center">
							<div class="relative calm-float p-4 text-zinc-400">
								<Send class="w-10 h-10" />
							</div>
						</div>
						<div class="max-w-md space-y-2">
							<h3 class="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">No sent notifications</h3>
							<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
								You haven't sent any mentions, task assignments, or comments to other team members yet.
							</p>
						</div>
					</div>
				{:else}
					{#each sentGroups as group (group.taskId || 'system')}
						<InboxTaskGroupCard
							{group}
							isSent={true}
							onOpenTask={openTask}
							onMarkGroupRead={handleMarkGroupRead}
							onMarkSingleRead={handleMarkSingleRead}
						/>
					{/each}
				{/if}
			{/if}

			{#if isLoadingMore}
				<div class="flex items-center justify-center py-6 text-sm text-zinc-500 gap-2">
					<Loader2 class="w-4 h-4 animate-spin text-brand-primary" />
					<span>Loading more task activity...</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Loading overlay for task fetch -->
	{#if isLoadingTask}
		<div class="absolute inset-0 bg-black/10 dark:bg-black/20 flex items-center justify-center z-40 pointer-events-none">
			<div class="bg-white dark:bg-zinc-900 rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 shadow-lg flex items-center gap-2">
				<Loader2 class="w-4 h-4 animate-spin text-brand-primary" />
				Loading task...
			</div>
		</div>
	{/if}

	<!-- Task Drawer -->
	{#if activeTask}
		<TaskDrawer
			bind:task={activeTask}
			currentUserId={data.user?.id || ''}
			allTasks={[]}
			groupUsers={data.groupUsers || []}
			stages={data.stages || []}
			customFields={[]}
			onClose={() => { activeTask = null; }}
		/>
	{/if}
</div>

<style>
	@keyframes floatCalm {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6px); }
	}
	@keyframes pulseCalm {
		0%, 100% { transform: scale(1); opacity: 0.15; }
		50% { transform: scale(1.08); opacity: 0.3; }
	}
	.calm-float {
		animation: floatCalm 4s ease-in-out infinite;
	}
	.calm-pulse {
		animation: pulseCalm 3s ease-in-out infinite;
	}
</style>
