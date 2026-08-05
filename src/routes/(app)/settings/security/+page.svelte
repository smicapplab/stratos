<script lang="ts">
	import { enhance } from '$app/forms';
	import { LogOut, MonitorSmartphone, Eye, EyeOff, CheckCircle2, XCircle, ShieldAlert } from 'lucide-svelte';

	let { data, form } = $props();
	let profileUser = $derived(data.profileUser);
	let activeSessions = $derived(data.activeSessions);
	let currentSessionId = $derived(data.currentSessionId);
	
	let isSaving = $state(false);
	let isLoggingOut = $state(false);

	let showCurrent = $state(false);
	let showNew = $state(false);
	let showConfirm = $state(false);

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');

	let hasMinLength = $derived(newPassword.length >= 8);
	let hasUpper = $derived(/[A-Z]/.test(newPassword));
	let hasLower = $derived(/[a-z]/.test(newPassword));
	let hasNumber = $derived(/[0-9]/.test(newPassword));
	let hasSpecial = $derived(/[!@#$%^&*(),.?":{}|<>]/.test(newPassword));

	let allRulesPassed = $derived(hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial);
	let passwordsMatch = $derived(confirmPassword.length > 0 && newPassword === confirmPassword);
	let isFormValid = $derived(allRulesPassed && passwordsMatch && (!profileUser.hasPassword || currentPassword.length > 0));
</script>

<svelte:head>
	<title>Security Settings | Stratos</title>
</svelte:head>

<div class="w-full">
	<h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-8">Security</h2>

	{#if profileUser.mustChangePassword}
		<div class="p-4 mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3 text-amber-800 dark:text-amber-300">
			<ShieldAlert class="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
			<div>
				<p class="font-semibold text-sm">Action Required: Change Your Temporary Password</p>
				<p class="text-xs mt-1 leading-relaxed opacity-90">
					You are currently using an initial temporary password. For your account security, you must update your password before accessing the rest of Stratos.
				</p>
			</div>
		</div>
	{/if}

	<form 
		method="POST" 
		action="?/updatePassword"
		use:enhance={() => {
			isSaving = true;
			return async ({ update }) => {
				isSaving = false;
				currentPassword = '';
				newPassword = '';
				confirmPassword = '';
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
		{#if profileUser.hasPassword}
			<div>
				<label for="currentPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current password</label>
				<div class="relative">
					<input 
						type={showCurrent ? 'text' : 'password'} 
						name="currentPassword" 
						id="currentPassword" 
						bind:value={currentPassword}
						required
						class="w-full pl-3 pr-10 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-300 dark:border-white/10 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm dark:text-gray-100" 
					/>
					<button
						type="button"
						onclick={() => showCurrent = !showCurrent}
						aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
						class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none"
					>
						{#if showCurrent}
							<EyeOff class="w-4 h-4" />
						{:else}
							<Eye class="w-4 h-4" />
						{/if}
					</button>
				</div>
			</div>
		{:else}
			<div class="p-4 bg-brand-primary/10 dark:bg-brand-primary/20 border border-brand-primary/30 dark:border-brand-primary rounded-md text-sm text-blue-800 dark:text-blue-300 mb-6">
				You haven't set a password yet. Please create one below to secure your account.
			</div>
		{/if}

		<div>
			<label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New password</label>
			<div class="relative">
				<input 
					type={showNew ? 'text' : 'password'} 
					name="newPassword" 
					id="newPassword" 
					bind:value={newPassword}
					required
					class="w-full pl-3 pr-10 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-300 dark:border-white/10 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm dark:text-gray-100" 
				/>
				<button
					type="button"
					onclick={() => showNew = !showNew}
					aria-label={showNew ? 'Hide new password' : 'Show new password'}
					class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none"
				>
					{#if showNew}
						<EyeOff class="w-4 h-4" />
					{:else}
						<Eye class="w-4 h-4" />
					{/if}
				</button>
			</div>

			<!-- Password Requirements Checklist -->
			<div class="mt-3 p-3 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-md space-y-1.5 text-xs">
				<p class="font-medium text-gray-700 dark:text-gray-300 mb-2">Password Requirements:</p>
				<div class="flex items-center gap-2 {hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}">
					{#if hasMinLength}
						<CheckCircle2 class="w-3.5 h-3.5 flex-shrink-0" />
					{:else}
						<XCircle class="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
					{/if}
					<span>At least 8 characters long</span>
				</div>
				<div class="flex items-center gap-2 {hasUpper ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}">
					{#if hasUpper}
						<CheckCircle2 class="w-3.5 h-3.5 flex-shrink-0" />
					{:else}
						<XCircle class="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
					{/if}
					<span>At least one uppercase letter (A-Z)</span>
				</div>
				<div class="flex items-center gap-2 {hasLower ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}">
					{#if hasLower}
						<CheckCircle2 class="w-3.5 h-3.5 flex-shrink-0" />
					{:else}
						<XCircle class="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
					{/if}
					<span>At least one lowercase letter (a-z)</span>
				</div>
				<div class="flex items-center gap-2 {hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}">
					{#if hasNumber}
						<CheckCircle2 class="w-3.5 h-3.5 flex-shrink-0" />
					{:else}
						<XCircle class="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
					{/if}
					<span>At least one number (0-9)</span>
				</div>
				<div class="flex items-center gap-2 {hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}">
					{#if hasSpecial}
						<CheckCircle2 class="w-3.5 h-3.5 flex-shrink-0" />
					{:else}
						<XCircle class="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
					{/if}
					<span>At least one special character (!@#$%^&*)</span>
				</div>
			</div>
		</div>

		<div>
			<label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm new password</label>
			<div class="relative">
				<input 
					type={showConfirm ? 'text' : 'password'} 
					name="confirmPassword" 
					id="confirmPassword" 
					bind:value={confirmPassword}
					required
					class="w-full pl-3 pr-10 py-2 bg-white dark:bg-[#1C1C1E] border border-gray-300 dark:border-white/10 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm dark:text-gray-100" 
				/>
				<button
					type="button"
					onclick={() => showConfirm = !showConfirm}
					aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
					class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none"
				>
					{#if showConfirm}
						<EyeOff class="w-4 h-4" />
					{:else}
						<Eye class="w-4 h-4" />
					{/if}
				</button>
			</div>

			{#if confirmPassword.length > 0}
				<div class="mt-2 flex items-center gap-2 text-xs {passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}">
					{#if passwordsMatch}
						<CheckCircle2 class="w-3.5 h-3.5 flex-shrink-0" />
						<span>Passwords match</span>
					{:else}
						<XCircle class="w-3.5 h-3.5 flex-shrink-0" />
						<span>Passwords do not match</span>
					{/if}
				</div>
			{/if}
		</div>

		<div class="pt-4">
			<button 
				type="submit" 
				disabled={isSaving || !isFormValid}
				class="px-4 py-2 bg-brand-primary hover:opacity-90 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
