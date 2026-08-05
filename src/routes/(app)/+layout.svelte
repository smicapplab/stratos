<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import AppSidebar from '$lib/components/layout/AppSidebar.svelte';
	import AppHeader from '$lib/components/layout/AppHeader.svelte';
	import CommandPalette from '$lib/components/ui/CommandPalette.svelte';
	import CreateProjectModal from '$lib/components/projects/CreateProjectModal.svelte';
	import CreateBoardModal from '$lib/components/boards/CreateBoardModal.svelte';
	import BrandLogoType from '$lib/components/ui/BrandLogoType.svelte';
	import CelebrationCanvas from '$lib/components/ui/CelebrationCanvas.svelte';
	import { LayoutDashboard, CheckCircle2, Inbox, CalendarDays, LifeBuoy } from 'lucide-svelte';

	let { data, children } = $props();
	let user = $derived(data.user);
	let group = $derived(data.group);
	let projects = $derived(data.projects);
	let boards = $derived(data.boards);

	interface NotificationItem {
		id: string;
		type: string;
		readAt: Date | null;
		createdAt: Date | string;
		taskId: string;
		boardId?: string | null;
		taskTitle: string | null;
		actorId: string | null;
	}

	import { markNotificationAsRead as apiMarkNotificationAsRead, markAllNotificationsAsRead as apiMarkAllNotificationsAsRead } from '$lib/utils/notifications';

	let notifications = $state<NotificationItem[]>([]);
	$effect(() => {
		notifications = data.notifications || [];
	});

	async function markNotificationAsRead(id: string) {
		const idx = notifications.findIndex((n) => n.id === id);
		if (idx !== -1) {
			notifications[idx].readAt = new Date();
		}
		await apiMarkNotificationAsRead(id);
	}

	async function markAllAsRead() {
		for (const n of notifications) {
			n.readAt = new Date();
		}
		await apiMarkAllNotificationsAsRead();
	}

	let userEventSource: EventSource | null = null;
	onMount(() => {
		if (!localStorage.getItem('stratos-theme') && data.group?.defaultTheme) {
			document.documentElement.setAttribute('data-theme', data.group.defaultTheme);
		}
		userEventSource = new EventSource('/api/users/sync');
		userEventSource.onmessage = (e) => {
			if (e.data === 'ping') return;
			try {
				const event = JSON.parse(e.data);
				if (event.type === 'notification_created') {
					notifications = [event.payload, ...notifications];
				}
			} catch (err) {}
		};
	});

	onDestroy(() => {
		if (userEventSource) userEventSource.close();
	});

	let isDark = $state(false);
	let themeInitialized = false;

	$effect(() => {
		if (browser && !themeInitialized) {
			const localTheme = localStorage.getItem('theme');
			if (localTheme) {
				if (localTheme === 'dark') document.documentElement.classList.add('dark');
				else document.documentElement.classList.remove('dark');
			} else if (user?.theme && user.theme !== 'system') {
				if (user.theme === 'dark') document.documentElement.classList.add('dark');
				else document.documentElement.classList.remove('dark');
				localStorage.setItem('theme', user.theme);
			} else {
				if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
					document.documentElement.classList.add('dark');
				} else {
					document.documentElement.classList.remove('dark');
				}
			}
			isDark = document.documentElement.classList.contains('dark');
			themeInitialized = true;
		}
	});

	function toggleTheme() {
		isDark = !isDark;
		if (isDark) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}

	// Modal Controls
	let isCommandPaletteOpen = $state(false);
	let isCreatingProject = $state(false);
	let isCreatingBoard = $state(false);
	let selectedProjectIdForBoard = $state('');

	function handleKeyDown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			isCommandPaletteOpen = !isCommandPaletteOpen;
		}
	}

	let currentPath = $derived($page.url.pathname);

	const topNavItems = [
		{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
		{ name: 'My Tasks', href: '/my-tasks', icon: CheckCircle2 },
		{ name: 'Inbox', href: '/inbox', icon: Inbox },
		{ name: 'Calendar', href: '/calendar', icon: CalendarDays },
		{ name: 'Helpdesk', href: '/helpdesk/tickets', icon: LifeBuoy }
	];
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="flex h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 antialiased selection:bg-brand-primary/20 selection:text-brand-primary">
	<!-- Desktop Left Navigation Sidebar -->
	<div class="hidden lg:flex h-full shrink-0">
		<AppSidebar
			{user}
			{group}
			{projects}
			{boards}
			onOpenCreateProject={() => isCreatingProject = true}
			onOpenCreateBoard={(pId) => {
				selectedProjectIdForBoard = pId;
				isCreatingBoard = true;
			}}
		/>
	</div>

	<!-- Main Content Layout Area -->
	<div class="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
		<!-- Top App Header -->
		<AppHeader
			{user}
			bind:isDark
			bind:notifications
			onOpenCommandPalette={() => isCommandPaletteOpen = true}
			onToggleTheme={toggleTheme}
			onMarkNotificationRead={markNotificationAsRead}
			onMarkAllNotificationsRead={markAllAsRead}
		/>

		<!-- Page View Slot -->
		<main class="flex-1 overflow-y-auto relative bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-950 dark:to-zinc-900/80">
			<!-- Ambient Watermark & Glow Effects -->
			<div class="absolute inset-0 overflow-hidden pointer-events-none z-0">
				<div class="absolute -top-[20%] left-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-brand-primary/10 to-purple-500/0 dark:from-brand-primary/15 dark:to-transparent blur-[120px] opacity-70"></div>
				<div class="absolute top-[40%] -right-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-brand-primary/10 to-indigo-500/0 dark:from-brand-primary/15 dark:to-transparent blur-[120px] opacity-70"></div>
				<div class="absolute bottom-0 right-0 w-[480px] h-[480px] translate-x-12 translate-y-12">
					<BrandLogoType class="w-full h-full text-brand-primary opacity-[0.08] dark:opacity-[0.05] transition-colors duration-300" />
				</div>
			</div>

			<div class="relative min-h-full h-full flex flex-col flex-1 pb-16 lg:pb-0">
				{@render children()}
			</div>
		</main>
	</div>
</div>

<!-- Mobile Bottom Navigation Bar (Rule 14) -->
<nav
	class="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/80 z-50 flex items-center justify-around"
	style="padding-bottom: env(safe-area-inset-bottom);"
>
	{#each topNavItems as item}
		<a
			href={item.href}
			class="flex flex-col items-center justify-center py-2 px-3 min-w-[44px] min-h-[44px] {currentPath === item.href ? 'text-brand-primary dark:text-brand-primary font-bold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}"
		>
			<item.icon class="w-5 h-5 mb-0.5" />
			<span class="text-[10px]">{item.name}</span>
		</a>
	{/each}
</nav>

<!-- Modals & Overlays -->
<CommandPalette bind:isOpen={isCommandPaletteOpen} />
<CreateProjectModal bind:isOpen={isCreatingProject} />
<CreateBoardModal
	bind:isOpen={isCreatingBoard}
	{projects}
	selectedProjectId={selectedProjectIdForBoard}
/>

<CelebrationCanvas />

