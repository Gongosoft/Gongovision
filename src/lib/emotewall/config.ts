import { z } from 'zod';
import type { EmoteStyle, KappaStyle, ThirdParty, WallSettings } from '@/types/emotewall.d.ts';

export const EMOTE_STYLES = [
	'Still',
	'StraightLine',
	'Rise',
	'Bounce',
	'Speed',
	'Drop',
	'Crazy',
	'Confetti',
	'Throw',
	'Pop',
	'Cube',
	'Fountain'
] as const satisfies readonly EmoteStyle[];

export const KAPPAGEN_STYLES = [
	'StraightLine',
	'Rise',
	'Speed',
	'Crazy',
	'Burst',
	'Fireworks',
	'Spiral',
	'Pyramid',
	'SmallPyramid',
	'CodeLines',
	'Fountain',
	'Stampede',
	'Confetti',
	'Conga',
	'Coaster',
	'TheCube',
	'Text'
] as const satisfies readonly KappaStyle[];

export const DEFAULT_SETTINGS: WallSettings = {
	styles: [...EMOTE_STYLES],
	kappaStyles: [...KAPPAGEN_STYLES],
	duplicates: 0,
	holidayZWE: true,
	shadow: false,
	cube: { size: 8 / 10, center: true, rotations: 5, faces: false },
	kappa: {
		count: 150,
		congaContagious: false,
		congaTime: 5,
		congaAvoidMiddle: false,
		textMessages: ['GONGO'],
		textTime: 3
	},
	emote: {
		time: 5,
		ratioNormal: 1 / 12,
		ratioSmall: 1 / 24,
		fadeIn: true,
		zoomIn: true,
		fadeOut: true,
		zoomOut: true
	}
};

const defaults = DEFAULT_SETTINGS;

export const cfg = {
	display: {
		styles: [...defaults.styles],
		duplicates: defaults.duplicates,
		extended: {
			holidayZWE: defaults.holidayZWE,
			priority: ['ffz', 'bttv', '7tv'] as const satisfies readonly ThirdParty[]
		},
		shadow: defaults.shadow,
		kappa: {
			count: defaults.kappa.count,
			enabled: [...defaults.kappaStyles] as KappaStyle[],
			message: [...defaults.kappa.textMessages],
			textTime: defaults.kappa.textTime,
			conga: {
				contagious: defaults.kappa.congaContagious,
				time: defaults.kappa.congaTime,
				avoidMiddle: defaults.kappa.congaAvoidMiddle
			}
		}
	},
	cube: { ...defaults.cube },
	emote: {
		time: defaults.emote.time,
		ratio: { normal: defaults.emote.ratioNormal, small: defaults.emote.ratioSmall },
		in: { fade: defaults.emote.fadeIn, zoom: defaults.emote.zoomIn },
		out: { fade: defaults.emote.fadeOut, zoom: defaults.emote.zoomOut }
	}
};

export function applySettings(settings: WallSettings): void {
	cfg.display.styles = [...settings.styles];
	cfg.display.duplicates = settings.duplicates;
	cfg.display.extended.holidayZWE = settings.holidayZWE;
	cfg.display.shadow = settings.shadow;
	cfg.display.kappa.count = settings.kappa.count;
	cfg.display.kappa.enabled = [...settings.kappaStyles];
	cfg.display.kappa.message = [...settings.kappa.textMessages];
	cfg.display.kappa.textTime = settings.kappa.textTime;
	cfg.display.kappa.conga.contagious = settings.kappa.congaContagious;
	cfg.display.kappa.conga.time = settings.kappa.congaTime;
	cfg.display.kappa.conga.avoidMiddle = settings.kappa.congaAvoidMiddle;
	cfg.cube.size = settings.cube.size;
	cfg.cube.center = settings.cube.center;
	cfg.cube.rotations = settings.cube.rotations;
	cfg.cube.faces = settings.cube.faces;
	cfg.emote.time = settings.emote.time;
	cfg.emote.ratio.normal = settings.emote.ratioNormal;
	cfg.emote.ratio.small = settings.emote.ratioSmall;
	cfg.emote.in.fade = settings.emote.fadeIn;
	cfg.emote.in.zoom = settings.emote.zoomIn;
	cfg.emote.out.fade = settings.emote.fadeOut;
	cfg.emote.out.zoom = settings.emote.zoomOut;
}

const freshDefaults = (): WallSettings => structuredClone(defaults);

/** keeps a number inside a given range */
const clamped = (min: number, max: number, fallback: number): z.ZodType<number> =>
	z
		.number()
		.transform((value) => Math.min(max, Math.max(min, value)))
		.catch(fallback);

/** keeps the known entries in canonical order; an empty or non-array value restores the default */
const subset = <T extends string>(allowed: readonly T[], fallback: readonly T[]): z.ZodType<T[]> =>
	z
		.array(z.unknown())
		.transform((values) => {
			const picked = allowed.filter((entry) => values.includes(entry));
			return picked.length > 0 ? picked : [...fallback];
		})
		.catch(() => [...fallback]);

/** trimmed, non-empty entries; an empty result restores the default, since a Text kappagen needs one */
const list = (fallback: string[]): z.ZodType<string[]> =>
	z
		.array(z.unknown())
		.transform((values) => {
			const kept = values
				.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '')
				.map((entry) => entry.trim());
			return kept.length > 0 ? kept : [...fallback];
		})
		.catch(() => [...fallback]);

const wallSettings = z
	.object({
		styles: subset(EMOTE_STYLES, defaults.styles),
		kappaStyles: subset(KAPPAGEN_STYLES, defaults.kappaStyles),
		duplicates: clamped(0, 50, defaults.duplicates),
		holidayZWE: z.boolean().catch(defaults.holidayZWE),
		shadow: z.boolean().catch(defaults.shadow),
		cube: z
			.object({
				size: clamped(0.1, 1, defaults.cube.size),
				center: z.boolean().catch(defaults.cube.center),
				rotations: clamped(0, 20, defaults.cube.rotations),
				faces: z.boolean().catch(defaults.cube.faces)
			})
			.catch(() => ({ ...defaults.cube })),
		kappa: z
			.object({
				count: clamped(1, 2000, defaults.kappa.count),
				congaContagious: z.boolean().catch(defaults.kappa.congaContagious),
				congaTime: clamped(0, 60, defaults.kappa.congaTime),
				congaAvoidMiddle: z.boolean().catch(defaults.kappa.congaAvoidMiddle),
				textMessages: list(defaults.kappa.textMessages),
				textTime: clamped(1, 30, defaults.kappa.textTime)
			})
			.catch(() => ({ ...defaults.kappa, textMessages: [...defaults.kappa.textMessages] })),
		emote: z
			.object({
				time: clamped(1, 60, defaults.emote.time),
				ratioNormal: clamped(0.01, 0.5, defaults.emote.ratioNormal),
				ratioSmall: clamped(0.005, 0.5, defaults.emote.ratioSmall),
				fadeIn: z.boolean().catch(defaults.emote.fadeIn),
				zoomIn: z.boolean().catch(defaults.emote.zoomIn),
				fadeOut: z.boolean().catch(defaults.emote.fadeOut),
				zoomOut: z.boolean().catch(defaults.emote.zoomOut)
			})
			.catch(() => ({ ...defaults.emote }))
	})
	.catch(freshDefaults);

export function sanitizeSettings(value: unknown): WallSettings {
	return wallSettings.parse(value ?? {});
}

/** fractions of `cfg.emote.time`, unless noted */
export const timing = {
	display: {
		Still: { time: 1 },
		StraightLine: { time: 1 },
		Rise: {
			origin: { min: 0.8, max: 1.1 },
			dest: { min: 4 / 100, max: 6 / 100 },
			time: 1,
			wiggle: { delay: { min: 0, max: 3 / 25 }, min: 2 / 5, max: 1 }
		},
		Bounce: {
			origin: { min: 0, max: 0.2 },
			time: 1,
			/** pixels per 300th of display time */
			velocity: { h: { min: 3, max: 9 }, v: { min: 4, max: 7 }, loss: 0.3 },
			gravity: 1
		},
		Speed: { origin: { min: 0.3, max: 0.7 }, time: 1, delay: 0.1 },
		Drop: { time: 1 },
		Crazy: { time: 1, distance: 7000, squash: { width: 2, height: 0.7, time: 1 / 50 } },
		Confetti: { time: 1 },
		Throw: {
			time: 1,
			twist: 7 / 50,
			toss: 1 / 5,
			drop: 4 / 5,
			dest: { h: { min: 0.3, max: 0.7 }, v: { min: 0.3, max: 0.7 } }
		},
		Pop: {
			time: 1,
			peek: { up: 1 / 10, pause: 1 / 10, down: 1 / 10 },
			pause: 0,
			jump: { up: 1 / 5, pause: 0, down: 1 / 2 },
			top: { min: 1 / 10, max: 2 / 5 },
			bottom: { min: 4 / 5, max: 19 / 20 }
		},
		Cube: { time: 1 },
		Fountain: { time: 1 / 2 }
	},
	kappa: {
		StraightLine: { time: 1 },
		Rise: { time: 2 },
		Speed: { time: 2 },
		Crazy: { time: 2 },
		Burst: { time: 1.5, top: { min: 1 / 4, max: 3 / 4 }, left: { min: 1 / 4, max: 3 / 4 } },
		Fireworks: {
			time: 1,
			origin: { x: [1 / 2], y: [1] },
			dest: { x: [1 / 4, 1 / 2, 3 / 4], y: [1 / 3] },
			speed: { rocket: 2 / 5, burst: 1 / 50 },
			quantity: { small: 1 / 8, medium: 3 / 4, large: 1 / 8 },
			radius: { base: 2 / 3, small: 1 / 3, medium: 2 / 3, large: 1 },
			spread: 12,
			delays: { small: 2 / 25, large: 1 / 10 }
		},
		Spiral: { time: 1 / 4, bulk: 8, vectors: { min: 40, max: 60 } },
		Pyramid: { time: 1, show: { total: 0.8, min: 75 }, pause: 0.2, hide: 0.01 },
		SmallPyramid: { time: 1, show: { total: 0.8, min: 100 }, pause: 0.2, hide: 0.01 },
		CodeLines: { time: 1, fade: 1 / 6, overlap: 3, opacity: 1 / 5 },
		Fountain: { time: 1.5, top: { min: 3 / 20, max: 2 / 5 }, left: { min: 1 / 3, max: 2 / 3 } },
		Stampede: {
			time: 1,
			speed: 2 / 5,
			maxdensity: 6,
			top: { min: 0.5, max: 0.5 },
			height: 3,
			bunch: { 1: { min: 1, max: 5 }, 2: 8, 4: { min: 0, max: 3 } },
			pause: { 1: 4 / 5, 2: 2 / 5 },
			sleep: { min: 90, max: 100 }
		},
		Confetti: { time: 1 },
		Conga: { time: { show: 2, hide: 2 }, size: 5 / 3, height: 5 / 6, avoidMiddle: 6 },
		Coaster: {
			time: 1 / 4,
			bottom: { min: 7 / 10, max: 9 / 10 },
			top: { min: 2 / 10, max: 4 / 10 },
			at: { min: 1 / 5, max: 1 / 3 }
		},
		TheCube: { time: 1 },
		Text: { time: 1, show: { total: 0.8, min: 75 }, hide: 0.01 }
	}
} as const;

/** on-screen lifetime of a single emote, in ms */
export function emoteDuration(style: EmoteStyle): number {
	return Math.floor(cfg.emote.time * 1000 * timing.display[style].time);
}

/** spawning window of a kappagen, in ms (each spawned emote then stays its own duration) */
export function kappaDuration(style: KappaStyle): number {
	const { time } = timing.kappa[style];
	return Math.floor(cfg.emote.time * 1000 * (typeof time === 'number' ? time : time.show + time.hide));
}
