<script lang="ts">
	import { File, Download, X } from 'lucide-svelte';
	import VideoPlayer from '$lib/components/ui/VideoPlayer.svelte';

	let { previewAttachment = $bindable(null), publicOrigin = '' }: { previewAttachment: any; publicOrigin?: string } = $props();

	let previewTextContent = $state<string | null>(null);
	let loadingText = $state(false);

	function isVideoAttachment(file: { mimeType?: string | null; fileName?: string | null }): boolean {
		if (!file) return false;
		const type = (file.mimeType || '').toLowerCase();
		const name = (file.fileName || '').toLowerCase();
		if (type.startsWith('video/')) return true;
		return ['.mp4', '.webm', '.ogg', '.mov', '.mkv'].some(ext => name.endsWith(ext));
	}

	function isImageFile(file: any) {
		const type = (file.mimeType || '').toLowerCase();
		const name = (file.fileName || '').toLowerCase();
		return type.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].some(ext => name.endsWith(ext));
	}

	function isPdfFile(file: any) {
		const type = (file.mimeType || '').toLowerCase();
		return type === 'application/pdf' || (file.fileName || '').toLowerCase().endsWith('.pdf');
	}

	function isTextFile(file: any) {
		const type = (file.mimeType || '').toLowerCase();
		const name = (file.fileName || '').toLowerCase();
		if (type.startsWith('text/') || type === 'application/json' || type === 'application/javascript' || type === 'application/x-typescript') return true;
		const txtExtensions = ['.env', '.json', '.md', '.js', '.ts', '.html', '.css', '.yaml', '.yml', '.sh', '.py', '.ini', '.conf', '.log', '.csv', '.txt'];
		return txtExtensions.some(ext => name.endsWith(ext));
	}

	function isOfficeDoc(file: any) {
		const name = (file.fileName || '').toLowerCase();
		return ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].some(ext => name.endsWith(ext));
	}

	function isLocalhost() {
		if (typeof window === 'undefined') return true;
		const host = window.location.hostname;
		return host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.16.');
	}

	let absoluteOfficeUrl = $derived.by(() => {
		if (!previewAttachment) return '';
		const absTokenUrl = `${publicOrigin || ''}${previewAttachment.tokenUrl}`;
		return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(absTokenUrl)}`;
	});

	$effect(() => {
		if (previewAttachment && isTextFile(previewAttachment)) {
			loadingText = true;
			previewTextContent = null;
			fetch(previewAttachment.tokenUrl)
				.then(async (res) => {
					if (res.ok) {
						const text = await res.text();
						if (text.length > 1 * 1024 * 1024) {
							previewTextContent = 'This file exceeds the 1MB inline preview limit. Please download the file to view its full contents.';
						} else {
							previewTextContent = text;
						}
					}
				})
				.catch(() => {
					previewTextContent = 'Failed to load text preview.';
				})
				.finally(() => {
					loadingText = false;
				});
		}
	});
</script>

{#if previewAttachment}
	<!-- Modal backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6"
		onclick={(e) => { if (e.target === e.currentTarget) previewAttachment = null; }}
		onkeydown={(e) => { if (e.key === 'Escape') previewAttachment = null; }}
	>
		<!-- Modal box -->
		<div class="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
			<!-- Modal Header -->
			<div class="px-6 py-4 border-b border-zinc-800 flex justify-between items-center text-white bg-zinc-950/40">
				<div class="flex items-center gap-3 min-w-0">
					<File class="w-5 h-5 text-brand-primary shrink-0" />
					<h3 class="font-bold text-sm truncate">{previewAttachment.fileName}</h3>
				</div>
				<div class="flex items-center gap-3">
					<a 
						href={previewAttachment.tokenUrl} 
						download={previewAttachment.fileName}
						class="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition-colors min-h-[36px]"
					>
						<Download class="w-3.5 h-3.5" />
						Download
					</a>
					<button 
						type="button" 
						onclick={() => previewAttachment = null} 
						class="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
					>
						<X class="w-5 h-5" />
					</button>
				</div>
			</div>

			<!-- Modal Body (Preview Area) -->
			<div class="p-6 flex-1 max-h-[75vh] overflow-y-auto flex items-center justify-center bg-zinc-950/20">
				{#if loadingText}
					<div class="flex flex-col items-center gap-3 py-12 text-zinc-400">
						<div class="w-8 h-8 border-3 border-brand-primary/20 border-t-blue-500 rounded-full animate-spin"></div>
						<span class="text-xs">Loading text preview...</span>
					</div>
				{:else if isVideoAttachment(previewAttachment)}
					<VideoPlayer
						src={previewAttachment.tokenUrl}
						mimeType={previewAttachment.mimeType || 'video/mp4'}
						fileName={previewAttachment.fileName}
					/>
				{:else if isImageFile(previewAttachment)}
					<img src={previewAttachment.tokenUrl} alt={previewAttachment.fileName} class="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md" />
				{:else if isPdfFile(previewAttachment)}
					<iframe sandbox="allow-scripts" src={previewAttachment.tokenUrl} title={previewAttachment.fileName} class="w-full h-[65vh] border-0 rounded-lg bg-white"></iframe>
				{:else if isOfficeDoc(previewAttachment)}
					{#if isLocalhost()}
						<div class="text-center py-12 text-zinc-400 space-y-4 max-w-md mx-auto">
							<File class="w-12 h-12 mx-auto text-brand-primary" />
							<p class="text-sm font-semibold text-zinc-200">Office Preview Disabled on Localhost</p>
							<p class="text-xs text-zinc-400">Microsoft Office Online requires a publicly accessible URL to download and render documents. It cannot connect to your local development server.</p>
							<a 
								href={previewAttachment.tokenUrl} 
								download={previewAttachment.fileName}
								class="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-primary hover:opacity-90 text-white text-xs font-bold rounded-xl transition-colors min-h-[38px] shadow-xs"
							>
								<Download class="w-4 h-4" />
								Download to View Locally
							</a>
						</div>
					{:else}
						<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups" src={absoluteOfficeUrl} title={previewAttachment.fileName} class="w-full h-[65vh] border-0 rounded-lg bg-white"></iframe>
					{/if}
				{:else if previewTextContent !== null}
					<pre class="w-full bg-zinc-950 text-zinc-100 p-5 rounded-xl font-mono text-xs overflow-auto max-h-[65vh] whitespace-pre-wrap select-text border border-zinc-800">{previewTextContent}</pre>
				{:else}
					<div class="text-center py-12 text-zinc-400 space-y-3">
						<File class="w-12 h-12 mx-auto text-zinc-600" />
						<p class="text-sm">Preview not supported for this file type.</p>
						<p class="text-xs text-zinc-500">Please download the file to view it locally.</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
