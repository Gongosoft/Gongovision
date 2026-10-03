import { toValue } from 'vue';
import { useEventListener } from '@vueuse/core';
import type { MaybeRefOrGetter } from 'vue';
import type { PlayerElement } from '@/composables/usePlayerSettings.ts';

const VOLUME_WHEEL_STEP = 0.05;

export function useVolumeWheel(
	container: MaybeRefOrGetter<HTMLElement | null>,
	player: MaybeRefOrGetter<PlayerElement | null>
): void {
	function handleWheel(event: WheelEvent): void {
		const store = toValue(player)?.store;
		if (!store || store.volumeAvailability !== 'available') {
			return;
		}
		if ((event.target as Element | null)?.closest('media-menu')) {
			return;
		}
		event.preventDefault();
		store.setVolume(store.volume + (event.deltaY < 0 ? VOLUME_WHEEL_STEP : -VOLUME_WHEEL_STEP));
	}

	function handleMouseDown(event: MouseEvent): void {
		if (event.button !== 1) {
			return;
		}
		const store = toValue(player)?.store;
		if (!store) {
			return;
		}
		event.preventDefault();
		store.setMuted(!store.muted);
	}

	useEventListener(container, 'wheel', handleWheel);
	useEventListener(container, 'mousedown', handleMouseDown);
}
