<script lang="ts">
	import md5 from 'md5';
	
	let { name = 'Unknown', email = null, photo = null, size = 'md' }: { name?: string; email?: string | null; photo?: string | null; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' } = $props();

	// Sizes mapping
	const sizes = {
		xs: 'w-5 h-5 text-[9px]',
		sm: 'w-6 h-6 text-[10px]',
		md: 'w-8 h-8 text-[12px]',
		lg: 'w-10 h-10 text-sm',
		xl: 'w-12 h-12 text-base'
	};

	// 16 vibrant linear gradient themes
	const gradients = [
		'bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-500',
		'bg-gradient-to-tr from-emerald-500 to-teal-700',
		'bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-600',
		'bg-gradient-to-tr from-cyan-500 to-blue-600',
		'bg-gradient-to-tr from-amber-400 to-orange-500',
		'bg-gradient-to-tr from-fuchsia-500 to-pink-600',
		'bg-gradient-to-tr from-green-400 to-emerald-600',
		'bg-gradient-to-tr from-red-500 to-rose-600',
		'bg-gradient-to-tr from-blue-500 via-cyan-500 to-teal-400',
		'bg-gradient-to-tr from-indigo-500 to-purple-600',
		'bg-gradient-to-tr from-pink-500 to-rose-500',
		'bg-gradient-to-tr from-orange-400 to-red-500',
		'bg-gradient-to-tr from-teal-400 to-emerald-500',
		'bg-gradient-to-tr from-purple-500 to-fuchsia-600',
		'bg-gradient-to-tr from-yellow-400 to-amber-500',
		'bg-gradient-to-tr from-blue-600 to-indigo-700',
	];

	// Initials (up to 2 characters)
	let initials = $derived((() => {
		const parts = name.trim().split(/\s+/).filter(Boolean);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[1][0]).toUpperCase();
		}
		const cleanName = parts[0] || 'UK';
		return cleanName.length >= 2
			? cleanName.substring(0, 2).toUpperCase()
			: cleanName.toUpperCase().padEnd(2, 'X');
	})());

	let gravatarUrl = $derived((() => {
		if (!email) return null;
		const hash = md5(email.trim().toLowerCase());
		return `https://www.gravatar.com/avatar/${hash}?d=404&s=200`;
	})());

	let imgFailed = $state(false);
	let activePhoto = $derived(photo || (imgFailed ? null : gravatarUrl));

	// Deterministic gradient based on seed
	let gradientClass = $derived((() => {
		const seed = `${initials}:${name}`;
		let hash = 0;
		for (let i = 0; i < seed.length; i++) {
			hash = seed.charCodeAt(i) + ((hash << 5) - hash);
		}
		return gradients[Math.abs(hash) % gradients.length];
	})());


</script>

{#if activePhoto}
	<img 
		src={activePhoto} 
		alt={name} 
		class="{sizes[size]} rounded-full object-cover shadow-xs ring-1 ring-black/10 dark:ring-white/20 shrink-0" 
		title={name} 
		onerror={() => { imgFailed = true; }}
	/>
{:else}
	<div class="{sizes[size]} {gradientClass} rounded-full flex items-center justify-center text-white font-semibold shadow-xs shrink-0 ring-1 ring-white/20 dark:ring-zinc-900/40 select-none" title={name}>
		{initials}
	</div>
{/if}
