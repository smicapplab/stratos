<script lang="ts">
	import { Lock, Info, X } from 'lucide-svelte';

	let { label = 'Files are secured' } = $props<{ label?: string }>();

	let showPopover = $state(false);

	function togglePopover(e: Event) {
		e.stopPropagation();
		showPopover = !showPopover;
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			showPopover = false;
		}
	}

	function handleWindowClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (showPopover && !target.closest('.security-popover-container')) {
			showPopover = false;
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} onclick={handleWindowClick} />

<div class="relative inline-flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 security-popover-container select-none">
	<Lock class="w-3 h-3 shrink-0" />
	<span>{label}</span>
	<button 
		type="button" 
		onclick={togglePopover}
		aria-label="Learn about file security"
		class="p-0.5 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
	>
		<Info class="w-3.5 h-3.5" />
	</button>

	{#if showPopover}
		<div class="absolute bottom-6 left-0 z-50 w-64 bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-xl text-zinc-300 flex flex-col gap-3 text-left">
			<div class="flex items-center justify-between border-b border-zinc-800 pb-1.5">
				<span class="font-bold text-xs text-white">File Security Features</span>
				<button type="button" onclick={() => showPopover = false} class="text-zinc-500 hover:text-white transition-colors">
					<X class="w-3.5 h-3.5" />
				</button>
			</div>
			
			<div class="space-y-3">
				<div>
					<div class="font-bold text-white flex items-center gap-1.5 text-xs">
						<span>🔒</span> Private by default
					</div>
					<div class="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
						Files are never exposed publicly. Only team members with access to this ticket can view or download them.
					</div>
				</div>

				<div>
					<div class="font-bold text-white flex items-center gap-1.5 text-xs">
						<span>⏱</span> Time-limited preview links
					</div>
					<div class="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
						Secure preview links expire automatically after 2 hours. Reopening the ticket generates a fresh link instantly.
					</div>
				</div>

				<div>
					<div class="font-bold text-white flex items-center gap-1.5 text-xs">
						<span>🛡</span> Identity-verified access
					</div>
					<div class="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
						Every file request verifies your identity and team. Shared links cannot be used by other accounts.
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
