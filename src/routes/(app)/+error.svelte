<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
	<div class="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl space-y-4">
		<div class="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-xl font-bold">
			{$page.status}
		</div>
		<h2 class="text-xl font-bold text-zinc-900 dark:text-zinc-100">Something went wrong</h2>
		<p class="text-sm text-zinc-600 dark:text-zinc-400">{$page.error?.message || 'Failed to load page content.'}</p>
		<div class="pt-2 flex justify-center gap-3">
			<button onclick={() => window.location.reload()} class="px-4 py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg transition-colors">
				Try Again
			</button>
			<a href="/dashboard" class="px-4 py-2 text-sm font-medium bg-brand-primary text-white hover:bg-brand-primary/90 rounded-lg transition-colors">
				Back to Dashboard
			</a>
		</div>
	</div>
</div>
