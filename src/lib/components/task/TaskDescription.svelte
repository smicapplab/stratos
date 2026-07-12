<script lang="ts">
	import { TextAlignStart, Bold, Italic, List } from 'lucide-svelte';
	let { task, editor, tiptapAction } = $props();
</script>

					<!-- WYSIWYG Description -->
					<div class="mb-8">
						<div
							class="flex items-center gap-2 mb-3 text-zinc-900 dark:text-zinc-100 font-semibold"
						>
							<TextAlignStart class="w-4 h-4 text-zinc-400" /> Description
						</div>

						<div
							class="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121214] shadow-sm overflow-hidden focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all"
						>
							<!-- Toolbar -->
							{#if editor}
								<div
									class="flex items-center gap-1 bg-zinc-50/80 dark:bg-white/[0.02] border-b border-zinc-200 dark:border-white/5 p-1.5 px-3"
								>
									<button
										type="button"
										onclick={() =>
											editor
												?.chain()
												.focus()
												.toggleBold()
												.run()}
										class="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 transition-colors {editor.isActive(
											'bold',
										)
											? 'bg-zinc-200 dark:bg-white/10 text-zinc-900 dark:text-white'
											: ''}"
										><Bold class="w-4 h-4" /></button
									>
									<button
										type="button"
										onclick={() =>
											editor
												?.chain()
												.focus()
												.toggleItalic()
												.run()}
										class="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 transition-colors {editor.isActive(
											'italic',
										)
											? 'bg-zinc-200 dark:bg-white/10 text-zinc-900 dark:text-white'
											: ''}"
										><Italic class="w-4 h-4" /></button
									>
									<div
										class="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-2"
									></div>
									<button
										type="button"
										onclick={() =>
											editor
												?.chain()
												.focus()
												.toggleBulletList()
												.run()}
										class="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 transition-colors {editor.isActive(
											'bulletList',
										)
											? 'bg-zinc-200 dark:bg-white/10 text-zinc-900 dark:text-white'
											: ''}"
										><List class="w-4 h-4" /></button
									>
								</div>
							{/if}
							<!-- Editor -->
							<div use:tiptapAction></div>
							<input
								type="hidden"
								name="description"
								value={task.description}
							/>
						</div>
					</div>


