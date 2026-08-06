<script lang="ts">
	import { 
		Sun, Moon, AlertTriangle, CheckCircle2, Clock, Edit2
	} from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	let {
		members = [],
		dateStrings = [],
		standupsMap = {},
		currentUserId = '',
		onOpenCheckInForDate
	}: {
		members: any[];
		dateStrings: string[];
		standupsMap: Record<string, any>;
		currentUserId?: string;
		onOpenCheckInForDate?: (dateStr: string, existingData?: any) => void;
	} = $props();

	let selectedStandup = $state<any | null>(null);

	function formatDayLabel(dateStr: string) {
		const [yyyy, mm, dd] = dateStr.split('-').map(Number);
		const d = new Date(yyyy, mm - 1, dd);
		const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
		const dayNum = d.getDate();
		return { dayName, dayNum };
	}

	function handleCellClick(member: any, dateStr: string, record: any) {
		if (currentUserId && member.userId === currentUserId && onOpenCheckInForDate) {
			onOpenCheckInForDate(dateStr, record);
		} else if (record) {
			selectedStandup = { ...record, memberName: member.name };
		}
	}
</script>

<div class="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
	<div class="overflow-x-auto custom-scrollbar">
		<table class="w-full text-left border-collapse min-w-[700px]">
			<thead>
				<tr class="border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-white/[0.01]">
					<th class="py-3.5 px-5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-64">
						Team Member
					</th>
					{#each dateStrings as dateStr}
						{@const dayInfo = formatDayLabel(dateStr)}
						<th class="py-3.5 px-4 text-center text-xs font-bold text-zinc-700 dark:text-zinc-300">
							<div>{dayInfo.dayName}</div>
							<div class="text-[11px] font-normal text-zinc-400">{dayInfo.dayNum}</div>
						</th>
					{/each}
				</tr>
			</thead>

			<tbody class="divide-y divide-zinc-100 dark:divide-white/5">
				{#each members as member (member.userId)}
					{@const isSelf = currentUserId === member.userId}
					<tr class="hover:bg-zinc-50/60 dark:hover:bg-white/[0.02] transition-colors {isSelf ? 'bg-brand-primary/[0.02]' : ''}">
						<!-- Member Profile Cell -->
						<td class="py-4 px-5">
							<div class="flex items-center gap-3">
								<Avatar name={member.name} email={member.email} photo={member.avatarUrl} size="md" />
								<div class="min-w-0">
									<div class="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
										<span>{member.name}</span>
										{#if isSelf}
											<span class="text-[10px] bg-brand-primary/10 text-brand-primary font-bold px-1.5 py-0.5 rounded-full">You</span>
										{/if}
									</div>
									<div class="text-xs text-zinc-400 truncate">{member.email}</div>
								</div>
							</div>
						</td>

						<!-- Day Status Cells -->
						{#each dateStrings as dateStr}
							{@const key = `${member.userId}_${dateStr}`}
							{@const record = standupsMap[key]}
							<td class="py-4 px-4 text-center align-middle">
								<button
									type="button"
									onclick={() => handleCellClick(member, dateStr, record)}
									title={isSelf ? 'Click to edit your standup for ' + dateStr : record ? 'View standup details' : 'No standup filed'}
									class="w-full max-w-[120px] mx-auto p-2 rounded-xl border transition-all text-xs font-medium flex flex-col items-center gap-1 min-h-[44px] justify-center relative group {record?.status === 'COMPLETED' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-400' : record?.status === 'CHECKED_IN' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50 hover:border-amber-400' : record?.status === 'CHECKED_OUT_DIRECTLY' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50 hover:border-indigo-400' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-brand-primary/50'}"
								>
									<div class="flex items-center gap-1">
										{#if record?.status === 'COMPLETED'}
											<CheckCircle2 class="w-3.5 h-3.5 text-emerald-500" />
											<span>Completed</span>
										{:else if record?.status === 'CHECKED_IN'}
											<Sun class="w-3.5 h-3.5 text-amber-500" />
											<span>Checked In</span>
										{:else if record?.status === 'CHECKED_OUT_DIRECTLY'}
											<Moon class="w-3.5 h-3.5 text-indigo-500" />
											<span>Outcome</span>
										{:else}
											<Clock class="w-3.5 h-3.5 text-zinc-400" />
											<span>Pending</span>
										{/if}
									</div>

									{#if record?.blockers}
										<span class="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/70 px-1.5 py-0.2 rounded-full">
											<AlertTriangle class="w-2.5 h-2.5" />
											Blocker
										</span>
									{/if}

									{#if isSelf}
										<div class="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-brand-primary text-white p-1 rounded-full shadow-sm transition-opacity">
											<Edit2 class="w-2.5 h-2.5" />
										</div>
									{/if}
								</button>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Standup Record Detail Modal -->
{#if selectedStandup}
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={() => selectedStandup = null}
		onkeydown={(e) => { if (e.key === 'Escape') selectedStandup = null; }}
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_click_events_have_key_events -->
		<div
			role="dialog"
			aria-modal="true"
			tabindex="0"
			class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150 outline-none"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<header class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
				<div>
					<h3 class="font-bold text-lg text-zinc-900 dark:text-zinc-100">{selectedStandup.memberName}'s Standup</h3>
					<p class="text-xs text-zinc-400">{selectedStandup.date}</p>
				</div>
				<button
					type="button"
					onclick={() => selectedStandup = null}
					class="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg min-h-[36px]"
				>
					Close
				</button>
			</header>

			{#if selectedStandup.morningIntent}
				<div class="space-y-1.5">
					<h4 class="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
						<Sun class="w-3.5 h-3.5" /> Morning Focus
					</h4>
					<p class="text-sm text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl whitespace-pre-wrap">
						{selectedStandup.morningIntent}
					</p>
				</div>
			{/if}

			{#if selectedStandup.eveningOutcome}
				<div class="space-y-1.5">
					<h4 class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
						<Moon class="w-3.5 h-3.5" /> Evening Accomplishments
					</h4>
					<p class="text-sm text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl whitespace-pre-wrap">
						{selectedStandup.eveningOutcome}
					</p>
				</div>
			{/if}

			{#if selectedStandup.blockers}
				<div class="space-y-1.5">
					<h4 class="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
						<AlertTriangle class="w-3.5 h-3.5" /> Reported Blockers
					</h4>
					<p class="text-sm text-red-900 dark:text-red-200 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 rounded-xl whitespace-pre-wrap">
						{selectedStandup.blockers}
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
