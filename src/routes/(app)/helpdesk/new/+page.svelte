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
	// Form state
	let ticketType = $state<'Bug' | 'Feature' | 'Support'>('Bug');
	let title = $state('');
	let description = $state('');
	let selectedFileCount = $state(0);
	let isSubmitting = $state(false);

	// Inline validation errors
	let errors = $state<{ title?: string; general?: string }>({});

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

<div class="min-h-full py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center space-y-4">
	<div class="w-full max-w-xl flex items-center justify-between">
		<a 
			href="/helpdesk/tickets" 
			class="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors min-h-[44px]"
		>
			<ArrowLeft class="w-4 h-4" />
			Back to Dashboard
		</a>
	</div>

	<div class="w-full max-w-xl bg-white dark:bg-zinc-900 shadow-xl rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden transition-all duration-300">
		<!-- Decorative Top Banner -->
		<div class="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600"></div>

		<!-- Card Content -->
		<div class="p-6 sm:p-8 space-y-6">
			<!-- Header -->
			<div class="text-center space-y-2">
				<div class="inline-flex p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400">
					<LifeBuoy class="w-8 h-8" />
				</div>
				<h1 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Submit a Ticket</h1>
				<p class="text-sm text-zinc-500 dark:text-zinc-400">
					Select a category, describe your request, and submit. Our development team will review it shortly.
				</p>
			</div>

			<!-- Main Form -->
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
							class="flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 group min-h-[44px]
							{ticketType === 'Bug' 
								? 'border-red-500/50 bg-red-50/30 dark:bg-red-950/10 text-red-600 dark:text-red-400 shadow-sm' 
								: 'border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-100'}"
						>
							<Bug class="w-5 h-5 mb-1.5 transition-transform group-hover:scale-110" />
							<span class="text-xs font-medium">Bug</span>
						</button>

						<button
							type="button"
							onclick={() => ticketType = 'Feature'}
							class="flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 group min-h-[44px]
							{ticketType === 'Feature' 
								? 'border-indigo-500/50 bg-indigo-50/30 dark:bg-indigo-950/10 text-indigo-600 dark:text-indigo-400 shadow-sm' 
								: 'border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-100'}"
						>
							<Lightbulb class="w-5 h-5 mb-1.5 transition-transform group-hover:scale-110" />
							<span class="text-xs font-medium">Feature</span>
						</button>

						<button
							type="button"
							onclick={() => ticketType = 'Support'}
							class="flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 group min-h-[44px]
							{ticketType === 'Support' 
								? 'border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 shadow-sm' 
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
						class="w-full px-4 py-2.5 rounded-xl border text-sm bg-transparent border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 dark:text-zinc-100 min-h-[44px]"
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
						rows="12"
						placeholder="Provide as much context as possible. For bugs, include steps to reproduce..."
						class="w-full px-4 py-2.5 rounded-xl border text-sm bg-transparent border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 dark:text-zinc-100 resize-y min-h-[220px]"
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
								<p class="text-xs text-zinc-500 dark:text-zinc-400 font-semibold"><span class="text-blue-500">Click to upload</span> or drag and drop</p>
								<p class="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Images or Documents (Max 10MB each)</p>
							</div>
							<input 
								type="file" 
								name="attachments" 
								multiple 
								class="hidden" 
								onchange={(e) => {
									selectedFileCount = (e.currentTarget as HTMLInputElement).files?.length || 0;
								}}
							/>
						</label>
					</div>
					{#if selectedFileCount > 0}
						<p class="text-xs text-blue-500 dark:text-blue-400 font-semibold pl-1 mt-1">{selectedFileCount} files selected</p>
					{/if}
				</div>

				<!-- Form-Level Error -->
				{#if errors.general}
					<div class="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/40 rounded-xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
						<span class="font-medium">{errors.general}</span>
					</div>
				{/if}

				<!-- Actions / Submit Button -->
				<div class="pt-2">
					<button
						type="submit"
						disabled={isSubmitting}
						class="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/25 disabled:opacity-50 transition-all duration-200 min-h-[44px]"
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
