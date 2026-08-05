import { writable } from 'svelte/store';

export type CelebrationType = 'rocket' | 'starburst' | 'confetti' | 'supernova' | 'random';

export interface CelebrationSignal {
	type: CelebrationType;
	timestamp: number;
}

export const celebrationSignal = writable<CelebrationSignal | null>(null);

let lastTriggerTime = 0;

export function triggerCelebration(type: CelebrationType = 'random') {
	const now = Date.now();
	// Cooldown of 1.2s so rapid successive completions don't stack effects
	if (now - lastTriggerTime < 1200) return;
	lastTriggerTime = now;

	celebrationSignal.set({ type, timestamp: now });
}
