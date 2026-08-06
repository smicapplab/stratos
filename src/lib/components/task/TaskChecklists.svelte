<script lang="ts">
	import { Check, Trash2, UserPlus, Calendar, Search, X } from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	let {
		checklists = [],
		toggleChecklist,
		deleteChecklist,
		updateChecklistMeta,
		newChecklistText = $bindable(),
		addChecklistItem,
		groupUsers = []
	}: {
		checklists: { id: string; text: string; done: boolean; assigneeId?: string | null; dueDate?: string | null }[];
		toggleChecklist: (id: string) => void;
		deleteChecklist: (id: string) => void;
		updateChecklistMeta: (id: string, assigneeId: string | null, dueDate: string | null) => void;
		newChecklistText: string;
		addChecklistItem: () => void;
		groupUsers?: any[];
	} = $props();

	let activePopoverItemId = $state<string | null>(null);
	let searchQuery = $state('');

	let filteredUsers = $derived(
		groupUsers.filter(
			(u) =>
				(u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
				(u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
		)
	);

	function openPopover(item: any) {
		activePopoverItemId = item.id;
		searchQuery = '';
	}

	function closePopover() {
		activePopoverItemId = null;
		searchQuery = '';
	}

	function selectAssignee(itemId: string, user: any | null) {
		const item = checklists.find((c) => c.id === itemId);
		const assigneeId = user ? user.id : null;
		const dueDate = item?.dueDate || null;
		updateChecklistMeta(itemId, assigneeId, dueDate);
		closePopover();
	}

	function handleDueDateChange(itemId: string, dateVal: string) {
		const item = checklists.find((c) => c.id === itemId);
		const assigneeId = item?.assigneeId || null;
		const dueDate = dateVal.trim().length > 0 ? dateVal : null;
		updateChecklistMeta(itemId, assigneeId, dueDate);
	}
</script>

<!-- Checklists Container -->
<div class="mb-8 relative">
	<div class="flex items-center justify-between mb-4 text-zinc-900 dark:text-zinc-100 font-semibold">
		<div class="flex items-center gap-2">
			<Check class="w-4 h-4 text-zinc-400" />
			<span>Checklist</span>
		</div>
		{#if checklists.length > 0}
			{@const doneCount = checklists.filter(c => c.done).length}
			<span class="text-xs text-zinc-500 font-normal">{doneCount}/{checklists.length} done</span>
		{/if}
	</div>

	<div class="space-y-1 mb-3">
		{#each checklists as item (item.id)}
			{@const assignedUser = item.assigneeId ? groupUsers.find((u) => u.id === item.assigneeId) : null}
			
			<div class="group flex items-center gap-2 py-1.5 px-2.5 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 relative">
				<input
					type="checkbox"
					checked={item.done}
					onchange={() => toggleChecklist(item.id)}
					class="w-4 h-4 rounded-md border-2 border-zinc-300 dark:border-zinc-600 text-brand-primary focus:ring-brand-primary bg-transparent transition-all cursor-pointer shrink-0"
				/>

				<!-- Left-Aligned Assignee Avatar Button -->
				<div class="relative shrink-0">
					{#if assignedUser}
						<button
							type="button"
							onclick={() => openPopover(item)}
							class="flex items-center gap-1.5 p-0.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors min-h-[32px]"
							title="Assigned to {assignedUser.name}"
						>
							<Avatar name={assignedUser.name} email={assignedUser.email} photo={assignedUser.photo || assignedUser.avatarUrl} size="xs" />
						</button>
					{:else}
						<button
							type="button"
							onclick={() => openPopover(item)}
							class="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs flex items-center justify-center min-h-[32px] min-w-[32px] p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
							title="Assign checklist item"
						>
							<UserPlus class="w-3.5 h-3.5" />
						</button>
					{/if}

					<!-- Member Assignment & Date Popover -->
					{#if activePopoverItemId === item.id}
						<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
						<div
							class="fixed inset-0 z-40"
							onclick={closePopover}
							onkeydown={(e) => e.key === 'Escape' && closePopover()}
						></div>
						<div class="absolute left-0 top-full mt-1 z-50 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 animate-in fade-in zoom-in duration-100">
							<div class="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
								<span class="text-xs font-bold text-zinc-900 dark:text-zinc-100">Item Options</span>
								<button type="button" onclick={closePopover} class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5">
									<X class="w-3.5 h-3.5" />
								</button>
							</div>

							<!-- Search Input -->
							<div class="relative mb-2">
								<Search class="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
								<input
									type="text"
									bind:value={searchQuery}
									placeholder="Search member by name or email..."
									class="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-brand-primary"
								/>
							</div>

							<!-- Member List -->
							<div class="space-y-1 max-h-40 overflow-y-auto custom-scrollbar mb-3">
								<button
									type="button"
									onclick={() => selectAssignee(item.id, null)}
									class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium text-left transition-colors"
								>
									<div class="w-5 h-5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[10px]">✕</div>
									<span>Unassigned (None)</span>
								</button>

								{#each filteredUsers as u}
									<button
										type="button"
										onclick={() => selectAssignee(item.id, u)}
										class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-brand-primary/10 hover:text-brand-primary dark:hover:bg-brand-primary/20 text-zinc-800 dark:text-zinc-200 font-medium text-left transition-colors {item.assigneeId === u.id ? 'bg-brand-primary/10 text-brand-primary font-bold' : ''}"
									>
										<Avatar name={u.name} email={u.email} photo={u.photo || u.avatarUrl} size="xs" />
										<div class="truncate">
											<div class="truncate font-semibold">{u.name}</div>
											<div class="text-[10px] text-zinc-400 truncate">{u.email}</div>
										</div>
									</button>
								{:else}
									<p class="text-[11px] text-zinc-400 py-2 text-center">No members found</p>
								{/each}
							</div>

							<!-- Due Date Selector -->
							<div class="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1">
								<label for="dueDate-{item.id}" class="text-[11px] font-bold text-zinc-500 flex items-center gap-1">
									<Calendar class="w-3 h-3" />
									Due Date (Optional)
								</label>
								<input
									id="dueDate-{item.id}"
									type="date"
									value={item.dueDate || ''}
									onchange={(e) => handleDueDateChange(item.id, e.currentTarget.value)}
									class="w-full px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
								/>
							</div>
						</div>
					{/if}
				</div>

				<!-- Item Text -->
				<span class="flex-1 text-sm {item.done ? 'text-zinc-400 line-through' : 'text-zinc-800 dark:text-zinc-200'} transition-all break-words">
					{item.text}
				</span>

				<!-- Due Date Pill -->
				{#if item.dueDate}
					<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shrink-0">
						<Calendar class="w-3 h-3 text-zinc-400" />
						{item.dueDate}
					</span>
				{/if}

				<!-- Delete Button -->
				<button
					type="button"
					onclick={() => deleteChecklist(item.id)}
					class="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
					title="Delete checklist item"
				>
					<Trash2 class="w-4 h-4" />
				</button>
			</div>
		{/each}
	</div>

	<!-- Add New Checklist Item Input -->
	<div class="flex items-center gap-3 mt-4">
		<input
			type="text"
			bind:value={newChecklistText}
			onkeydown={(e) => e.key === "Enter" && (e.preventDefault(), addChecklistItem())}
			placeholder="Add a checklist item..."
			class="flex-1 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/50 text-zinc-900 dark:text-zinc-100 transition-all placeholder:text-zinc-500"
		/>
		<button
			type="button"
			onclick={addChecklistItem}
			class="px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-bold rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 transition-all min-h-[44px]"
		>
			Add
		</button>
	</div>
</div>
