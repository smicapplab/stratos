<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Tag, Pencil, Trash2 } from 'lucide-svelte';

	let { project, tags = $bindable([]), isProjectAdmin }: { project: any; tags: any[]; isProjectAdmin: boolean } = $props();

	let editTagId = $state<string | null>(null);
	let editTagName = $state('');
	let editTagColor = $state('zinc');

	async function saveEditTag(tag: any) {
		if (!editTagName.trim()) return;
		const res = await fetch(`/api/tags/${tag.id}`, {
			method: 'PATCH',
			body: JSON.stringify({ name: editTagName, color: editTagColor })
		});
		if (res.ok) {
			const updated = await res.json();
			tags = tags.map((t: any) => (t.id === tag.id ? updated : t));
			editTagId = null;
			invalidateAll();
		}
	}
</script>

<section class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
	<div class="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
		<div>
			<h2 class="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
				<Tag class="w-5 h-5 text-zinc-400" />
				Project Tags
			</h2>
			<p class="text-sm text-zinc-500 dark:text-zinc-400">
				Manage custom labels and tags for tasks in this project.
			</p>
		</div>
	</div>

	{#if isProjectAdmin}
		<div class="p-5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
			<form
				class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
				onsubmit={async (e) => {
					e.preventDefault();
					const formEl = e.currentTarget;
					if (!formEl) return;
					const formData = new FormData(formEl);
					const name = formData.get('tagName') as string;
					const color = formData.get('tagColor') as string;
					if (!name) return;
					const res = await fetch(`/api/projects/${project.id}/tags`, {
						method: 'POST',
						body: JSON.stringify({ name, color })
					});
					if (res.ok) {
						const newTag = await res.json();
						tags = [...tags, newTag];
						formEl.reset();
						invalidateAll();
					}
				}}
			>
				<div class="flex-1 flex flex-col gap-1.5">
					<label
						for="new-tag-name"
						class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
					>
						Tag Name
					</label>
					<input
						type="text"
						id="new-tag-name"
						name="tagName"
						placeholder="e.g. Frontend"
						required
						class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 min-h-[44px]"
					/>
				</div>

				<div class="w-full sm:w-32 flex flex-col gap-1.5">
					<label
						for="new-tag-color"
						class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
					>
						Color
					</label>
					<div class="relative">
						<select
							id="new-tag-color"
							name="tagColor"
							class="w-full appearance-none bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer min-h-[44px]"
						>
							<option value="blue">Blue</option>
							<option value="red">Red</option>
							<option value="emerald">Green</option>
							<option value="amber">Yellow</option>
							<option value="purple">Purple</option>
							<option value="pink">Pink</option>
							<option value="zinc" selected>Gray</option>
						</select>
						<div class="absolute inset-y-0 right-2 flex items-center pointer-events-none text-zinc-500">
							<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="m6 9 6 6 6-6" />
							</svg>
						</div>
					</div>
				</div>

				<button
					type="submit"
					class="px-5 py-2.5 bg-brand-primary hover:opacity-90 text-white text-sm font-semibold rounded-xl transition-colors min-h-[44px]"
				>
					Add Tag
				</button>
			</form>
		</div>
	{/if}

	<ul class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
		{#each tags.filter((t: any) => !t.deletedAt) as tag (tag.id)}
			{#if editTagId === tag.id}
				<li class="p-4 bg-zinc-50 dark:bg-zinc-900 flex flex-col sm:flex-row items-start sm:items-center gap-3">
					<input
						type="text"
						bind:value={editTagName}
						class="flex-1 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded px-3 py-1.5 text-sm w-full min-h-[44px]"
					/>
					<div class="flex items-center gap-2 w-full sm:w-auto">
						<div class="relative flex-1 sm:flex-none">
							<select
								bind:value={editTagColor}
								class="w-full appearance-none bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded px-3 pr-8 py-1.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/50 min-h-[44px]"
							>
								<option value="blue">Blue</option>
								<option value="red">Red</option>
								<option value="emerald">Green</option>
								<option value="amber">Yellow</option>
								<option value="purple">Purple</option>
								<option value="pink">Pink</option>
								<option value="zinc">Gray</option>
							</select>
							<div class="absolute inset-y-0 right-2 flex items-center pointer-events-none text-zinc-500">
								<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="m6 9 6 6 6-6" />
								</svg>
							</div>
						</div>
						<button
							onclick={() => saveEditTag(tag)}
							class="px-4 py-2 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:opacity-90 whitespace-nowrap min-h-[44px]"
						>
							Save
						</button>
						<button
							onclick={() => (editTagId = null)}
							class="px-4 py-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-sm font-semibold whitespace-nowrap min-h-[44px]"
						>
							Cancel
						</button>
					</div>
				</li>
			{:else}
				<li class="flex items-center justify-between p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors group">
					<div class="flex items-center gap-3">
						<div class="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-{tag.color}-500/10 text-{tag.color}-600 dark:text-{tag.color}-400 border border-{tag.color}-500/20">
							{tag.name}
						</div>
					</div>

					<div class="flex items-center gap-2">
						{#if isProjectAdmin}
							<button
								type="button"
								class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
								title="Edit Tag"
								onclick={() => {
									editTagId = tag.id;
									editTagName = tag.name;
									editTagColor = tag.color;
								}}
							>
								<Pencil class="w-4 h-4" />
							</button>
							<button
								type="button"
								class="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
								title="Delete Tag"
								onclick={async () => {
									const res = await fetch(`/api/tags/${tag.id}`, { method: 'DELETE' });
									if (res.ok) {
										tags = tags.filter((t: any) => t.id !== tag.id);
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

	{#if tags.filter((t: any) => !t.deletedAt).length === 0}
		<div class="p-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">
			No tags have been created yet.
		</div>
	{/if}
</section>
