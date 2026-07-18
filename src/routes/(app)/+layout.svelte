<script lang="ts">
	import { browser } from '$app/environment';
	import CreateBoardModal from '$lib/components/boards/CreateBoardModal.svelte';
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import CommandPalette from '$lib/components/ui/CommandPalette.svelte';
	import { 
		KanbanSquare,
		LogOut,
		Search,
		Plus,
		Bell,
		CheckCircle2,
		Inbox,
		CalendarDays,
		Settings,
		ChevronRight,
		ChevronDown,
		Sun,
		Moon,
		PanelLeft,
		LayoutDashboard,
		LifeBuoy,
		User
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { data, children } = $props();
	let user = $derived(data.user);
	let projects = $derived(data.projects);
	let boards = $derived(data.boards);
	
	interface NotificationItem {
		id: string;
		type: string;
		readAt: Date | null;
		createdAt: Date | string;
		taskId: string;
		taskTitle: string | null;
		actorId: string | null;
	}

	let notifications = $state<NotificationItem[]>([]);
	$effect(() => {
		notifications = data.notifications || [];
	});
	let unreadCount = $derived(notifications.filter((n) => !n.readAt).length);

	let isNotificationsOpen = $state(false);

	async function markNotificationAsRead(id: string) {
		const idx = notifications.findIndex((n) => n.id === id);
		if (idx !== -1) {
			notifications[idx].readAt = new Date();
		}
		
		try {
			await fetch('/api/notifications/read', {
				method: 'POST',
				body: JSON.stringify({ notificationId: id })
			});
		} catch (e) {
			console.error(e);
		}
	}

	async function markAllAsRead() {
		for (const n of notifications) {
			n.readAt = new Date();
		}
		
		try {
			await fetch('/api/notifications/read', { method: 'POST', body: JSON.stringify({}) });
		} catch (e) {
			console.error(e);
		}
	}

	let userEventSource: EventSource | null = null;
	onMount(() => {
		userEventSource = new EventSource('/api/users/sync');
		userEventSource.onmessage = (e) => {
			if (e.data === 'ping') return;
			try {
				const event = JSON.parse(e.data);
				if (event.type === 'notification_created') {
					notifications = [event.payload, ...notifications];
				}
			} catch(err) {}
		};
	});

	onDestroy(() => {
		if (userEventSource) userEventSource.close();
	});

	let boardsByProject = $derived((() => {
		const map: Record<string, typeof boards> = {};
		for (const b of boards) {
			if (!map[b.projectId]) map[b.projectId] = [];
			map[b.projectId].push(b);
		}
		return map;
	})());

	// Theme Toggle Logic
	let isDark = $state(false);

	// On mount, sync with actual DOM state and user's DB preference
	$effect(() => {
		if (browser) {
			if (user?.theme && user.theme !== 'system') {
				if (localStorage.theme !== user.theme) {
					localStorage.theme = user.theme;
					if (user.theme === 'dark') {
						document.documentElement.classList.add('dark');
					} else {
						document.documentElement.classList.remove('dark');
					}
				}
			} else if (user?.theme === 'system' && localStorage.theme) {
				localStorage.removeItem('theme');
				if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
					document.documentElement.classList.add('dark');
				} else {
					document.documentElement.classList.remove('dark');
				}
			}
			isDark = document.documentElement.classList.contains('dark');
		}
	});

	function toggleTheme() {
		isDark = !isDark;
		if (isDark) {
			document.documentElement.classList.add('dark');
			localStorage.theme = 'dark';
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.theme = 'light';
		}
	}

	const topNavItems = [
		{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
		{ name: 'My Tasks', href: '/my-tasks', icon: CheckCircle2 },
		{ name: 'Inbox', href: '/inbox', icon: Inbox },
		{ name: 'My Calendar', href: '/calendar', icon: CalendarDays },
	];

	const adminItems = [
		{ name: 'My Profile', href: '/settings/profile', icon: Settings },
		{ name: 'User Access', href: '/admin/users', icon: Settings },
	];

	let collapsedProjects = $state<Record<string, boolean>>({});
	let addingBoardToProject = $state<string | null>(null);
	let addingProject = $state(false);
	let isCreatingBoard = $state(false);
	let selectedProjectIdForBoard = $state<string | null>(null);
	let isSidebarOpen = $state(true);

	$effect(() => {
		if (browser) {
			const stored = localStorage.getItem('collapsed-projects');
			if (stored) {
				try {
					collapsedProjects = JSON.parse(stored);
				} catch (e) {}
			}
			const storedSidebar = localStorage.getItem('sidebar-open');
			if (storedSidebar !== null) {
				isSidebarOpen = storedSidebar === 'true';
			}
		}
	});

	function toggleProject(projectId: string) {
		collapsedProjects[projectId] = !collapsedProjects[projectId];
		localStorage.setItem('collapsed-projects', JSON.stringify(collapsedProjects));
	}

	function toggleSidebar() {
		isSidebarOpen = !isSidebarOpen;
		localStorage.setItem('sidebar-open', String(isSidebarOpen));
	}

	// Derived store to check active routes
	let currentPath = $derived($page.url.pathname);
	let isCommandPaletteOpen = $state(false);
	let isUserMenuOpen = $state(false);

	async function handleSignOut() {
		isUserMenuOpen = false;
		try {
			const response = await fetch('/api/logout', {
				method: 'POST'
			});
			if (response.ok || response.redirected) {
				window.location.href = '/';
			}
		} catch (e) {
			console.error('Logout failed:', e);
		}
	}
</script>

<div class="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-sans text-zinc-900 dark:text-zinc-100">
	
	<!-- Sidebar / Workspace Shell -->
	<aside class="hidden lg:flex w-64 flex-shrink-0 flex-col bg-white/70 dark:bg-zinc-900/50 backdrop-blur-xl border-r border-zinc-200/80 dark:border-zinc-800/80 z-20 transition-all duration-300 ease-in-out {isSidebarOpen ? 'ml-0' : '-ml-64'}">
		<!-- Brand Header -->
		<div class="h-16 flex items-center px-6 border-b border-zinc-200/50 dark:border-zinc-800/50">
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md flex items-center justify-center">
					<span class="text-white font-bold text-sm tracking-tighter">ST</span>
				</div>
				<span class="font-bold text-lg tracking-tight">Stratos</span>
			</div>
		</div>

		<!-- Navigation -->
		<nav class="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
			
			<!-- Top Nav -->
			<div>
				<ul class="space-y-1">
					{#each topNavItems as item}
						<li>
							<a 
								href={item.href}
								class="flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 group
								{currentPath === item.href 
									? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
									: 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'}"
							>
								<item.icon class="w-4 h-4 transition-transform group-hover:scale-110" />
								{item.name}
							</a>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Projects & Boards -->
			<div>
				<div class="px-3 mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 group">
					Projects
					<button 
						class="opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex-shrink-0"
						title="Add Project"
						onclick={(e) => {
							e.stopPropagation();
							addingProject = true;
						}}
					>
						<Plus class="w-3.5 h-3.5" />
					</button>
				</div>
				<ul class="space-y-2">
					{#if addingProject}
						<li>
							<form 
								method="POST" 
								action="/projects?/create" 
								use:enhance={() => {
									return async ({ update }) => {
										await update();
										addingProject = false;
									}
								}}
								class="flex items-center px-2 py-1 mb-1"
							>
								<input 
									type="text" 
									name="name" 
									placeholder="Project name..." 
									class="w-full bg-white dark:bg-zinc-950 border border-blue-500 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
									onblur={() => {
										setTimeout(() => {
											if (addingProject) addingProject = false;
										}, 150);
									}}
									onkeydown={(e) => {
										if (e.key === 'Escape') addingProject = false;
									}}
								/>
							</form>
						</li>
					{/if}
					{#each projects as project (project.id)}
						<li>
							<div class="flex items-center px-2 py-1 w-full rounded-md text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors group relative">
								<div class="flex items-center gap-1.5 flex-1 min-w-0">
									<button 
										class="flex-shrink-0 p-0.5 rounded text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800" 
										onclick={(e) => { e.preventDefault(); e.stopPropagation(); toggleProject(project.id); }}
										aria-label="Toggle Project"
									>
										{#if collapsedProjects[project.id]}
											<ChevronRight class="w-3.5 h-3.5" />
										{:else}
											<ChevronDown class="w-3.5 h-3.5" />
										{/if}
									</button>
									<a 
										href={`/projects/${project.id}/settings`} 
										class="flex-1 truncate hover:text-zinc-900 dark:hover:text-white"
									>
										{project.name}
									</a>
								</div>
								<!-- Project Actions -->
								<div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
									<a 
										href={`/projects/${project.id}/settings`}
										class="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex-shrink-0"
										title="Project Settings"
										onclick={(e) => e.stopPropagation()}
									>
										<Settings class="w-3.5 h-3.5" />
									</a>
									{#if user?.role === 'Admin'}
										<button 
											class="p-1 -mr-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex-shrink-0"
											title="Add Board"
											onclick={(e) => {
												e.stopPropagation();
												isCreatingBoard = true;
												selectedProjectIdForBoard = project.id;
												collapsedProjects[project.id] = false; // Expand the project
											}}
										>
											<Plus class="w-3.5 h-3.5" />
										</button>
									{/if}
								</div>
							</div>
							{#if !collapsedProjects[project.id]}
								<ul class="mt-1 space-y-0.5 ml-4 border-l border-zinc-200 dark:border-zinc-800 pl-2">
									{#each (boardsByProject[project.id] || []) as board (board.id)}
										<li>
											<a 
												href={`/boards/${board.id}`}
												class="flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 group
												{currentPath === `/boards/${board.id}` 
													? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
													: 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'}"
											>
												<KanbanSquare class="w-3.5 h-3.5 transition-transform group-hover:scale-110 {currentPath === `/boards/${board.id}` ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'}" />
												<span class="truncate">{board.name}</span>
											</a>
										</li>
									{/each}
									
									{#if addingBoardToProject === project.id}
										<!-- Trigger global modal via reactive state. Since the layout is global, we can just render the modal at the layout level. But we're rendering the button here. Wait, addingBoardToProject is just state. Let's just set global isCreatingBoard = true instead of using addingBoardToProject inline form -->
									{/if}

									{#if !(boardsByProject[project.id] && boardsByProject[project.id].length > 0) && addingBoardToProject !== project.id}
										<li class="px-3 py-1.5 text-[12px] text-zinc-400 italic">No boards</li>
									{/if}
								</ul>
							{/if}
						</li>
					{/each}
				</ul>
			</div>

			<!-- Administration -->
			{#if user?.role === 'Admin'}
				<div>
					<div class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Administration</div>
					<ul class="space-y-1">
						{#each adminItems as item}
							<li>
								<a 
									href={item.href}
									class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group
									{currentPath.startsWith(item.href)
										? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
										: 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'}"
								>
									<item.icon class="w-4 h-4 transition-transform group-hover:scale-110" />
									{item.name}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</nav>

		<!-- User Footer -->
		<div class="p-4 border-t border-zinc-200/50 dark:border-zinc-800/50 relative user-menu-container">
			{#if isUserMenuOpen}
				<div 
					class="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-50 overflow-hidden"
				>
					<a 
						href="/settings/profile" 
						class="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[44px]"
						onclick={() => isUserMenuOpen = false}
					>
						<User class="w-4 h-4 text-zinc-500" />
						<span>My Profile</span>
					</a>
					<a 
						href="/helpdesk/tickets" 
						class="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[44px]"
						onclick={() => isUserMenuOpen = false}
					>
						<LifeBuoy class="w-4 h-4 text-zinc-500" />
						<span>Helpdesk Portal</span>
					</a>
					<hr class="border-zinc-200 dark:border-zinc-800 my-1" />
					<button 
						type="button" 
						class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors min-h-[44px] cursor-pointer"
						onclick={handleSignOut}
					>
						<LogOut class="w-4 h-4" />
						<span>Sign Out</span>
					</button>
				</div>
			{/if}

			<button 
				onclick={() => isUserMenuOpen = !isUserMenuOpen}
				class="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors group cursor-pointer text-left min-h-[44px]"
				title="Toggle User Menu"
			>
				<div class="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-inner flex-shrink-0">
					{user?.name?.charAt(0).toUpperCase()}
				</div>
				<div class="truncate flex-1">
					<div class="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">{user?.name}</div>
					<div class="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user?.role}</div>
				</div>
				<ChevronRight class="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-transform duration-200 {isUserMenuOpen ? '-rotate-90' : 'rotate-90'}" />
			</button>
		</div>
	</aside>

	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col relative z-10 overflow-hidden">
		<!-- Top Navbar -->
		<header class="h-16 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between px-8 sticky top-0 z-30 transition-all duration-300">
			
			<!-- Left Side Actions -->
			<div class="flex items-center gap-4 flex-1 max-w-xl">
				<button 
					onclick={toggleSidebar}
					class="hidden lg:flex p-1.5 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
					title="Toggle Sidebar"
				>
					<PanelLeft class="w-5 h-5" />
				</button>

				<!-- Search Bar -->
				<div class="relative group flex-1">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
					<input 
						type="text" 
						readonly
						onclick={() => isCommandPaletteOpen = true}
						onfocus={() => isCommandPaletteOpen = true}
						placeholder="Search tasks, projects, or boards... (Press ⌘K)" 
						class="w-full bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-zinc-500 cursor-pointer"
					/>
				</div>
			</div>

			<!-- Right Actions -->
			<div class="flex items-center gap-2 ml-4">
				<!-- Notification Bell -->
				<div class="relative">
					<button 
						onclick={() => isNotificationsOpen = !isNotificationsOpen}
						class="relative p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
						title="Notifications"
					>
						<Bell class="w-4 h-4" />
						{#if unreadCount > 0}
							<span class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
						{/if}
					</button>

					{#if isNotificationsOpen}
						<div class="fixed inset-0 z-40" onclick={() => isNotificationsOpen = false} onkeydown={(e) => e.key === 'Escape' && (isNotificationsOpen = false)} role="button" tabindex="0" aria-label="Close notifications"></div>
						<div class="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden max-h-[60vh] flex flex-col">
							<div class="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
								<h3 class="text-sm font-bold text-zinc-900 dark:text-white">Notifications</h3>
								{#if unreadCount > 0}
									<button class="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400" onclick={markAllAsRead}>Mark all read</button>
								{/if}
							</div>
							<div class="overflow-y-auto flex-1">
								{#if notifications.length === 0}
									<div class="p-6 text-center text-sm text-zinc-500">No notifications yet</div>
								{:else}
									{#each notifications.slice(0, 20) as notif (notif.id)}
										<button 
											class="w-full text-left px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors {notif.readAt ? 'opacity-60' : ''}"
											onclick={() => { markNotificationAsRead(notif.id); isNotificationsOpen = false; }}
										>
											<div class="flex items-start gap-2">
												{#if !notif.readAt}
													<div class="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
												{:else}
													<div class="w-2 h-2 flex-shrink-0"></div>
												{/if}
												<div class="flex-1 min-w-0">
													<p class="text-xs font-medium text-zinc-900 dark:text-white truncate">
														{notif.type === 'assigned' ? 'You were assigned to' : notif.type === 'mentioned' ? 'You were mentioned in' : 'Status changed on'}
														<span class="font-semibold">{notif.taskTitle || 'a task'}</span>
													</p>
												</div>
											</div>
										</button>
									{/each}
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<button 
					onclick={toggleTheme}
					class="flex items-center gap-2 p-2 px-3 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors border border-transparent dark:border-zinc-800"
					title="Toggle theme"
				>
					{#if isDark}
						<Sun class="w-4 h-4" /> <span class="hidden sm:inline">Light</span>
					{:else}
						<Moon class="w-4 h-4" /> <span class="hidden sm:inline">Dark</span>
					{/if}
				</button>

				<a 
					href="/settings/profile" 
					class="lg:hidden flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 text-white text-xs font-bold shadow-inner flex-shrink-0 ml-1"
					title="My Profile"
				>
					{user?.name?.charAt(0).toUpperCase()}
				</a>

			</div>
		</header>

		<!-- Page Content -->
		<main class="flex-1 overflow-y-auto relative bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-950 dark:to-zinc-900/80">
			<!-- We render the child routes here -->
			{@render children()}
		</main>
	</div>
</div>

	<!-- Mobile Bottom Navigation -->
	<nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/80 z-50 flex items-center justify-around" style="padding-bottom: env(safe-area-inset-bottom);">
		{#each topNavItems as item}
			<a 
				href={item.href}
				class="flex flex-col items-center justify-center py-3 px-4 min-w-[44px] min-h-[44px]
				{currentPath === item.href ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}"
			>
				<item.icon class="w-5 h-5 mb-1" />
				<span class="text-[10px]">{item.name}</span>
			</a>
		{/each}
	</nav>

<CommandPalette bind:isOpen={isCommandPaletteOpen} />
<CreateBoardModal bind:isOpen={isCreatingBoard} projects={projects} selectedProjectId={selectedProjectIdForBoard} />

<svelte:window onclick={(e) => {
	if (isUserMenuOpen && e.target && !(e.target as Element).closest('.user-menu-container')) {
		isUserMenuOpen = false;
	}
}} />

<style>
	/* Subtle custom scrollbar for the workspace */
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(156, 163, 175, 0.3);
		border-radius: 10px;
	}
	.custom-scrollbar:hover::-webkit-scrollbar-thumb {
		background: rgba(156, 163, 175, 0.5);
	}
</style>
