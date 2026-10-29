import { get, useIntervalFn } from '@vueuse/core';
import { computed, onScopeDispose, ref, toValue } from 'vue';
import { formatTimestamp, parseTimestamp } from '@/utils/format.ts';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export const SLEEP_TIMERS = [
	{ value: '5m', label: '5 minutes' },
	{ value: '10m', label: '10 minutes' },
	{ value: '15m', label: '15 minutes' },
	{ value: '20m', label: '20 minutes' },
	{ value: '30m', label: '30 minutes' },
	{ value: '45m', label: '45 minutes' },
	{ value: '60m', label: '60 minutes' },
	{ value: '90m', label: '90 minutes' }
];

interface UseSleepTimerReturn {
	/** currently selected option, empty when no timer is running */
	value: ComputedRef<string>;
	/** countdown displayed in the menu hint, empty when no timer is running */
	label: ComputedRef<string>;
	/** selecting the active option again cancels the timer */
	select: (value: string) => void;
}

export function useSleepTimer(
	player: MaybeRefOrGetter<HTMLMediaElement | null>,
	onExpire?: () => void
): UseSleepTimerReturn {
	const selected = ref('');
	const remaining = ref(0);

	function reset(): void {
		selected.value = '';
		remaining.value = 0;
	}

	const { pause, resume } = useIntervalFn(
		() => {
			if (get(remaining) > 1) {
				remaining.value -= 1;
				return;
			}
			reset();
			pause();
			toValue(player)?.pause();
			onExpire?.();
		},
		1000,
		{ immediate: false }
	);

	function stop(): void {
		reset();
		pause();
	}

	function start(option: (typeof SLEEP_TIMERS)[number]): void {
		selected.value = option.value;
		remaining.value = parseTimestamp(option.value);
		resume();
	}

	function select(value: string): void {
		if (get(selected) === value) {
			stop();
			return;
		}
		const option = SLEEP_TIMERS.find((item) => item.value === value);
		if (option) {
			start(option);
		}
	}

	onScopeDispose(pause);

	return {
		value: computed(() => get(selected)),
		label: computed(() => (get(selected) ? formatTimestamp(get(remaining)) : '')),
		select
	};
}
