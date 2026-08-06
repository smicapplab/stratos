<script lang="ts">
	import { 
		X, Sun, Moon, AlertTriangle, Check, Plus, Sparkles, Calendar, Percent, Search
	} from 'lucide-svelte';

	interface AttachedTask {
		id: string;
		title: string;
		progress?: number;
	}

	let {
		isOpen = $bindable(false),
		todayStandup,
		targetDateStr,
		inProgressTasks = [],
		completedTasks = [],
		onSave,
		onClose
	}: {
		isOpen: boolean;
		todayStandup: any;
		targetDateStr?: string;
		inProgressTasks?: any[];
		completedTasks?: any[];
		onSave: (payload: { dateStr?: string; morningIntent?: string; eveningOutcome?: string; blockers?: string; morningTaskIds?: any[]; eveningTaskIds?: any[] }) => Promise<void>;
		onClose: () => void;
	} = $props();

	let morningIntent = $state('');
	let eveningOutcome = $state('');
	let blockers = $state('');
	let isSaving = $state(false);
	let validationError = $state('');
	let activeTab = $state<'morning' | 'evening'>('morning');
	let taskSearchQuery = $state('');

	let filteredInProgressTasks = $derived(
		inProgressTasks.filter((t) => t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()))
	);

	let attachedEveningTasks = $state<AttachedTask[]>([]);
	let attachedMorningTasks = $state<AttachedTask[]>([]);

	$effect(() => {
		validationError = '';
		if (todayStandup) {
			morningIntent = todayStandup.morningIntent || '';
			eveningOutcome = todayStandup.eveningOutcome || '';
			blockers = todayStandup.blockers || '';
			attachedEveningTasks = Array.isArray(todayStandup.eveningTaskIds) ? [...todayStandup.eveningTaskIds] : [];
			attachedMorningTasks = Array.isArray(todayStandup.morningTaskIds) ? [...todayStandup.morningTaskIds] : [];

			if (todayStandup.morningIntent && !todayStandup.eveningOutcome) {
				activeTab = 'evening';
			} else {
				activeTab = 'morning';
			}
		} else {
			morningIntent = '';
			eveningOutcome = '';
			blockers = '';
			attachedEveningTasks = [];
			attachedMorningTasks = [];
			activeTab = 'morning';
		}
	});

	function clearValidationError() {
		if (validationError) validationError = '';
	}

	function handleMorningInput() {
		clearValidationError();
		// Live sync: remove tasks whose links were backspaced out of morningIntent
		attachedMorningTasks = attachedMorningTasks.filter((t) => morningIntent.includes(`/tasks/${t.id}`));
	}

	function handleEveningInput() {
		clearValidationError();
		// Live sync: remove tasks whose links were backspaced out of eveningOutcome
		attachedEveningTasks = attachedEveningTasks.filter((t) => eveningOutcome.includes(`/tasks/${t.id}`));
	}

	function removeAttachedMorningTask(id: string) {
		attachedMorningTasks = attachedMorningTasks.filter((t) => t.id !== id);
		const lines = morningIntent.split('\n');
		morningIntent = lines.filter((l) => !l.includes(`/tasks/${id}`)).join('\n');
	}

	function removeAttachedEveningTask(id: string) {
		attachedEveningTasks = attachedEveningTasks.filter((t) => t.id !== id);
		const lines = eveningOutcome.split('\n');
		eveningOutcome = lines.filter((l) => !l.includes(`/tasks/${id}`)).join('\n');
	}

	function appendTaskToMorning(title: string, id: string) {
		clearValidationError();
		if (!attachedMorningTasks.some((t) => t.id === id)) {
			attachedMorningTasks = [...attachedMorningTasks, { id, title }];
		}
		const link = `[${title}](/tasks/${id})`;
		if (!morningIntent.includes(`/tasks/${id}`)) {
			morningIntent = morningIntent ? `${morningIntent}\n• Working on ${link}` : `• Working on ${link}`;
		}
	}

	function appendTaskToEvening(title: string, id: string, pct?: number) {
		clearValidationError();
		const existingIdx = attachedEveningTasks.findIndex((t) => t.id === id);
		if (existingIdx !== -1) {
			attachedEveningTasks[existingIdx] = { id, title, progress: pct };
		} else {
			attachedEveningTasks = [...attachedEveningTasks, { id, title, progress: pct }];
		}

		const link = `[${title}](/tasks/${id})`;
		const pctSuffix = pct !== undefined ? ` - ${pct}%` : '';
		const line = pct !== undefined ? `• Progress on ${link}${pctSuffix}` : `• Completed ${link}`;

		if (eveningOutcome.includes(`/tasks/${id}`)) {
			const lines = eveningOutcome.split('\n');
			eveningOutcome = lines.map((l) => l.includes(`/tasks/${id}`) ? line : l).join('\n');
		} else {
			eveningOutcome = eveningOutcome ? `${eveningOutcome}\n${line}` : line;
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isSaving) return;

		validationError = '';

		const trimmedMorning = morningIntent.trim();
		const trimmedEvening = eveningOutcome.trim();
		const trimmedBlockers = blockers.trim();

		if (!trimmedMorning && !trimmedEvening && !trimmedBlockers) {
			validationError = 'Please enter your Morning Focus or Evening Accomplishments before saving.';
			return;
		}

		if (morningIntent.length > 2000 || eveningOutcome.length > 2000 || blockers.length > 2000) {
			validationError = 'Standup entries cannot exceed 2000 characters.';
			return;
		}

		isSaving = true;
		try {
			await onSave({
				dateStr: targetDateStr || todayStandup?.date,
				morningIntent: trimmedMorning || undefined,
				eveningOutcome: trimmedEvening || undefined,
				blockers: trimmedBlockers || undefined,
				morningTaskIds: attachedMorningTasks,
				eveningTaskIds: attachedEveningTasks
			});
			isOpen = false;
		} catch (err) {
			validationError = err instanceof Error ? err.message : 'Failed to save standup check-in.';
		} finally {
			isSaving = false;
		}
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={onClose}
		onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_click_events_have_key_events -->
		<div
			role="dialog"
			aria-modal="true"
			tabindex="0"
			class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150 outline-none"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<header class="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
						<Sun class="w-5 h-5" />
					</div>
					<div>
						<h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
							<span>Standup Check-in</span>
							{#if targetDateStr}
								<span class="text-xs bg-brand-primary/10 text-brand-primary font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
									<Calendar class="w-3 h-3" />
									{targetDateStr}
								</span>
							{/if}
						</h2>
						<p class="text-xs text-zinc-500 dark:text-zinc-400">Log morning focus & evening outcome for your team.</p>
					</div>
				</div>

				<button
					type="button"
					onclick={onClose}
					class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
				>
					<X class="w-5 h-5" />
				</button>
			</header>

			<!-- 2-Phase Mode Tabs Navigation -->
			<div class="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 px-6 pt-2 shrink-0">
				<button
					type="button"
					onclick={() => activeTab = 'morning'}
					class="px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 min-h-[44px] {activeTab === 'morning' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
				>
					<Sun class="w-4 h-4 text-amber-500" />
					<span>Morning Focus</span>
					{#if morningIntent}
						<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
					{/if}
				</button>
				<button
					type="button"
					onclick={() => activeTab = 'evening'}
					class="px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 min-h-[44px] {activeTab === 'evening' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
				>
					<Moon class="w-4 h-4 text-indigo-500" />
					<span>Evening Outcome</span>
					{#if eveningOutcome}
						<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
					{/if}
				</button>
			</div>

			<form onsubmit={handleSubmit} class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
				{#if activeTab === 'morning'}
					<!-- Morning Section -->
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<label for="morningIntent" class="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
								<Sun class="w-4 h-4 text-amber-500" />
								Morning Focus & Intent
							</label>
						</div>

						<!-- Attached Morning Task Pills -->
						{#if attachedMorningTasks.length > 0}
							<div class="flex flex-wrap gap-1.5 p-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30">
								{#each attachedMorningTasks as task}
									<span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300/50 dark:border-amber-700/50">
										<span class="truncate max-w-[180px]">{task.title}</span>
										<button
											type="button"
											onclick={() => removeAttachedMorningTask(task.id)}
											class="p-0.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded transition-colors text-amber-600 dark:text-amber-300"
											title="Remove task"
										>
											<X class="w-3 h-3" />
										</button>
									</span>
								{/each}
							</div>
						{/if}

						<textarea
							id="morningIntent"
							bind:value={morningIntent}
							oninput={handleMorningInput}
							rows="4"
							placeholder="What are your main goals for today?"
							class="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all resize-none"
						></textarea>

						{#if inProgressTasks.length > 0}
							<div class="space-y-1.5">
								<span class="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
									<Sparkles class="w-3 h-3 text-brand-primary" />
									Suggest from In-Progress Tasks:
								</span>
								<div class="flex flex-wrap gap-2">
									{#each inProgressTasks as task}
										<button
											type="button"
											onclick={() => appendTaskToMorning(task.title, task.id)}
											class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-brand-primary/10 hover:text-brand-primary dark:hover:bg-brand-primary/20 rounded-lg transition-colors text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 min-h-[32px]"
										>
											<Plus class="w-3 h-3" />
											<span class="truncate max-w-[200px]">{task.title}</span>
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<!-- Evening Section -->
					<div class="space-y-4">
						{#if morningIntent}
							<div class="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-1">
								<span class="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
									<Sun class="w-3.5 h-3.5 text-amber-500" />
									Morning Focus Reference:
								</span>
								<p class="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">{morningIntent}</p>
							</div>
						{/if}

						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<label for="eveningOutcome" class="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
									<Moon class="w-4 h-4 text-indigo-500" />
									Evening Accomplishments & Outcome
								</label>
							</div>

							<!-- Attached Evening Task Pills (Live Synced) -->
							{#if attachedEveningTasks.length > 0}
								<div class="flex flex-wrap gap-1.5 p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/30">
									{#each attachedEveningTasks as task}
										<span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 border border-indigo-300/50 dark:border-indigo-700/50">
											<span class="truncate max-w-[180px]">{task.title}</span>
											{#if task.progress !== undefined}
												<span class="text-[10px] bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100 px-1.5 py-0.5 rounded font-extrabold">{task.progress}%</span>
											{/if}
											<button
												type="button"
												onclick={() => removeAttachedEveningTask(task.id)}
												class="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded transition-colors text-indigo-600 dark:text-indigo-300"
												title="Remove task"
											>
												<X class="w-3 h-3" />
											</button>
										</span>
									{/each}
								</div>
							{/if}

							<textarea
								id="eveningOutcome"
								bind:value={eveningOutcome}
								oninput={handleEveningInput}
								rows="4"
								placeholder="What did you achieve today? (e.g. Completed feature, or Long task - 90%)"
								class="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all resize-none"
							></textarea>

							<!-- Completed Tasks Suggestions -->
							{#if completedTasks.length > 0}
								<div class="space-y-1.5">
									<span class="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
										<Sparkles class="w-3 h-3 text-emerald-500" />
										Suggest from Completed Today:
									</span>
									<div class="flex flex-wrap gap-2">
										{#each completedTasks as task}
											<button
												type="button"
												onclick={() => appendTaskToEvening(task.title, task.id)}
												class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800/50 min-h-[32px]"
											>
												<Plus class="w-3 h-3" />
												<span class="truncate max-w-[200px]">{task.title}</span>
											</button>
										{/each}
									</div>
								</div>
							{/if}

							<!-- In-Progress Task Percentage Progress Suggestions -->
							{#if inProgressTasks.length > 0}
								<div class="space-y-2 pt-1">
									<div class="flex items-center justify-between">
										<span class="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
											<Percent class="w-3 h-3 text-indigo-500" />
											Attach In-Progress Task Progress %:
										</span>
										<span class="text-[10px] text-zinc-400 font-medium">{filteredInProgressTasks.length} task{filteredInProgressTasks.length === 1 ? '' : 's'}</span>
									</div>

									{#if inProgressTasks.length > 3}
										<div class="relative">
											<Search class="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
											<input
												type="text"
												bind:value={taskSearchQuery}
												placeholder="Filter in-progress tasks..."
												class="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-brand-primary"
											/>
										</div>
									{/if}

									<div class="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
										{#each filteredInProgressTasks as task}
											<div class="flex items-center flex-wrap gap-1.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
												<span class="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[180px]">{task.title}</span>
												<div class="flex items-center gap-1 ml-auto">
													<button
														type="button"
														onclick={() => appendTaskToEvening(task.title, task.id, 25)}
														class="px-2 py-0.5 text-[11px] font-semibold bg-zinc-200 dark:bg-zinc-800 hover:bg-brand-primary hover:text-white rounded transition-colors text-zinc-700 dark:text-zinc-300 min-h-[28px]"
													>
														25%
													</button>
													<button
														type="button"
														onclick={() => appendTaskToEvening(task.title, task.id, 50)}
														class="px-2 py-0.5 text-[11px] font-semibold bg-zinc-200 dark:bg-zinc-800 hover:bg-brand-primary hover:text-white rounded transition-colors text-zinc-700 dark:text-zinc-300 min-h-[28px]"
													>
														50%
													</button>
													<button
														type="button"
														onclick={() => appendTaskToEvening(task.title, task.id, 75)}
														class="px-2 py-0.5 text-[11px] font-semibold bg-zinc-200 dark:bg-zinc-800 hover:bg-brand-primary hover:text-white rounded transition-colors text-zinc-700 dark:text-zinc-300 min-h-[28px]"
													>
														75%
													</button>
													<button
														type="button"
														onclick={() => appendTaskToEvening(task.title, task.id, 90)}
														class="px-2 py-0.5 text-[11px] font-semibold bg-zinc-200 dark:bg-zinc-800 hover:bg-brand-primary hover:text-white rounded transition-colors text-zinc-700 dark:text-zinc-300 min-h-[28px]"
													>
														90%
													</button>
												</div>
											</div>
										{:else}
											<p class="text-xs text-zinc-400 py-2 text-center">No matching in-progress tasks found.</p>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<hr class="border-zinc-100 dark:border-zinc-800/80" />

				<!-- Blockers Section -->
				<div class="space-y-3">
					<label for="blockers" class="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400">
						<AlertTriangle class="w-4 h-4" />
						Blockers & Dependencies (Optional)
					</label>
					<textarea
						id="blockers"
						bind:value={blockers}
						oninput={clearValidationError}
						rows="2"
						placeholder="Any issues blocking your progress that need team lead intervention?"
						class="w-full px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-none"
					></textarea>
				</div>

				{#if validationError}
					<div class="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 animate-in fade-in duration-150">
						<AlertTriangle class="w-4 h-4 shrink-0 text-red-500" />
						<span>{validationError}</span>
					</div>
				{/if}

				<footer class="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-end gap-3 shrink-0">
					<button
						type="button"
						onclick={onClose}
						class="px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl transition-colors min-h-[44px]"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSaving}
						class="px-5 py-2.5 text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-xl shadow-md transition-all min-h-[44px] flex items-center gap-2"
					>
						<Check class="w-4 h-4" />
						<span>{isSaving ? 'Saving...' : 'Save Check-in'}</span>
					</button>
				</footer>
			</form>
		</div>
	</div>
{/if}
