<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/stores/ui.svelte';
	import { Upload, Link as LinkIcon, Trash2 } from 'lucide-svelte';

	let { data, form } = $props();

	let group = $derived(data.group);

	let defaultTheme = $state('stratos');
	let logoUrl = $state('');
	let logoSource = $state<'file' | 'url'>('file');
	let name = $state('');
	let showWorkspaceName = $state(true);
	let isSaving = $state(false);
	let previewUrl = $state('');
	let fileInputRef = $state<HTMLInputElement | null>(null);
	let selectedFile = $state<File | null>(null);

	$effect(() => {
		if (group) {
			defaultTheme = group.defaultTheme || 'stratos';
			logoUrl = group.logoUrl || '';
			name = group.name || '';
			showWorkspaceName = group.showWorkspaceName ?? true;
			if (!previewUrl && group.logoUrl) {
				previewUrl = group.logoUrl;
			}
		}
	});

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			selectedFile = target.files[0];
			previewUrl = URL.createObjectURL(selectedFile);
		}
	}

	function removeLogo() {
		logoUrl = '';
		previewUrl = '';
		selectedFile = null;
		if (fileInputRef) fileInputRef.value = '';
	}
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
		enctype="multipart/form-data"
		use:enhance={() => {
			isSaving = true;
			return async ({ result, update }) => {
				isSaving = false;
				if (result.type === 'success') {
					toastStore.success('Workspace branding updated successfully');
					const successData = result.data as { logoUrl?: string } | undefined;
					if (successData?.logoUrl) {
						logoUrl = successData.logoUrl;
						previewUrl = successData.logoUrl;
					}
				} else if (result.type === 'failure') {
					const failureData = result.data as { message?: string } | undefined;
					toastStore.error(failureData?.message || 'Failed to update workspace branding');
				}
				await update({ reset: false });
			};
		}}
		class="space-y-8"
	>
		<input type="hidden" name="logoSource" value={logoSource} />

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
					placeholder="e.g. Acme Corp"
					class="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-300 dark:border-white/10 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary min-h-[44px] sm:text-sm dark:text-gray-100" 
				/>
				
				<div class="mt-3 flex items-center gap-3">
					<input 
						type="checkbox" 
						name="showWorkspaceName" 
						id="showWorkspaceName" 
						bind:checked={showWorkspaceName}
						class="w-4 h-4 text-brand-primary rounded border-gray-300 dark:border-zinc-700 focus:ring-brand-primary cursor-pointer" 
					/>
					<label for="showWorkspaceName" class="text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
						Display workspace name text alongside logo in sidebar and headers
					</label>
				</div>
			</div>

			<!-- Logo Option Selector Tabs -->
			<div class="mb-3">
				<span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Workspace Logo</span>
				<div class="flex items-center gap-2 p-1 bg-gray-100 dark:bg-zinc-800/60 rounded-lg w-fit border border-gray-200/80 dark:border-zinc-700/60">
					<button
						type="button"
						onclick={() => (logoSource = 'file')}
						class="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all min-h-[36px] cursor-pointer {logoSource === 'file' ? 'bg-white dark:bg-zinc-900 text-brand-primary shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}"
					>
						<Upload class="w-3.5 h-3.5" />
						Upload Image File
					</button>
					<button
						type="button"
						onclick={() => (logoSource = 'url')}
						class="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all min-h-[36px] cursor-pointer {logoSource === 'url' ? 'bg-white dark:bg-zinc-900 text-brand-primary shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}"
					>
						<LinkIcon class="w-3.5 h-3.5" />
						Direct Image URL
					</button>
				</div>
			</div>

			{#if logoSource === 'file'}
				<!-- Option 1: File Upload -->
				<div class="space-y-2">
					<div class="flex items-center justify-center w-full">
						<label for="logoFile" class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl cursor-pointer bg-gray-50 dark:bg-zinc-900/40 hover:bg-gray-100 dark:hover:bg-zinc-900/80 transition-all group">
							<div class="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
								<Upload class="w-7 h-7 text-gray-400 dark:text-gray-500 group-hover:text-brand-primary mb-2 transition-colors" />
								<p class="text-xs font-medium text-gray-600 dark:text-gray-300">
									<span class="font-bold text-brand-primary">Click to upload</span> or drag and drop logo image
								</p>
								<p class="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
									PNG, JPG, WEBP, GIF, or SVG (Max 10MB)
								</p>
							</div>
							<input 
								id="logoFile" 
								name="logoFile" 
								type="file" 
								accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
								bind:this={fileInputRef}
								onchange={handleFileSelect}
								class="hidden" 
							/>
						</label>
					</div>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						Uploaded logos automatically store to local storage (`static/uploads/logos`) or AWS S3 / Supabase based on environment setup.
					</p>
				</div>
			{:else}
				<!-- Option 2: Direct URL -->
				<div class="space-y-2">
					<input 
						type="url" 
						name="logoUrl" 
						id="logoUrl" 
						bind:value={logoUrl}
						oninput={() => (previewUrl = logoUrl)}
						placeholder="https://example.com/logo.png"
						class="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-300 dark:border-white/10 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary min-h-[44px] sm:text-sm dark:text-gray-100" 
					/>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						Provide a direct public image link (PNG, SVG, JPG) for your workspace logo.
					</p>
				</div>
			{/if}

			{#if previewUrl}
				<div class="mt-4 p-4 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="h-12 w-20 flex items-center justify-center bg-white dark:bg-zinc-950 p-2 rounded-lg border border-gray-200 dark:border-zinc-800">
							<img 
								src={previewUrl} 
								alt="Workspace logo preview" 
								class="max-h-full max-w-full object-contain"
								onerror={(e) => {
									(e.currentTarget as HTMLImageElement).style.display = 'none';
								}}
							/>
						</div>
						<div>
							<span class="block text-xs font-semibold text-gray-900 dark:text-gray-100">Logo Preview</span>
							<span class="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-xs block">{selectedFile ? selectedFile.name : previewUrl}</span>
						</div>
					</div>

					<button
						type="button"
						onclick={removeLogo}
						class="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
						title="Remove logo"
					>
						<Trash2 class="w-4 h-4" />
					</button>
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
						value="emerald" 
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
						value="ruby" 
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
						value="violet" 
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
