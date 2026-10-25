import { computed, shallowRef, watch } from 'vue';
import { get, useEventSource, useIntervalFn, useTimeoutFn, useTimestamp } from '@vueuse/core';
import type { ComputedRef, ShallowRef } from 'vue';
import type { EventSourceStatus } from '@vueuse/core';
import type { ApiNowPlaying, NowPlayingPublication, NowPlayingSseMessage } from '@/types/azuracast.d.ts';

/** SSE beats actual playback, so this delays track changes until listeners actually hear them */
const LISTENER_DELAY = 4200;

interface UseRadioSongReturn {
	np: ShallowRef<ApiNowPlaying | null>;
	status: ShallowRef<EventSourceStatus>;
	elapsed: ComputedRef<number>;
	duration: ComputedRef<number>;
}

function parse(raw?: string): NowPlayingSseMessage | null {
	try {
		return raw ? (JSON.parse(raw) as NowPlayingSseMessage) : null;
	} catch {
		return null;
	}
}

export function useRadioSong(station: string = AZURACAST.STATION): UseRadioSongReturn {
	const url = new URL('/api/live/nowplaying/sse', AZURACAST.HOST);
	url.searchParams.set('cf_connect', JSON.stringify({ subs: { [`station:${station}`]: { recover: true } } }));

	const np = shallowRef<ApiNowPlaying | null>(null);
	/** server clock minus local clock, in ms */
	const clockOffset = shallowRef(0);

	const { data, status } = useEventSource(url.toString(), [], {
		autoReconnect: { delay: 5000 },
		serializer: { read: parse }
	});

	const { start: applyLater } = useTimeoutFn(
		(next: ApiNowPlaying) => {
			np.value = next;
		},
		LISTENER_DELAY,
		{ immediate: false }
	);

	function receive({ np: next }: NowPlayingPublication['data'], delay: boolean): void {
		if (!next.now_playing) {
			return;
		}
		if (delay && get(np)) {
			applyLater(next);
		} else {
			np.value = next;
		}
	}

	watch(data, (message) => {
		if (message && 'connect' in message) {
			if (message.connect.time) {
				clockOffset.value = message.connect.time - Date.now();
			}
			for (const sub of Object.values(message.connect.subs)) {
				for (const { data: publication } of sub.publications ?? []) {
					receive(publication, false);
				}
			}
		} else if (message && 'pub' in message) {
			if (message.pub.data.current_time) {
				clockOffset.value = message.pub.data.current_time * 1000 - Date.now();
			}
			receive(message.pub.data, true);
		}
	});

	const now = useTimestamp({ scheduler: (update) => useIntervalFn(update, 1000) });
	const duration = computed(() => get(np)?.now_playing?.duration ?? 0);
	const elapsed = computed(() => {
		const playedAt = get(np)?.now_playing?.played_at;
		if (!playedAt) {
			return 0;
		}
		const seconds = Math.floor((get(now) + get(clockOffset)) / 1000) - playedAt;
		return Math.min(Math.max(seconds, 0), get(duration));
	});

	return { np, status, elapsed, duration };
}
