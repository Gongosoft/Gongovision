import { computed, ref, toValue, watch } from 'vue';
import { get, useIntervalFn, useTimestamp } from '@vueuse/core';
import { useStreamSource } from '@/composables/useStreamSource.ts';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import type { StreamInfoResponse, StreamSource } from '@/types/stream.d.ts';

const info = ref<StreamInfoResponse | null>(null);

async function refresh(): Promise<void> {
	try {
		const res = await fetch('/stream/info');
		if (!res.ok) {
			return;
		}
		info.value = await res.json();
	} catch {
		/*_*/
	}
}

interface UseStreamInfoReturn {
	info: typeof info;
	uptime: ComputedRef<string | null>;
}

export function useStreamInfo(source: MaybeRefOrGetter<StreamSource>): UseStreamInfoReturn {
	const { angelthumpLive, owncastStatus } = useStreamSource();

	watch(
		angelthumpLive,
		(live) => {
			if (live === true) {
				void refresh();
			} else if (live === false) {
				info.value = null;
			}
		},
		{ immediate: true }
	);

	const now = useTimestamp({
		scheduler: (update) => useIntervalFn(update, 1000)
	});

	const startedAt = computed<string | null>(() => {
		if (toValue(source) === 'owncast') {
			return get(owncastStatus)?.lastConnectTime ?? null;
		}
		return get(info)?.angelthump?.createdAt ?? null;
	});

	const uptime = computed(() => {
		const start = get(startedAt);
		if (!start) {
			return null;
		}
		const elapsed = Math.max(0, get(now) - Date.parse(start));
		const h = Math.floor(elapsed / 3_600_000);
		const m = Math.floor((elapsed % 3_600_000) / 60_000);
		const s = Math.floor((elapsed % 60_000) / 1000);
		return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	});

	return { info, uptime };
}
