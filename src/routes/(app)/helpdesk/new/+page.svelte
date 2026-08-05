<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/stores/ui.svelte';
	import { 
		Bug, 
		Lightbulb, 
		LifeBuoy, 
		Send,
		ArrowLeft,
		Paperclip
	} from 'lucide-svelte';
	import FileSecurityBadge from '$lib/components/ui/FileSecurityBadge.svelte';

	// Form state
	let ticketType = $state<'Bug' | 'Feature' | 'Support'>('Bug');
	let title = $state('');
	let description = $state('');
	let selectedFileCount = $state(0);
	let isSubmitting = $state(false);

	// Inline validation errors
	let errors = $state<{ title?: string; general?: string; attachments?: string }>({});

	function handleSubmit() {
		errors = {};
		if (!title.trim()) {
			errors.title = 'Title is required';
			return false;
		}
		isSubmitting = true;
		return true;
	}
</script>

<svelte:head>
	<title>Submit a Ticket - Stratos Helpdesk</title>
</svelte:head>

<div class="space-y-8 p-6 sm:p-8 max-w-6xl mx-auto">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-6">
		<div>
			<a 
				href="/helpdesk/tickets" 
				class="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors min-h-[44px]"
			>
				<ArrowLeft class="w-4 h-4" />
				Back to Tickets
			</a>
		</div>

		<div class="flex items-center justify-between">
			<div class="space-y-1">
				<div class="flex items-center gap-2 text-brand-primary">
					<LifeBuoy class="w-5 h-5" />
					<span class="text-xs font-bold uppercase tracking-wider">Helpdesk</span>
				</div>
				<h1 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Submit a Ticket</h1>
				<p class="text-sm text-zinc-500 dark:text-zinc-400">
					Select a category, describe your issue or feature request, and attach supporting files.
				</p>
			</div>
		</div>
	</div>

	<!-- Main Form Card -->
	<div class="bg-white dark:bg-zinc-900 shadow-sm rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
		<!-- Decorative Top Accent Bar -->
		<div class="h-1.5 bg-gradient-to-r from-brand-primary via-indigo-500 to-purple-600"></div>

		<!-- Card Body -->
		<div class="p-6 sm:p-8">
			<form 
				method="POST" 
				action="?/submitTicket" 
				enctype="multipart/form-data" 
				use:enhance={({ cancel }) => {
					if (!handleSubmit()) {
						cancel();
					}
					return async ({ update, result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							toastStore.success('Ticket submitted successfully!');
							title = '';
							description = '';
							ticketType = 'Bug';
							selectedFileCount = 0;
							errors = {};
						} else if (result.type === 'failure') {
							const errorMsg = result.data && typeof result.data.error === 'string'
								? result.data.error
								: 'Failed to submit ticket';
							if (errorMsg.toLowerCase().includes('file') || errorMsg.toLowerCase().includes('size') || errorMsg.toLowerCase().includes('type') || errorMsg.toLowerCase().includes('limit') || errorMsg.toLowerCase().includes('allowed')) {
								errors.attachments = errorMsg;
							} else {
								errors.general = errorMsg;
								toastStore.error(errorMsg);
							}
						} else if (result.type === 'error') {
							const errorMsg = result.error?.message || 'A server error occurred';
							errors.general = errorMsg;
							toastStore.error(errorMsg);
						}
						await update({ reset: false });
					};
				}} 
				class="space-y-6"
			>
				<!-- Ticket Type Selector -->
				<div class="space-y-2">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
						Select Category
					</span>
					<div class="grid grid-cols-3 gap-3">
						<button
							type="button"
							onclick={() => ticketType = 'Bug'}
							class="flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all duration-200 group min-h-[44px]
							{ticketType === 'Bug' 
								? 'border-red-500/50 bg-red-50/40 dark:bg-red-950/20 text-red-600 dark:text-red-400 shadow-sm' 
								: 'border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-100'}"
						>
							<Bug class="w-5 h-5 mb-1.5 transition-transform group-hover:scale-110" />
							<span class="text-xs font-medium">Bug</span>
						</button>

						<button
							type="button"
							onclick={() => ticketType = 'Feature'}
							class="flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all duration-200 group min-h-[44px]
							{ticketType === 'Feature' 
								? 'border-indigo-500/50 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 shadow-sm' 
								: 'border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-100'}"
						>
							<Lightbulb class="w-5 h-5 mb-1.5 transition-transform group-hover:scale-110" />
							<span class="text-xs font-medium">Feature</span>
						</button>

						<button
							type="button"
							onclick={() => ticketType = 'Support'}
							class="flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all duration-200 group min-h-[44px]
							{ticketType === 'Support' 
								? 'border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 shadow-sm' 
								: 'border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-100'}"
						>
							<LifeBuoy class="w-5 h-5 mb-1.5 transition-transform group-hover:scale-110" />
							<span class="text-xs font-medium">Support</span>
						</button>
					</div>
					<!-- Hidden Input to bind value inside form action -->
					<input type="hidden" name="type" value={ticketType} />
				</div>

				<!-- Ticket Title -->
				<div class="space-y-1">
					<label for="title" class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
						Ticket Title
					</label>
					<input
						type="text"
						id="title"
						name="title"
						bind:value={title}
						placeholder="Brief summary of the issue or request..."
						class="w-full px-4 py-2.5 rounded-xl border text-sm bg-transparent border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-200 dark:text-zinc-100 min-h-[44px]"
					/>
					{#if errors.title}
						<p class="text-xs text-red-500 font-medium pl-1 mt-1">{errors.title}</p>
					{/if}
				</div>

				<!-- Description -->
				<div class="space-y-1">
					<label for="description" class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
						Detailed Description
					</label>
					<textarea
						id="description"
						name="description"
						bind:value={description}
						rows="10"
						placeholder="Provide as much context as possible. For bugs, include steps to reproduce..."
						class="w-full px-4 py-2.5 rounded-xl border text-sm bg-transparent border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-200 dark:text-zinc-100 resize-y min-h-[200px]"
					></textarea>
				</div>

				<!-- Attachments -->
				<div class="space-y-1.5">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
						Attach Screenshots or Documents
					</span>
					<div class="flex items-center justify-center w-full">
						<label class="flex flex-col items-center justify-center w-full h-28 border-2 border-zinc-200 dark:border-zinc-800 border-dashed rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-all">
							<div class="flex flex-col items-center justify-center pt-4 pb-4">
								<Paperclip class="w-7 h-7 text-zinc-400 mb-1.5" />
								<p class="text-xs text-zinc-500 dark:text-zinc-400 font-semibold"><span class="text-brand-primary">Click to upload</span> or drag and drop</p>
								<p class="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Images, Videos or Documents (Max 20MB for files, 100MB for video, limit 5 files)</p>
							</div>
							<input 
								type="file" 
								name="attachments" 
								multiple 
								class="hidden" 
								accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.csv,.txt,.json,.log,.md,.mp4,.webm,.ogg,.mov,.mkv"
								onchange={(e) => {
									selectedFileCount = (e.currentTarget as HTMLInputElement).files?.length || 0;
								}}
							/>
						</label>
					</div>
					<div class="flex justify-between items-center px-1 mt-1">
						<FileSecurityBadge label="Your files are stored securely" />
						{#if selectedFileCount > 0}
							<p class="text-xs text-brand-primary dark:text-brand-primary font-semibold">{selectedFileCount} files selected</p>
						{/if}
					</div>
					{#if errors.attachments}
						<p class="text-xs text-red-500 font-medium pl-1 mt-1">{errors.attachments}</p>
					{/if}
				</div>

				<!-- Form-Level Error -->
				{#if errors.general}
					<div class="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/40 rounded-xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
						<span class="font-medium">{errors.general}</span>
					</div>
				{/if}

				<!-- Actions / Submit Button -->
				<div class="pt-4 flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800/50">
					<a
						href="/helpdesk/tickets"
						class="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors min-h-[44px] flex items-center"
					>
						Cancel
					</a>
					<button
						type="submit"
						disabled={isSubmitting}
						class="flex items-center justify-center gap-2 py-2.5 px-6 bg-brand-primary hover:opacity-90 text-white font-bold text-sm rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-brand-primary/25 disabled:opacity-50 transition-all duration-200 min-h-[44px]"
					>
						{#if isSubmitting}
							<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
							<span>Submitting...</span>
						{:else}
							<Send class="w-4 h-4" />
							<span>Submit Ticket</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
