// https://github.com/owncast/owncast/blob/develop/web/components/video/viewer-ping.ts
import { computed, toValue, watch } from 'vue';
import { get, useEventListener, useFetch, useIntervalFn } from '@vueuse/core';
import type { MaybeRefOrGetter } from 'vue';
import type { StreamSource } from '@/types/stream.d.ts';

const PING_INTERVAL_MS = 4000;

export function useWatchingStream(
	element: MaybeRefOrGetter<HTMLElement | null>,
	source: MaybeRefOrGetter<StreamSource>
): void {
	const active = computed(() => toValue(source) === 'owncast');
	const { execute } = useFetch(`${OWNCAST.HOST}/api/ping`, { immediate: false });

	const { pause, resume } = useIntervalFn(
		() => {
			if (toValue(element)?.isConnected) {
				void execute();
			}
		},
		PING_INTERVAL_MS,
		{
			immediate: false,
			immediateCallback: true
		}
	);

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
