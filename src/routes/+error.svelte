<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="min-h-screen flex items-center justify-center bg-zinc-950 text-white font-sans p-6">
	<div class="max-w-md w-full text-center space-y-4">
		<h1 class="text-6xl font-black text-brand-primary">{$page.status}</h1>
		<p class="text-xl font-medium text-zinc-300">{$page.error?.message || 'An unexpected error occurred'}</p>
		<div class="pt-4">
			<a href="/" class="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-medium rounded-lg transition-colors">
				Return to Login
			</a>
		</div>
	</div>
</div>
