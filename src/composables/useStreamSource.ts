import { computed, ref, watch } from 'vue';
import { useStreamSourceSetting } from '@/composables/usePlayerSettings.ts';
import { get, useIntervalFn, useLocalStorage, useWebSocket } from '@vueuse/core';
import type { ComputedRef, Ref } from 'vue';
import type { RemovableRef } from '@vueuse/core';
import type { Region } from '@/types/angelthump.d.ts';
import type { StreamSource } from '@/types/stream.d.ts';
import type { OwncastStatus } from '@/types/owncast.d.ts';

export const REGIONS = {
	auto: { label: 'Auto' },
	...ANGELTHUMP.CDN
};

const angelthumpWsLive = ref<boolean | null>(null);
const angelthumpPollLive = ref<boolean | null>(null);
const owncastStatus = ref<OwncastStatus | null>(null);
const owncastUnreachable = ref(false);

const {
	status: wsStatus,
	data: wsData,
	send: wsSend
} = useWebSocket(ANGELTHUMP.WS, {
	immediate: true,
	autoReconnect: {
		retries: Infinity,
		delay: 5000
	},
	onConnected() {
		wsSend(JSON.stringify({ action: 'subscribe', channel: ANGELTHUMP.CHANNEL }));
	}
});

watch(wsData, (raw) => {
	if (!raw) {
		return;
	}
	try {
		const msg = JSON.parse(raw);
		if (msg.action === 'live') {
			angelthumpWsLive.value = msg.live === true;
		}
	} catch {
		/*_*/
	}
});

const angelthumpLive = computed<boolean | null>(() => {
	const ws = get(angelthumpWsLive);
	if (ws !== null) {
		return ws;
	}
	return get(angelthumpPollLive);
});

const owncastLive = computed<boolean | null>(() => {
	if (get(owncastUnreachable)) {
		return false;
	}
	return get(owncastStatus)?.online ?? null;
});

const isStreamLive = computed<boolean | null>(() => {
	const angelthump = get(angelthumpLive);
	const owncast = get(owncastLive);
	if (angelthump === true || owncast === true) {
		return true;
	}
	if (angelthump === null || owncast === null) {
		return null;
	}
	return false;
});

const { pause: pausePolling, resume: resumePolling } = useIntervalFn(
	async () => {
		try {
			const res = await fetch('/notification/live');
			if (res.ok) {
				const data: { angelthump?: boolean | null } = await res.json();
				angelthumpPollLive.value = data.angelthump ?? null;
			}
		} catch {
			/*_*/
		}
	},
	30_000,
	{ immediate: true, immediateCallback: true }
);

useIntervalFn(
	async () => {
		try {
			const res = await fetch(`${OWNCAST.HOST}/api/status`);
			if (!res.ok) {
				owncastStatus.value = null;
				owncastUnreachable.value = true;
				return;
			}
			owncastStatus.value = await res.json();
			owncastUnreachable.value = false;
		} catch {
			owncastStatus.value = null;
			owncastUnreachable.value = true;
		}
	},
	15_000,
	{ immediate: true, immediateCallback: true }
);

watch(wsStatus, (status) => {
	if (status === 'OPEN') {
		pausePolling();
	} else if (status === 'CLOSED') {
		angelthumpWsLive.value = null;
		resumePolling();
	}
});

const sourceSetting = useStreamSourceSetting();
const region = useLocalStorage<Region>('stream:region', 'auto');

const effectiveSource = computed<StreamSource>(() => {
	const selected = get(sourceSetting);
	const live = { owncast: owncastLive, angelthump: angelthumpLive };
	if (get(live[selected]) !== false) {
		return selected;
	}
	const fallback: StreamSource = selected === 'owncast' ? 'angelthump' : 'owncast';
	return get(live[fallback]) === true ? fallback : selected;
});

const src = computed(() => {
	if (get(effectiveSource) === 'owncast') {
		return `${OWNCAST.HOST}/hls/stream.m3u8`;
	}
	const selected = get(region) ?? 'auto';
	return selected === 'auto' ? '/stream/m3u8' : `/stream/m3u8?region=${selected}`;
});

interface UseStreamSourceReturn {
	angelthumpLive: Ref<boolean | null>;
	effectiveSource: ComputedRef<StreamSource>;
	isStreamLive: Ref<boolean | null>;
	owncastLive: Ref<boolean | null>;
	owncastStatus: Ref<OwncastStatus | null>;
	/** selected AngelThump CDN */
	region: RemovableRef<Region>;
	/** HLS URL of `effectiveSource` */
	src: ComputedRef<string>;
	refresh: () => void;
}

export function useStreamSource(): UseStreamSourceReturn {
	return {
		angelthumpLive,
		effectiveSource,
		isStreamLive,
		owncastLive,
		owncastStatus,
		region,
		src,
		refresh: () => location.reload()
	};
}
