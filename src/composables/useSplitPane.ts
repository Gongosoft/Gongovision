import { computed, ref } from 'vue';
import { get, useMediaQuery, useStorage, useWindowSize } from '@vueuse/core';
import type { ComputedRef, Ref } from 'vue';

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
	divStyle: ComputedRef<Record<string, string>>;
	onPointerDown: (e: PointerEvent) => void;
	onPointerUp: () => void;
	onPointerMove: (e: PointerEvent) => void;
	showEdge: (sideName: 'start' | 'end') => void;
	flip: () => void;
	snapTo16by9: () => void;
}

export function useSplitPane(): UseSplitPaneReturn {
	const isMobile = useMediaQuery('(max-width: 767px)');
	const { width: viewW, height: viewH } = useWindowSize();

	const desktopSide = useStorage<'start' | 'end'>('chatdesk', 'end');
	const mobileSide = useStorage<'start' | 'end'>('chatmob', 'end');

	const initial = ((): number => {
		if (typeof window === 'undefined') {
			return 0.25;
		}
		const ideal = chatRatioFor16ᱺ9(window.innerWidth, window.innerHeight, get(isMobile));
		return ideal >= CHAT_MIN ? ideal : 0.25;
	})();
	const chatRatio = useStorage('chatpct', initial);

	const hidden = ref(false);
	const dragging = ref(false);

	const side = computed<'start' | 'end'>(() =>
		get(isMobile) ? get<'start' | 'end'>(mobileSide) : get<'start' | 'end'>(desktopSide)
	);
	const ideal = computed(() => chatRatioFor16ᱺ9(get(viewW), get(viewH), get(isMobile)));
	const ceiling = computed(() => (get(ideal) >= CHAT_MIN ? get(ideal) : CHAT_MAX));

	const chatStyle = computed(() => ({ flexBasis: `${get<number>(chatRatio) * 100}%` }));

	const divStyle = computed(() => {
		const pct = get<number>(chatRatio) * 100;
		const offset = `calc(${pct}% - 6px)`;
		const style: Record<string, string> = {};
		let key = '';
		if (get(isMobile)) {
			key = get(side) === 'start' ? 'top' : 'bottom';
		} else {
			key = get(side) === 'start' ? 'left' : 'right';
		}
		style[key] = offset;
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
			(get(isMobile) ? mobileSide : desktopSide).value = flipSide;
			chatRatio.value = Math.max(CHAT_MIN, chatRatioFor16ᱺ9(get(viewW), get(viewH), get(isMobile)));
			dragging.value = false;
			return;
		}

		chatRatio.value = Math.min(Math.max(position, CHAT_MIN), limit);
	}

	function showEdge(sideName: 'start' | 'end'): void {
		if (!get(hidden)) {
			return;
		}
		(get(isMobile) ? mobileSide : desktopSide).value = sideName;
		chatRatio.value = get(ideal) >= CHAT_MIN ? get(ideal) : 0.33;
		hidden.value = false;
	}

	function snapTo16by9(): void {
		chatRatio.value = Math.max(CHAT_MIN, chatRatioFor16ᱺ9(get(viewW), get(viewH), get(isMobile)));
		hidden.value = false;
	}

	function flip(): void {
		const newSide: 'start' | 'end' = get(side) === 'start' ? 'end' : 'start';
		(get(isMobile) ? mobileSide : desktopSide).value = newSide;
		snapTo16by9();
	}

	return {
		isMobile,
		side,
		hidden,
		dragging,
		chatStyle,
		divStyle,
		onPointerDown,
		onPointerUp,
		onPointerMove,
		showEdge,
		snapTo16by9,
		flip
	};
}
