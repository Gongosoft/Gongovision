import { cfg, kappaDuration } from '@/lib/emotewall/config.ts';
import type { WallEmote, WallEvent, WallKappaEvent } from '@/types/emotewall.d.ts';

/** lead time so every viewer receives an event before it starts */
const START_LEAD_MS = 420;

function pick<T>(list: readonly T[]): T {
	return list[Math.floor(Math.random() * list.length)]!;
}

function randomSeed(): number {
	return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

/** one random seed and start time per event */
function base(now: number): { seed: number; startAt: number } {
	return { seed: randomSeed(), startAt: now + START_LEAD_MS };
}

/** picks the animation for each chat event; layout randomness belongs to the client */
export class WallScheduler {
	private congaEnd = 0;
	private readonly emit: (event: WallEvent) => void;

	public constructor(emit: (event: WallEvent) => void) {
		this.emit = emit;
	}

	public addEmotes(emotes: WallEmote[], now: number): void {
		if (cfg.display.styles.length === 0) {
			return;
		}
		for (const emote of emotes) {
			this.emit({ ...base(now), kind: 'emote', style: pick(cfg.display.styles), emote });
		}
	}

	public addKappa(emotes: WallEmote[], now: number): void {
		if (emotes.length === 0 || cfg.display.kappa.enabled.length === 0) {
			return;
		}
		const contagious = cfg.display.kappa.conga.contagious && this.congaEnd > now;
		const style = contagious ? 'Conga' : pick(cfg.display.kappa.enabled);
		const event: WallKappaEvent = {
			...base(now),
			kind: 'kappa',
			style,
			count: cfg.display.kappa.count,
			emotes
		};
		if (style === 'Text') {
			event.text = pick(cfg.display.kappa.message);
		}
		if (style === 'Conga') {
			this.congaEnd = event.startAt + kappaDuration(style) + Math.floor(cfg.display.kappa.conga.time * 1000);
		}
		this.emit(event);
	}
}
