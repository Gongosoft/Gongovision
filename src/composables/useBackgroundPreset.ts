import { ref } from 'vue';
import { randomize } from '@/lib/gongoizer/randomize.ts';
import { BASE, DEFAULT_PRESET, FEATURED } from '@/lib/gongoizer/presets.ts';
import type { Ref } from 'vue';
import type { GongoizerParams } from '@/types/gongoizer.d.ts';

/** chance (0–1) that a look is fully randomized instead of a featured one */
const RANDOM_CHANCE = 0.2;

interface UseBackgroundPresetReturn {
	preset: string;
	params: Ref<Partial<GongoizerParams> | undefined>;
	ready: Ref<boolean>;
}

const looks = new Map<string, UseBackgroundPresetReturn>();

function roll(taken: string[]): UseBackgroundPresetReturn {
	const featured = Object.keys(FEATURED).filter((key) => !taken.includes(key));
	const randomized = Math.random() < RANDOM_CHANCE || featured.length === 0;
	const preset = randomized ? DEFAULT_PRESET : featured[Math.floor(Math.random() * featured.length)]!;
	const look: UseBackgroundPresetReturn = { preset, params: ref(undefined), ready: ref(!randomized) };

	if (randomized) {
		try {
			look.params.value = { ...randomize({ ...BASE }), strobe: 0 };
		} catch {
			/*_*/
		} finally {
			look.ready.value = true;
		}
	}
	return look;
}

/** each variant gets its own look, avoiding the featured presets the others already use */
export function useBackgroundPreset(variant = 'page'): UseBackgroundPresetReturn {
	let look = looks.get(variant);
	if (!look) {
		look = roll([...looks.values()].map((other) => other.preset));
		looks.set(variant, look);
	}
	return look;
}
