import { computed, ref, watch } from 'vue';
import { useFetch, useIntervalFn, useWebSocket } from '@vueuse/core';
import type { Ref } from 'vue';

interface LivestreamsResponse {
	twitch: string[];
	angelthump: string[];
}

const wsLive = ref<boolean | null>(null);
const pollLive = ref<boolean | null>(null);

const { data, error, isFetching, execute } = useFetch('/livestreams').get().json<LivestreamsResponse>();

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

watch(wsStatus, (status) => {
	if (status === 'CLOSED') {
		wsLive.value = null;
	}
});

const isGreatSphynxLive = computed<boolean>(() => {
	if (wsLive.value !== null) {
		return wsLive.value;
	}
	if (pollLive.value !== null) {
		return pollLive.value;
	}
	return (data.value?.angelthump ?? []).includes('GreatSphynx');
});

const { pause, resume } = useIntervalFn(
	async () => {
		try {
			const res = await fetch('/notification/live');
			if (res.ok) {
				const { isLive } = (await res.json()) as { isLive: boolean };
				const wasLive = isGreatSphynxLive.value;
				pollLive.value = isLive;
				if (isLive && !wasLive) {
					await execute();
				}
			}
		} catch {
			/*_*/
		}
	},
	30_000,
	{ immediate: true, immediateCallback: true }
);

watch(isGreatSphynxLive, (live) => {
	if (live) {
		pause();
	} else {
		resume();
	}
});

export function useStreamSource(): {
	isGreatSphynxLive: Ref<boolean>;
	twitchChannels: Ref<string[]>;
	loading: Ref<boolean>;
	errorMessage: Ref<string | null>;
	refresh: () => Promise<void>;
} {
	return {
		isGreatSphynxLive,
		twitchChannels: computed(() => data.value?.twitch ?? []),
		loading: isFetching,
		errorMessage: computed(() => (error.value ? String(error.value) : null)),
		refresh: execute
	};
}
