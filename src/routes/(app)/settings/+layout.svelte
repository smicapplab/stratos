<script lang="ts">
	import { page } from '$app/stores';
	import { User, Shield, Sliders } from 'lucide-svelte';

	let { children } = $props();

	const navItems = [
		{ name: 'Profile', href: '/settings/profile', icon: User },
		{ name: 'Preferences', href: '/settings/preferences', icon: Sliders },
		{ name: 'Security', href: '/settings/security', icon: Shield },
	];
</script>

<div class="flex flex-col md:flex-row h-full w-full bg-white dark:bg-[#1C1C1E]">
	<!-- Settings Sidebar -->
	<div class="w-full md:w-[240px] flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-200 dark:border-white/[0.05] bg-[#F9F9F9] dark:bg-[#1E1E20] flex flex-col pt-6">
		<div class="px-5 mb-6">
			<h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
		</div>
		
		<nav class="flex-1 px-3 space-y-1">
			{#each navItems as item}
				{@const isActive = $page.url.pathname === item.href}
				<a 
					href={item.href}
					class="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors {isActive ? 'bg-gray-200 dark:bg-white/[0.08] text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-gray-200'}"
				>
					<item.icon class="w-4 h-4 mr-3 {isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-500'}" />
					{item.name}
				</a>
			{/each}
		</nav>
		
		<div class="p-4 border-t border-gray-200 dark:border-white/[0.05]">
			<form method="POST" action="/api/logout">
				<button 
					type="submit" 
					class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-white/[0.05] rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C1C1E] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
				>
					Sign out
				</button>
			</form>
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="flex-1 overflow-y-auto">
		<div class="max-w-3xl mx-auto px-8 py-10">
			{@render children()}
		</div>
	</div>
</div>
