<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import md5 from 'md5';

	let { data, form } = $props();
	let profileUser = $derived(data.profileUser);
	let isSaving = $state(false);

	let gravatarUrl = $derived((() => {
		const hash = md5(profileUser.email.trim().toLowerCase());
		return `https://www.gravatar.com/avatar/${hash}?d=404&s=200`;
	})());

	// Helper to check if image loads
	let hasGravatar = $state(false);
	$effect(() => {
		const img = new Image();
		img.onload = () => hasGravatar = true;
		img.onerror = () => hasGravatar = false;
		img.src = gravatarUrl;
	});
</script>

<svelte:head>
	<title>Profile Settings | Stratos</title>
</svelte:head>

<div class="max-w-2xl">
	<h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-8">Profile</h2>

	<div class="mb-10">
		<h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Avatar</h3>
		<div class="flex items-center space-x-6">
			<Avatar name={profileUser.name} photo={hasGravatar ? gravatarUrl : null} size="xl" />
			<div class="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
				We use Gravatar to manage profile pictures. To change your avatar, please update it on <a href="https://gravatar.com" target="_blank" class="text-blue-500 hover:text-blue-600 dark:text-blue-400 underline">Gravatar</a> using your email address.
			</div>
		</div>
	</div>

	<hr class="border-gray-200 dark:border-white/[0.05] mb-10" />

	<form 
		method="POST" 
		action="?/updateProfile"
		use:enhance={() => {
			isSaving = true;
			return async ({ update }) => {
				isSaving = false;
				update({ reset: false });
				// We could use a toastStore here if implemented
			};
		}}
		class="space-y-6"
	>
		{#if form?.error}
			<div class="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400">
				{form.error}
			</div>
		{/if}
		{#if form?.success}
			<div class="p-3 bg-green-50 text-green-600 text-sm rounded-md border border-green-200 dark:bg-green-900/20 dark:border-green-900 dark:text-green-400">
				Profile updated successfully.
			</div>
		{/if}

		<div>
			<label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email address</label>
			<input 
				type="email" 
				id="email" 
				value={profileUser.email} 
				disabled
				class="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.02] border border-gray-300 dark:border-white/10 rounded-md shadow-sm text-gray-500 dark:text-gray-400 cursor-not-allowed sm:text-sm" 
			/>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">Your email address cannot be changed right now.</p>
		</div>

		<div>
			<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full name</label>
			<input 
				type="text" 
				name="name" 
				id="name" 
				value={profileUser.name} 
				required
				class="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-300 dark:border-white/10 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:text-gray-100" 
			/>
		</div>

		<div>
			<label for="jobTitle" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job title</label>
			<input 
				type="text" 
				name="jobTitle" 
				id="jobTitle" 
				value={profileUser.jobTitle || ''} 
				placeholder="e.g. Product Manager"
				class="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-300 dark:border-white/10 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:text-gray-100" 
			/>
		</div>

		<div class="pt-4">
			<button 
				type="submit" 
				disabled={isSaving}
				class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50 flex items-center"
			>
				{isSaving ? 'Saving...' : 'Save changes'}
			</button>
		</div>
	</form>
</div>
