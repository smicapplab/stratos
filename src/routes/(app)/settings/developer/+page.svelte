<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore, modalStore } from '$lib/stores/ui.svelte';
	import { Terminal, Copy, Check, Trash2, Key, Info } from 'lucide-svelte';

	let { data, form } = $props();

	let tokens = $derived(data.tokens || []);
	let tokenName = $state('');
	let copiedToken = $state(false);

	let justCreatedToken = $derived(form?.success && form?.generatedToken);
	let generatedToken = $derived(form?.generatedToken || '');

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedToken = true;
			toastStore.success('Token copied to clipboard!');
			setTimeout(() => {
				copiedToken = false;
			}, 2000);
		} catch (err) {
			toastStore.error('Failed to copy token to clipboard');
		}
	}

	function confirmRevocation(tokenId: string, name: string) {
		modalStore.show({
			title: 'Revoke API Token',
			description: `Are you sure you want to revoke the API token "${name}"? This action cannot be undone and any external clients using this key will immediately fail with 401 Unauthorized.`,
			confirmText: 'Revoke Token',
			cancelText: 'Cancel',
			destructive: true,
			onConfirm: async () => {
				const formEl = document.getElementById(`revoke-form-${tokenId}`) as HTMLFormElement;
				if (formEl) {
					formEl.requestSubmit();
				}
			}
		});
	}
</script>

<div class="space-y-8">
	<!-- Overview Header -->
	<div class="border-b border-zinc-200 dark:border-zinc-800 pb-5">
		<h2 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
			<Terminal class="w-6 h-6 text-zinc-500" />
			Developer Access & API Keys
		</h2>
		<p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
			Generate API bearer tokens to integrate programmatic scripts, external AI projects, or webhook triggers with your Stratos workspace.
		</p>
	</div>

	<!-- Informational Callout -->
	<div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex gap-3">
		<Info class="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
		<div class="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
			<span class="font-medium text-zinc-900 dark:text-zinc-100 block">API Usage Guidelines</span>
			<p>
				All API endpoints live under <code class="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-xs">/api/v1/*</code>.
				Authenticate by sending your key in the header:
				<code class="block mt-2 p-2 bg-zinc-800 text-zinc-200 dark:bg-black rounded font-mono text-xs overflow-x-auto">
					Authorization: Bearer stratos_tok_...
				</code>
			</p>
		</div>
	</div>

	<!-- Plaintext Token Generation Show-Once Box -->
	{#if justCreatedToken}
		<div class="p-5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 space-y-4">
			<div>
				<h3 class="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
					<Key class="w-4 h-4" />
					API Token Created Successfully
				</h3>
				<p class="text-xs text-blue-700 dark:text-blue-400 mt-1">
					Copy this token now. It will not be shown again for security reasons.
				</p>
			</div>

			<div class="flex items-center gap-2">
				<div class="flex-1 p-3 bg-zinc-900 dark:bg-black text-zinc-100 rounded-lg font-mono text-sm break-all select-all select-none">
					{generatedToken}
				</div>
				<button 
					type="button" 
					onclick={() => copyToClipboard(generatedToken)}
					class="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg shadow-sm transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300"
				>
					{#if copiedToken}
						<Check class="w-5 h-5 text-green-500" />
					{:else}
						<Copy class="w-5 h-5" />
					{/if}
				</button>
			</div>
		</div>
	{/if}

	<!-- Create Token Card -->
	<div class="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4 shadow-sm">
		<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Create New Token</h3>
		<form 
			method="POST" 
			action="?/create" 
			use:enhance={() => {
				return async ({ update }) => {
					tokenName = '';
					await update({ reset: true, invalidateAll: true });
					toastStore.success('Token created successfully!');
				};
			}} 
			class="space-y-4"
		>
			<div class="space-y-1">
				<label for="token-name" class="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Token Description</label>
				<input 
					type="text" 
					id="token-name" 
					name="name" 
					bind:value={tokenName}
					placeholder="e.g. GitHub Action PR Mover, local-agent" 
					required 
					class="w-full min-h-[44px] px-3 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
				/>
			</div>
			
			<button 
				type="submit" 
				class="min-h-[44px] px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black shadow-sm transition-colors cursor-pointer"
			>
				Generate Token
			</button>
		</form>
	</div>

	<!-- Token List Section -->
	<div class="space-y-4">
		<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Active API Keys</h3>

		{#if tokens.length === 0}
			<div class="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
				<Key class="w-8 h-8 mx-auto text-zinc-400 mb-2" />
				<span class="text-sm font-medium text-zinc-900 dark:text-zinc-100 block">No active tokens</span>
				<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Generate a token above to get started.</p>
			</div>
		{:else}
			<div class="overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 shadow-sm divide-y divide-zinc-200 dark:divide-zinc-800">
				{#each tokens as token}
					<div class="p-4 flex items-center justify-between gap-4">
						<div class="space-y-1">
							<span class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">{token.name}</span>
							<div class="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
								<span>Created by: {token.userName}</span>
								<span>•</span>
								<span>Created: {new Date(token.createdAt).toLocaleDateString()}</span>
								{#if token.lastUsedAt}
									<span>•</span>
									<span>Last used: {new Date(token.lastUsedAt).toLocaleString()}</span>
								{/if}
							</div>
						</div>

						<div>
							<form 
								id="revoke-form-{token.id}" 
								method="POST" 
								action="?/revoke" 
								use:enhance={() => {
									return async ({ update }) => {
										await update({ invalidateAll: true });
										toastStore.success('API token revoked');
									};
								}}
							>
								<input type="hidden" name="tokenId" value={token.id} />
								<button 
									type="button" 
									onclick={() => confirmRevocation(token.id, token.name)}
									class="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-500 hover:text-red-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
