<script setup lang="ts">
import '@/styles/scene.css';
import '@/styles/status.css';
import '@videojs/html/video/skin';
import '@videojs/html/video/player';
import { useHead } from '@unhead/vue';
import { useRoute, useRouter } from 'vue-router';
import { useVODs } from '@/composables/useVODs.ts';
import { computed, ref, useTemplateRef, watchEffect } from 'vue';
import { get, useEventListener, useThrottleFn } from '@vueuse/core';

const { vods, loading } = useVODs();
const route = useRoute();
const router = useRouter();
const title = computed(() => decodeURIComponent(String(route.params.title)));
const error = ref<string | null>(null);
const vod = computed(() => get(vods).find((v) => v.name === get(title)));

const video = useTemplateRef<HTMLVideoElement>('video');

/** reads `1h2m3s`, `2m3s`, `45s` and plain seconds */
function parseTimestamp(value: string | undefined): number {
	if (!value) {
		return 0;
	}
	if (/^\d+(?:\.\d+)?$/.test(value)) {
		return Number(value);
	}
	const match = /^(?:(?<h>\d+)h)?(?:(?<m>\d+)m)?(?:(?<s>\d+)s)?$/.exec(value);
	if (!match?.groups) {
		return 0;
	}
	const { h = 0, m = 0, s = 0 } = match.groups;
	return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function formatTimestamp(seconds: number): string {
	const whole = Math.floor(seconds);
	const h = Math.floor(whole / 3600);
	const m = Math.floor((whole % 3600) / 60);
	const s = whole % 60;
	return `${h ? `${h}h` : ''}${h || m ? `${m}m` : ''}${s}s`;
}

const startAt = parseTimestamp(typeof route.query.t === 'string' ? route.query.t : undefined);

useEventListener(video, 'loadedmetadata', () => {
	const el = get(video);
	if (el && startAt > 0 && startAt < el.duration) {
		el.currentTime = startAt;
	}
});

const writeTimestamp = useThrottleFn(
	(seconds: number) =>
		router.replace({ query: { ...route.query, t: seconds >= 1 ? formatTimestamp(seconds) : undefined } }),
	1000
);

useEventListener(video, 'timeupdate', () => {
	const el = get(video);
	if (el && el.readyState > 0) {
		void writeTimestamp(el.currentTime);
	}
});

watchEffect(() => {
	error.value = !get(loading) && !get(vod) ? `VOD not found: ${get(title)}` : null;
});

useHead({ title: computed(() => get(title).replace(/^\[[^\]]*\]\s*/, '')) });
</script>

<template>
	<div class="scene scene-dark">
		<div v-if="loading || error || !vod" class="status">
			<span v-if="loading">loading VOD...</span>
			<span v-else class="status-error">{{ error || 'VOD not found' }}</span>
			<a v-if="!loading" href="/vods" class="status-retry">back to VODs</a>
		</div>
		<div v-else id="vod">
			<video-player v-if="vod.url">
				<video-skin>
					<video ref="video" :src="vod.url" :poster="vod.thumbnail || undefined" autoplay playsinline />
				</video-skin>
			</video-player>
		</div>
	</div>
</template>

<style scoped>
#vod {
	background: var(--color-black);
	width: 100%;
	height: 100%;

	& video-skin {
		display: block;
		width: 100%;
		height: 100%;
	}
}
</style>
