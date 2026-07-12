<script lang="ts">
	import { Check, Trash2 } from 'lucide-svelte';
	let {
		checklists,
		toggleChecklist,
		deleteChecklist,
		newChecklistText = $bindable(),
		addChecklistItem
	} = $props();
</script>

					<!-- Checklists -->
					<div class="mb-8">
						<div
							class="flex items-center gap-2 mb-4 text-zinc-900 dark:text-zinc-100 font-semibold"
						>
							<Check class="w-4 h-4 text-zinc-400" /> Checklist
						</div>
						<div class="space-y-0.5 mb-3">
							{#each checklists as item (item.id)}
								<div
									class="flex items-center gap-2.5 group py-1 px-2 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-lg transition-colors -mx-2"
								>
									<input
										type="checkbox"
										checked={item.done}
										onchange={() =>
											toggleChecklist(item.id)}
										class="w-4 h-4 rounded-md border-2 border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 bg-transparent transition-all cursor-pointer"
									/>
									<span
										class="flex-1 text-[15px] {item.done
											? 'text-zinc-400 line-through'
											: 'text-zinc-700 dark:text-zinc-200'} transition-all"
										>{item.text}</span
									>
									<button
										type="button"
										onclick={() => deleteChecklist(item.id)}
										class="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-white dark:hover:bg-white/10 rounded-md transition-all"
									>
										<Trash2 class="w-4 h-4" />
									</button>
								</div>
							{/each}
						</div>
						<div class="flex items-center gap-3 mt-4">
							<input
								type="text"
								bind:value={newChecklistText}
								onkeydown={(e) =>
									e.key === "Enter" &&
									(e.preventDefault(), addChecklistItem())}
								placeholder="Add an item..."
								class="flex-1 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-zinc-900 dark:text-zinc-100 transition-all placeholder:text-zinc-500"
							/>
							<button
								type="button"
								onclick={addChecklistItem}
								class="px-5 py-2.5 bg-zinc-200 dark:bg-white/10 text-sm font-semibold rounded-lg hover:bg-zinc-300 dark:hover:bg-white/20 active:scale-95 transition-all text-zinc-900 dark:text-zinc-100"
								>Add</button
							>
						</div>
					</div>
