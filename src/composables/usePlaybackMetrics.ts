// https://github.com/owncast/owncast/blob/develop/web/components/video/metrics/playback.js
import { computed, onBeforeUnmount, toValue, watch } from 'vue';
import { get, useEventListener, useIntervalFn } from '@vueuse/core';
import type { MaybeRefOrGetter } from 'vue';
import type { StreamSource } from '@/composables/usePlayerSettings.ts';

const REPORT_INTERVAL_MS = 10_000;
const MAX_LATENCY_MS = 100_000;

interface HlsEngine {
	readonly bandwidthEstimate: number;
	readonly latency: number;
	readonly levels: { readonly bitrate: number }[];
	readonly currentLevel: number;
	on: (event: string, listener: (event: string, data: FragLoadedData) => void) => void;
	off: (event: string, listener: (event: string, data: FragLoadedData) => void) => void;
}

interface FragLoadedData {
	stats?: { loading?: { start?: number; end?: number } };
}

export interface MetricsMediaElement extends HTMLElement {
	readonly engine?: HlsEngine | null;
	readonly paused: boolean;
	readonly seeking: boolean;
	readonly ended: boolean;
	readonly error: MediaError | null;
}

export function usePlaybackMetrics(
	element: MaybeRefOrGetter<MetricsMediaElement | null>,
	source: MaybeRefOrGetter<StreamSource>
): { sessionId: string } {
	const sessionId = crypto.randomUUID();
	const active = computed(() => toValue(source) === 'owncast');

	let hasStartedPlaying = false;
	let isStalled = false;
	let downloadMs = 0;
	let downloadCount = 0;
	let sequenceNumber = 0;
	let engine: HlsEngine | null = null;

	function onFragmentLoaded(_event: string, data: FragLoadedData): void {
		const { start, end } = data.stats?.loading ?? {};
		if (typeof start === 'number' && typeof end === 'number') {
			downloadMs += end - start;
			downloadCount += 1;
		}
	}

	function setEngine(next: HlsEngine | null): void {
		if (next === engine) {
			return;
		}
		engine?.off('hlsFragLoaded', onFragmentLoaded);
		engine = next;
		engine?.on('hlsFragLoaded', onFragmentLoaded);
	}

	function liveLatencyMs(): number | null {
		const latencyMs = Math.round((toValue(element)?.engine?.latency ?? 0) * 1000);
		return latencyMs > 0 && latencyMs < MAX_LATENCY_MS ? latencyMs : null;
	}

	function playerStateToken(el: MetricsMediaElement): string {
		if (el.seeking) {
			return 'k';
		}
		if (el.ended) {
			return 'e';
		}
		if (el.paused) {
			return 'a';
		}
		if (isStalled) {
			return 'w';
		}
		return 'p';
	}

	function commonKeys(): Record<string, unknown> {
		const keys: Record<string, unknown> = { v: 2, sid: sessionId };
		const hls = toValue(element)?.engine ?? null;

		const throughput = hls?.bandwidthEstimate;
		if (throughput) {
			keys.mtp = Math.round(throughput / 1000 / 100) * 100;
		}
		const bitrate = hls?.levels?.[hls.currentLevel]?.bitrate;
		if (bitrate) {
			keys.br = Math.round(bitrate / 1000);
		}
		const latency = liveLatencyMs();
		if (latency !== null) {
			keys.ltc = latency;
		}
		return keys;
	}

	async function sendReport(event: string, extra: Record<string, unknown> = {}): Promise<void> {
		sequenceNumber += 1;

		const el = toValue(element);
		const report: Record<string, unknown> = {
			...commonKeys(),
			...extra,
			e: event,
			ts: Date.now(),
			sn: sequenceNumber
		};

		if (report.sta === undefined && el) {
			report.sta = playerStateToken(el);
		}

		if (downloadCount > 0) {
			report.ttlb = Math.round(downloadMs / downloadCount);
			downloadMs = 0;
			downloadCount = 0;
		}

		try {
			await fetch(`${OWNCAST.HOST}/api/metrics/cmcd`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(report)
			});
		} catch {
			/*_*/
		}
	}

	function onBuffering(): void {
		if (!get(active) || !hasStartedPlaying || toValue(element)?.seeking || isStalled) {
			return;
		}
		isStalled = true;
		void sendReport('ps', { sta: 'w', bs: true });
	}

	useEventListener(element, 'playing', () => {
		if (!get(active)) {
			return;
		}
		setEngine(toValue(element)?.engine ?? null);
		const firstPlay = !hasStartedPlaying;
		hasStartedPlaying = true;
		isStalled = false;
		if (firstPlay) {
			void sendReport('ps', { sta: 'p' });
		}
	});

	useEventListener(element, 'pause', () => {
		if (!get(active) || toValue(element)?.ended) {
			return;
		}
		void sendReport('ps', { sta: 'a' });
	});

	useEventListener(element, 'ended', () => {
		if (!get(active)) {
			return;
		}
		void sendReport('ps', { sta: 'e' });
	});

	useEventListener(element, 'error', () => {
		if (!get(active)) {
			return;
		}
		const code = toValue(element)?.error?.code;
		void sendReport('e', code === undefined ? {} : { ec: String(code) });
	});

	useEventListener(element, 'waiting', onBuffering);
	useEventListener(element, 'stalled', onBuffering);

	useEventListener(element, 'canplaythrough', () => {
		isStalled = false;
	});

	useIntervalFn(() => {
		if (!get(active) || !hasStartedPlaying) {
			return;
		}
		if (toValue(element)?.paused) {
			void sendReport('t', { sta: 'a' });
			return;
		}
		void sendReport('t');
	}, REPORT_INTERVAL_MS);

	function stop(): void {
		setEngine(null);
		isStalled = false;
		if (hasStartedPlaying && !toValue(element)?.ended) {
			void sendReport('ps', { sta: 'e' });
		}
		hasStartedPlaying = false;
		downloadMs = 0;
		downloadCount = 0;
	}

	watch(active, (value) => {
		if (!value) {
			stop();
		}
	});

	onBeforeUnmount(stop);

	return { sessionId };
}
