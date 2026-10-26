<script setup lang="ts">
import '@/styles/scene.css';
import '@/styles/status.css';
import '@videojs/html/video/skin';
import '@videojs/html/video/player';
import mediaImage from '@/assets/images/offline-background.avif';
import { useHead } from '@unhead/vue';
import { useRoute, useRouter } from 'vue-router';
import { get, useLocalStorage } from '@vueuse/core';
import { useClips } from '@/composables/useClips.ts';
import { useMediaSession } from '@/composables/useMediaSession.ts';
import { computed, ref, useTemplateRef, watch, watchEffect } from 'vue';

const route = useRoute();
const router = useRouter();
const played = useLocalStorage<string[]>('clips:played', []);
const { clips, loading, errorMessage } = useClips();

const clip = computed(() => get(clips).find((c) => c.name === route.params.title));

const slots = ref([
	{ name: '', url: '' },
	{ name: '', url: '' }
]);

const videoA = useTemplateRef<HTMLVideoElement>('videoA');
const videoB = useTemplateRef<HTMLVideoElement>('videoB');
const active = computed(() => {
	const index = slots.value.findIndex((s) => s.name === get(clip)?.name);
	return index === -1 ? 0 : index;
});

const playbackRate = ref(1);

function setSpeed(video: HTMLVideoElement | null): void {
	if (!video) {
		return;
	}
	video.defaultPlaybackRate = get(playbackRate);
	video.playbackRate = get(playbackRate);
	video.dispatchEvent(new Event('ratechange'));
}

function onSpeedChange(event: Event): void {
	const video = event.target as HTMLVideoElement;
	const current = get(active) === 0 ? get(videoA) : get(videoB);
	if (video !== current || video.playbackRate === get(playbackRate)) {
		return;
	}
	playbackRate.value = video.playbackRate;
	setSpeed(get(videoA));
	setSpeed(get(videoB));
}

async function play(video: HTMLVideoElement | null): Promise<void> {
	if (!video) {
		return;
	}
	try {
		await video.play();
	} catch {
		/*_*/
	}
}

function load(video: HTMLVideoElement | null, url: string): void {
	if (!video) {
		return;
	}
	video.src = url;
	setSpeed(video);
	video.load();
}

function slotVideo(i: number): HTMLVideoElement | null {
	return i === 0 ? get(videoA) : get(videoB);
}

function pickClip(exclude?: string): string | null {
	const list = get(clips);
	if (list.length === 0) {
		return null;
	}
	const seen = new Set(get(played));
	let pool = list.filter((c) => c.name !== exclude && !seen.has(c.name));
	if (pool.length === 0) {
		played.value = [];
		pool = list.filter((c) => c.name !== exclude);
	}
	if (pool.length === 0) {
		pool = list;
	}
	return pool[Math.floor(Math.random() * pool.length)]!.name;
}

function goRandom(): void {
	const name = pickClip();
	if (name) {
		router.push(`/clips/${encodeURIComponent(name)}`);
	}
}

function onEnded(): void {
	const staged = slots.value[1 - get(active)]!;
	if (staged.name) {
		router.push(`/clips/${encodeURIComponent(staged.name)}`);
	} else {
		goRandom();
	}
}

watch(active, (i) => {
	setSpeed(slotVideo(i));
	void play(slotVideo(i));
});

watchEffect(
	() => {
		if (get(loading)) {
			return;
		}
		const current = get(clip);
		if (!current) {
			goRandom();
			return;
		}
		const seen = get(played) ?? [];
		if (!seen.includes(current.name)) {
			played.value = [...seen, current.name];
		}

		if (slots.value.findIndex((s) => s.name === current.name) === -1) {
			slots.value[0] = { name: current.name, url: current.url };
			load(slotVideo(0), current.url);
			play(slotVideo(0));
		}

		const staged = pickClip(current.name);
		if (staged) {
			const stagedClip = get(clips).find((c) => c.name === staged);
			const other = 1 - get(active);
			if (stagedClip && slots.value[other]!.name !== stagedClip.name) {
				slots.value[other] = { name: stagedClip.name, url: stagedClip.url };
				load(slotVideo(other), stagedClip.url);
			}
		}
	},
	{ flush: 'post' }
);

const title = computed(() => get(clip)?.name.replace(/^\[[^\]]*\]\s*|\s*\[[^\]]*\]$/g, '') ?? 'clips');
const clipper = computed(() => {
	const name = get(clip)?.name.replace(/^\[[^\]]*\]\s*/, '') ?? '';
	return name.match(/\[(?<artist>[^\]]+)\]\s*$/)?.groups?.artist?.trim() || 'GreatSphynx';
});

const metadata = computed<MediaMetadataInit | null>(() =>
	get(clip) ? { title: get(title), artist: get(clipper), album: 'gongo clips', artwork: [{ src: mediaImage }] } : null
);

useHead({ title });
useMediaSession(metadata);
</script>

<template>
	<div class="scene scene-dark">
		<div v-if="loading || errorMessage || !clip" class="status">
			<span v-if="loading">loading clips...</span>
			<span v-else class="status-error">{{ errorMessage || 'no clips available' }}</span>
		</div>
		<div v-else id="clips">
			<div class="stage" :class="{ active: active === 0 }">
				<video-player>
					<video-skin>
						<video ref="videoA" playsinline preload="auto" @ended="onEnded" @ratechange="onSpeedChange" />
					</video-skin>
				</video-player>
			</div>
			<div class="stage" :class="{ active: active === 1 }">
				<video-player>
					<video-skin>
						<video ref="videoB" playsinline preload="auto" @ended="onEnded" @ratechange="onSpeedChange" />
					</video-skin>
				</video-player>
			</div>
		</div>
	</div>
</template>

<style scoped>
#clips {
	background: var(--color-black);
	position: relative;
	width: 100%;
	height: 100%;

	& .stage {
		inset: 0;
		pointer-events: none;
		position: absolute;
		visibility: hidden;

		&.active {
			pointer-events: auto;
			visibility: visible;
		}

		& video-skin {
			display: block;
			width: 100%;
			height: 100%;
		}
	}
}
</style>
