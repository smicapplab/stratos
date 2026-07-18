<script lang="ts">
	import { 
		Bell, CheckCircle2, UserPlus, AtSign, Clock, Inbox, Check, MessageSquare
	} from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	let { data } = $props();
	
	// Convert server array into a Svelte 5 state array so we can optimistically update
	let notifications = $state<any[]>([]);

	// Svelte 5 effect to sync when data updates from server (e.g., via realtime invalidation)
	$effect(() => {
		notifications = data.notifications || [];
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
			case 'assigned': return { icon: UserPlus, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' };
			case 'mentioned': return { icon: AtSign, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' };
			case 'status_changed': return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' };
			case 'comment_added': return { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' };
			default: return { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' };
		}
	}

	function getNotificationText(type: string) {
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

<div class="h-full flex flex-col bg-zinc-50 dark:bg-[#09090b]">
	<header class="shrink-0 px-6 sm:px-10 py-8 max-w-4xl w-full mx-auto flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-3">
				Inbox 
				{#if unreadCount > 0}
					<span class="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} new</span>
				{/if}
			</h1>
			<p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Catch up on your latest activity.</p>
		</div>
		
		{#if notifications.length > 0}
			<button 
				onclick={markAllAsRead}
				disabled={unreadCount === 0}
				class="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all {unreadCount > 0 ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 hover:shadow-sm text-zinc-700 dark:text-zinc-300' : 'opacity-50 cursor-not-allowed text-zinc-400 border border-transparent'}"
			>
				<Check class="w-4 h-4" />
				Mark all read
			</button>
		{/if}
	</header>

	<div class="flex-1 overflow-y-auto px-6 sm:px-10 pb-20 custom-scrollbar">
		<div class="max-w-4xl w-full mx-auto">
			{#if notifications.length === 0}
				<div class="flex flex-col items-center justify-center py-28 px-4 text-center space-y-6">
					<div class="relative w-24 h-24 flex items-center justify-center">
						<!-- Double breathing glowing halo -->
						<div class="absolute inset-0 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full calm-pulse"></div>
						<div class="absolute inset-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-full border border-emerald-100 dark:border-emerald-800/25"></div>
						
						<!-- Floating animated icon -->
						<div class="relative calm-float p-4 text-emerald-600 dark:text-emerald-400">
							<Inbox class="w-10 h-10" />
						</div>
					</div>
					<div class="max-w-md space-y-2">
						<h3 class="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">All caught up! 🌿</h3>
						<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
							Your inbox is clear and peaceful. No new activities require your response. Take a moment to enjoy the quiet!
						</p>
					</div>
				</div>
			{:else}
				<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden flex flex-col divide-y divide-zinc-100 dark:divide-white/5">
					{#each notifications as notif}
						{@const IconInfo = getNotificationIcon(notif.type)}
						<a 
							href="/tasks/{notif.taskId || ''}" 
							onclick={() => {
								if (!notif.readAt) {
									markAsRead(notif.id);
								}
								// If we know the board ID, we'd navigate to it. Since notifications only store taskId right now,
								// we might need a global search or redirect endpoint. For now, we simulate a click.
								// e.preventDefault();
							}}
							class="group flex items-start gap-4 p-5 sm:p-6 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.02] relative {notif.readAt ? 'opacity-70' : ''}"
						>
							{#if !notif.readAt}
								<div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 dark:bg-blue-500"></div>
							{/if}
							
							<div class="shrink-0 relative">
								<Avatar name="System" size="lg" />
								<div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-[#121214] flex items-center justify-center {IconInfo.bg} {IconInfo.color}">
									<IconInfo.icon class="w-3 h-3" />
								</div>
							</div>
							
							<div class="flex-1 min-w-0">
								<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-1">
									<p class="text-[15px] text-zinc-900 dark:text-zinc-100 leading-snug pr-4">
										<span class="font-bold">Someone</span> {getNotificationText(notif.type)}
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
									<div class="mt-2 inline-flex items-center text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
										New Activity
									</div>
								{/if}
							</div>
						</a>
					{/each}
				</div>
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
