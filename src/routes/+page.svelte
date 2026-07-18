<script lang="ts">
	import { enhance } from '$app/forms';
	import { Mail, Lock, Eye, EyeOff } from 'lucide-svelte';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';

	let { form } = $props();
	let showPassword = $state(false);
</script>

<div class="min-h-screen relative overflow-hidden bg-zinc-50 dark:bg-[#09090b] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<!-- Ambient light spots -->
	<div class="absolute inset-0 overflow-hidden pointer-events-none">
		<div class="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/0 dark:from-blue-600/10 dark:to-transparent blur-[120px] opacity-75"></div>
		<div class="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-tl from-indigo-500/10 to-blue-500/0 dark:from-indigo-600/10 dark:to-transparent blur-[120px] opacity-75"></div>
	</div>

	<!-- Dot grid pattern overlay -->
	<div class="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] opacity-60 pointer-events-none"></div>

	<div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-2 flex flex-col items-center">
		<BrandLogo class="h-12 w-auto mb-6 text-blue-600 dark:text-blue-500" />
		<h2 class="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
			Welcome back
		</h2>
		<p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
			Please sign in to access your Stratos workspace
		</p>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
		<div class="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] sm:rounded-2xl sm:px-10 border border-zinc-200/80 dark:border-zinc-800/80">
			<form class="space-y-6" method="POST" use:enhance>
				{#if form?.error}
					<div class="p-3.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-200/60 dark:border-red-900/30 flex items-start gap-2.5">
						<svg class="w-5 h-5 shrink-0 mt-0.5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						<span>{form.error}</span>
					</div>
				{/if}

				<div>
					<label for="email" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
						Email address
					</label>
					<div class="mt-2 relative rounded-lg shadow-sm">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
							<Mail class="h-4 w-4" />
						</div>
						<input 
							id="email" 
							name="email" 
							type="email" 
							autocomplete="email" 
							required 
							placeholder="admin@acme.internal"
							class="appearance-none block w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white transition-all sm:text-sm"
						>
					</div>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
						Password
					</label>
					<div class="mt-2 relative rounded-lg shadow-sm">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
							<Lock class="h-4 w-4" />
						</div>
						<input 
							id="password" 
							name="password" 
							type={showPassword ? "text" : "password"} 
							autocomplete="current-password" 
							required 
							placeholder="password123"
							class="appearance-none block w-full pl-10 pr-10 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white transition-all sm:text-sm"
						>
						<button 
							type="button" 
							onclick={() => showPassword = !showPassword} 
							class="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors focus:outline-none"
							aria-label={showPassword ? "Hide password" : "Show password"}
						>
							{#if showPassword}
								<EyeOff class="h-4 w-4" />
							{:else}
								<Eye class="h-4 w-4" />
							{/if}
						</button>
					</div>
				</div>

				<div class="pt-2">
					<button type="submit" class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 focus:ring-blue-500 transition-all duration-200 transform active:scale-[0.98] cursor-pointer">
						Sign in
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
