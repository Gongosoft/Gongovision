import { clamp } from '@vueuse/shared';
import { computed, ref, useTemplateRef } from 'vue';
import { get, useLocalStorage, useMediaQuery, useWindowSize } from '@vueuse/core';
import type { ComputedRef, Ref, StyleValue } from 'vue';

const CHAT_MAX = 0.85;
const CHAT_MIN = 0.12;
const FLIP_EDGE = 0.06;
const HIDE_EDGE = 0.04;

/** chat fraction that gives the video pane exactly 16:9 (negative if impossible) */
function chatRatioFor16ᱺ9(w: number, h: number, mobile: boolean): number {
	return mobile ? 1 - (w * 9) / (h * 16) : 1 - (h * 16) / (w * 9);
}

export interface UseSplitPaneReturn {
	isMobile: ComputedRef<boolean>;
	side: ComputedRef<'start' | 'end'>;
	hidden: Ref<boolean>;
	dragging: Ref<boolean>;
	chatStyle: ComputedRef<{ flexBasis: string }>;
	dividerStyle: ComputedRef<StyleValue>;
	edgeStart: Ref<HTMLElement | null>;
	edgeEnd: Ref<HTMLElement | null>;
	onPointerDown: (e: PointerEvent) => void;
	onPointerUp: () => void;
	onPointerMove: (e: PointerEvent) => void;
	showEdge: (sideName: 'start' | 'end') => void;
	flip: () => void;
	snapTo16ᱺ9: () => void;
}

export function useSplitPane(): UseSplitPaneReturn {
	const isMobile = useMediaQuery('(max-width: 767px)');
	const { width: viewW, height: viewH } = useWindowSize();

	const desktopSide = useLocalStorage<'start' | 'end'>('chat:desktop', 'end');
	const mobileSide = useLocalStorage<'start' | 'end'>('chat:mobile', 'end');

	const storedRatio = useLocalStorage<number | null>('chat:size', null);

	function currentSide(): Ref<'start' | 'end'> {
		return get(isMobile) ? mobileSide : desktopSide;
	}

	const chatRatio = computed({
		get: (): number => {
			const stored = get(storedRatio);
			if (typeof stored === 'number' && stored >= CHAT_MIN && stored <= CHAT_MAX) {
				return stored;
			}
			const ideal = chatRatioFor16ᱺ9(get(viewW), get(viewH), get(isMobile));
			return ideal >= CHAT_MIN ? ideal : 0.25;
		},
		set: (value: number): void => {
			storedRatio.value = value;
		}
	});

	const hidden = ref(false);
	const dragging = ref(false);

	const side = computed<'start' | 'end'>(() => get(currentSide()));
	const ideal = computed(() => chatRatioFor16ᱺ9(get(viewW), get(viewH), get(isMobile)));
	const ceiling = computed(() => (get(ideal) >= CHAT_MIN ? get(ideal) : CHAT_MAX));

	const chatStyle = computed(() => ({ flexBasis: `${get(chatRatio) * 100}%` }));

	const dividerStyle = computed(() => {
		const percentage = get(chatRatio) * 100;
		const offset = `calc(${percentage}% - 6px)`;
		const style: Record<string, string> = {};
		if (get(isMobile)) {
			style[get(side) === 'start' ? 'top' : 'bottom'] = offset;
		} else {
			style[get(side) === 'start' ? 'left' : 'right'] = offset;
		}
		return style;
	});

	function onPointerDown(e: PointerEvent): void {
		hidden.value = false;
		dragging.value = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerUp(): void {
		dragging.value = false;
	}

	function onPointerMove(e: PointerEvent): void {
		if (!get(dragging)) {
			return;
		}

		let position = get(isMobile) ? e.clientY / get(viewH) : e.clientX / get(viewW);
		if (get(side) !== 'start') {
			position = 1 - position;
		}

		if (position < HIDE_EDGE) {
			hidden.value = true;
			dragging.value = false;
			return;
		}

		const limit = get(isMobile) ? get(ceiling) : CHAT_MAX;

		if (position > limit + FLIP_EDGE) {
			const flipSide: 'start' | 'end' = get(side) === 'start' ? 'end' : 'start';
			currentSide().value = flipSide;
			chatRatio.value = clamp(chatRatioFor16ᱺ9(get(viewW), get(viewH), get(isMobile)), CHAT_MIN, limit);
			dragging.value = false;
			return;
		}

		chatRatio.value = clamp(position, CHAT_MIN, limit);
	}

	function showEdge(sideName: 'start' | 'end'): void {
		if (!get(hidden)) {
			return;
		}
		currentSide().value = sideName;
		chatRatio.value = get(ideal) >= CHAT_MIN ? get(ideal) : 0.33;
		hidden.value = false;
	}

	const edgeStart = useTemplateRef<HTMLElement>('edgeStart');
	const edgeEnd = useTemplateRef<HTMLElement>('edgeEnd');

	function snapTo16ᱺ9(): void {
		chatRatio.value = clamp(chatRatioFor16ᱺ9(get(viewW), get(viewH), get(isMobile)), CHAT_MIN, 1);
		hidden.value = false;
	}

	function flip(): void {
		const newSide: 'start' | 'end' = get(side) === 'start' ? 'end' : 'start';
		currentSide().value = newSide;
		snapTo16ᱺ9();
	}

	return {
		isMobile,
		side,
		hidden,
		dragging,
		chatStyle,
		dividerStyle,
		edgeStart,
		edgeEnd,
		onPointerDown,
		onPointerUp,
		onPointerMove,
		showEdge,
		snapTo16ᱺ9,
		flip
	};
}
