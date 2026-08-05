<script lang="ts">
	import { Search, Bell, Sun, Moon } from 'lucide-svelte';
	import NotificationDropdown from './NotificationDropdown.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	let {
		user,
		isDark = $bindable(false),
		notifications = $bindable([]),
		onOpenCommandPalette,
		onToggleTheme,
		onMarkNotificationRead,
		onMarkAllNotificationsRead
	}: {
		user: any;
		isDark: boolean;
		notifications: any[];
		onOpenCommandPalette: () => void;
		onToggleTheme: () => void;
		onMarkNotificationRead: (id: string) => void;
		onMarkAllNotificationsRead: () => void;
	} = $props();

	let isNotificationsOpen = $state(false);
	let unreadCount = $derived(notifications.filter((n) => !n.readAt).length);
</script>

<header class="h-14 border-b border-zinc-200/60 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/30 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0 z-30">
	<!-- Left Search Trigger Button -->
	<button
		onclick={onOpenCommandPalette}
		class="flex items-center gap-3 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-zinc-100/70 dark:bg-zinc-800/50 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 rounded-full transition-all border border-zinc-200/50 dark:border-zinc-700/50 min-h-[36px]"
	>
		<Search class="w-3.5 h-3.5" />
		<span class="font-medium pr-10">Search or jump to...</span>
		<kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700 shadow-2xs">⌘K</kbd>
	</button>

	<!-- Right Actions (Notifications & Theme Toggle & Mobile Avatar) -->
	<div class="flex items-center gap-2">
		<!-- Notification Bell -->
		<div class="relative">
			<button
				onclick={() => isNotificationsOpen = !isNotificationsOpen}
				class="relative p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors border border-transparent dark:border-zinc-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
				title="Notifications"
			>
				<Bell class="w-4 h-4" />
				{#if unreadCount > 0}
					<span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-primary/100"></span>
				{/if}
			</button>

			<NotificationDropdown
				bind:isOpen={isNotificationsOpen}
				bind:notifications
				onMarkRead={onMarkNotificationRead}
				onMarkAllRead={onMarkAllNotificationsRead}
			/>
		</div>

		<!-- Theme Toggle -->
		<button
			onclick={onToggleTheme}
			class="flex items-center gap-2 p-2 px-3 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors border border-transparent dark:border-zinc-800 min-h-[44px]"
			title="Toggle theme"
		>
			{#if isDark}
				<Sun class="w-4 h-4" />
				<span class="hidden sm:inline">Light</span>
			{:else}
				<Moon class="w-4 h-4" />
				<span class="hidden sm:inline">Dark</span>
			{/if}
		</button>

		<!-- Mobile Profile Avatar -->
		<a
			href="/settings/profile"
			class="lg:hidden flex items-center justify-center flex-shrink-0 ml-1"
			title="My Profile"
		>
			<Avatar name={user?.name || 'User'} email={user?.email} photo={user?.avatarUrl} size="sm" />
		</a>
	</div>
</header>
