import { PALETTE_OPTIONS } from '@/lib/gongoizer/palettes.ts';
import { EFFECT_ODDS, GROUPS, NO_RANDOM, OFF_IS_ZERO } from '@/lib/gongoizer/schema.ts';
import type {
	GongoizerParams,
	ListParamDef,
	NumberParamDef,
	ParamDef,
	ParamGroup,
	RandomizeMode
} from '@/types/gongoizer.d.ts';

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

const snap = (value: number, step: number, min: number, max: number): number => {
	const snapped = Math.round(value / step) * step;
	const decimals = String(step).split('.')[1]?.length ?? 0;
	return Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals));
};

function rollNumber(def: NumberParamDef, params: GongoizerParams, mode: RandomizeMode): number | undefined {
	const lo = def.randomRange?.[0] ?? def.min;
	const hi = def.randomRange?.[1] ?? def.max;
	const current = params[def.key];

	if (mode === 'random') {
		if (def.key === 'flowMode') {
			return pick([0, 0, 0, 1, 2]);
		}
		if (OFF_IS_ZERO.has(def.key) && Math.random() > (EFFECT_ODDS[def.key] ?? 0.3)) {
			return 0;
		}
		if (def.key === 'flowAngle') {
			return pick([90, 90, 270, 180, 0, 45, 135, 225, 315, rnd(0, 360)]);
		}
		return snap(rnd(lo, hi), def.step, def.min, def.max);
	}

	if (def.step >= 1) {
		if (Math.random() < 0.15) {
			return snap(rnd(lo, hi), def.step, def.min, def.max);
		}
		return undefined;
	}
	if (OFF_IS_ZERO.has(def.key) && current === 0) {
		if (Math.random() < 0.08) {
			return snap(rnd(lo, lo + (hi - lo) * 0.5), def.step, def.min, def.max);
		}
		return undefined;
	}
	return snap(current + (Math.random() * 2 - 1) * (hi - lo) * 0.12, def.step, def.min, def.max);
}

function rollList(def: ListParamDef, mode: RandomizeMode): number | undefined {
	const hi = def.options.length - 1;
	if (mode === 'random') {
		return OFF_IS_ZERO.has(def.key) ? 1 + Math.floor(Math.random() * hi) : Math.floor(Math.random() * (hi + 1));
	}
	if (Math.random() < 0.15) {
		return Math.floor(Math.random() * (hi + 1));
	}
	return undefined;
}

const isList = (def: ParamDef): def is ListParamDef =>
	'options' in def && def.key !== 'palette' && def.key !== 'palette2';

/** New values for a group's rows. mode 'random' = fresh values in sensible ranges, 'variant' = nudge. */
export function shuffle(
	rows: readonly ParamDef[],
	params: GongoizerParams,
	mode: RandomizeMode
): Partial<GongoizerParams> {
	const out: Partial<GongoizerParams> = {};
	for (const def of rows) {
		if (def.key === 'palette' || def.key === 'palette2' || def.key === 'reactive' || def.key === 'cutoutShow') {
			continue;
		}
		const value = isList(def) ? rollList(def, mode) : rollNumber(def as NumberParamDef, params, mode);
		if (value !== undefined) {
			out[def.key] = value;
		}
	}
	return out;
}

const NO_DARK = new Set(['candy', 'ice', 'sunset']);

function tame(params: GongoizerParams, changed?: Partial<GongoizerParams>): Partial<GongoizerParams> {
	const t: Record<string, number> = {};
	if (params.flowMode > 0 && params.stripeHue) {
		t.stripeHue = 0;
	}
	if (params.negative > 0 && params.glow > 0) {
		t.glow = 0;
	}
	if (NO_DARK.has(params.palette) && params.glow > 0.4) {
		t.glow = 0.4;
	}
	const soft =
		Number(params.glow > 0) + Number(params.bloom > 0) + Number(params.blur > 0) + Number(params.trails > 0);
	if (soft > 2) {
		t[pick(['blur', 'trails'] as const)] = 0;
	}
	if (params.blur > 0.45 && params.mosaic > 0) {
		t.mosaic = 0;
	}
	if (params.ampTo < params.ampFrom + 0.1) {
		t.ampTo = Number((params.ampFrom + 0.1 + Math.random() * 0.4).toFixed(2));
	}
	const out: Record<string, number> = {};
	for (const [key, value] of Object.entries(t)) {
		if (!changed || key in changed || key === 'ampTo') {
			out[key] = value;
		}
	}
	return out;
}

/**
 * Whole-look randomizer.
 * 'random' = fresh settings everywhere; 'variant' = nudge the current look a little.
 */
export function randomize(params: GongoizerParams, mode: RandomizeMode = 'random'): GongoizerParams {
	const out: GongoizerParams = { ...params };
	for (const group of GROUPS) {
		if (NO_RANDOM.has(group.name)) {
			continue;
		}
		Object.assign(out, shuffle(group.rows, out, mode));
		if (group.name === 'Colour') {
			if (mode === 'random') {
				out.palette = pick(PALETTE_OPTIONS);
				out.palette2 = pick(PALETTE_OPTIONS);
			} else if (Math.random() < 0.2) {
				out.palette2 = pick(PALETTE_OPTIONS);
			}
		}
	}
	return Object.assign(out, tame(out));
}

/**
 * Randomize/variant a subset of groups (per-section buttons), applying tame() to the merged result.
 * Returns only the keys that changed.
 */
export function shuffleGroups(
	groups: readonly ParamGroup[],
	params: GongoizerParams,
	mode: RandomizeMode
): Partial<GongoizerParams> {
	const changes: Partial<GongoizerParams> = {};
	for (const group of groups) {
		if (NO_RANDOM.has(group.name)) {
			continue;
		}
		Object.assign(changes, shuffle(group.rows, params, mode));
		if (group.name === 'Colour') {
			if (mode === 'random') {
				changes.palette = pick(PALETTE_OPTIONS);
				changes.palette2 = pick(PALETTE_OPTIONS);
			} else if (Math.random() < 0.2) {
				changes.palette2 = pick(PALETTE_OPTIONS);
			}
		}
	}
	return Object.assign(changes, tame({ ...params, ...changes }, changes));
}
