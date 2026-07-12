<script lang="ts">
	import { Search, ChevronDown, Check } from 'lucide-svelte';

	let { 
		options = [], 
		value = $bindable(), 
		placeholder = 'Select...',
		searchable = false,
		searchPlaceholder = 'Search...',
		selectedRender = undefined as import('svelte').Snippet<[any]> | undefined,
		optionRender = undefined as import('svelte').Snippet<[any]> | undefined,
		onValueChange = undefined as ((val: any) => void) | undefined
	} = $props();

	let isOpen = $state(false);
	let searchQuery = $state('');
	
	let filteredOptions = $derived.by(() => {
		if (!searchable || !searchQuery.trim()) return options;
		const query = searchQuery.toLowerCase();
		return options.filter((o: any) => o.label.toLowerCase().includes(query));
	});

	let selectedOption = $derived(options.find((o: any) => o.value === value) || null);

	function handleSelect(val: any) {
		value = val;
		isOpen = false;
		searchQuery = '';
		if (onValueChange) onValueChange(val);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') isOpen = false;
	}

	function handleClickOutside(node: HTMLElement) {
		const handleClick = (e: MouseEvent) => {
			if (!node.contains(e.target as Node)) {
				// Also check if they clicked inside the fixed popover
				const popover = document.getElementById('combobox-popover');
				if (popover && popover.contains(e.target as Node)) return;
				isOpen = false;
			}
		};
		document.addEventListener('mousedown', handleClick);
		return {
			destroy: () => document.removeEventListener('mousedown', handleClick)
		};
	}

	let triggerNode = $state<HTMLElement | null>(null);
	let popoverStyles = $state('');

	function updatePosition() {
		if (triggerNode) {
			const rect = triggerNode.getBoundingClientRect();
			// Calculate space below and above
			const spaceBelow = window.innerHeight - rect.bottom;
			const spaceAbove = rect.top;
			
			// If not enough space below but space above, render above
			if (spaceBelow < 250 && spaceAbove > 250) {
				popoverStyles = `bottom: ${window.innerHeight - rect.top + 4}px; left: ${rect.left}px; width: ${rect.width > 200 ? rect.width : 240}px;`;
			} else {
				popoverStyles = `top: ${rect.bottom + 4}px; left: ${rect.left}px; width: ${rect.width > 200 ? rect.width : 240}px;`;
			}
		}
	}

	$effect(() => {
		if (isOpen) {
			updatePosition();
			window.addEventListener('scroll', updatePosition, true);
			window.addEventListener('resize', updatePosition);
			return () => {
				window.removeEventListener('scroll', updatePosition, true);
				window.removeEventListener('resize', updatePosition);
			};
		}
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="w-full" use:handleClickOutside onkeydown={handleKeydown}>
	<!-- Trigger -->
	<button 
		bind:this={triggerNode}
		type="button" 
		class="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-black/20 hover:bg-zinc-100 dark:hover:bg-white/5 border border-zinc-200 dark:border-zinc-800/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all {isOpen ? 'bg-zinc-100 dark:bg-white/5 border-zinc-300 dark:border-zinc-700' : ''}"
		onclick={() => isOpen = !isOpen}
	>
		<div class="flex-1 overflow-hidden text-left truncate flex items-center gap-2">
			{#if selectedOption}
				{#if selectedRender}
					{@render selectedRender(selectedOption)}
				{:else}
					<span class="text-zinc-900 dark:text-zinc-100 font-medium">{selectedOption.label}</span>
				{/if}
			{:else}
				<span class="text-zinc-500 font-medium">{placeholder}</span>
			{/if}
		</div>
		<ChevronDown class="w-4 h-4 text-zinc-400 shrink-0" />
	</button>
</div>

<!-- Popover -->
{#if isOpen}
	<div id="combobox-popover" class="fixed z-[99999] bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-white/10 rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-100" style={popoverStyles}>
		
		{#if searchable}
			<div class="p-2 border-b border-zinc-100 dark:border-white/5 flex items-center gap-2 bg-zinc-50/50 dark:bg-black/20 shrink-0 rounded-t-xl">
				<Search class="w-4 h-4 text-zinc-400" />
				<!-- svelte-ignore a11y_autofocus -->
				<input 
					type="text" 
					bind:value={searchQuery} 
					placeholder={searchPlaceholder}
					autofocus
					class="w-full bg-transparent border-none text-sm focus:ring-0 p-0 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500"
				/>
			</div>
		{/if}

		<div class="max-h-60 overflow-y-auto custom-scrollbar p-1.5 flex flex-col gap-0.5">
			{#each filteredOptions as option}
				<button 
					type="button" 
					class="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors text-left group {value === option.value ? 'bg-zinc-50 dark:bg-white/5' : ''}"
					onclick={() => handleSelect(option.value)}
				>
					<div class="flex-1 flex items-center gap-2 overflow-hidden">
						{#if optionRender}
							{@render optionRender(option)}
						{:else}
							<span class="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{option.label}</span>
						{/if}
					</div>
					
					{#if value === option.value}
						<Check class="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
					{/if}
				</button>
			{:else}
				<div class="px-3 py-4 text-center text-sm text-zinc-500">
					No results found.
				</div>
			{/each}
		</div>
	</div>
{/if}
