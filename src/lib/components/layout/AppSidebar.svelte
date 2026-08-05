<script lang="ts">
	import { page } from '$app/stores';
	import DynamicIcon from '$lib/components/ui/DynamicIcon.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import {
		LayoutDashboard,
		CheckCircle2,
		Inbox,
		CalendarDays,
		LifeBuoy,
		Plus,
		ChevronRight,
		ChevronDown,
		Settings,
		LogOut,
		User,
		Users,
		Info,
		BookOpen
	} from 'lucide-svelte';

	let {
		user,
		group,
		projects = [],
		boards = [],
		onOpenCreateProject,
		onOpenCreateBoard
	}: {
		user: any;
		group: any;
		projects: any[];
		boards: any[];
		onOpenCreateProject: () => void;
		onOpenCreateBoard: (projectId: string) => void;
	} = $props();

	let openProjects = $state<Record<string, boolean>>({});
	let isUserMenuOpen = $state(false);

	let boardsByProject = $derived(
		(() => {
			const map: Record<string, any[]> = {};
			for (const b of boards) {
				if (!map[b.projectId]) map[b.projectId] = [];
				map[b.projectId].push(b);
			}
			return map;
		})()
	);

	function toggleProject(id: string) {
		openProjects[id] = !openProjects[id];
	}

	async function handleSignOut() {
		try {
			const response = await fetch('/api/logout', { method: 'POST' });
			if (response.ok || response.redirected) {
				window.location.href = '/';
			}
		} catch (e) {
			console.error('Logout failed:', e);
		}
	}

	let currentPath = $derived($page.url.pathname);
</script>

<aside class="w-64 h-full bg-white/70 dark:bg-zinc-900/50 border-r border-zinc-200/80 dark:border-zinc-800/80 flex flex-col justify-between flex-shrink-0 backdrop-blur-xl relative">
	<!-- Top Area: Workspace Header & Navigation -->
	<div class="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
		<!-- Workspace / Brand Header -->
		<div class="h-16 flex items-center px-5 border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
			<div class="flex items-center gap-3 min-w-0">
				{#if group?.logoUrl}
					<img src={group.logoUrl} alt={group.name} class="w-8 h-8 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800 shrink-0" />
				{:else}
					<div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-primary to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
						{group?.name?.charAt(0).toUpperCase() || 'S'}
					</div>
				{/if}
				<div class="flex flex-col min-w-0">
					<span class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{group?.name || 'Workspace'}</span>
					<span class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Stratos Platform</span>
				</div>
			</div>
		</div>

		<!-- Main Section Nav Links -->
		<div class="p-3 space-y-1">
			<a
				href="/dashboard"
				class="flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all min-h-[40px] {currentPath === '/dashboard' ? 'bg-brand-primary/10 text-brand-primary font-bold dark:bg-brand-primary/20 dark:text-brand-primary' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'}"
			>
				<LayoutDashboard class="w-4 h-4" />
				<span>Dashboard</span>
			</a>
			<a
				href="/my-tasks"
				class="flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all min-h-[40px] {currentPath === '/my-tasks' ? 'bg-brand-primary/10 text-brand-primary font-bold dark:bg-brand-primary/20 dark:text-brand-primary' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'}"
			>
				<CheckCircle2 class="w-4 h-4" />
				<span>My Tasks</span>
			</a>
			<a
				href="/inbox"
				class="flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all min-h-[40px] {currentPath === '/inbox' ? 'bg-brand-primary/10 text-brand-primary font-bold dark:bg-brand-primary/20 dark:text-brand-primary' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'}"
			>
				<Inbox class="w-4 h-4" />
				<span>Inbox</span>
			</a>
			<a
				href="/calendar"
				class="flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all min-h-[40px] {currentPath === '/calendar' ? 'bg-brand-primary/10 text-brand-primary font-bold dark:bg-brand-primary/20 dark:text-brand-primary' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'}"
			>
				<CalendarDays class="w-4 h-4" />
				<span>Calendar</span>
			</a>
			<a
				href="/helpdesk/tickets"
				class="flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all min-h-[40px] {currentPath.startsWith('/helpdesk') ? 'bg-brand-primary/10 text-brand-primary font-bold dark:bg-brand-primary/20 dark:text-brand-primary' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'}"
			>
				<LifeBuoy class="w-4 h-4" />
				<span>Support Helpdesk</span>
			</a>
		</div>

		<!-- Projects & Boards Tree -->
		<div class="px-3 pt-4 pb-2 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
			<div class="flex items-center justify-between px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
				<span>Projects & Boards</span>
				{#if user?.role === 'Admin' || user?.role === 'Manager'}
					<button
						onclick={onOpenCreateProject}
						class="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"
						title="Create Project"
					>
						<Plus class="w-3.5 h-3.5" />
					</button>
				{/if}
			</div>

			<div class="space-y-1">
				{#each projects as project}
					{@const isExpanded = openProjects[project.id]}
					{@const projectBoards = boardsByProject[project.id] || []}
					<div>
						<div class="flex items-center justify-between group px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors text-xs font-medium text-zinc-700 dark:text-zinc-300">
							<button
								onclick={() => toggleProject(project.id)}
								class="flex items-center gap-2 flex-1 min-w-0 text-left"
							>
								{#if isExpanded}
									<ChevronDown class="w-3.5 h-3.5 text-zinc-400" />
								{:else}
									<ChevronRight class="w-3.5 h-3.5 text-zinc-400" />
								{/if}
								<DynamicIcon name={project.icon || 'Folder'} class="w-4 h-4 text-zinc-400 shrink-0" />
								<span class="truncate">{project.name}</span>
							</button>

							<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<a
									href="/projects/{project.id}/settings"
									class="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded"
									title="Project Settings"
								>
									<Settings class="w-3.5 h-3.5" />
								</a>
								<button
									onclick={() => onOpenCreateBoard(project.id)}
									class="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded"
									title="New Board"
								>
									<Plus class="w-3.5 h-3.5" />
								</button>
							</div>
						</div>

						{#if isExpanded}
							<div class="pl-6 pt-1 space-y-0.5 border-l border-zinc-200 dark:border-zinc-800 ml-4 my-1">
								{#each projectBoards as board}
									<a
										href="/boards/{board.id}"
										class="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[36px] {currentPath === `/boards/${board.id}` ? 'bg-brand-primary/10 text-brand-primary font-semibold dark:bg-brand-primary/20 dark:text-brand-primary' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-100'}"
									>
										<span class="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
										<span class="truncate">{board.name}</span>
									</a>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Admin Section -->
		{#if user?.role === 'Admin'}
			<div class="px-3 pt-4 pb-2 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-1">
				<div class="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
					Administration
				</div>
				<a
					href="/admin/users"
					class="flex items-center gap-3 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl transition-colors min-h-[40px] {currentPath.startsWith('/admin/users') ? 'bg-brand-primary/10 text-brand-primary font-bold dark:bg-brand-primary/20' : ''}"
				>
					<Users class="w-4 h-4 text-zinc-400" />
					<span>User Access</span>
				</a>
			</div>
		{/if}
	</div>

	<!-- User Footer Section with Avatar Card & Popover Menu -->
	<div class="p-3 border-t border-zinc-200/60 dark:border-zinc-800/60 relative user-menu-container shrink-0">
		{#if isUserMenuOpen}
			<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
			<div
				class="fixed inset-0 z-40"
				onclick={() => isUserMenuOpen = false}
				onkeydown={(e) => { if (e.key === 'Escape') isUserMenuOpen = false; }}
			></div>

			<div class="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 z-50 overflow-hidden animate-in fade-in zoom-in duration-150">
				<a
					href="/settings/profile"
					class="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[40px]"
					onclick={() => isUserMenuOpen = false}
				>
					<User class="w-4 h-4 text-zinc-400" />
					<span>My Profile</span>
				</a>
				<a
					href="/settings/preferences"
					class="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[40px]"
					onclick={() => isUserMenuOpen = false}
				>
					<Settings class="w-4 h-4 text-zinc-400" />
					<span>Preferences</span>
				</a>
				<a
					href="/manual/index.html"
					target="_blank"
					class="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[40px]"
					onclick={() => isUserMenuOpen = false}
				>
					<BookOpen class="w-4 h-4 text-zinc-400" />
					<span>User Manual</span>
				</a>
				<a
					href="/about"
					class="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[40px]"
					onclick={() => isUserMenuOpen = false}
				>
					<Info class="w-4 h-4 text-zinc-400" />
					<span>About Stratos</span>
				</a>

				<hr class="border-zinc-200 dark:border-zinc-800 my-1" />

				<button
					onclick={handleSignOut}
					class="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors min-h-[40px]"
				>
					<LogOut class="w-4 h-4 text-red-500" />
					<span>Sign Out</span>
				</button>
			</div>
		{/if}

		<button
			type="button"
			class="w-full flex items-center justify-between p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors min-h-[48px]"
			onclick={() => isUserMenuOpen = !isUserMenuOpen}
		>
			<div class="flex items-center gap-3 min-w-0">
				<Avatar name={user?.name || 'User'} email={user?.email} photo={user?.avatarUrl} size="md" />
				<div class="flex flex-col text-left min-w-0">
					<span class="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{user?.name || 'User'}</span>
					<span class="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{user?.email || ''}</span>
				</div>
			</div>
			<ChevronDown class="w-4 h-4 text-zinc-400 shrink-0 ml-1" />
		</button>
	</div>
</aside>
