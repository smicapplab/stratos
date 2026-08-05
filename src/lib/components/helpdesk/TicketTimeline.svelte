<script lang="ts">
	import { MessageSquare, PlusCircle, Activity } from 'lucide-svelte';

	interface TimelineItem {
		id: string;
		timelineType: 'comment' | 'audit';
		createdAt: Date | string;
		content?: string;
		authorId?: string;
		authorName?: string;
		authorRole?: string;
		avatarUrl?: string | null;
		actionType?: string;
		oldValue?: string | null;
		newValue?: string | null;
		actorName?: string;
	}

	let { timeline = [], reporterId = '' }: { timeline: TimelineItem[]; reporterId?: string } = $props();

	function formatDate(dateVal: Date | string) {
		const date = new Date(dateVal);
		return date.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getAuditMessage(item: TimelineItem) {
		switch (item.actionType) {
			case 'task_created': return `${item.actorName} submitted the ticket`;
			case 'stage_change': return `${item.actorName} updated the ticket status`;
			case 'assignee_change': return `${item.actorName} changed the ticket assignee`;
			default: return `${item.actorName || 'System'} performed action: ${item.actionType}`;
		}
	}

	function getAuditIcon(actionType: string) {
		switch (actionType) {
			case 'task_created': return PlusCircle;
			case 'stage_change': return Activity;
			default: return MessageSquare;
		}
	}
</script>

<div class="space-y-6">
	<!-- Conversation Timeline Header -->
	<div class="pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
		<h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
			<MessageSquare class="w-5 h-5 text-zinc-400" />
			Ticket Activity & Timeline
		</h2>
	</div>

	<!-- Timeline Thread -->
	<div class="relative pl-6 border-l border-zinc-200 dark:border-zinc-800 space-y-6 ml-4">
		{#each timeline as item (item.id)}
			{#if item.timelineType === 'audit'}
				{@const AuditIcon = getAuditIcon(item.actionType || '')}
				<!-- Audit Timeline Item -->
				<div class="relative flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 py-1">
					<div class="absolute -left-[31px] w-4 h-4 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center text-zinc-500">
						<AuditIcon class="w-2.5 h-2.5" />
					</div>
					<span class="font-medium text-zinc-700 dark:text-zinc-300">{getAuditMessage(item)}</span>
					<span class="text-zinc-400 dark:text-zinc-600">•</span>
					<span>{formatDate(item.createdAt)}</span>
				</div>
			{:else}
				<!-- Comment Message Bubble -->
				<div class="relative space-y-1">
					<div class="absolute -left-[31px] w-4 h-4 bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900 rounded-full flex items-center justify-center">
						<div class="w-1.5 h-1.5 bg-brand-primary/100 rounded-full"></div>
					</div>

					<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow">
						<div class="flex items-center justify-between gap-3 mb-2">
							<div class="flex items-center gap-2">
								<div class="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
									{(item.authorName || 'Unknown').charAt(0).toUpperCase()}
								</div>
								<div>
									<span class="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{item.authorName || 'Unknown'}</span>
									{#if item.authorRole === 'Admin'}
										<span class="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded border border-red-200/50 dark:border-red-800/30 ml-1.5">
											Support Team
										</span>
									{:else if item.authorId === reporterId}
										<span class="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-brand-primary rounded border border-brand-primary/30/50 dark:border-brand-primary/30 ml-1.5">
											Reporter
										</span>
									{/if}
								</div>
							</div>
							<span class="text-[10px] text-zinc-400 dark:text-zinc-500">{formatDate(item.createdAt)}</span>
						</div>
						<div class="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap pl-8">
							{item.content || ''}
						</div>
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>
