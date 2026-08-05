<script lang="ts">
	import { enhance } from '$app/forms';
	import { Users, Shield, ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	let { members, availableUsers, isProjectAdmin }: { members: any[]; availableUsers: any[]; isProjectAdmin: boolean } = $props();

	let selectedEmail = $state('');
	let selectedRole = $state('Member');

	let projectAdmins = $derived(members.filter((m) => m.role === 'Admin'));
	let projectMembersList = $derived(members.filter((m) => m.role === 'Member'));
</script>

<section class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
	<div class="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
		<div>
			<h2 class="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
				<Users class="w-5 h-5 text-zinc-400" />
				Project Members
			</h2>
			<p class="text-sm text-zinc-500 dark:text-zinc-400">
				Manage team members who have access to this project.
			</p>
		</div>
	</div>

	{#if isProjectAdmin}
		<div class="p-5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
			<form
				method="POST"
				action="?/addMember"
				use:enhance={() => {
					return async ({ update }) => {
						selectedEmail = '';
						await update();
					};
				}}
				class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
			>
				<div class="flex-1 flex flex-col gap-1.5">
					<label
						for="invite-email"
						class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
					>
						Invite User by Email
					</label>
					<input
						type="email"
						id="invite-email"
						name="email"
						placeholder="teammate@example.com"
						bind:value={selectedEmail}
						required
						list="available-users"
						class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 min-h-[44px]"
					/>
					<datalist id="available-users">
						{#each availableUsers as u}
							<option value={u.email}>{u.name}</option>
						{/each}
					</datalist>
				</div>

				<div class="w-full sm:w-32 flex flex-col gap-1.5">
					<label
						for="invite-role"
						class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
					>
						Role
					</label>
					<Select
						id="invite-role"
						name="role"
						bind:value={selectedRole}
					>
						<option value="Member">Member</option>
						<option value="Admin">Admin</option>
					</Select>
				</div>

				<button
					type="submit"
					disabled={!selectedEmail}
					class="px-5 py-2.5 bg-brand-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors min-h-[44px]"
				>
					Invite
				</button>
			</form>
		</div>
	{/if}

	<!-- Project Admins List -->
	{#if projectAdmins.length > 0}
		<div class="px-5 py-2 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
			Project Admins ({projectAdmins.length})
		</div>
		<ul class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
			{#each projectAdmins as member}
				<li class="flex items-center justify-between p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
					<div class="flex items-center gap-3">
						<Avatar name={member.name} email={member.email} photo={member.avatarUrl} size="md" />
						<div>
							<div class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
								{member.name}
								<span class="px-1.5 py-0.5 rounded-full bg-brand-primary/20 dark:bg-brand-primary/30 text-brand-primary dark:text-brand-primary text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
									<Shield class="w-3 h-3" /> Admin
								</span>
							</div>
							<div class="text-xs text-zinc-500 dark:text-zinc-400">
								{member.email}
							</div>
						</div>
					</div>

					{#if isProjectAdmin}
						<div class="flex items-center gap-2">
							<form method="POST" action="?/updateMemberRole" use:enhance>
								<input type="hidden" name="userId" value={member.userId} />
								<input type="hidden" name="role" value="Member" />
								<button
									type="submit"
									class="p-2 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
									title="Demote to Member"
								>
									<ArrowDownCircle class="w-4 h-4" />
								</button>
							</form>
							<form method="POST" action="?/removeMember" use:enhance>
								<input type="hidden" name="userId" value={member.userId} />
								<button
									type="submit"
									class="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
									title="Remove member"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</form>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<!-- Project Members List -->
	{#if projectMembersList.length > 0}
		<div class="px-5 py-2 bg-zinc-50 dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
			Project Members ({projectMembersList.length})
		</div>
		<ul class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
			{#each projectMembersList as member}
				<li class="flex items-center justify-between p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
					<div class="flex items-center gap-3">
						<Avatar name={member.name} email={member.email} photo={member.avatarUrl} size="md" />
						<div>
							<div class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
								{member.name}
							</div>
							<div class="text-xs text-zinc-500 dark:text-zinc-400">
								{member.email}
							</div>
						</div>
					</div>

					{#if isProjectAdmin}
						<div class="flex items-center gap-2">
							<form method="POST" action="?/updateMemberRole" use:enhance>
								<input type="hidden" name="userId" value={member.userId} />
								<input type="hidden" name="role" value="Admin" />
								<button
									type="submit"
									class="p-2 text-zinc-400 hover:text-brand-primary hover:bg-brand-primary/10 dark:hover:bg-blue-950/30 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
									title="Promote to Admin"
								>
									<ArrowUpCircle class="w-4 h-4" />
								</button>
							</form>
							<form method="POST" action="?/removeMember" use:enhance>
								<input type="hidden" name="userId" value={member.userId} />
								<button
									type="submit"
									class="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
									title="Remove member"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</form>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if members.length === 0}
		<div class="p-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">
			No members have been added to this project yet.
		</div>
	{/if}
</section>
