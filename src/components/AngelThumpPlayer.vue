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
				:config.prop="{
					hlsJs: {
						enableWorker: true,
						lowLatencyMode: true,
						startLevel: -1
					}
				}"
				:src
				stream-type="live"
				playsinline
				autoplay />
		</template>
		<template #poster>
			<img :src="`https://thumbnail.angelthump.com/thumbnails/${SPHYNX}.jpeg`" />
		</template>
		<template #settings>
			<media-menu-item commandfor="settings-region-menu" class="media-menu__item media-menu__item--submenu">
				<media-icon name="switches" class="media-icon"></media-icon>
				CDN
				<span class="media-menu__hint">
					<span class="media-menu__hint-label">{{ regionLabel }}</span>
					<media-icon name="chevron" class="media-icon media-menu__chevron"></media-icon>
				</span>
			</media-menu-item>
		</template>
		<template #settings-menu>
			<media-menu id="settings-region-menu" class="media-menu__panel">
				<media-menu-back class="media-menu__back" label="Region">
					<media-icon name="chevron" class="media-icon media-menu__chevron media-icon--flipped"></media-icon>
					Region
				</media-menu-back>
				<div class="media-menu__separator"></div>
				<media-menu-radio-group ref="regionGroup" :value="region" class="media-menu__group">
					<media-menu-radio-item
						v-for="(config, id) in REGIONS"
						:key="id"
						:value="id"
						class="media-menu__item">
						<span data-part="label">{{ config.label }}</span>
						<media-menu-item-indicator force-mount class="media-menu__indicator">
							<media-icon name="check" class="media-icon"></media-icon>
						</media-menu-item-indicator>
					</media-menu-radio-item>
				</media-menu-radio-group>
			</media-menu>
		</template>
	</VideoJS>
</template>
