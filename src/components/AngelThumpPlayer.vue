<script setup lang="ts">
import '@videojs/html/media/hlsjs-video';
import VideoJS from '@/components/VideoJS.vue';
import { useHead, useSeoMeta } from '@unhead/vue';
import { computed, useTemplateRef, watchEffect } from 'vue';
import { useStreamInfo } from '@/composables/useStreamInfo.ts';
import { get, useEventListener, useFavicon, useLocalStorage } from '@vueuse/core';

const { CDN, CHANNEL: SPHYNX } = ANGELTHUMP;

const REGIONS = {
	auto: { label: 'Auto' },
	...CDN
};

type Region = keyof typeof REGIONS;

const { info, uptime } = useStreamInfo();
const stream = useTemplateRef<HTMLVideoElement>('stream');
const regionGroup = useTemplateRef<HTMLElement>('regionGroup');
const region = useLocalStorage<Region>('stream:region', 'auto');
const regionLabel = computed(() => REGIONS[get(region) ?? 'auto'].label);
const videojs = useTemplateRef<{ currentTime: HTMLElement | null }>('videojs');

const src = computed(() => {
	const selected = get(region) ?? 'auto';
	return selected === 'auto' ? '/stream/m3u8' : `/stream/m3u8?region=${selected}`;
});

useEventListener(stream, 'canplay', async () => {
	try {
		await get(stream)?.play();
	} catch {
		/*_*/
	}
});

useEventListener(stream, 'error', (e) => console.error('video.js', e.message));

useEventListener(regionGroup, 'value-change', (e) => {
	const value = (e as CustomEvent<{ value: string }>).detail?.value;
	if (value in REGIONS) {
		region.value = value as Region;
	}
});

useFavicon(computed(() => get(info)?.user?.profile_logo_url ?? null));

useHead({ title: computed(() => get(uptime)) });

useSeoMeta({
	ogType: 'video.other',
	ogImage: `https://thumbnail.angelthump.com/thumbnails/${SPHYNX}.jpeg`,
	ogImageType: 'image/jpeg',
	ogImageWidth: '1920',
	ogImageHeight: '1080'
});

watchEffect(() => {
	const value = get(uptime);
	if (value === null) {
		return;
	}
	const currentTime = get(videojs)?.currentTime;
	if (currentTime) {
		currentTime.textContent = value;
	}
});
</script>

<template>
	<VideoJS ref="videojs">
		<template #media>
			<hlsjs-video
				ref="stream"
				:source.prop="{
					src,
					engine: {
						hlsJs: {
							enableWorker: true,
							lowLatencyMode: true,
							startLevel: -1
						}
					}
				}"
				stream-type="live"
				playsinline
				autoplay />
		</template>
		<template #poster>
			<img class="media-poster-image" :src="`https://thumbnail.angelthump.com/thumbnails/${SPHYNX}.jpeg`" />
		</template>
		<template #settings>
			<media-menu-item commandfor="settings-region-content" class="media-menu-trigger-item">
				<media-icon name="switches" class="media-menu-trigger-item-icon"></media-icon>
				CDN
				<span class="media-menu-hint">
					<span class="media-menu-hint-label">{{ regionLabel }}</span>
					<media-icon name="chevron" class="media-menu-forward-chevron"></media-icon>
				</span>
			</media-menu-item>
		</template>
		<template #settings-menu>
			<media-menu-content id="settings-region-content" class="media-menu-content">
				<media-menu-item class="media-menu-back-item">
					<media-icon name="chevron" class="media-menu-back-chevron"></media-icon>
					Region
				</media-menu-item>
				<media-menu-separator class="media-menu-separator"></media-menu-separator>
				<media-menu-radio-group ref="regionGroup" :value="region" class="media-menu-radio-group">
					<media-menu-radio-item
						v-for="(config, id) in REGIONS"
						:key="id"
						:value="id"
						class="media-menu-radio-item">
						<span data-part="label">{{ config.label }}</span>
						<media-menu-item-indicator force-mount class="media-menu-item-indicator">
							<media-icon name="check" class="media-menu-radio-item-icon"></media-icon>
						</media-menu-item-indicator>
					</media-menu-radio-item>
				</media-menu-radio-group>
			</media-menu-content>
		</template>
	</VideoJS>
</template>
