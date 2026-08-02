import { computed, ref } from 'vue';
import { useMediaQuery, useStorage, useWindowSize } from '@vueuse/core';
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
		const ideal = chatRatioFor16ᱺ9(window.innerWidth, window.innerHeight, isMobile.value);
		return ideal >= CHAT_MIN ? ideal : 0.25;
	})();
	const chatRatio = useStorage('chatpct', initial);

	const hidden = ref(false);
	const dragging = ref(false);

	const side = computed<'start' | 'end'>(() => (isMobile.value ? mobileSide.value : desktopSide.value));
	const ideal = computed(() => chatRatioFor16ᱺ9(viewW.value, viewH.value, isMobile.value));
	const ceiling = computed(() => (ideal.value >= CHAT_MIN ? ideal.value : CHAT_MAX));

	const chatStyle = computed(() => ({ flexBasis: `${chatRatio.value * 100}%` }));

	const divStyle = computed(() => {
		const pct = chatRatio.value * 100;
		const offset = `calc(${pct}% - 6px)`;
		const style: Record<string, string> = {};
		let key = '';
		if (isMobile.value) {
			key = side.value === 'start' ? 'top' : 'bottom';
		} else {
			key = side.value === 'start' ? 'left' : 'right';
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
		if (!dragging.value) {
			return;
		}

		let position = isMobile.value ? e.clientY / viewH.value : e.clientX / viewW.value;
		if (side.value !== 'start') {
			position = 1 - position;
		}

		if (position < HIDE_EDGE) {
			hidden.value = true;
			dragging.value = false;
			return;
		}

		const limit = isMobile.value ? ceiling.value : CHAT_MAX;

		if (position > limit + FLIP_EDGE) {
			const flipSide: 'start' | 'end' = side.value === 'start' ? 'end' : 'start';
			(isMobile.value ? mobileSide : desktopSide).value = flipSide;
			chatRatio.value = Math.max(CHAT_MIN, chatRatioFor16ᱺ9(viewW.value, viewH.value, isMobile.value));
			dragging.value = false;
			return;
		}

		chatRatio.value = Math.min(Math.max(position, CHAT_MIN), limit);
	}

	function showEdge(sideName: 'start' | 'end'): void {
		if (!hidden.value) {
			return;
		}
		(isMobile.value ? mobileSide : desktopSide).value = sideName;
		chatRatio.value = ideal.value >= CHAT_MIN ? ideal.value : 0.33;
		hidden.value = false;
	}

	function snapTo16by9(): void {
		chatRatio.value = Math.max(CHAT_MIN, chatRatioFor16ᱺ9(viewW.value, viewH.value, isMobile.value));
		hidden.value = false;
	}

	function flip(): void {
		const newSide: 'start' | 'end' = side.value === 'start' ? 'end' : 'start';
		(isMobile.value ? mobileSide : desktopSide).value = newSide;
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
