<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/stores/ui.svelte';
	import { MessageSquare, Send } from 'lucide-svelte';

	let replyContent = $state('');
	let isSubmitting = $state(false);
</script>

<div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-4">
	<h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
		<MessageSquare class="w-4 h-4 text-zinc-400" />
		Post a Reply
	</h3>

	<form 
		method="POST" 
		action="?/postComment" 
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update, result }) => {
				isSubmitting = false;
				if (result.type === 'success') {
					replyContent = '';
					toastStore.success('Reply posted successfully!');
				} else if (result.type === 'failure') {
					const errorMsg = result.data && typeof result.data.error === 'string'
						? result.data.error
						: 'Failed to post reply';
					toastStore.error(errorMsg);
				}
				await update({ reset: false });
			};
		}}
		class="space-y-4"
	>
		<textarea
			bind:value={replyContent}
			name="content"
			rows="4"
			placeholder="Type your reply here..."
			class="w-full px-4 py-2.5 rounded-xl border text-sm bg-transparent border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-200 dark:text-zinc-100 resize-none"
		></textarea>

		<div class="flex justify-end">
			<button
				type="submit"
				disabled={isSubmitting || !replyContent.trim()}
				class="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-primary to-brand-accent hover:from-brand-primary hover:opacity-90 hover:to-brand-accent text-white font-medium text-sm rounded-xl shadow-md disabled:opacity-50 transition-all duration-200 min-h-[44px]"
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
