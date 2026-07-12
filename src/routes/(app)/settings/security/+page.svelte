<script lang="ts">
	import { enhance } from '$app/forms';
	import { LogOut, MonitorSmartphone } from 'lucide-svelte';

	let { data, form } = $props();
	let profileUser = $derived(data.profileUser);
	let activeSessions = $derived(data.activeSessions);
	let currentSessionId = $derived(data.currentSessionId);
	
	let isSaving = $state(false);
	let isLoggingOut = $state(false);
</script>

<svelte:head>
	<title>Security Settings | Stratos</title>
</svelte:head>

<div class="max-w-2xl">
	<h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-8">Security</h2>

	<form 
		method="POST" 
		action="?/updatePassword"
		use:enhance={() => {
			isSaving = true;
			return async ({ update }) => {
				isSaving = false;
				update({ reset: true });
			};
		}}
		class="space-y-6 mb-12"
	>
		<div>
			<h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">Change Password</h3>
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Ensure your account is using a long, random password to stay secure.</p>
		</div>

		{#if form?.error}
			<div class="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400">
				{form.error}
			</div>
		{/if}
		{#if form?.success}
			<div class="p-3 bg-green-50 text-green-600 text-sm rounded-md border border-green-200 dark:bg-green-900/20 dark:border-green-900 dark:text-green-400">
				Password updated successfully.
			</div>
		{/if}

		<!-- Only require current password if they have one -->
		{#if profileUser.hashedPassword}
			<div>
				<label for="currentPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current password</label>
				<input 
					type="password" 
					name="currentPassword" 
					id="currentPassword" 
					required
					class="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-300 dark:border-white/10 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:text-gray-100" 
				/>
			</div>
		{:else}
			<div class="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-800 dark:text-blue-300 mb-6">
				You haven't set a password yet. Please create one below to secure your account.
			</div>
		{/if}

		<div>
			<label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New password</label>
			<input 
				type="password" 
				name="newPassword" 
				id="newPassword" 
				required
				minlength="8"
				class="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-300 dark:border-white/10 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:text-gray-100" 
			/>
		</div>

		<div>
			<label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm new password</label>
			<input 
				type="password" 
				name="confirmPassword" 
				id="confirmPassword" 
				required
				minlength="8"
				class="w-full px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-300 dark:border-white/10 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:text-gray-100" 
			/>
		</div>

		<div class="pt-4">
			<button 
				type="submit" 
				disabled={isSaving}
				class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50"
			>
				{isSaving ? 'Updating...' : 'Update password'}
			</button>
		</div>
	</form>

	<hr class="border-gray-200 dark:border-white/[0.05] mb-12" />

	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">Active Sessions</h3>
				<p class="text-sm text-gray-500 dark:text-gray-400">Review devices that are currently logged into your account.</p>
			</div>
			
			{#if activeSessions.length > 1}
				<form 
					method="POST" 
					action="?/logoutOtherDevices"
					use:enhance={() => {
						isLoggingOut = true;
						return async ({ update }) => {
							isLoggingOut = false;
							update();
						};
					}}
				>
					<button 
						type="submit" 
						disabled={isLoggingOut}
						class="px-4 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.04] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
					>
						<LogOut class="w-4 h-4" />
						{isLoggingOut ? 'Logging out...' : 'Log out of other devices'}
					</button>
				</form>
			{/if}
		</div>

		<div class="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-[#1C1C1E]">
			<ul class="divide-y divide-gray-200 dark:divide-white/10">
				{#each activeSessions as session}
					<li class="px-5 py-4 flex items-start gap-4">
						<div class="mt-1 flex-shrink-0">
							<MonitorSmartphone class="w-6 h-6 text-gray-400 dark:text-gray-500" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center justify-between">
								<p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
									{session.userAgent || 'Unknown Device'}
								</p>
								{#if session.id === currentSessionId}
									<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
										Current session
									</span>
								{/if}
							</div>
							<div class="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
								<span>{session.ipAddress || 'Unknown IP'}</span>
								<span>&bull;</span>
								<span>Expires {new Date(session.expiresAt).toLocaleDateString()}</span>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
