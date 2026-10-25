import { computed, toValue } from 'vue';
import { get, useElementBounding, useElementSize } from '@vueuse/core';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

/** VCR OSD is monospaced at about 0.6em per glyph */
const GLYPH = 0.6;
const MIN_SIZE = 11;

/** Blotter draws with 1.5 leading and pads the canvas 16px either side and 8px above and below */
const PAD_X = 16;
const PAD_Y = 8;

/** keeps the text off the diamond's border */
const EDGE = 12;

const canvasHeight = (size: number): number => size * 1.5 + PAD_Y * 2;

interface UseDiamondLinesOptions {
	/** one entry per line, top to bottom; empty lines are dropped */
	lines: MaybeRefOrGetter<string[]>;
	/** the largest font size for each line */
	maxSizes: MaybeRefOrGetter<number[]>;
	/** the element the lines are drawn in: its top is where the stack starts, its width the most a line may use */
	target: MaybeRefOrGetter<HTMLElement | null>;
}

interface UseDiamondLinesReturn {
	texts: ComputedRef<string[]>;
	sizes: ComputedRef<number[]>;
	/** the stack's height at the largest sizes, so layout never depends on how the lines were fitted */
	height: ComputedRef<number>;
}

/** fits stacked Blotter lines inside Diamond.vue, each is sized for the rhombus width at its own bottom edge */
export function useDiamondLines({ lines, maxSizes, target }: UseDiamondLinesOptions): UseDiamondLinesReturn {
	const { width: targetWidth } = useElementSize(target);
	const { top: stackTop } = useElementBounding(target);
	const diamond = useElementBounding(() => document.querySelector<HTMLElement>('#diamond'));

	function diamondWidthAt(y: number): number {
		const width = get(diamond.width);
		const height = get(diamond.height);
		if (!width || !height) {
			return Infinity;
		}
		const dy = Math.min(Math.abs(y - (get(diamond.top) + height / 2)), height / 2);
		return width * (1 - dy / (height / 2));
	}

	function fit(raw: string, maxSize: number, bottom: number): { text: string; size: number } {
		const rhombus = diamondWidthAt(bottom - PAD_Y) - EDGE * 2;
		const width = get(targetWidth) || Infinity;
		const room = Math.max(Math.min(width - PAD_X * 2, rhombus), 40);
		const needed = Math.max(raw.length, 1) * GLYPH;
		const size = Math.max(MIN_SIZE, Math.floor(Math.min(maxSize, room / needed)));
		const chars = Math.max(1, Math.floor(room / (size * GLYPH)));
		return { text: raw.length > chars ? `${raw.slice(0, chars - 1)}…` : raw, size };
	}

	const fitted = computed(() => {
		const sizes = toValue(maxSizes);
		let bottom = get(stackTop) || window.innerHeight / 2;
		return toValue(lines)
			.map((raw, index) => {
				const maxSize = sizes[index] ?? MIN_SIZE;
				bottom += canvasHeight(maxSize);
				return fit(raw, maxSize, bottom);
			})
			.filter(({ text }) => text);
	});

	return {
		texts: computed(() => get(fitted).map(({ text }) => text)),
		sizes: computed(() => get(fitted).map(({ size }) => size)),
		height: computed(() => toValue(maxSizes).reduce((total, size) => total + canvasHeight(size), 0))
	};
}
