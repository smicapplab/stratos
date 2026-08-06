<script lang="ts">
	import { 
		X, Sun, Moon, AlertTriangle, Check, Plus, Sparkles, Calendar
	} from 'lucide-svelte';

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
		onSave: (payload: { dateStr?: string; morningIntent?: string; eveningOutcome?: string; blockers?: string }) => Promise<void>;
		onClose: () => void;
	} = $props();

	let morningIntent = $state('');
	let eveningOutcome = $state('');
	let blockers = $state('');
	let isSaving = $state(false);

	$effect(() => {
		if (todayStandup) {
			morningIntent = todayStandup.morningIntent || '';
			eveningOutcome = todayStandup.eveningOutcome || '';
			blockers = todayStandup.blockers || '';
		} else {
			morningIntent = '';
			eveningOutcome = '';
			blockers = '';
		}
	});

	function appendTaskToMorning(title: string, id: string) {
		const link = `[${title}](/tasks/${id})`;
		if (!morningIntent) {
			morningIntent = `• Working on ${link}`;
		} else {
			morningIntent += `\n• Working on ${link}`;
		}
	}

	function appendTaskToEvening(title: string, id: string) {
		const link = `[${title}](/tasks/${id})`;
		if (!eveningOutcome) {
			eveningOutcome = `• Completed ${link}`;
		} else {
			eveningOutcome += `\n• Completed ${link}`;
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isSaving) return;

		isSaving = true;
		try {
			await onSave({
				dateStr: targetDateStr || todayStandup?.date,
				morningIntent: morningIntent.trim() || undefined,
				eveningOutcome: eveningOutcome.trim() || undefined,
				blockers: blockers.trim() || undefined
			});
			isOpen = false;
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
						<p class="text-xs text-zinc-500 dark:text-zinc-400">Log morning intent & evening outcome for your team.</p>
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

			<form onsubmit={handleSubmit} class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
				<!-- Morning Section -->
				<div class="space-y-3">
					<label for="morningIntent" class="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
						<Sun class="w-4 h-4 text-amber-500" />
						Morning Focus & Intent
					</label>
					<textarea
						id="morningIntent"
						bind:value={morningIntent}
						rows="3"
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

				<hr class="border-zinc-100 dark:border-zinc-800/80" />

				<!-- Evening Section -->
				<div class="space-y-3">
					<label for="eveningOutcome" class="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
						<Moon class="w-4 h-4 text-indigo-500" />
						Evening Accomplishments & Outcome
					</label>
					<textarea
						id="eveningOutcome"
						bind:value={eveningOutcome}
						rows="3"
						placeholder="What did you achieve today?"
						class="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all resize-none"
					></textarea>

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
				</div>

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
						rows="2"
						placeholder="Any issues blocking your progress that need team lead intervention?"
						class="w-full px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-none"
					></textarea>
				</div>

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
