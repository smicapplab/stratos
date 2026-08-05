<script lang="ts">
	import TicketHeader from '$lib/components/helpdesk/TicketHeader.svelte';
	import TicketTimeline from '$lib/components/helpdesk/TicketTimeline.svelte';
	import TicketReplyForm from '$lib/components/helpdesk/TicketReplyForm.svelte';
	import AttachmentPreviewModal from '$lib/components/helpdesk/AttachmentPreviewModal.svelte';

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

	let { data } = $props();
	let ticket = $derived(data.ticket as HelpdeskTicket);
	let comments = $derived(data.comments || []);
	let auditLogs = $derived(data.auditLogs || []);
	let attachments = $derived(data.attachments || []);

	let previewAttachment = $state<any>(null);

	let timeline = $derived(
		[
			...comments.map((c: any) => ({
				id: c.id,
				timelineType: 'comment',
				createdAt: c.createdAt,
				content: c.content,
				authorId: c.author?.id,
				authorName: c.author?.name || 'Unknown',
				authorRole: c.author?.role || 'Member',
				avatarUrl: c.author?.avatarUrl
			})),
			...auditLogs.map((a: any) => ({
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
</script>

<svelte:head>
	<title>Ticket #TIC-{ticket.number} | Stratos</title>
</svelte:head>

<div class="space-y-6 p-6 sm:p-8 max-w-6xl mx-auto">
	<!-- Ticket Card Header & Attachments Uploader -->
	<TicketHeader 
		{ticket} 
		{attachments} 
		onPreview={(file) => previewAttachment = file} 
	/>

	<!-- Conversation Timeline -->
	<TicketTimeline 
		{timeline} 
		reporterId={ticket.customFields?.reporterId} 
	/>

	<!-- Post Reply Box -->
	<TicketReplyForm />
</div>

<!-- Dynamic Attachment File Preview Overlay -->
<AttachmentPreviewModal 
	bind:previewAttachment 
	publicOrigin={data.publicOrigin} 
/>
