<script lang="ts">
	import '../app.css';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';

	let { children } = $props();
</script>

<Toast />
<ConfirmModal />

<div class="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
	{@render children()}
</div>
