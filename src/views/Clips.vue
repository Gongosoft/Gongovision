<script setup lang="ts">
import '@/styles/scene.css';
import '@/styles/status.css';
import '@videojs/html/video/skin';
import '@videojs/html/video/player';
import { useHead } from '@unhead/vue';
import { useRoute, useRouter } from 'vue-router';
import { get, useLocalStorage } from '@vueuse/core';
import { useClips } from '@/composables/useClips.ts';
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

watch(active, (i) => play(slotVideo(i)));

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

useHead({ title: computed(() => get(clip)?.name.replace(/^\[[^\]]*\]\s*|\s*\[[^\]]*\]$/g, '') ?? 'clips') });
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
						<video ref="videoA" playsinline preload="auto" @ended="onEnded" />
					</video-skin>
				</video-player>
			</div>
			<div class="stage" :class="{ active: active === 1 }">
				<video-player>
					<video-skin>
						<video ref="videoB" playsinline preload="auto" @ended="onEnded" />
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
		position: absolute;
		inset: 0;
		pointer-events: none;
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
