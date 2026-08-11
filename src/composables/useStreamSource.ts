import { computed, ref, watch } from 'vue';
import { get, useIntervalFn, useWebSocket } from '@vueuse/core';
import type { Ref } from 'vue';

const wsLive = ref<boolean | null>(null);
const pollLive = ref<boolean | null>(null);

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
			wsLive.value = msg.live === true;
		}
	} catch {
		/*_*/
	}
});

const isGreatSphynxLive = computed<boolean>(() => {
	const ws = get(wsLive);
	if (ws !== null) {
		return ws;
	}
	const poll = get(pollLive);
	if (poll !== null) {
		return poll;
	}
	return true;
});

const { pause: pausePolling, resume: resumePolling } = useIntervalFn(
	async () => {
		try {
			const res = await fetch('/notification/live');
			if (res.ok) {
				const data: { isLive: boolean } = await res.json();
				pollLive.value = data.isLive;
			}
		} catch {
			/*_*/
		}
	},
	30_000,
	{ immediate: true, immediateCallback: true }
);

watch(wsStatus, (status) => {
	if (status === 'OPEN') {
		pausePolling();
	} else if (status === 'CLOSED') {
		wsLive.value = null;
		resumePolling();
	}
});

export function useStreamSource(): {
	isGreatSphynxLive: Ref<boolean>;
	refresh: () => void;
} {
	return {
		isGreatSphynxLive,
		refresh: () => location.reload()
	};
}
