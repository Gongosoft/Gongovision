<script setup lang="ts">
import '@videojs/html/live-audio/player';
import '@/components/videojs/live-audio/skin.ts';
import { useVolumeWheel } from '@/composables/useVolumeWheel.ts';
import { useMediaSession } from '@/composables/useMediaSession.ts';
import { get, useEventListener, useLocalStorage } from '@vueuse/core';
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import type { LiveAudioPlayerElement } from '@videojs/html/live-audio';
import type { ApiSong } from '@/types/azuracast.d.ts';

const {
	src,
	song = null,
	elapsed = 0,
	duration = 0
} = defineProps<{
	/** Icecast mount URL */
	src: string;
	song?: ApiSong | null;
	/** seconds into the current track on the server */
	elapsed?: number;
	/** current track length in seconds; 0 while unknown (e.g. a live DJ) */
	duration?: number;
}>();

defineEmits<{
	/** open the song history popup */
	history: [];
}>();

const progress = computed(() => (duration > 0 ? Math.min((elapsed / duration) * 100, 100) : 0));

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = String(Math.floor(seconds % 60)).padStart(2, '0');
	return `${m}:${s}`;
}

/** resuming a paused Icecast stream after this long reconnects at live instead of playing stale buffer */
const RESUME_LIVE_AFTER = 2000;
const RECONNECT_DELAY = 5000;
const DEFAULT_PREFS = { volume: 1, muted: false };

const player = useTemplateRef<LiveAudioPlayerElement>('player');
const container = useTemplateRef<HTMLElement>('container');
const audio = useTemplateRef<HTMLAudioElement>('audio');
const prefs = useLocalStorage('radio:volume', DEFAULT_PREFS);

// a fresh URL per connection: Firefox otherwise replays its cached copy of the stream
const nonce = ref(Date.now());
const streamUrl = computed(() => {
	const url = new URL(src);
	url.searchParams.set('_', String(get(nonce)));
	return url.toString();
});

let pausedAt: number | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined = undefined;

async function reconnect(): Promise<void> {
	clearTimeout(reconnectTimer);
	nonce.value = Date.now();
	await nextTick();
	try {
		await get(audio)?.play();
	} catch {
		/* a later user gesture or reconnect retries */
	}
}

useEventListener(audio, 'pause', () => {
	pausedAt = Date.now();
});

useEventListener(audio, 'play', () => {
	const stale = pausedAt !== null && Date.now() - pausedAt > RESUME_LIVE_AFTER;
	pausedAt = null;
	if (stale) {
		void reconnect();
	}
});

useEventListener(audio, 'error', () => {
	const media = get(audio);
	if (media?.error?.code === MediaError.MEDIA_ERR_NETWORK && pausedAt === null) {
		reconnectTimer = setTimeout(() => void reconnect(), RECONNECT_DELAY);
	}
});

watch(
	() => src,
	() => {
		if (get(audio)?.paused === false) {
			void reconnect();
		}
	}
);

let unsubscribe: (() => void) | undefined = undefined;

onMounted(() => {
	const store = get(player)?.store;
	if (!store) {
		return;
	}
	let restored = false;
	const sync = (): void => {
		if (!store.target) {
			return;
		}
		const saved = prefs.value ?? DEFAULT_PREFS;
		if (!restored) {
			restored = true;
			store.setVolume(saved.volume);
			if (saved.muted) {
				store.setMuted(true);
			}
			return;
		}
		const { volume, muted } = store;
		if (volume !== saved.volume || muted !== saved.muted) {
			prefs.value = { volume, muted };
		}
	};
	unsubscribe = store.subscribe(sync);
	sync();
});

onUnmounted(() => {
	unsubscribe?.();
	clearTimeout(reconnectTimer);
});

useVolumeWheel(container, player);

const metadata = computed<MediaMetadataInit | null>(() => {
	if (!song) {
		return null;
	}
	return {
		title: song.title ?? song.text ?? '',
		artist: song.artist?.replaceAll(';', ',') ?? '',
		album: song.album ?? '',
		artwork: song.art ? [{ src: song.art }] : []
	};
});

useMediaSession(metadata);
</script>

<template>
	<live-audio-player ref="player" class="radio-player">
		<media-container
			ref="container"
			class="media-skin media-container audio-skin"
			data-theme="default"
			data-preset="live-audio">
			<audio ref="audio" :src="streamUrl" preload="none" crossorigin="anonymous"></audio>
			<media-error-dialog class="audio-dialog-root">
				<media-dialog-backdrop class="audio-dialog-backdrop"> </media-dialog-backdrop>
				<media-dialog-popup class="audio-dialog-popup">
					<div class="audio-dialog-content">
						<media-dialog-title class="audio-dialog-title"> </media-dialog-title>
						<media-dialog-description class="audio-dialog-description"> </media-dialog-description>
					</div>
					<div class="audio-dialog-actions">
						<media-dialog-close class="media-button audio-dialog-close"> </media-dialog-close>
					</div>
				</media-dialog-popup>
			</media-error-dialog>
			<media-controls visibility="always">
				<media-controls-content class="audio-controls audio-controls-content">
					<media-tooltip-group>
						<media-controls-group class="audio-controls-start">
							<div class="audio-play-button">
								<media-buffering-indicator
									class="media-buffering-indicator audio-play-button-buffering-indicator">
									<media-icon name="spinner" class="media-buffering-indicator-spinner-icon">
									</media-icon>
								</media-buffering-indicator>
								<media-play-button class="media-button media-play-button" id="radio-play-trigger">
									<media-icon name="restart" class="media-button-icon media-play-button-restart-icon">
									</media-icon>
									<media-icon name="play" class="media-button-icon media-play-button-play-icon">
									</media-icon>
									<media-icon name="pause" class="media-button-icon media-play-button-pause-icon">
									</media-icon>
								</media-play-button>
								<media-tooltip
									trigger="radio-play-trigger"
									boundary="viewport"
									side="top"
									class="media-popup media-popup-safe-area media-popup-transition media-popup-surface media-tooltip">
									<media-tooltip-label> </media-tooltip-label>
									<media-tooltip-shortcut class="media-tooltip-shortcut"> </media-tooltip-shortcut>
								</media-tooltip>
							</div>
						</media-controls-group>
						<div class="audio-controls-spacer radio-track">
							<template v-if="duration > 0">
								<span class="radio-track-time">{{ formatTime(elapsed) }}</span>
								<div class="radio-track-bar">
									<div class="radio-track-fill" :style="{ width: `${progress}%` }"></div>
								</div>
								<span class="radio-track-time">{{ formatTime(duration) }}</span>
							</template>
							<slot></slot>
						</div>
						<media-controls-group class="audio-controls-end">
							<button
								type="button"
								class="media-button radio-history-button"
								title="Song History"
								aria-label="Song History"
								@click="$emit('history')">
								<media-icon name="restart" class="media-button-icon"> </media-icon>
							</button>
							<media-mute-button
								commandfor="radio-volume-popup"
								class="media-button media-mute-button"
								id="radio-mute-trigger">
								<media-icon name="volume-off" class="media-button-icon media-mute-button-off-icon">
								</media-icon>
								<media-icon name="volume-low" class="media-button-icon media-mute-button-low-icon">
								</media-icon>
								<media-icon name="volume-high" class="media-button-icon media-mute-button-high-icon">
								</media-icon>
							</media-mute-button>
							<media-tooltip
								trigger="radio-mute-trigger"
								delay="0"
								disabled
								sticky
								side="top"
								class="media-popup media-popup-safe-area media-popup-transition media-popup-surface media-tooltip">
								<media-tooltip-label> </media-tooltip-label>
								<media-tooltip-shortcut class="media-tooltip-shortcut"> </media-tooltip-shortcut>
							</media-tooltip>
							<media-volume-popover
								open-on-hover
								delay="200"
								close-delay="100"
								side="top"
								boundary="viewport"
								class="media-popup media-popup-safe-area media-popup-transition media-popup-surface media-volume-popover"
								id="radio-volume-popup">
								<media-volume-slider
									class="media-slider media-volume-slider"
									thumb-alignment="edge"
									orientation="vertical">
									<media-slider-track class="media-slider-track">
										<media-slider-fill class="media-slider-fill"> </media-slider-fill>
									</media-slider-track>
									<media-slider-thumb class="media-slider-thumb media-volume-slider-thumb">
									</media-slider-thumb>
								</media-volume-slider>
							</media-volume-popover>
						</media-controls-group>
					</media-tooltip-group>
				</media-controls-content>
			</media-controls>
			<media-hotkey keys="Space" action="togglePaused"> </media-hotkey>
			<media-hotkey keys="k" action="togglePaused"> </media-hotkey>
			<media-hotkey keys="m" action="toggleMuted"> </media-hotkey>
			<media-hotkey keys="ArrowUp" action="volumeStep"> </media-hotkey>
			<media-hotkey keys="ArrowDown" action="volumeStep"> </media-hotkey>
			<media-status-announcer class="media-status-announcer"> </media-status-announcer>
		</media-container>
	</live-audio-player>
</template>

<style scoped>
.radio-player {
	display: block;
}

.radio-track {
	align-items: center;
	color: var(--media-controls-foreground);
	display: flex;
	gap: 0.35rem;
	min-width: 0;

	& .radio-track-time {
		flex-shrink: 0;
		font-size: 0.65rem;
		font-variant-numeric: tabular-nums;
		opacity: 0.75;
	}

	& .radio-track-bar {
		background: rgb(0 0 0 / 0.6);
		border-radius: 9999px;
		box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.18);
		flex: 1;
		height: 0.5rem;
		min-width: 1rem;
		position: relative;
	}

	@container media-root (width < 13rem) {
		& .radio-track-time {
			display: none;
		}
	}

	& .radio-track-fill {
		background: #fff;
		border-radius: inherit;
		height: 100%;
		position: relative;
		transition: width 1s linear;
	}
}
</style>
