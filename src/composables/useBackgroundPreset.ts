import { ref } from 'vue';
import { randomize } from '@/lib/gongoizer/randomize.ts';
import { BASE, DEFAULT_PRESET, FEATURED } from '@/lib/gongoizer/presets.ts';
import type { Ref } from 'vue';
import type { GongoizerParams } from '@/types/gongoizer.d.ts';

/** chance (0–1) that a visit gets a fully randomized look instead of a featured one */
const RANDOM_CHANCE = 0.2;

const featuredKeys = Object.keys(FEATURED);

function pick<T>(list: T[]): T {
	return list[Math.floor(Math.random() * list.length)]!;
}

const randomized = Math.random() < RANDOM_CHANCE;
const preset = randomized ? DEFAULT_PRESET : pick(featuredKeys);

const params = ref<Partial<GongoizerParams> | undefined>(undefined);
const ready = ref(!randomized);

if (randomized) {
	try {
		params.value = { ...randomize({ ...BASE }), strobe: 0 };
	} catch {
		/*_*/
	} finally {
		ready.value = true;
	}
}

interface UseBackgroundPresetReturn {
	preset: string;
	params: Ref<Partial<GongoizerParams> | undefined>;
	ready: Ref<boolean>;
}

export function useBackgroundPreset(): UseBackgroundPresetReturn {
	return { preset, params, ready };
}
