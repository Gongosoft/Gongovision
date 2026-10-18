import { z } from 'zod';
import { BASE } from '@/lib/gongoizer/presets.ts';
import { GROUPS } from '@/lib/gongoizer/schema.ts';
import { PALETTES } from '@/lib/gongoizer/palettes.ts';
import type { GongoizerParams } from '@/types/gongoizer.d.ts';

const rows = GROUPS.flatMap((group) => group.rows);

/** min/max by param key: sliders from their min/max, dropdowns from their option count */
const ranges = new Map<string, { min: number; max: number; step: number }>(
	rows.map((def) => {
		if ('options' in def) {
			return [def.key, { min: 0, max: def.options.length - 1, step: 1 }] as const;
		}
		return [def.key, { min: def.min, max: def.max, step: def.step }] as const;
	})
);

/** how many decimals a step needs (0.05 and 0.25 both need two, 10 needs none) */
function stepDecimals(step: number): number {
	const [mantissa, exponent] = String(step).split('e-');
	if (exponent) {
		return Number(exponent);
	}
	const dot = mantissa!.indexOf('.');
	return dot === -1 ? 0 : mantissa!.length - dot - 1;
}

/** clamp to the range and snap to the slider's step */
function fit(value: number, range: { min: number; max: number; step: number }): number {
	const snapped = Math.round(value / range.step) * range.step;
	const clamped = Math.min(range.max, Math.max(range.min, snapped));
	return Number(clamped.toFixed(stepDecimals(range.step)));
}

/** shortest exact param query form, decimals match the slider step */
export function formatParam(key: string, value: number): string {
	const range = ranges.get(key);
	const decimals = range ? stepDecimals(range.step) : 4;
	return String(Number(value.toFixed(decimals)));
}

const shape: Record<string, z.ZodType> = {};
for (const [key, value] of Object.entries(BASE)) {
	if (typeof value === 'string') {
		shape[key] = z.string().refine((palette) => palette in PALETTES, { message: `unknown palette "${key}"` });
	} else {
		const range = ranges.get(key);
		shape[key] = z.number().transform((n) => (range ? fit(n, range) : n));
	}
}

/** a partial settings object: unknown keys are dropped and values are fitted to the panel's controls */
export const presetPatchSchema = z.object(shape).partial();

/** fit a single raw value (a query string, a pasted field) to its parameter */
export function fitParam(key: string, value: unknown): number | string | undefined {
	const schema = shape[key];
	if (!schema) {
		return undefined;
	}
	const result = schema.safeParse(value);
	return result.success ? (result.data as number | string) : undefined;
}

/** fit a whole preset to the sliders' step grid, so the panel can't rewrite it on refresh */
export function fitPreset(patch: Partial<GongoizerParams>): Partial<GongoizerParams> {
	const fitted: Record<string, number | string> = {};
	for (const [key, value] of Object.entries(patch)) {
		fitted[key] = typeof value === 'number' ? (fitParam(key, value) ?? value) : value;
	}
	return fitted;
}

function tryParse(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return null;
	}
}

export function parsePreset(text: string): Partial<GongoizerParams> | null {
	const result = presetPatchSchema.safeParse(tryParse(text));
	if (!result.success || Object.keys(result.data).length === 0) {
		return null;
	}
	return result.data;
}
