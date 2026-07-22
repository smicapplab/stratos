<script lang="ts">
	interface Props {
		src: string;
		mimeType: string;
		fileName: string;
	}

	let { src, mimeType, fileName }: Props = $props();

	let videoEl = $state<HTMLVideoElement | null>(null);
	let isPlaying = $state(false);
	let isLoading = $state(true);
	let hasError = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	let volume = $state(1);
	let isMuted = $state(false);
	let isFullscreen = $state(false);
	let showControls = $state(true);
	let controlsTimer = $state<ReturnType<typeof setTimeout> | null>(null);

	const supportsPiP = $derived(typeof document !== 'undefined' && 'pictureInPictureEnabled' in document);

	function formatTime(seconds: number): string {
		if (!isFinite(seconds)) return '0:00';
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function togglePlay() {
		if (!videoEl) return;
		if (isPlaying) {
			videoEl.pause();
		} else {
			videoEl.play();
		}
	}

	function handleSeek(e: Event) {
		if (!videoEl) return;
		const input = e.target as HTMLInputElement;
		videoEl.currentTime = parseFloat(input.value);
	}

	function handleVolumeChange(e: Event) {
		if (!videoEl) return;
		const input = e.target as HTMLInputElement;
		volume = parseFloat(input.value);
		videoEl.volume = volume;
		isMuted = volume === 0;
	}

	function toggleMute() {
		if (!videoEl) return;
		isMuted = !isMuted;
		videoEl.muted = isMuted;
	}

	function toggleFullscreen() {
		const container = videoEl?.closest('.video-container') as HTMLElement | null;
		if (!container) return;
		if (!document.fullscreenElement) {
			container.requestFullscreen();
		} else {
			document.exitFullscreen();
		}
	}

	async function togglePiP() {
		if (!videoEl) return;
		try {
			if (document.pictureInPictureElement) {
				await document.exitPictureInPicture();
			} else {
				await videoEl.requestPictureInPicture();
			}
		} catch (err) {
			console.warn('PiP not supported in this context:', err);
		}
	}

	function resetControlsTimer() {
		showControls = true;
		if (controlsTimer) clearTimeout(controlsTimer);
		if (isPlaying) {
			controlsTimer = setTimeout(() => { showControls = false; }, 3000);
		}
	}
</script>

<div
	class="video-container group relative w-full max-w-3xl mx-auto bg-black rounded-xl overflow-hidden"
	role="region"
	aria-label={`Video: ${fileName}`}
	onmousemove={resetControlsTimer}
	onmouseenter={() => { showControls = true; }}
	onmouseleave={() => { if (isPlaying) showControls = false; }}
>
	<!-- Video element -->
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		bind:this={videoEl}
		{src}
		preload="metadata"
		class="w-full aspect-video"
		onclick={togglePlay}
		onplay={() => { isPlaying = true; isLoading = false; resetControlsTimer(); }}
		onpause={() => { isPlaying = false; showControls = true; }}
		ontimeupdate={() => { currentTime = videoEl?.currentTime ?? 0; }}
		onloadedmetadata={() => { duration = videoEl?.duration ?? 0; isLoading = false; }}
		onwaiting={() => { isLoading = true; }}
		oncanplay={() => { isLoading = false; }}
		onfullscreenchange={() => { isFullscreen = !!document.fullscreenElement; }}
		onerror={() => { hasError = true; isLoading = false; }}
	>
		<source {src} type={mimeType} />
	</video>

	<!-- Loading spinner -->
	{#if isLoading && !hasError}
		<div class="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
			<div class="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
		</div>
	{/if}

	<!-- Error state -->
	{#if hasError}
		<div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900 text-zinc-300 p-6">
			<svg class="w-12 h-12 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
			</svg>
			<p class="text-sm font-medium">Unable to play this video</p>
			<p class="text-xs text-zinc-500">Your browser may not support this format.</p>
			<a
				href={src}
				download={fileName}
				class="mt-2 px-4 py-2 min-h-[44px] flex items-center bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm transition-colors"
			>
				Download file
			</a>
		</div>
	{/if}

	<!-- Custom controls overlay -->
	{#if !hasError}
		<div
			class="absolute bottom-0 inset-x-0 transition-opacity duration-200 {showControls ? 'opacity-100' : 'opacity-0'}"
			style="background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%); padding: 12px 16px 16px;"
		>
			<!-- Seek slider -->
			<input
				id="video-seek-slider"
				type="range"
				min="0"
				max={duration || 100}
				step="0.1"
				value={currentTime}
				oninput={handleSeek}
				class="w-full h-1.5 mb-3 appearance-none bg-white/20 rounded-full cursor-pointer accent-white min-h-[20px]"
				aria-label="Video seek position"
			/>

			<!-- Controls row -->
			<div class="flex items-center gap-3">
				<!-- Play/Pause -->
				<button
					type="button"
					onclick={togglePlay}
					class="min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:text-white/80 transition-colors"
					aria-label={isPlaying ? 'Pause' : 'Play'}
				>
					{#if isPlaying}
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
							<rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
						</svg>
					{:else}
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5.14v14l11-7-11-7z" />
						</svg>
					{/if}
				</button>

				<!-- Time display -->
				<span class="text-white text-xs tabular-nums select-none">
					{formatTime(currentTime)} / {formatTime(duration)}
				</span>

				<div class="flex-1"></div>

				<!-- Volume -->
				<button
					type="button"
					onclick={toggleMute}
					class="min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:text-white/80 transition-colors"
					aria-label={isMuted ? 'Unmute' : 'Mute'}
				>
					{#if isMuted || volume === 0}
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
							<path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
						</svg>
					{:else}
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
							<path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
						</svg>
					{/if}
				</button>
				<input
					type="range"
					min="0"
					max="1"
					step="0.05"
					value={volume}
					oninput={handleVolumeChange}
					class="w-16 h-1 appearance-none bg-white/20 rounded-full cursor-pointer accent-white hidden sm:block min-h-[20px]"
					aria-label="Volume"
				/>

				<!-- PiP -->
				{#if supportsPiP}
					<button
						type="button"
						onclick={togglePiP}
						class="min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:text-white/80 transition-colors"
						aria-label="Picture in picture"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
							<rect x="2" y="3" width="20" height="14" rx="2" /><rect x="12" y="10" width="8" height="6" rx="1" fill="currentColor" />
						</svg>
					</button>
				{/if}

				<!-- Fullscreen -->
				<button
					type="button"
					onclick={toggleFullscreen}
					class="min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:text-white/80 transition-colors"
					aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
				>
					{#if isFullscreen}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
							<path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" stroke-linecap="round" />
						</svg>
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
							<path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" stroke-linecap="round" />
						</svg>
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>
