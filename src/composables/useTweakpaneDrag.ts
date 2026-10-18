import { watch } from 'vue';
import { useDraggable, useResizeObserver, useWindowSize } from '@vueuse/core';
import type { ComputedRef, Ref } from 'vue';

interface UseTweakpaneDragOptions {
	/** the panel element, moved with viewport left/top */
	container: Ref<HTMLElement | null>;
	/** the element that starts a drag (tweakpane's title bar, resolved once the pane exists) */
	handle: Ref<HTMLElement | null>;
	/** panel width in px, used to place it against the right edge */
	width: number;
	margin?: number;
}

interface UseTweakpaneDragReturn {
	dragStyle: ComputedRef<string>;
	/** a fresh pointer interaction can never be the click that ended a drag */
	onPointerDownCapture: () => void;
	onClickCapture: (event: MouseEvent) => void;
}

export function useTweakpaneDrag({
	container,
	handle,
	width,
	margin = 12
}: UseTweakpaneDragOptions): UseTweakpaneDragReturn {
	const { width: viewportWidth, height: viewportHeight } = useWindowSize();
	let origin = { x: 0, y: 0 };
	let moved = false;
	let suppressClick = false;

	const { position, style } = useDraggable(container, {
		handle,
		containerElement: document.documentElement,
		restrictInView: true,
		initialValue: {
			x: Math.max(margin, window.innerWidth - width - margin),
			y: margin
		},
		onStart: (_position, event) => {
			origin = { x: event.clientX, y: event.clientY };
			moved = false;
		},
		onMove: (_position, event) => {
			if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 4) {
				moved = true;
			}
		},
		onEnd: () => {
			suppressClick = moved;
		}
	});

	function keepOnScreen(): void {
		const el = container.value;
		if (!el?.offsetWidth) {
			return;
		}
		position.value = {
			x: Math.min(position.value.x, Math.max(0, viewportWidth.value - el.offsetWidth)),
			y: Math.min(position.value.y, Math.max(0, viewportHeight.value - el.offsetHeight))
		};
	}

	watch([viewportWidth, viewportHeight], keepOnScreen);
	useResizeObserver(container, keepOnScreen);

	return {
		dragStyle: style,
		onPointerDownCapture(): void {
			suppressClick = false;
		},
		onClickCapture(event: MouseEvent): void {
			if (!suppressClick) {
				return;
			}
			suppressClick = false;
			event.stopPropagation();
			event.preventDefault();
		}
	};
}
