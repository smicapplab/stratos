<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';

	let { data, form } = $props();

	let theme = $state('system');
	let brandTheme = $state('stratos');
	let isSaving = $state(false);

	let initialized = $state(false);
	let initialTheme = $state('');
	let initialBrandTheme = $state('');

	$effect(() => {
		if (browser && !initialized) {
			const savedLocal = localStorage.getItem('theme');
			const activeTheme = savedLocal || data.profileUser?.theme || 'system';
			theme = activeTheme;
			initialTheme = activeTheme;

			const activeBrand = localStorage.getItem('stratos-theme') || 'stratos';
			brandTheme = activeBrand;
			initialBrandTheme = activeBrand;

			initialized = true;
		}
	});

	// Only apply theme changes when user explicitly changes the radio selection
	$effect(() => {
		if (browser && initialized && theme !== initialTheme) {
			if (theme === 'dark') {
				document.documentElement.classList.add('dark');
				localStorage.setItem('theme', 'dark');
			} else if (theme === 'light') {
				document.documentElement.classList.remove('dark');
				localStorage.setItem('theme', 'light');
			} else if (theme === 'system') {
				localStorage.setItem('theme', 'system');
				if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
					document.documentElement.classList.add('dark');
				} else {
					document.documentElement.classList.remove('dark');
				}
			}
			initialTheme = theme;
		}
	});

	$effect(() => {
		if (browser && initialized && brandTheme !== initialBrandTheme) {
			if (brandTheme === 'stratos') {
				localStorage.removeItem('stratos-theme');
				document.documentElement.removeAttribute('data-theme');
			} else {
				localStorage.setItem('stratos-theme', brandTheme);
				document.documentElement.setAttribute('data-theme', brandTheme);
			}
			initialBrandTheme = brandTheme;
		}
	});
</script>

<svelte:head>
	<title>Preferences | Stratos</title>
</svelte:head>

<div class="w-full">
	<h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-8">Preferences</h2>

	<form 
		method="POST" 
		action="?/updatePreferences"
		use:enhance={() => {
			isSaving = true;
			return async ({ update }) => {
				isSaving = false;
				update({ reset: false });
			};
		}}
		class="space-y-8"
	>
		{#if form?.error}
			<div class="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400">
				{form.error}
			</div>
		{/if}
		{#if form?.success}
			<div class="p-3 bg-green-50 text-green-600 text-sm rounded-md border border-green-200 dark:bg-green-900/20 dark:border-green-900 dark:text-green-400 transition-opacity duration-300">
				Preferences updated successfully.
			</div>
		{/if}

		<div>
			<h3 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Appearance</h3>
			
			<div class="space-y-4">
				<label class="flex items-center gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
					<input type="radio" name="theme" value="system" bind:group={theme} class="w-4 h-4 text-brand-primary" />
					<div>
						<div class="text-sm font-medium text-gray-900 dark:text-gray-100">System</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">Automatically switch between light and dark themes when your system does.</div>
					</div>
				</label>

				<label class="flex items-center gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
					<input type="radio" name="theme" value="light" bind:group={theme} class="w-4 h-4 text-brand-primary" />
					<div>
						<div class="text-sm font-medium text-gray-900 dark:text-gray-100">Light</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">Light theme for bright environments.</div>
					</div>
				</label>

				<label class="flex items-center gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
					<input type="radio" name="theme" value="dark" bind:group={theme} class="w-4 h-4 text-brand-primary" />
					<div>
						<div class="text-sm font-medium text-gray-900 dark:text-gray-100">Dark</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">Dark theme for low-light environments.</div>
					</div>
				</label>
			</div>
		</div>

		<div>
			<h3 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Brand Theme</h3>
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Customize the accent colors of Stratos.</p>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<label class="flex items-center gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors relative overflow-hidden">
					<input type="radio" name="brandTheme" value="stratos" bind:group={brandTheme} class="w-4 h-4 text-brand-primary" />
					<div class="flex-1">
						<div class="text-sm font-medium text-gray-900 dark:text-gray-100">Classic Stratos</div>
					</div>
					<div class="w-8 h-8 rounded-full bg-slate-600 flex-shrink-0"></div>
				</label>

				<label class="flex items-center gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors relative overflow-hidden">
					<input type="radio" name="brandTheme" value="emerald" bind:group={brandTheme} class="w-4 h-4 text-brand-primary" />
					<div class="flex-1">
						<div class="text-sm font-medium text-gray-900 dark:text-gray-100">Emerald Oasis</div>
					</div>
					<div class="w-8 h-8 rounded-full bg-[#00afab] border-2 border-purple-600 flex-shrink-0"></div>
				</label>

				<label class="flex items-center gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors relative overflow-hidden">
					<input type="radio" name="brandTheme" value="ruby" bind:group={brandTheme} class="w-4 h-4 text-brand-primary" />
					<div class="flex-1">
						<div class="text-sm font-medium text-gray-900 dark:text-gray-100">Crimson Blaze</div>
					</div>
					<div class="w-8 h-8 rounded-full bg-[#e31837] border-2 border-black flex-shrink-0"></div>
				</label>

				<label class="flex items-center gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors relative overflow-hidden">
					<input type="radio" name="brandTheme" value="violet" bind:group={brandTheme} class="w-4 h-4 text-brand-primary" />
					<div class="flex-1">
						<div class="text-sm font-medium text-gray-900 dark:text-gray-100">Fiesta Twilight</div>
					</div>
					<div class="w-8 h-8 rounded-full bg-[#702082] border-2 border-[#f47920] flex-shrink-0"></div>
				</label>
			</div>
		</div>

		<div class="pt-4 border-t border-gray-200 dark:border-white/[0.05]">
			<button 
				type="submit" 
				disabled={isSaving}
				class="px-4 py-2 bg-brand-primary hover:opacity-90 text-white text-sm font-medium rounded-md shadow-sm transition-opacity disabled:opacity-50"
			>
				{isSaving ? 'Saving...' : 'Save preferences'}
			</button>
		</div>
	</form>
</div>
