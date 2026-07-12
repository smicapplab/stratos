<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let users = $derived(data.users);
	let currentUser = $derived(data.currentUser);

	let isInviting = $state(false);
</script>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 text-zinc-900 dark:text-zinc-100">
	<div class="max-w-5xl mx-auto space-y-8">
		
		<!-- Header -->
		<div class="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
			<div>
				<h1 class="text-3xl font-semibold tracking-tight">User Administration</h1>
				<p class="text-zinc-500 dark:text-zinc-400 mt-1">Manage team access and role permissions.</p>
			</div>
			
			<button 
				class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-medium transition-all transform hover:scale-[1.02] active:scale-95"
				onclick={() => isInviting = !isInviting}
			>
				{isInviting ? 'Cancel' : '+ Invite User'}
			</button>
		</div>

		{#if form?.error}
			<div class="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg animate-in fade-in slide-in-from-top-2">
				{form.error}
			</div>
		{/if}

		<!-- Invite Form (Glassmorphism) -->
		{#if isInviting}
			<div class="bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4">
				<h2 class="text-lg font-medium mb-4">Invite New Team Member</h2>
				<form method="POST" action="?/invite" use:enhance class="flex gap-4 items-end">
					<div class="flex-1 space-y-2">
						<label for="email" class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email Address</label>
						<input type="email" name="email" id="email" required placeholder="colleague@stratos.local" class="w-full px-4 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
					</div>
					<div class="w-48 space-y-2">
						<label for="role" class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Role</label>
						<select name="role" id="role" class="w-full px-4 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:bg-zinc-900">
							<option value="Viewer">Viewer</option>
							<option value="Member" selected>Member</option>
							<option value="Admin">Admin</option>
						</select>
					</div>
					<button type="submit" class="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
						Send Invite
					</button>
				</form>
			</div>
		{/if}

		<!-- Users Table -->
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
						<th class="px-6 py-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">User</th>
						<th class="px-6 py-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Role</th>
						<th class="px-6 py-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Joined</th>
						<th class="px-6 py-4 text-sm font-medium text-zinc-500 dark:text-zinc-400 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
					{#each users as user}
						<tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
							<td class="px-6 py-4">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium shadow-inner">
										{user.name.charAt(0).toUpperCase()}
									</div>
									<div>
										<div class="font-medium">{user.name}</div>
										<div class="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</div>
									</div>
								</div>
							</td>
							<td class="px-6 py-4">
								<form method="POST" action="?/updateRole" use:enhance class="flex items-center gap-2">
									<input type="hidden" name="userId" value={user.id} />
									<select name="role" onchange={(e) => e.currentTarget.form?.requestSubmit()} class="bg-transparent border-0 text-sm font-medium focus:ring-0 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 rounded-md transition-colors" disabled={user.id === currentUser?.id}>
										<option value="Admin" selected={user.role === 'Admin'}>Admin</option>
										<option value="Member" selected={user.role === 'Member'}>Member</option>
										<option value="Viewer" selected={user.role === 'Viewer'}>Viewer</option>
									</select>
								</form>
							</td>
							<td class="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
								{new Date(user.createdAt).toLocaleDateString()}
							</td>
							<td class="px-6 py-4 text-right">
								{#if user.id !== currentUser?.id}
									<form method="POST" action="?/remove" use:enhance>
										<input type="hidden" name="userId" value={user.id} />
										<button type="submit" class="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
											Remove
										</button>
									</form>
								{:else}
									<span class="text-xs font-medium px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">It's You</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
