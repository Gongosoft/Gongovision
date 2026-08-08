<script setup lang="ts">
import '@videojs/html/video/skin';
import '@videojs/html/video/player';
import '@videojs/html/media/hlsjs-video';
import { computed, useTemplateRef } from 'vue';
import { useHead, useSeoMeta } from '@unhead/vue';
import { useStreamInfo } from '@/composables/useStreamInfo.ts';
import { get, useEventListener, useFavicon } from '@vueuse/core';

const { info, uptime } = useStreamInfo();
const stream = useTemplateRef<HTMLVideoElement>('stream');

useEventListener(stream, 'canplay', () => get(stream)?.play(), { once: true });

useFavicon(computed(() => get(info)?.user?.profile_logo_url ?? null));

useHead({ title: computed(() => get(uptime)) });

useSeoMeta({
	ogType: 'video.other',
	ogImage: `https://thumbnail.angelthump.com/thumbnails/${ANGELTHUMP.CHANNEL}.jpeg`,
	ogImageType: 'image/jpeg',
	ogImageWidth: '1920',
	ogImageHeight: '1080'
});
</script>

<template>
	<video-player>
		<video-skin>
			<hlsjs-video
				ref="stream"
				:config.prop="{
					hlsJs: {
						enableWorker: true,
						lowLatencyMode: true,
						startLevel: -1
					}
				}"
				src="/stream/m3u8"
				stream-type="live"
				playsinline
				autoplay />
		</video-skin>
	</video-player>
</template>

<style scoped>
video-skin {
	width: 100%;
	height: 100%;
}
</style>
