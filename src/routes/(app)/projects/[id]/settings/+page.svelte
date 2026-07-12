<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Users, Shield, ShieldAlert, Settings, Trash2, ArrowLeft, ArrowUpCircle, ArrowDownCircle, Pencil } from 'lucide-svelte';
	import Select from '$lib/components/ui/Select.svelte';

	let { data, form } = $props();
	let project = $derived(data.project);
	let members = $derived(data.members);
	let projectAdmins = $derived(members.filter(m => m.role === 'Admin'));
	let projectMembersList = $derived(members.filter(m => m.role === 'Member'));
	
	let availableUsers = $derived(data.availableUsers);
	let user = $derived(data.user);

	let isProjectAdmin = $derived(user.role === 'Admin' || members.find(m => m.userId === user.id)?.role === 'Admin');

	let selectedEmail = $state('');
	let selectedRole = $state('Member');
	
	let editTagId = $state<string | null>(null);
	let editTagName = $state('');
	let editTagColor = $state('zinc');
	
	async function saveEditTag(tag: any) {
		if (!editTagName.trim()) return;
		const res = await fetch(`/api/tags/${tag.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: editTagName, color: editTagColor }),
		});
		if (res.ok) {
			const updated = await res.json();
			data.tags = data.tags.map((t: any) => t.id === tag.id ? updated : t);
			editTagId = null;
			invalidateAll();
		}
	}
</script>

<div class="max-w-6xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
	<div class="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
		<a href="/" class="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-500">
			<ArrowLeft class="w-5 h-5" />
		</a>
		<div>
			<h1 class="text-2xl font-bold flex items-center gap-2">
				<Settings class="w-6 h-6 text-zinc-400" />
				{project.name} Settings
			</h1>
			<p class="text-zinc-500 text-sm mt-1">Manage visibility, access, and team members for this project.</p>
		</div>
	</div>

	{#if form?.error}
		<div class="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-sm font-medium">
			{form.error}
		</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<!-- Main Content -->
		<div class="md:col-span-2 space-y-8">
			
			<!-- Members Section -->
			<section class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
				<div class="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
					<div>
						<h2 class="text-lg font-bold flex items-center gap-2">
							<Users class="w-5 h-5 text-zinc-400" />
							Project Members
						</h2>
						<p class="text-sm text-zinc-500">Manage who has access to this project.</p>
					</div>
				</div>

				{#if isProjectAdmin}
					<div class="p-5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
						<form method="POST" action="?/addMember" use:enhance class="flex gap-3 items-end">
							<div class="flex-1 flex flex-col gap-1.5">
								<label for="invite-email" class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Invite User by Email</label>
								<input 
									type="email"
									id="invite-email"
									name="email" 
									placeholder="teammate@example.com"
									bind:value={selectedEmail}
									required
									list="available-users"
									class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
								/>
								<datalist id="available-users">
									{#each availableUsers as u}
										<option value={u.email}>{u.name}</option>
									{/each}
								</datalist>
							</div>
							
							<div class="w-32 flex flex-col gap-1.5">
								<label for="invite-role" class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Role</label>
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
								class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
							>
								Invite
							</button>
						</form>
					</div>
				{/if}

				<!-- Admins Section -->
				{#if projectAdmins.length > 0}
					<div class="px-5 py-2 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-500">
						Project Admins
					</div>
					<ul class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
						{#each projectAdmins as member}
							<li class="flex items-center justify-between p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-inner">
										{member.name.charAt(0).toUpperCase()}
									</div>
									<div>
										<div class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
											{member.name}
											<span class="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
												<Shield class="w-3 h-3" /> Admin
											</span>
										</div>
										<div class="text-xs text-zinc-500">{member.email}</div>
									</div>
								</div>
								
								{#if isProjectAdmin}
									<div class="flex items-center gap-2">
										<form method="POST" action="?/updateMemberRole" use:enhance>
											<input type="hidden" name="userId" value={member.userId} />
											<input type="hidden" name="role" value="Member" />
											<button 
												type="submit" 
												class="p-2 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-md transition-colors"
												title="Demote to Member"
											>
												<ArrowDownCircle class="w-4 h-4" />
											</button>
										</form>
										<form method="POST" action="?/removeMember" use:enhance>
											<input type="hidden" name="userId" value={member.userId} />
											<button 
												type="submit" 
												class="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
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

				<!-- Members Section -->
				{#if projectMembersList.length > 0}
					<div class="px-5 py-2 bg-zinc-50 dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-500">
						Project Members
					</div>
					<ul class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
						{#each projectMembersList as member}
							<li class="flex items-center justify-between p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-300 to-zinc-400 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center text-white text-sm font-bold shadow-inner">
										{member.name.charAt(0).toUpperCase()}
									</div>
									<div>
										<div class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{member.name}</div>
										<div class="text-xs text-zinc-500">{member.email}</div>
									</div>
								</div>
								
								{#if isProjectAdmin}
									<div class="flex items-center gap-2">
										<form method="POST" action="?/updateMemberRole" use:enhance>
											<input type="hidden" name="userId" value={member.userId} />
											<input type="hidden" name="role" value="Admin" />
											<button 
												type="submit" 
												class="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors"
												title="Promote to Admin"
											>
												<ArrowUpCircle class="w-4 h-4" />
											</button>
										</form>
										<form method="POST" action="?/removeMember" use:enhance>
											<input type="hidden" name="userId" value={member.userId} />
											<button 
												type="submit" 
												class="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
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
					<div class="p-8 text-center text-zinc-500 text-sm">
						No members have been added to this project yet.
					</div>
				{/if}
			</section>
		</div>

		<!-- Main Content Left (continued) -->
		<div class="md:col-span-2 space-y-8 mt-6">
			<!-- Tags Section -->
			<section class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
				<div class="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
					<div>
						<h2 class="text-lg font-bold flex items-center gap-2">
							<Settings class="w-5 h-5 text-zinc-400" />
							Project Tags
						</h2>
						<p class="text-sm text-zinc-500">Manage tags for tasks within this project.</p>
					</div>
				</div>

				<div class="p-5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
					<form 
						class="flex gap-3 items-end"
						onsubmit={async (e) => {
							e.preventDefault();
							const form = e.target;
							const name = form.tagName.value;
							const color = form.tagColor.value;
							if (!name) return;
							const res = await fetch(`/api/projects/${project.id}/tags`, {
								method: 'POST',
								body: JSON.stringify({ name, color })
							});
							if (res.ok) {
								const newTag = await res.json();
								data.tags = [...data.tags, newTag];
								form.reset();
								invalidateAll();
							}
						}}
					>
						<div class="flex-1 flex flex-col gap-1.5">
							<label for="new-tag-name" class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tag Name</label>
							<input 
								type="text"
								id="new-tag-name"
								name="tagName" 
								placeholder="e.g. Bug"
								required
								class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
							/>
						</div>
						
						<div class="w-32 flex flex-col gap-1.5">
							<label for="new-tag-color" class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Color</label>
							<div class="relative">
								<select id="new-tag-color" name="tagColor" class="w-full appearance-none bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer">
									<option value="blue">Blue</option>
									<option value="red">Red</option>
									<option value="emerald">Green</option>
									<option value="amber">Yellow</option>
									<option value="purple">Purple</option>
									<option value="pink">Pink</option>
									<option value="zinc" selected>Gray</option>
								</select>
								<div class="absolute inset-y-0 right-2 flex items-center pointer-events-none text-zinc-500">
									<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
								</div>
							</div>
						</div>

						<button 
							type="submit" 
							class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
						>
							Add Tag
						</button>
					</form>
				</div>

				<ul class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
					{#each data.tags.filter(t => !t.isDeleted) as tag}
						{#if editTagId === tag.id}
							<li class="p-4 bg-zinc-50 dark:bg-zinc-900 flex flex-col sm:flex-row items-start sm:items-center gap-3">
								<input type="text" bind:value={editTagName} class="flex-1 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded px-3 py-1.5 text-sm w-full" />
								<div class="flex items-center gap-2 w-full sm:w-auto">
									<div class="relative">
										<select bind:value={editTagColor} class="appearance-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded px-3 pr-8 py-1.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50">
											<option value="blue">Blue</option>
											<option value="red">Red</option>
											<option value="emerald">Green</option>
											<option value="amber">Yellow</option>
											<option value="purple">Purple</option>
											<option value="pink">Pink</option>
											<option value="zinc">Gray</option>
										</select>
										<div class="absolute inset-y-0 right-2 flex items-center pointer-events-none text-zinc-500">
											<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
										</div>
									</div>
									<button onclick={() => saveEditTag(tag)} class="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 whitespace-nowrap">Save</button>
									<button onclick={() => editTagId = null} class="px-3 py-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-sm font-semibold whitespace-nowrap">Cancel</button>
								</div>
							</li>
						{:else}
							<li class="flex items-center justify-between p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors group">
								<div class="flex items-center gap-3">
									<div class="px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-{tag.color}-500/10 text-{tag.color}-600 dark:text-{tag.color}-400 border border-{tag.color}-500/20">
										{tag.name}
									</div>
								</div>
								
								<div class="flex items-center gap-2">
									<button 
										type="button"
										class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors opacity-0 group-hover:opacity-100"
										title="Edit Tag"
										onclick={() => {
											editTagId = tag.id;
											editTagName = tag.name;
											editTagColor = tag.color;
										}}
									>
										<Pencil class="w-4 h-4" />
									</button>
									{#if isProjectAdmin}
										<button 
											type="button" 
											class="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
											title="Delete Tag"
											onclick={async () => {
												const res = await fetch(`/api/tags/${tag.id}`, { method: 'DELETE' });
												if (res.ok) {
													data.tags = data.tags.filter(t => t.id !== tag.id);
													invalidateAll();
												}
											}}
										>
											<Trash2 class="w-4 h-4" />
										</button>
									{/if}
								</div>
							</li>
						{/if}
					{/each}
				</ul>
				
				{#if data.tags.filter(t => !t.isDeleted).length === 0}
					<div class="p-8 text-center text-zinc-500 text-sm">
						No tags have been created yet.
					</div>
				{/if}
			</section>
		</div>

		<!-- Sidebar (Visibility) -->
		<div class="space-y-6">
			<section class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-5">
				<h3 class="text-sm font-bold flex items-center gap-2 mb-4">
					<ShieldAlert class="w-4 h-4 text-zinc-400" />
					Project Visibility
				</h3>
				
				<form method="POST" action="?/updateVisibility" use:enhance class="space-y-4">
					<div class="space-y-3">
						<label class="flex items-start gap-3 cursor-pointer group">
							<div class="flex items-center h-5">
								<input 
									type="radio" 
									name="visibility" 
									value="Public" 
									checked={project.visibility === 'Public'}
									disabled={!isProjectAdmin}
									class="w-4 h-4 text-blue-600 border-zinc-300 focus:ring-blue-500 disabled:opacity-50"
								/>
							</div>
							<div>
								<div class="text-sm font-semibold group-hover:text-blue-600 transition-colors">Public to Group</div>
								<div class="text-xs text-zinc-500 mt-0.5 leading-relaxed">Everyone in the group can view tasks and boards.</div>
							</div>
						</label>

						<label class="flex items-start gap-3 cursor-pointer group">
							<div class="flex items-center h-5">
								<input 
									type="radio" 
									name="visibility" 
									value="Private" 
									checked={project.visibility === 'Private'}
									disabled={!isProjectAdmin}
									class="w-4 h-4 text-blue-600 border-zinc-300 focus:ring-blue-500 disabled:opacity-50"
								/>
							</div>
							<div>
								<div class="text-sm font-semibold group-hover:text-blue-600 transition-colors">Private to Members</div>
								<div class="text-xs text-zinc-500 mt-0.5 leading-relaxed">Only invited members can view this project.</div>
							</div>
						</label>
					</div>

					{#if isProjectAdmin}
						<button 
							type="submit" 
							class="w-full py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm font-semibold rounded-lg transition-colors mt-4"
						>
							Save Visibility
						</button>
					{/if}
				</form>
			</section>
		</div>
	</div>
</div>
