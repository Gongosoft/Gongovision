<script setup lang="ts">
import '@/styles/scene.css';
import '@/styles/status.css';
import '@videojs/html/video/skin';
import '@videojs/html/video/player';
import SplitPane from '@/components/SplitPane.vue';
import ChatReplay from '@/components/ChatReplay.vue';
import SplitPaneEdges from '@/components/SplitPaneEdges.vue';
import fallbackThumb from '@/assets/images/thumbnails/fallback.avif';
import { useHead } from '@unhead/vue';
import { useRoute } from 'vue-router';
import { useRouteQuery } from '@vueuse/router';
import { useVODs } from '@/composables/useVODs.ts';
import { useChatReplay } from '@/composables/useChatReplay.ts';
import { computed, ref, useTemplateRef, watchEffect } from 'vue';
import { useMediaSession } from '@/composables/useMediaSession.ts';
import { formatTimestamp, parseTimestamp } from '@/utils/format.ts';
import { get, useMediaControls, watchThrottled, whenever } from '@vueuse/core';

const { vods, loading } = useVODs();
const route = useRoute();
const error = ref<string | null>(null);
const basename = computed(() => decodeURIComponent(String(route.params.title)));
const vod = computed(() => get(vods).find((v) => v.name === get(basename)));
const video = useTemplateRef<HTMLVideoElement>('video');

const t = useRouteQuery<string | undefined>('t');
const startAt = parseTimestamp(get(t));
const { currentTime, duration } = useMediaControls(video);

const chatURL = computed(() => {
	const current = get(vod);
	return current ? `/b2/twitch_vods/chat/${encodeURIComponent(`${current.name}.chat.json`)}` : null;
});

const { available: hasChat, visible: chatLines } = useChatReplay(chatURL, currentTime);

whenever(
	duration,
	(length) => {
		if (startAt > 0 && startAt < length) {
			currentTime.value = startAt;
		}
	},
	{ once: true }
);

watchThrottled(
	currentTime,
	(seconds) => {
		t.value = seconds >= 1 ? formatTimestamp(seconds, 'labeled') : undefined;
	},
	{ throttle: 1000 }
);

watchEffect(() => {
	error.value = !get(loading) && !get(vod) ? `VOD not found: ${get(basename)}` : null;
});

const title = computed(() => get(basename).replace(/^\[[^\]]*\]\s*/, ''));

const metadata = computed<MediaMetadataInit | null>(() => {
	const current = get(vod);
	if (!current) {
		return null;
	}
	return {
		title: get(basename),
		artist: 'GreatSphynx',
		album: 'gongo VODs',
		artwork: current.thumbnail ? [{ src: current.thumbnail }] : [{ src: fallbackThumb }]
	};
});

useHead({ title });
useMediaSession(metadata);
</script>

<template>
	<div class="scene scene-dark">
		<div v-if="loading || error || !vod" class="status">
			<span v-if="loading">loading VOD...</span>
			<span v-else class="status-error">{{ error || 'VOD not found' }}</span>
			<a v-if="!loading" href="/vods" class="status-retry">back to VODs</a>
		</div>
		<SplitPane v-else id="vod" :collapsed="!hasChat">
			<video-player>
				<video-skin>
					<video ref="video" :src="vod.url" :poster="vod.thumbnail || undefined" autoplay playsinline />
				</video-skin>
			</video-player>
			<SplitPaneEdges />
			<template #side><ChatReplay :lines="chatLines" /></template>
		</SplitPane>
	</div>
</template>

<style scoped>
#vod {
	background: var(--color-black);
	width: 100%;
	height: 100%;

	& video-player {
		display: block;
		flex: 1;
		min-height: 0;
		width: 100%;
		height: 100%;

		& video-skin {
			display: block;
			width: 100%;
			height: 100%;
		}
	}
}
</style>
