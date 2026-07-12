<script lang="ts">
	import { Calendar, User, Flag, CheckCircle2, Tags } from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Combobox from '$lib/components/ui/Combobox.svelte';
	import PriorityBadge from '$lib/components/ui/PriorityBadge.svelte';

	interface Props {
		task: any;
		groupUsers: any[];
		stages: any[];
		customFields?: any[];
		projectTags?: any[];
		projectId?: string;
		handlePropertyChange: () => void;
	}

	let { task = $bindable(), groupUsers = [], stages = [], customFields = [], projectTags = [], projectId, handlePropertyChange }: Props = $props();

	let stageOptions = $derived(
		stages.map((s) => ({
			value: s.id,
			label: s.name,
		}))
	);

	let assigneeOptions = $derived(
		groupUsers.map((u) => ({
			value: u.id,
			label: u.name,
			meta: u,
		}))
	);

	let priorityOptions = [
		{ value: "Low", label: "Low" },
		{ value: "Medium", label: "Medium" },
		{ value: "High", label: "High" },
		{ value: "Urgent", label: "Urgent" },
	];

	import { invalidateAll } from '$app/navigation';
	import { Pencil, Trash2 } from 'lucide-svelte';

	let showTagDropdown = $state(false);
	let tagSearchQuery = $state("");
	let editTagId = $state<string | null>(null);
	let editTagName = $state("");
	let editTagColor = $state("blue");

	let filteredTags = $derived(
		projectTags.filter(t => !t.deletedAt && t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()))
	);

	let exactMatch = $derived(
		projectTags.some(t => !t.deletedAt && t.name.toLowerCase() === tagSearchQuery.toLowerCase())
	);

	async function toggleTag(tag: any) {
		if (!task.tags) task.tags = [];
		const isAttached = task.tags.some((t: any) => t.id === tag.id);
		
		if (isAttached) {
			task.tags = task.tags.filter((t: any) => t.id !== tag.id);
			fetch(`/api/tasks/${task.id}/tags`, {
				method: 'DELETE',
				body: JSON.stringify({ tagId: tag.id })
			});
		} else {
			task.tags.push(tag);
			fetch(`/api/tasks/${task.id}/tags`, {
				method: 'POST',
				body: JSON.stringify({ tagId: tag.id })
			});
		}
	}

	async function createNewTag() {
		if (!tagSearchQuery || exactMatch) return;
		const targetProjectId = projectId || task.projectId || task.boardId;
		if (!targetProjectId) {
			toastStore.error("Missing project context to create a tag");
			return;
		}
		const res = await fetch(`/api/projects/${targetProjectId}/tags`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: tagSearchQuery, color: "zinc" }),
		});
		if (res.ok) {
			const newTag = await res.json();
			projectTags.push(newTag);
			toggleTag(newTag);
			tagSearchQuery = "";
			invalidateAll();
		}
	}

	async function saveEditTag(tag: any) {
		if (!editTagName) return;
		const res = await fetch(`/api/tags/${tag.id}`, {
			method: 'PATCH',
			body: JSON.stringify({ name: editTagName, color: editTagColor })
		});
		if (res.ok) {
			const updated = await res.json();
			Object.assign(tag, updated);
			// Also update attached task tags
			if (task.tags) {
				const attached = task.tags.find((t: any) => t.id === tag.id);
				if (attached) {
					attached.name = updated.name;
					attached.color = updated.color;
				}
			}
			editTagId = null;
			invalidateAll();
		}
	}

	function startEdit(tag: any, e: MouseEvent) {
		e.stopPropagation();
		editTagId = tag.id;
		editTagName = tag.name;
		editTagColor = tag.color;
	}
</script>

<div class="space-y-6">
		<!-- Stage / Status -->
		<div>
			<div class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
				<CheckCircle2 class="w-3.5 h-3.5" /> Stage
			</div>
			<input type="hidden" name="stageId" form="task-form" value={task.stageId || ""} />
			<Combobox options={stageOptions} bind:value={task.stageId} placeholder="Select stage" onValueChange={handlePropertyChange}>
				{#snippet selectedRender(option: { value: string, label: string })}
					<span class="text-zinc-900 dark:text-zinc-100 font-semibold">{option.label}</span>
				{/snippet}
				{#snippet optionRender(option: { value: string, label: string })}
					<span class="text-zinc-900 dark:text-zinc-100 font-medium">{option.label}</span>
				{/snippet}
			</Combobox>
		</div>

		<!-- Assignee -->
		<div id="assignee-wrapper">
			<div class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
				<User class="w-3.5 h-3.5" /> Assignee
			</div>
			<input type="hidden" name="assigneeId" form="task-form" value={task.assigneeId || ""} />
			<Combobox options={assigneeOptions} bind:value={task.assigneeId} placeholder="Unassigned" searchable={true} onValueChange={handlePropertyChange}>
				{#snippet selectedRender(option: any)}
					{#if option.meta}
						<Avatar name={option.label} size="sm" />
						<span class="text-zinc-900 dark:text-zinc-100 font-semibold">{option.label}</span>
					{:else}
						<div class="w-6 h-6 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center shrink-0">
							<User class="w-3 h-3 text-zinc-400" />
						</div>
						<span class="text-zinc-900 dark:text-zinc-100 font-semibold">Unassigned</span>
					{/if}
				{/snippet}
				{#snippet optionRender(option: any)}
					{#if option.meta}
						<Avatar name={option.label} size="sm" />
						<span class="text-zinc-900 dark:text-zinc-100 font-medium">{option.label}</span>
					{:else}
						<div class="w-6 h-6 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center shrink-0">
							<User class="w-3 h-3 text-zinc-400" />
						</div>
						<span class="text-zinc-500 font-medium">Unassigned</span>
					{/if}
				{/snippet}
			</Combobox>
		</div>

		<!-- Priority -->
		<div>
			<div class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
				<Flag class="w-3.5 h-3.5" /> Priority
			</div>
			<input type="hidden" name="priority" form="task-form" value={task.priority} />
			<Combobox options={priorityOptions} bind:value={task.priority} onValueChange={handlePropertyChange}>
				{#snippet selectedRender(option: any)}<PriorityBadge priority={option.value} />{/snippet}
				{#snippet optionRender(option: any)}<PriorityBadge priority={option.value} />{/snippet}
			</Combobox>
		</div>

		<!-- Tags -->
		<div class="relative">
			<div class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
				<Tags class="w-3.5 h-3.5" /> Tags
			</div>
			<div class="flex flex-wrap gap-1.5 mb-2">
				{#each (task.tags || []) as tag}
					<div class="px-2 py-0.5 text-xs font-medium rounded-md bg-{tag.color}-500/10 text-{tag.color}-600 dark:text-{tag.color}-400 border border-{tag.color}-500/20 flex items-center gap-1">
						{tag.name}
						<button class="hover:text-{tag.color}-800 dark:hover:text-{tag.color}-200" onclick={() => toggleTag(tag)}>
							&times;
						</button>
					</div>
				{/each}
				<button class="px-2 py-0.5 text-xs font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors" onclick={() => showTagDropdown = !showTagDropdown}>
					+ Add
				</button>
			</div>
			
			{#if showTagDropdown}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="fixed inset-0 z-[9]" onclick={(e) => { e.stopPropagation(); showTagDropdown = false; editTagId = null; }}></div>
				<div class="absolute z-10 top-full left-0 mt-1 w-56 bg-white dark:bg-[#1e1e21] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden flex flex-col">
					<!-- Search -->
					<div class="p-2 border-b border-zinc-200 dark:border-zinc-800">
						<!-- svelte-ignore a11y_autofocus -->
						<input 
							type="text" 
							bind:value={tagSearchQuery} 
							placeholder="Search or create..." 
							autofocus
							onkeydown={(e) => { if (e.key === 'Enter') createNewTag(); }}
							class="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none" 
						/>
					</div>
					
					<div class="p-2 max-h-48 overflow-y-auto custom-scrollbar">
						{#each filteredTags as tag}
							{@const isSelected = (task.tags || []).some((t: any) => t.id === tag.id)}
							{#if editTagId === tag.id}
								<div class="p-2 mb-1 border border-zinc-200 dark:border-zinc-700 rounded-md bg-zinc-50 dark:bg-zinc-900 flex flex-col gap-2">
									<input type="text" bind:value={editTagName} class="w-full bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 text-xs" />
									<div class="flex items-center gap-2">
										<select bind:value={editTagColor} class="flex-1 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded px-1 py-1 text-xs">
											<option value="blue">Blue</option>
											<option value="red">Red</option>
											<option value="emerald">Green</option>
											<option value="amber">Yellow</option>
											<option value="purple">Purple</option>
											<option value="pink">Pink</option>
											<option value="zinc">Gray</option>
										</select>
										<button onclick={() => saveEditTag(tag)} class="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Save</button>
										<button onclick={() => editTagId = null} class="px-2 py-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-xs">Cancel</button>
									</div>
								</div>
							{:else}
								<button 
									class="w-full text-left px-2 py-1.5 text-sm rounded-md flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
									onclick={() => { toggleTag(tag); }}
								>
									<div class="flex items-center gap-2">
										<div class="w-3 h-3 rounded-full bg-{tag.color}-500"></div>
										<span class="text-zinc-900 dark:text-zinc-100">{tag.name}</span>
									</div>
									<div class="flex items-center gap-2">
										<div 
											role="button"
											tabindex="0"
											class="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-opacity p-0.5"
											onclick={(e) => startEdit(tag, e)}
											onkeydown={(e) => { if (e.key === 'Enter') startEdit(tag, e); }}
										>
											<Pencil class="w-3.5 h-3.5" />
										</div>
										{#if isSelected}
											<CheckCircle2 class="w-4 h-4 text-zinc-400" />
										{/if}
									</div>
								</button>
							{/if}
						{/each}
						
						{#if filteredTags.length === 0 && !tagSearchQuery}
							<div class="text-xs text-zinc-500 text-center py-2">No tags available</div>
						{/if}
						
						{#if tagSearchQuery && !exactMatch}
							<button 
								class="w-full text-left px-2 py-2 text-sm rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-2"
								onclick={createNewTag}
							>
								<span class="font-semibold">+</span> Create "{tagSearchQuery}"
							</button>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Due Date -->
		<div>
			<div class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
				<Calendar class="w-3.5 h-3.5" /> Due Date
			</div>
			<input type="hidden" name="dueDate" form="task-form" value={task.dueDate ? new Date(task.dueDate).toISOString() : ""} />
			<input
				type="date"
				class="w-full px-3 py-2 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
				value={task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""}
				onchange={(e) => {
					const val = e.currentTarget.value;
					task.dueDate = val ? new Date(val).toISOString() : null;
					handlePropertyChange();
				}}
			/>
		</div>
	</div>

	<div class="border-t border-zinc-200 dark:border-zinc-800 pt-6 mt-2">
		<div class="flex items-center justify-between text-xs text-zinc-500 font-medium">
			<span>Created</span>
			<span>{task.createdAt ? new Date(task.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
			<!-- Custom Fields -->
	{#if customFields && customFields.length > 0}
		<div class="pt-4 border-t border-zinc-200 dark:border-zinc-800">
			<h4 class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Custom Fields</h4>
			<div class="flex flex-col gap-3">
				{#each customFields as field}
					<div class="flex items-center group">
						<div class="w-24 shrink-0 flex items-center gap-2 text-zinc-500">
							<Tags class="w-4 h-4 shrink-0" />
							<span class="text-xs font-medium truncate" title={field.name}>{field.name}</span>
						</div>
						<div class="flex-1 min-w-0">
							{#if field.type === 'select'}
								<Combobox
									options={field.options.map((opt: string) => ({ value: opt, label: opt }))}
									value={(task.customFields || {})[field.id]}
									onValueChange={(val: any) => {
										if (!task.customFields) task.customFields = {};
										task.customFields[field.id] = val;
										handlePropertyChange();
									}}
									placeholder={`Select ${field.name.toLowerCase()}...`}
								/>
							{:else if field.type === 'date'}
								<input
									type="date"
									class="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1.5 -ml-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-none"
									value={(task.customFields || {})[field.id] || ''}
									onchange={(e) => {
										if (!task.customFields) task.customFields = {};
										task.customFields[field.id] = (e.target as HTMLInputElement).value;
										handlePropertyChange();
									}}
								/>
							{:else if field.type === 'number'}
								<input
									type="number"
									class="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1.5 -ml-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-none"
									value={(task.customFields || {})[field.id] || ''}
									placeholder="Empty"
									onchange={(e) => {
										if (!task.customFields) task.customFields = {};
										task.customFields[field.id] = (e.target as HTMLInputElement).value;
										handlePropertyChange();
									}}
								/>
							{:else}
								<!-- default text -->
								<input
									type="text"
									class="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1.5 -ml-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-none"
									value={(task.customFields || {})[field.id] || ''}
									placeholder="Empty"
									onchange={(e) => {
										if (!task.customFields) task.customFields = {};
										task.customFields[field.id] = (e.target as HTMLInputElement).value;
										handlePropertyChange();
									}}
								/>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
	</div>
