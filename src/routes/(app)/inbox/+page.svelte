<script lang="ts">
	import { 
		Bell, CheckCircle2, UserPlus, AtSign, Clock, Inbox, Check, MessageSquare, Send
	} from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	let { data } = $props();
	
	let activeTab = $state<'received' | 'sent'>('received');
	let notifications = $state<any[]>([]);
	let sentNotifications = $state<any[]>([]);

	$effect(() => {
		notifications = data.notifications || [];
		sentNotifications = data.sentNotifications || [];
	});

	let unreadCount = $derived(notifications.filter((n: any) => !n.readAt).length);

	async function markAsRead(id: string) {
		const idx = notifications.findIndex((n: any) => n.id === id);
		if (idx > -1 && !notifications[idx].readAt) {
			notifications[idx].readAt = new Date();
			try {
				await fetch('/api/notifications/read', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ id })
				});
			} catch (err) {
				console.error("Failed to mark notification as read", err);
			}
		}
	}

	async function markAllAsRead() {
		const unread = notifications.filter((n: any) => !n.readAt);
		if (unread.length === 0) return;
		
		for (const n of unread) {
			n.readAt = new Date();
		}
		
		try {
			await fetch('/api/notifications/read', { method: 'POST', body: JSON.stringify({}) });
		} catch (err) {
			console.error("Failed to mark all as read", err);
		}
	}

	function getNotificationIcon(type: string) {
		switch (type) {
			case 'assigned': return { icon: UserPlus, color: 'text-indigo-500 dark:text-indigo-400' };
			case 'mentioned': return { icon: AtSign, color: 'text-purple-500 dark:text-purple-400' };
			case 'status_changed': return { icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400' };
			case 'comment_added': return { icon: MessageSquare, color: 'text-brand-primary dark:text-brand-primary' };
			default: return { icon: Bell, color: 'text-brand-primary dark:text-brand-primary' };
		}
	}

	function getNotificationText(type: string, isSent: boolean = false) {
		if (isSent) {
			switch (type) {
				case 'assigned': return 'assigned a task to';
				case 'mentioned': return 'mentioned';
				case 'status_changed': return 'updated a task for';
				case 'comment_added': return 'commented on a task for';
				default: return 'notified';
			}
		}
		switch (type) {
			case 'assigned': return 'assigned you a task';
			case 'mentioned': return 'mentioned you in a task';
			case 'status_changed': return 'changed the status of a task';
			case 'comment_added': return 'commented on a task';
			default: return 'notified you';
		}
	}
</script>

<svelte:head>
	<title>Inbox - Stratos</title>
</svelte:head>

<div class="h-full flex flex-col bg-transparent">
	<header class="shrink-0 px-6 sm:px-10 py-8 max-w-4xl w-full mx-auto flex flex-col gap-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-3">
					Inbox 
					{#if unreadCount > 0}
						<span class="bg-brand-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} new</span>
					{/if}
				</h1>
				<p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Catch up on your latest activity.</p>
			</div>
			
			{#if activeTab === 'received' && notifications.length > 0}
				<button 
					onclick={markAllAsRead}
					disabled={unreadCount === 0}
					class="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all {unreadCount > 0 ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-brand-primary/50 hover:shadow-sm text-zinc-700 dark:text-zinc-300' : 'opacity-50 cursor-not-allowed text-zinc-400 border border-transparent'}"
				>
					<Check class="w-4 h-4" />
					Mark all read
				</button>
			{/if}
		</div>

		<!-- Navigation Tabs -->
		<div class="flex items-center border-b border-zinc-200 dark:border-zinc-800 gap-6">
			<button 
				class="pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 {activeTab === 'received' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
				onclick={() => activeTab = 'received'}
			>
				<Inbox class="w-4 h-4" />
				Received ({notifications.length})
			</button>

			<button 
				class="pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 {activeTab === 'sent' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
				onclick={() => activeTab = 'sent'}
			>
				<Send class="w-4 h-4" />
				Sent / Outgoing ({sentNotifications.length})
			</button>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto px-6 sm:px-10 pb-20 custom-scrollbar">
		<div class="max-w-4xl w-full mx-auto">
			{#if activeTab === 'received'}
				{#if notifications.length === 0}
					<div class="flex flex-col items-center justify-center py-28 px-4 text-center space-y-6">
						<div class="relative w-24 h-24 flex items-center justify-center">
							<div class="absolute inset-0 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full calm-pulse"></div>
							<div class="absolute inset-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-full border border-emerald-100 dark:border-emerald-800/25"></div>
							
							<div class="relative calm-float p-4 text-emerald-600 dark:text-emerald-400">
								<Inbox class="w-10 h-10" />
							</div>
						</div>
						<div class="max-w-md space-y-2">
							<h3 class="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">All caught up! 🌿</h3>
							<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
								Your inbox is clear and peaceful. No new activities require your response.
							</p>
						</div>
					</div>
				{:else}
					<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden flex flex-col divide-y divide-zinc-100 dark:divide-white/5">
						{#each notifications as notif}
							{@const IconInfo = getNotificationIcon(notif.type)}
							{@const taskUrl = notif.boardId ? `/boards/${notif.boardId}?task=${notif.taskId}` : `/tasks/${notif.taskId}`}
							<a 
								href={taskUrl}
								onclick={() => { if (!notif.readAt) markAsRead(notif.id); }}
								class="group flex items-start gap-4 p-5 sm:p-6 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.02] relative {notif.readAt ? 'opacity-70' : ''}"
							>
								{#if !notif.readAt}
									<div class="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary dark:bg-brand-primary/100"></div>
								{/if}
								
								<div class="shrink-0 relative">
									<Avatar name={notif.actorName || "System"} size="lg" />
									<div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border-2 border-white dark:border-[#09090b] shadow-sm flex items-center justify-center {IconInfo.color}">
										<IconInfo.icon class="w-3 h-3" />
									</div>
								</div>
								
								<div class="flex-1 min-w-0">
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-1">
										<p class="text-[15px] text-zinc-900 dark:text-zinc-100 leading-snug pr-4">
											<span class="font-bold">{notif.actorName || 'Someone'}</span> {getNotificationText(notif.type)}
											{#if notif.taskTitle}
												<span class="font-medium text-zinc-600 dark:text-zinc-400">"{notif.taskTitle}"</span>
											{/if}
										</p>
										<span class="shrink-0 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
											<Clock class="w-3.5 h-3.5" />
											{new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
										</span>
									</div>
									{#if !notif.readAt}
										<button 
											type="button"
											onclick={(e) => { e.preventDefault(); e.stopPropagation(); markAsRead(notif.id); }}
											class="mt-2 inline-flex items-center text-xs font-bold uppercase tracking-wider text-brand-primary hover:underline cursor-pointer"
										>
											Mark as Read
										</button>
									{/if}
								</div>
							</a>
						{/each}
					</div>
				{/if}
			{:else}
				<!-- Sent / Outgoing Tab -->
				{#if sentNotifications.length === 0}
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
					<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden flex flex-col divide-y divide-zinc-100 dark:divide-white/5">
						{#each sentNotifications as notif}
							{@const IconInfo = getNotificationIcon(notif.type)}
							{@const taskUrl = notif.boardId ? `/boards/${notif.boardId}?task=${notif.taskId}` : `/tasks/${notif.taskId}`}
							<a 
								href={taskUrl}
								class="group flex items-start gap-4 p-5 sm:p-6 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.02] relative"
							>
								<div class="shrink-0 relative">
									<Avatar name={notif.recipientName || "Team Member"} size="lg" />
									<div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border-2 border-white dark:border-[#09090b] shadow-sm flex items-center justify-center {IconInfo.color}">
										<IconInfo.icon class="w-3 h-3" />
									</div>
								</div>
								
								<div class="flex-1 min-w-0">
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-1">
										<p class="text-[15px] text-zinc-900 dark:text-zinc-100 leading-snug pr-4">
											<span class="font-bold">You</span> {getNotificationText(notif.type, true)} <span class="font-bold">{notif.recipientName || 'a team member'}</span>
											{#if notif.taskTitle}
												<span class="font-medium text-zinc-600 dark:text-zinc-400"> on "{notif.taskTitle}"</span>
											{/if}
										</p>
										<span class="shrink-0 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
											<Clock class="w-3.5 h-3.5" />
											{new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
										</span>
									</div>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</div>
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
