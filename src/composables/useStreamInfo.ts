import { get, useNow } from '@vueuse/core';
import { computed, ref, shallowRef } from 'vue';
import type { ComputedRef } from 'vue';
import type { AngelThumpStreamResponse } from '@/types/angelthump.d.ts';

const info = ref<AngelThumpStreamResponse | null>(null);

async function refresh(): Promise<void> {
	try {
		const res = await fetch('/stream/info');
		if (!res.ok) {
			return;
		}
		info.value = (await res.json()) as AngelThumpStreamResponse;
	} catch {
		/*_*/
	}
}

export function useStreamInfo(): {
	info: typeof info;
	uptime: ComputedRef<string | null>;
} {
	if (info.value === null) {
		void refresh();
	}

	const now = useNow({
		scheduler: (fn) => {
			const id = setInterval(fn, 1000);
			const active = shallowRef(true);
			return {
				isActive: active,
				pause: (): void => {
					clearInterval(id);
					active.value = false;
				},
				resume: (): void => {
					active.value = true;
				}
			};
		}
	});

	const uptime = computed(() => {
		const stream = get(info);
		if (!stream?.createdAt) {
			return null;
		}
		const elapsed = Math.max(0, get(now).getTime() - Date.parse(stream.createdAt));
		const h = Math.floor(elapsed / 3_600_000);
		const m = Math.floor((elapsed % 3_600_000) / 60_000);
		const s = Math.floor((elapsed % 60_000) / 1000);
		return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	});

	return { info, uptime };
}
