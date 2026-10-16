import { computed, ref, watch } from 'vue';
import { get, useIntervalFn, useWebSocket } from '@vueuse/core';
import type { Ref } from 'vue';
import type { OwncastStatus } from '@/types/owncast.d.ts';

const angelthumpWsLive = ref<boolean | null>(null);
const angelthumpPollLive = ref<boolean | null>(null);
const owncastStatus = ref<OwncastStatus | null>(null);

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
	const status = get(owncastStatus);
	if (status === null) {
		return null;
	}
	return status.online;
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
			if (res.ok) {
				owncastStatus.value = await res.json();
			}
		} catch {
			/*_*/
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

interface UseStreamSourceReturn {
	angelthumpLive: Ref<boolean | null>;
	isStreamLive: Ref<boolean | null>;
	owncastLive: Ref<boolean | null>;
	owncastStatus: Ref<OwncastStatus | null>;
	refresh: () => void;
}

export function useStreamSource(): UseStreamSourceReturn {
	return {
		angelthumpLive,
		isStreamLive,
		owncastLive,
		owncastStatus,
		refresh: () => location.reload()
	};
}
