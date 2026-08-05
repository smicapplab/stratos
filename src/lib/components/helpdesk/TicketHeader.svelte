<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/stores/ui.svelte';
	import { ArrowLeft, Paperclip, Download, File, Eye } from 'lucide-svelte';
	import FileSecurityBadge from '$lib/components/ui/FileSecurityBadge.svelte';

	let { ticket, attachments = [], onPreview }: { ticket: any; attachments: any[]; onPreview: (file: any) => void } = $props();

	let isUploading = $state(false);

	function formatDate(dateVal: Date | string) {
		const date = new Date(dateVal);
		return date.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function isVideoAttachment(file: { mimeType?: string | null; fileName?: string | null }): boolean {
		if (!file) return false;
		const type = (file.mimeType || '').toLowerCase();
		const name = (file.fileName || '').toLowerCase();
		if (type.startsWith('video/')) return true;
		return ['.mp4', '.webm', '.ogg', '.mov', '.mkv'].some(ext => name.endsWith(ext));
	}

	function isImageFile(file: any) {
		const type = (file.mimeType || '').toLowerCase();
		const name = (file.fileName || '').toLowerCase();
		return type.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].some(ext => name.endsWith(ext));
	}

	function isPdfFile(file: any) {
		const type = (file.mimeType || '').toLowerCase();
		return type === 'application/pdf' || (file.fileName || '').toLowerCase().endsWith('.pdf');
	}

	function isTextFile(file: any) {
		const type = (file.mimeType || '').toLowerCase();
		const name = (file.fileName || '').toLowerCase();
		if (type.startsWith('text/') || type === 'application/json' || type === 'application/javascript' || type === 'application/x-typescript') return true;
		const txtExtensions = ['.env', '.json', '.md', '.js', '.ts', '.html', '.css', '.yaml', '.yml', '.sh', '.py', '.ini', '.conf', '.log', '.csv', '.txt'];
		return txtExtensions.some(ext => name.endsWith(ext));
	}

	function isOfficeDoc(file: any) {
		const name = (file.fileName || '').toLowerCase();
		return ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].some(ext => name.endsWith(ext));
	}
</script>

<div class="space-y-6">
	<!-- Breadcrumb / Back Button -->
	<div class="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-4">
		<a 
			href="/helpdesk/tickets" 
			class="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors min-h-[44px]"
		>
			<ArrowLeft class="w-4 h-4" />
			Back to Tickets
		</a>
		<div class="text-xs text-zinc-400 dark:text-zinc-400">
			Ticket #TIC-{ticket.number}
		</div>
	</div>

	<!-- Ticket Card -->
	<div class="bg-white dark:bg-zinc-900 shadow-xs rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
		<div class="p-6 space-y-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h1 class="text-xl font-bold text-zinc-900 dark:text-white">{ticket.title}</h1>
				<!-- Category Badge -->
				<span class="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-brand-primary border border-brand-primary/30 dark:border-brand-primary/50">
					{ticket.customFields?.ticketType || 'Support'}
				</span>
			</div>

			{#if ticket.description}
				<div class="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950/40 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/30 whitespace-pre-wrap">
					{ticket.description}
				</div>
			{/if}

			<div class="flex flex-wrap items-center gap-6 text-xs text-zinc-500 dark:text-zinc-400">
				<div>
					<span class="font-medium text-zinc-400 dark:text-zinc-500">Submitted:</span> {formatDate(ticket.createdAt)}
				</div>
				<div>
					<span class="font-medium text-zinc-400 dark:text-zinc-500">Priority:</span> {ticket.priority}
				</div>
			</div>

			<!-- Attachments Section -->
			<div class="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<h3 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Attachments</h3>
					<FileSecurityBadge />
				</div>

				{#if attachments && attachments.length > 0}
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{#each attachments as file}
							{@const isVideo = isVideoAttachment(file)}
							{@const isImage = isImageFile(file)}
							{@const isPdf = isPdfFile(file)}
							{@const isText = isTextFile(file)}
							{@const isDoc = isOfficeDoc(file)}
							{@const canPreview = isVideo || isImage || isPdf || isText || isDoc}

							<div class="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200/50 dark:border-zinc-800/30 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									{#if isVideo}
										<button 
											type="button" 
											onclick={() => onPreview(file)} 
											aria-label={`Preview ${file.fileName}`}
											class="w-10 h-10 rounded-lg bg-brand-primary/20 dark:bg-brand-primary/30 flex-shrink-0 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-800/30 text-brand-primary cursor-pointer min-h-[44px] min-w-[44px]"
										>
											<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
												<polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
											</svg>
										</button>
									{:else if isImage}
										<button 
											type="button" 
											onclick={() => onPreview(file)} 
											aria-label={`Preview ${file.fileName}`}
											class="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-800/30 min-h-[44px] min-w-[44px]"
										>
											<img src={file.tokenUrl} alt={file.fileName} class="w-full h-full object-cover" />
										</button>
									{:else}
										<div class="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-800/30 text-zinc-400">
											<File class="w-5 h-5" />
										</div>
									{/if}
									<div class="min-w-0">
										<p class="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{file.fileName}</p>
										<p class="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Uploaded by {file.uploader?.name}</p>
									</div>
								</div>
								
								<div class="flex items-center gap-1.5">
									{#if canPreview}
										<button 
											type="button"
											onclick={() => onPreview(file)}
											class="p-2 text-zinc-400 hover:text-brand-primary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
											title="Preview File"
										>
											<Eye class="w-4 h-4" />
										</button>
									{/if}
									<a 
										href={file.tokenUrl} 
										download={file.fileName}
										class="p-2 text-zinc-400 hover:text-brand-primary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
										title="Download File"
									>
										<Download class="w-4 h-4" />
									</a>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-xs text-zinc-400 dark:text-zinc-500 italic pl-1">No attachments added to this ticket.</p>
				{/if}
			</div>

			<!-- Inline File Attach Uploader -->
			<div class="pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
				<form 
					method="POST" 
					action="?/uploadAttachment" 
					enctype="multipart/form-data"
					use:enhance={() => {
						isUploading = true;
						return async ({ update, result }) => {
							isUploading = false;
							if (result.type === 'success') {
								toastStore.success('File uploaded successfully!');
							} else if (result.type === 'failure') {
								const errorMsg = result.data && typeof result.data.error === 'string'
									? result.data.error
									: 'Failed to upload file';
								toastStore.error(errorMsg);
							} else if (result.type === 'error') {
								toastStore.error(result.error?.message || 'A server error occurred during upload');
							}
							await update({ reset: true });
						};
					}}
					class="flex items-center gap-3"
				>
					<label class="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all min-h-[40px]">
						<Paperclip class="w-3.5 h-3.5" />
						Attach File
						<input 
							type="file" 
							name="files" 
							multiple 
							class="hidden" 
							accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.csv,.txt,.json,.log,.md,.mp4,.webm,.ogg,.mov,.mkv"
							onchange={(e) => {
								const input = e.currentTarget as HTMLInputElement;
								if (input.files && input.files.length > 0) {
									input.form?.requestSubmit();
								}
							}}
						/>
					</label>
					<span class="text-[10px] text-zinc-400 dark:text-zinc-500">Max 20MB for files, 100MB for video</span>
					{#if isUploading}
						<div class="flex items-center gap-2 text-xs text-zinc-400">
							<div class="w-4 h-4 border-2 border-brand-primary/20 border-t-blue-500 rounded-full animate-spin"></div>
							<span>Uploading...</span>
						</div>
					{/if}
				</form>
			</div>
		</div>
	</div>
</div>
