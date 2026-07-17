<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/stores/ui.svelte';
	import { 
		ArrowLeft, 
		Send, 
		MessageSquare, 
		Activity, 
		PlusCircle
	} from 'lucide-svelte';

	interface HelpdeskTicket {
		id: string;
		number: number;
		title: string;
		description: string | null;
		priority: 'Low' | 'Medium' | 'High' | 'Urgent';
		createdAt: Date;
		updatedAt: Date;
		customFields: {
			reporterId?: string;
			ticketType?: string;
		} | null;
	}

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

	let { data, form } = $props();
	let ticket = $derived(data.ticket as HelpdeskTicket);
	let comments = $derived(data.comments || []);
	let auditLogs = $derived(data.auditLogs || []);

	// State
	let replyContent = $state('');
	let isSubmitting = $state(false);

	// Construct chronologically sorted timeline of comments & audit logs
	let timeline = $derived(
		[
			...comments.map(c => ({
				id: c.id,
				timelineType: 'comment',
				createdAt: c.createdAt,
				content: c.content,
				authorId: c.author?.id,
				authorName: c.author?.name || 'Unknown',
				authorRole: c.author?.role || 'Member',
				avatarUrl: c.author?.avatarUrl
			})),
			...auditLogs.map(a => ({
				id: a.id,
				timelineType: 'audit',
				createdAt: a.createdAt,
				actionType: a.actionType,
				oldValue: a.oldValue,
				newValue: a.newValue,
				actorName: a.actor?.name || 'System'
			}))
		].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) as TimelineItem[]
	);

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
			case 'task_created':
				return `${item.actorName} submitted the ticket`;
			case 'stage_change':
				return `${item.actorName} updated the ticket status`;
			case 'assignee_change':
				return `${item.actorName} changed the ticket assignee`;
			default:
				return `${item.actorName || 'System'} performed action: ${item.actionType}`;
		}
	}

	function getAuditIcon(actionType: string) {
		switch (actionType) {
			case 'task_created':
				return PlusCircle;
			case 'stage_change':
				return Activity;
			default:
				return MessageSquare;
		}
	}


	// Handle form reply response
	$effect(() => {
		if (form) {
			if (form.success) {
				replyContent = '';
				isSubmitting = false;
				toastStore.success('Reply posted successfully!');
			} else if (form.error) {
				isSubmitting = false;
				toastStore.error(form.error);
			}
		}
	});
</script>

<div class="space-y-6 p-6 sm:p-8 max-w-4xl mx-auto">
	<!-- Breadcrumb / Back Button -->
	<div class="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-4">
		<a 
			href="/helpdesk/tickets" 
			class="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors min-h-[44px]"
		>
			<ArrowLeft class="w-4 h-4" />
			Back to Tickets
		</a>
		<div class="text-xs text-zinc-400 dark:text-zinc-500">
			Ticket #TIC-{ticket.number}
		</div>
	</div>

	<!-- Ticket Card -->
	<div class="bg-white dark:bg-zinc-900 shadow-sm rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
		<div class="p-6 space-y-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h1 class="text-xl font-bold text-zinc-900 dark:text-zinc-50">{ticket.title}</h1>
				<!-- Category Badge -->
				<span class="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
					{ticket.customFields?.ticketType || 'Support'}
				</span>
			</div>

			{#if ticket.description}
				<div class="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-850 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/30 whitespace-pre-wrap">
					{ticket.description}
				</div>
			{/if}

			<div class="flex flex-wrap items-center gap-6 text-xs text-zinc-500 dark:text-zinc-400">
				<div>
					<span class="font-medium text-zinc-400">Submitted:</span> {formatDate(ticket.createdAt)}
				</div>
				<div>
					<span class="font-medium text-zinc-400">Priority:</span> {ticket.priority}
				</div>
			</div>
		</div>
	</div>

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
					<!-- Circular Icon Indicator on the vertical line -->
					<div class="absolute -left-[31px] w-4 h-4 bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900 rounded-full flex items-center justify-center">
						<div class="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
					</div>

					<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
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
									{:else if item.authorId === ticket.customFields?.reporterId}
										<span class="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded border border-blue-200/50 dark:border-blue-800/30 ml-1.5">
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

	<!-- Reply Box -->
	<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4">
		<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
			<MessageSquare class="w-4 h-4 text-zinc-400" />
			Post a Reply
		</h3>

		<form 
			method="POST" 
			action="?/postComment" 
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					isSubmitting = false;
					await update();
				};
			}}
			class="space-y-4"
		>
			<textarea
				bind:value={replyContent}
				name="content"
				rows="4"
				placeholder="Type your reply here..."
				class="w-full px-4 py-2.5 rounded-xl border text-sm bg-transparent border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 dark:text-zinc-100 resize-none"
			></textarea>

			<div class="flex justify-end">
				<button
					type="submit"
					disabled={isSubmitting || !replyContent.trim()}
					class="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm rounded-xl shadow-md disabled:opacity-50 transition-all duration-200 min-h-[44px]"
				>
					{#if isSubmitting}
						<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
						<span>Sending...</span>
					{:else}
						<Send class="w-4 h-4" />
						<span>Send Message</span>
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
