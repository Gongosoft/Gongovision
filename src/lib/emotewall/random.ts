import { createSeededRandom } from 'animejs';
import type { Rnd } from '@/types/emotewall.d.ts';

/** seeded stand-in for the original's `shared.rnd` */
export function createRnd(seed: number): Rnd {
	const next = createSeededRandom(seed, 0, 1, 9);
	return (m) => {
		const f = next();
		if (m === undefined) {
			return f;
		}
		return m < 1 ? f * m : Math.floor(f * m);
	};
}

export function rndFromRange(rnd: Rnd, range: { min: number; max: number }): number {
	return rnd(range.max - range.min) + range.min;
}
