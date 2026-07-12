<script lang="ts">
	let { name = 'Unknown', photo = null, size = 'md' }: { name?: string; photo?: string | null; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' } = $props();

	// Sizes mapping
	const sizes = {
		xs: 'w-5 h-5 text-[9px]',
		sm: 'w-6 h-6 text-[10px]',
		md: 'w-8 h-8 text-[12px]',
		lg: 'w-10 h-10 text-sm',
		xl: 'w-12 h-12 text-base'
	};

	// Tailwind vibrant background colors for avatars
	const colors = [
		'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 
		'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 
		'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
		'bg-pink-500', 'bg-rose-500'
	];

	// Deterministic color based on name
	let bgColor = $derived((() => {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		return colors[Math.abs(hash) % colors.length];
	})());

	// Initials (up to 2 characters)
	let initials = $derived((() => {
		const parts = name.split(' ').filter(p => p.length > 0);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[1][0]).toUpperCase();
		}
		return name.substring(0, 2).toUpperCase();
	})());
</script>

{#if photo}
	<img src={photo} alt={name} class="{sizes[size]} rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-zinc-950 shrink-0" title={name} />
{:else}
	<div class="{sizes[size]} {bgColor} rounded-full flex items-center justify-center text-white font-bold shadow-sm shrink-0 ring-2 ring-white dark:ring-zinc-950" title={name}>
		{initials}
	</div>
{/if}
