// https://github.com/owncast/owncast/blob/develop/web/components/video/viewer-ping.ts
import { computed, toValue, watch } from 'vue';
import { get, useEventListener, useIntervalFn } from '@vueuse/core';
import type { MaybeRefOrGetter } from 'vue';
import type { StreamSource } from '@/composables/usePlayerSettings.ts';

const PING_INTERVAL_MS = 4000;

async function ping(): Promise<void> {
	try {
		await fetch(`${OWNCAST.HOST}/api/ping`);
	} catch {
		/*_*/
	}
}

export function useWatchingStream(
	element: MaybeRefOrGetter<HTMLElement | null>,
	source: MaybeRefOrGetter<StreamSource>
): void {
	const active = computed(() => toValue(source) === 'owncast');

	const { pause, resume } = useIntervalFn(() => void ping(), PING_INTERVAL_MS, {
		immediate: false,
		immediateCallback: true
	});

	useEventListener(element, 'playing', () => {
		if (get(active)) {
			resume();
		}
	});

	useEventListener(element, ['pause', 'ended', 'emptied'], pause);

	watch(active, (value) => {
		if (!value) {
			pause();
		}
	});
}
