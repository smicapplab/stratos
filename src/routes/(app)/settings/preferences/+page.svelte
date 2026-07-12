<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';

	let { data, form } = $props();
	let profileUser = $derived(data.profileUser);
	let theme = $state(data.profileUser.theme || 'system');
	let isSaving = $state(false);

	// When theme changes in the form, apply it instantly to UI for a better UX
	$effect(() => {
		if (browser) {
			if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
			localStorage.setItem('theme', theme);
		}
	});
</script>

<svelte:head>
	<title>Preferences | Stratos</title>
</svelte:head>

<div class="max-w-2xl">
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
					<input type="radio" name="theme" value="system" bind:group={theme} class="w-4 h-4 text-blue-600" />
					<div>
						<div class="text-sm font-medium text-gray-900 dark:text-gray-100">System</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">Automatically switch between light and dark themes when your system does.</div>
					</div>
				</label>

				<label class="flex items-center gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
					<input type="radio" name="theme" value="light" bind:group={theme} class="w-4 h-4 text-blue-600" />
					<div>
						<div class="text-sm font-medium text-gray-900 dark:text-gray-100">Light</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">Light theme for bright environments.</div>
					</div>
				</label>

				<label class="flex items-center gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
					<input type="radio" name="theme" value="dark" bind:group={theme} class="w-4 h-4 text-blue-600" />
					<div>
						<div class="text-sm font-medium text-gray-900 dark:text-gray-100">Dark</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">Dark theme for low-light environments.</div>
					</div>
				</label>
			</div>
		</div>

		<div class="pt-4 border-t border-gray-200 dark:border-white/[0.05]">
			<button 
				type="submit" 
				disabled={isSaving}
				class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50"
			>
				{isSaving ? 'Saving...' : 'Save preferences'}
			</button>
		</div>
	</form>
</div>
