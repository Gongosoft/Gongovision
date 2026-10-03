import { useLocalStorage } from '@vueuse/core';
import { onMounted, onUnmounted, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { VideoPlayerStore } from '@videojs/html';

interface PlayerSettings {
	volume: number;
	muted: boolean;
	quality: string;
}

export interface PlayerElement {
	readonly store: VideoPlayerStore;
}

type VideoRendition = VideoPlayerStore['videoRenditionList'][number];

function hasStoredSettings(): boolean {
	try {
		return localStorage.getItem('stream:settings') !== null;
	} catch {
		return false;
	}
}

function selectedQuality(renditions: VideoRendition[]): string {
	const selected = renditions.find((rendition) => rendition.selected);
	return selected ? selected.id : 'auto';
}

export function usePlayerSettings(player: MaybeRefOrGetter<PlayerElement | null>): void {
	const hadStoredSettings = hasStoredSettings();
	const settings = useLocalStorage<PlayerSettings>(
		'stream:settings',
		{
			volume: 1,
			muted: false,
			quality: 'auto'
		},
		{ writeDefaults: false }
	);

	let unsubscribe: (() => void) | undefined = undefined;

	onMounted(() => {
		const store = toValue(player)?.store;
		if (!store) {
			return;
		}

		let restored = false;
		let qualitySeen: string | undefined = undefined;

		const restore = (): void => {
			if (!hadStoredSettings) {
				return;
			}
			store.setVolume(settings.value.volume);
			if (settings.value.muted && settings.value.volume > 0) {
				store.setMuted(true);
			}
		};

		const sync = (): void => {
			if (!store.target) {
				return;
			}

			if (!restored) {
				restore();
				restored = true;
				return;
			}

			if (store.volumeAvailability === 'available') {
				settings.value.volume = store.volume;
			}
			if (store.mutedAvailability === 'available') {
				settings.value.muted = store.muted;
			}

			const renditions = store.videoRenditionList;
			if (!renditions.length) {
				qualitySeen = undefined;
				return;
			}

			const quality = selectedQuality(renditions);
			if (qualitySeen === undefined) {
				qualitySeen = quality;
				const saved = settings.value.quality;
				if (quality !== saved && (saved === 'auto' || renditions.some((rendition) => rendition.id === saved))) {
					store.selectVideoRendition(saved);
				}
				return;
			}

			if (quality !== qualitySeen) {
				qualitySeen = quality;
				settings.value.quality = quality;
			}
		};

		unsubscribe = store.subscribe(sync);
		sync();
	});

	onUnmounted(() => {
		unsubscribe?.();
	});
}
