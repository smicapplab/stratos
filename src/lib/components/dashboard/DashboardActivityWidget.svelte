<script lang="ts">
	import { Bell, UserPlus, AtSign, CheckCircle2, MessageSquare, Clock, Check, ArrowRight } from 'lucide-svelte';

	let { widgetsPromise }: { widgetsPromise: Promise<any> } = $props();

	let localNotifications = $state<any[]>([]);

	$effect(() => {
		widgetsPromise.then((widgets: any) => {
			localNotifications = widgets.unreadNotificationsList || [];
		});
	});

	async function markRead(id: string) {
		localNotifications = localNotifications.filter((n) => n.id !== id);
		try {
			await fetch('/api/notifications/read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
		} catch (err) {
			console.error('Failed to mark notification read:', err);
		}
	}

	function getNotificationIcon(type: string) {
		switch (type) {
			case 'assigned': return { icon: UserPlus, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' };
			case 'mentioned': return { icon: AtSign, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' };
			case 'status_changed': return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' };
			case 'comment_added': return { icon: MessageSquare, color: 'text-brand-primary', bg: 'bg-brand-primary/10 dark:bg-brand-primary/10' };
			default: return { icon: Bell, color: 'text-brand-primary', bg: 'bg-brand-primary/10 dark:bg-brand-primary/10' };
		}
	}

	function getNotificationText(type: string) {
		switch (type) {
			case 'assigned': return 'assigned you a task';
			case 'mentioned': return 'mentioned you in a task';
			case 'status_changed': return 'changed status of a task';
			case 'comment_added': return 'commented on a task';
			default: return 'notified you';
		}
	}
</script>

<div class="bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col min-h-[350px]">
	<div class="flex justify-between items-center mb-6">
		<div>
			<h3 class="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
				<Bell class="w-4 h-4 text-amber-500" />
				Inbox Alerts
			</h3>
			<p class="text-xs text-zinc-500 mt-0.5">Your most recent unread activities.</p>
		</div>
		<a href="/inbox" class="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 min-h-[36px]">
			Full Inbox
			<ArrowRight class="w-3 h-3" />
		</a>
	</div>

	{#await widgetsPromise}
		<div class="flex-1 flex items-center justify-center">
			<div class="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
		</div>
	{:then}
		{#if localNotifications.length === 0}
			<div class="flex-1 flex flex-col items-center justify-center text-center p-6 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
				<CheckCircle2 class="w-8 h-8 text-emerald-500 mb-2" />
				<h4 class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No Unread Alerts</h4>
				<p class="text-xs text-zinc-400 mt-1 max-w-[200px]">You are fully caught up with all notifications.</p>
			</div>
		{:else}
			<div class="flex-1 flex flex-col gap-3">
				{#each localNotifications as notif}
					{@const IconInfo = getNotificationIcon(notif.type)}
					<div class="flex items-start justify-between gap-4 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/40 hover:border-zinc-200/50 dark:hover:border-zinc-800/80 transition-colors bg-zinc-50/30 dark:bg-zinc-900/10">
						<div class="flex items-start gap-3 min-w-0">
							<div class="p-2 rounded-xl shrink-0 mt-0.5 {IconInfo.bg} {IconInfo.color}">
								<IconInfo.icon class="w-4 h-4" />
							</div>
							<div class="min-w-0">
								<p class="text-xs text-zinc-800 dark:text-zinc-200 font-medium">
									<span class="font-bold">{notif.actorName || 'Someone'}</span> {getNotificationText(notif.type)}
								</p>
								{#if notif.taskTitle}
									<p class="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold truncate mt-0.5">"{notif.taskTitle}"</p>
								{/if}
								<div class="flex items-center gap-1 text-[10px] text-zinc-400 mt-1">
									<Clock class="w-3 h-3" />
									{new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
								</div>
							</div>
						</div>

						<button 
							onclick={() => markRead(notif.id)}
							title="Mark read"
							class="p-2 rounded-lg border border-zinc-100 hover:border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-emerald-500 transition-all shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
						>
							<Check class="w-3.5 h-3.5" />
						</button>
					</div>
				{/each}
			</div>
		{/if}
	{/await}
</div>
