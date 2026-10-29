import { cfg } from '@/lib/emotewall/config.ts';
import { planKappa } from '@/lib/emotewall/kappa.ts';
import { createRnd } from '@/lib/emotewall/random.ts';
import { emoteHeight, rememberAspect, styleFor } from '@/lib/emotewall/styles.ts';
import type { AnimSpec, SpawnSpec, WallEmote, WallEvent } from '@/types/emotewall.d.ts';

const MAX_ELEMENTS = 420;
const FACES = ['front', 'back', 'right', 'left', 'top', 'bottom'] as const;

interface Live {
	el: HTMLElement;
	timer: ReturnType<typeof setTimeout>;
}

/** resolves an event into concrete spawns */
function planEvent(event: WallEvent): SpawnSpec[] {
	const { innerWidth: sW, innerHeight: sH } = window;
	const rnd = createRnd(event.seed);
	if (event.kind === 'emote') {
		return [
			styleFor(event.style)({
				rnd,
				sW,
				sH,
				eH: emoteHeight(sW, sH, cfg.emote.ratio.normal),
				emote: event.emote,
				torus: true
			})
		];
	}
	return planKappa(event.style, {
		rnd,
		sW,
		sH,
		emotes: event.emotes,
		count: event.count,
		text: event.text ?? ''
	});
}

/**
 * WAAPI rejects decreasing offsets, and sub-pixel timings can produce them
 * Keyframes without an explicit offset must stay offset-less so the browser distributes them evenly
 */
function monotonic(keyframes: Keyframe[]): Keyframe[] {
	if (!keyframes.some((keyframe) => typeof keyframe.offset === 'number')) {
		return keyframes;
	}
	let last = 0;
	return keyframes.map((keyframe) => {
		if (typeof keyframe.offset !== 'number') {
			return keyframe;
		}
		last = Math.max(last, Math.min(1, keyframe.offset));
		return { ...keyframe, offset: last };
	});
}

/** runs a spec's animations on `target`, starting at `at` ms so late joiners see the emote mid-flight */
function play(target: Element, anims: AnimSpec[], at: number): void {
	for (const { keyframes, options } of anims) {
		target.animate(monotonic(keyframes), options).currentTime = Math.max(0, at);
	}
}

function image(url: string, classes: string[]): HTMLImageElement {
	const img = document.createElement('img');
	img.alt = '';
	img.decoding = 'async';
	img.referrerPolicy = 'no-referrer';
	img.classList.add(...classes);
	img.addEventListener('load', () => rememberAspect(url, img.naturalWidth, img.naturalHeight), { once: true });
	img.src = url;
	return img;
}

/** base emote plus its zero-width overlays, stacked in one box */
function parts(emote: WallEmote, extra: string[] = []): HTMLImageElement[] {
	return [
		image(emote.url, [...(emote.baseCls ?? []), ...extra]),
		...emote.zwe.map((url) => image(url, ['zwe', ...extra]))
	];
}

export class Stage {
	private readonly root: HTMLElement;
	private readonly live = new Set<Live>();
	private readonly pending = new Set<ReturnType<typeof setTimeout>>();

	public constructor(root: HTMLElement) {
		this.root = root;
	}

	/** `offset` = server clock - local clock */
	public play(event: WallEvent, offset: number): void {
		const localStart = event.startAt - offset;
		for (const spec of planEvent(event)) {
			this.at(localStart + (spec.at ?? 0), () => this.spawn(spec, localStart));
		}
	}

	public destroy(): void {
		for (const timer of this.pending) {
			clearTimeout(timer);
		}
		this.pending.clear();
		for (const live of this.live) {
			this.remove(live);
		}
	}

	private at(localTime: number, fn: () => void): void {
		const wait = localTime - Date.now();
		if (wait <= 0) {
			fn();
			return;
		}
		const timer = setTimeout(() => {
			this.pending.delete(timer);
			fn();
		}, wait);
		this.pending.add(timer);
	}

	private spawn(spec: SpawnSpec, localStart: number): void {
		const elapsed = Date.now() - (localStart + (spec.at ?? 0));
		if (elapsed >= spec.life) {
			return;
		}
		// the element itself, then one copy per screen-sized offset where the path re-enters
		for (const [dx, dy] of [[0, 0] as const, ...(spec.copies ?? [])]) {
			if (this.live.size >= MAX_ELEMENTS) {
				return;
			}
			this.mount(spec, elapsed, dx, dy);
		}
	}

	private mount(spec: SpawnSpec, elapsed: number, dx: number, dy: number): void {
		const el = document.createElement('div');
		el.className = 'wall-emote';
		for (const [property, value] of Object.entries(spec.style)) {
			el.style.setProperty(property, value);
		}
		el.style.setProperty('--emote-height', `${spec.eH}px`);
		el.style.setProperty('--emote-width', `${spec.eW ?? spec.eH}px`);
		if (spec.box) {
			el.style.height = `${spec.box}px`;
			el.style.width = `${spec.box}px`;
		}

		let inner: HTMLElement | null = null;
		if (spec.cube) {
			el.classList.add('scene');
			const cube = document.createElement('div');
			cube.className = 'cube';
			for (const [index, face] of spec.cube.entries()) {
				const faceName = FACES[index]!;
				const part = parts(face);
				if (part.length === 1) {
					part[0]!.setAttribute('data-face', faceName);
					cube.appendChild(part[0]!);
					continue;
				}
				const faceEl = document.createElement('div');
				faceEl.setAttribute('data-face', faceName);
				for (const imageEl of part) {
					faceEl.appendChild(imageEl);
				}
				cube.appendChild(faceEl);
			}
			el.appendChild(cube);
			inner = cube;
		} else {
			const extra = spec.dancer ? ['dancer'] : [];
			for (const part of parts(spec.emote, extra)) {
				el.appendChild(part);
			}
		}
		// a full-bleed holder offset by one screen keeps the animated element's coordinates intact.
		const holder = document.createElement('div');
		holder.className = 'wall-copy';
		holder.style.transform = `translate(${dx}px, ${dy}px)`;
		holder.appendChild(el);
		this.root.appendChild(holder);

		play(el, spec.anims, elapsed);
		if (inner) {
			play(inner, spec.cubeAnims ?? [], elapsed);
		}

		const live: Live = {
			el: holder,
			timer: setTimeout(() => this.remove(live), spec.life - elapsed)
		};
		this.live.add(live);
	}

	private remove(live: Live): void {
		clearTimeout(live.timer);
		live.el.remove();
		this.live.delete(live);
	}
}
