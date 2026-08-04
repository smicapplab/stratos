<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/stores/ui.svelte';

	let { data, form } = $props();

	let group = $derived(data.group);

	let defaultTheme = $state('stratos');
	let logoUrl = $state('');
	let name = $state('');
	let isSaving = $state(false);

	$effect(() => {
		if (group) {
			defaultTheme = group.defaultTheme || 'stratos';
			logoUrl = group.logoUrl || '';
			name = group.name || '';
		}
	});
</script>

<svelte:head>
	<title>Workspace Settings | Stratos</title>
</svelte:head>

<div class="max-w-2xl">
	<div class="mb-8">
		<h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Workspace Settings</h2>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			Manage group-level branding, default theme, and workspace appearance for all users in {group?.name || 'your workspace'}.
		</p>
	</div>

	<form 
		method="POST" 
		action="?/updateBranding"
		use:enhance={() => {
			isSaving = true;
			return async ({ result, update }) => {
				isSaving = false;
				if (result.type === 'success') {
					toastStore.success('Workspace branding updated successfully');
				} else if (result.type === 'failure') {
					const failureData = result.data as { message?: string } | undefined;
					toastStore.error(failureData?.message || 'Failed to update workspace branding');
				}
				await update({ reset: false });
			};
		}}
		class="space-y-8"
	>
		{#if form?.message}
			<div class="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400">
				{form.message}
			</div>
		{/if}

		<div>
			<h3 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Workspace Details</h3>
			
			<div class="mb-6">
				<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Workspace Name</label>
				<input 
					type="text" 
					name="name" 
					id="name" 
					bind:value={name}
					required
					placeholder="e.g. Pizza Hut"
					class="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-300 dark:border-white/10 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary min-h-[44px] sm:text-sm dark:text-gray-100" 
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					This is your organization's display name.
				</p>
			</div>

			<label for="logoUrl" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo URL</label>
			<input 
				type="url" 
				name="logoUrl" 
				id="logoUrl" 
				bind:value={logoUrl}
				placeholder="https://example.com/logo.png"
				class="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-300 dark:border-white/10 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary min-h-[44px] sm:text-sm dark:text-gray-100" 
			/>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				Provide a direct image link (PNG, SVG, JPG) for your workspace logo.
			</p>

			{#if logoUrl}
				<div class="mt-4 p-4 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/[0.02]">
					<span class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Logo Preview:</span>
					<div class="h-12 flex items-center">
						<img 
							src={logoUrl} 
							alt="Workspace logo preview" 
							class="max-h-12 max-w-full object-contain"
							onerror={(e) => {
								(e.currentTarget as HTMLImageElement).style.display = 'none';
							}}
						/>
					</div>
				</div>
			{/if}
		</div>

		<div>
			<div class="flex items-center justify-between mb-2">
				<h3 class="text-base font-medium text-gray-900 dark:text-gray-100">Default Group Theme</h3>
				<span class="text-xs text-gray-500 dark:text-gray-400 font-mono">Active: {defaultTheme}</span>
			</div>
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
				Set the default brand color theme applied across the workspace for all team members.
			</p>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<label class="flex items-center gap-3 p-4 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors relative overflow-hidden min-h-[44px]">
					<input 
						type="radio" 
						name="defaultTheme" 
						value="stratos" 
						bind:group={defaultTheme} 
						class="w-4 h-4 text-brand-primary" 
					/>
					<div class="flex-1">
						<div class="text-sm font-medium text-gray-900 dark:text-gray-100">Classic Stratos</div>
					</div>
					<div class="w-8 h-8 rounded-full bg-slate-600 flex-shrink-0"></div>
				</label>

				<label class="flex items-center gap-3 p-4 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors relative overflow-hidden min-h-[44px]">
					<input 
						type="radio" 
						name="defaultTheme" 
						value="araneta-city" 
						bind:group={defaultTheme} 
						class="w-4 h-4 text-brand-primary" 
					/>
					<div class="flex-1">
						<div class="text-sm font-medium text-gray-900 dark:text-gray-100">Emerald Oasis</div>
					</div>
					<div class="w-8 h-8 rounded-full bg-[#00afab] border-2 border-purple-600 flex-shrink-0"></div>
				</label>

				<label class="flex items-center gap-3 p-4 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors relative overflow-hidden min-h-[44px]">
					<input 
						type="radio" 
						name="defaultTheme" 
						value="pizza-hut" 
						bind:group={defaultTheme} 
						class="w-4 h-4 text-brand-primary" 
					/>
					<div class="flex-1">
						<div class="text-sm font-medium text-gray-900 dark:text-gray-100">Crimson Blaze</div>
					</div>
					<div class="w-8 h-8 rounded-full bg-[#e31837] border-2 border-black flex-shrink-0"></div>
				</label>

				<label class="flex items-center gap-3 p-4 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors relative overflow-hidden min-h-[44px]">
					<input 
						type="radio" 
						name="defaultTheme" 
						value="taco-bell" 
						bind:group={defaultTheme} 
						class="w-4 h-4 text-brand-primary" 
					/>
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
				class="px-4 py-2.5 bg-brand-primary hover:opacity-90 text-white text-sm font-medium rounded-md shadow-sm transition-opacity disabled:opacity-50 min-h-[44px] cursor-pointer"
			>
				{isSaving ? 'Saving...' : 'Save workspace branding'}
			</button>
		</div>
	</form>
</div>
