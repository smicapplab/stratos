<script lang="ts">
	import { enhance } from '$app/forms';
	let { form } = $props();
</script>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<h2 class="mt-6 text-center text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
			Sign in to Stratos
		</h2>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-zinc-200 dark:border-zinc-800">
			<form class="space-y-6" method="POST" use:enhance>
				{#if form?.error}
					<div class="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800">
						{form.error}
					</div>
				{/if}

				<div>
					<label for="email" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
						Email address
					</label>
					<div class="mt-2">
						<input id="email" name="email" type="email" autocomplete="email" required class="appearance-none block w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-950 dark:text-white transition-all sm:text-sm">
					</div>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
						Password
					</label>
					<div class="mt-2">
						<input id="password" name="password" type="password" autocomplete="current-password" required class="appearance-none block w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-950 dark:text-white transition-all sm:text-sm">
					</div>
				</div>

				<div class="pt-2">
					<button type="submit" class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform active:scale-95">
						Sign in
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
