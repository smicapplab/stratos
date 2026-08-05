<script lang="ts">
	import { page } from '$app/stores';
	import { User, Shield, Sliders, Terminal, Building2 } from 'lucide-svelte';

	let { children } = $props();

	// Check if user has developer tab rights (Admins and Managers)
	let user = $derived($page.data.user);
	let showDeveloperTab = $derived(user?.role === 'Admin' || user?.role === 'Manager');
	let showWorkspaceTab = $derived(user?.role === 'Admin');

	const baseNavItems = [
		{ name: 'Profile', href: '/settings/profile', icon: User },
		{ name: 'Preferences', href: '/settings/preferences', icon: Sliders },
		{ name: 'Security', href: '/settings/security', icon: Shield },
	];

	let navItems = $derived([
		...baseNavItems,
		...(showWorkspaceTab ? [{ name: 'Workspace', href: '/settings/workspace', icon: Building2 }] : []),
		...(showDeveloperTab ? [{ name: 'Developer Tokens', href: '/settings/developer', icon: Terminal }] : [])
	]);

	async function handleSignOut() {
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

<div class="flex flex-col md:flex-row h-full min-h-full flex-1 w-full bg-transparent">
	<!-- Settings Sidebar -->
	<div class="w-full md:w-[240px] shrink-0 border-b md:border-b-0 md:border-r border-zinc-200/60 dark:border-zinc-800/60 bg-white/40 dark:bg-zinc-900/30 backdrop-blur-md flex flex-col h-full min-h-full justify-between py-6">
		<div class="px-5 mb-6 shrink-0">
			<h1 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Settings</h1>
		</div>
		
		<nav class="px-3 space-y-1 flex-1">
			{#each navItems as item}
				{@const isActive = $page.url.pathname === item.href}
				<a 
					href={item.href}
					class="flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 {isActive ? 'bg-brand-primary/10 text-brand-primary font-semibold dark:bg-brand-primary/20 dark:text-brand-primary' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'}"
				>
					<item.icon class="w-4 h-4 mr-3 {isActive ? 'text-brand-primary' : 'text-zinc-400 dark:text-zinc-500'}" />
					{item.name}
				</a>
			{/each}
		</nav>

		<div class="p-4 mt-auto border-t border-zinc-200/60 dark:border-zinc-800/60 shrink-0">
			<button 
				type="button" 
				onclick={handleSignOut}
				class="w-full flex items-center justify-center px-4 py-2.5 border border-red-200/60 dark:border-red-900/30 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/70 dark:hover:bg-red-900/40 transition-colors cursor-pointer min-h-[44px]"
			>
				Sign out
			</button>
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="flex-1 overflow-y-auto">
		<div class="max-w-3xl mx-auto px-8 py-10">
			{@render children()}
		</div>
	</div>
</div>
