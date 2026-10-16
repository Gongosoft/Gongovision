<script setup lang="ts">
import '@videojs/html/media/hlsjs-video';
import VideoJS from '@/components/VideoJS.vue';
import { useHead, useSeoMeta } from '@unhead/vue';
import { computed, useTemplateRef, watchEffect } from 'vue';
import { useStreamInfo } from '@/composables/useStreamInfo.ts';
import { useStreamSource } from '@/composables/useStreamSource.ts';
import { usePlaybackMetrics } from '@/composables/usePlaybackMetrics.ts';
import { useStreamSourceSetting } from '@/composables/usePlayerSettings.ts';
import { get, useEventListener, useFavicon, useIntervalFn, useLocalStorage, useTimestamp } from '@vueuse/core';
import type { StreamSource } from '@/composables/usePlayerSettings.ts';

const SOURCES: Record<StreamSource, { label: string }> = {
	owncast: { label: 'Owncast' },
	angelthump: { label: 'AngelThump' }
};

const REGIONS = {
	auto: { label: 'Auto' },
	...ANGELTHUMP.CDN
};

type Region = keyof typeof REGIONS;

const sourceSetting = useStreamSourceSetting();
const { angelthumpLive, owncastLive } = useStreamSource();
const stream = useTemplateRef<HTMLVideoElement>('stream');
const lowLatency = useLocalStorage('stream:lowLatency', true);
const sourceGroup = useTemplateRef<HTMLElement>('sourceGroup');
const regionGroup = useTemplateRef<HTMLElement>('regionGroup');
const region = useLocalStorage<Region>('stream:region', 'auto');
const videojs = useTemplateRef<{ currentTime: HTMLElement | null }>('videojs');

const sourceLabel = computed(() => SOURCES[get(sourceSetting)].label);
const regionLabel = computed(() => REGIONS[get(region) ?? 'auto'].label);

const live = { owncast: owncastLive, angelthump: angelthumpLive } as const;

const effectiveSource = computed<StreamSource>(() => {
	const selected = get(sourceSetting);
	if (get(live[selected]) !== false) {
		return selected;
	}
	const fallback: StreamSource = selected === 'owncast' ? 'angelthump' : 'owncast';
	return get(live[fallback]) === true ? fallback : selected;
});

const { info, uptime } = useStreamInfo(effectiveSource);
const { sessionId } = usePlaybackMetrics(stream, effectiveSource);

const showSource = computed(() => get(live.owncast) === true && get(live.angelthump) === true);

const src = computed(() => {
	if (get(effectiveSource) === 'owncast') {
		return `${OWNCAST.HOST}/hls/stream.m3u8`;
	}
	const selected = get(region) ?? 'auto';
	return selected === 'auto' ? '/stream/m3u8' : `/stream/m3u8?region=${selected}`;
});

const source = computed(() => ({
	src: src.value,
	engine: {
		hlsJs: {
			enableWorker: true,
			startLevel: -1,
			lowLatencyMode: get(lowLatency),
			...(get(effectiveSource) === 'owncast' ? { cmcd: { sessionId } } : {})
		}
	}
}));

const thumbnail = useTimestamp({
	scheduler: (update) => useIntervalFn(update, 20_000)
});

const poster = computed(() =>
	get(effectiveSource) === 'owncast'
		? `${OWNCAST.HOST}/thumbnail.jpg?${get(thumbnail)}=`
		: `https://thumbnail.angelthump.com/thumbnails/${ANGELTHUMP.CHANNEL}.jpeg`
);

function setLowLatency(event: CustomEvent<{ checked: boolean }>): void {
	lowLatency.value = event.detail.checked;
}

function setSource(event: CustomEvent<{ value: StreamSource }>): void {
	const { value } = event.detail;
	if (value === 'owncast' || value === 'angelthump') {
		sourceSetting.value = value;
	}
}

useEventListener(sourceGroup, 'value-change', setSource);

useEventListener(regionGroup, 'value-change', (event: CustomEvent<{ value: string }>) => {
	const { value } = event.detail;
	if (value in REGIONS) {
		region.value = value as Region;
	}
});

useEventListener(stream, 'canplay', async () => {
	try {
		await get(stream)?.play();
	} catch {
		/*_*/
	}
});

useEventListener(stream, 'error', (e) => console.error('video.js', e.message));

useFavicon(
	computed(() =>
		get(effectiveSource) === 'owncast'
			? `${OWNCAST.HOST}/favicon.ico`
			: (get(info)?.angelthump?.user?.profile_logo_url ?? null)
	)
);

useHead({ title: computed(() => get(uptime)) });

useSeoMeta({
	ogType: 'video.other',
	ogImage: poster,
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
	<VideoJS ref="videojs" :show-playback-rate="false">
		<template #media>
			<hlsjs-video ref="stream" :source.prop="source" stream-type="live" playsinline autoplay />
		</template>
		<template #poster>
			<img class="media-poster-image" :src="poster" />
		</template>
		<template #settings>
			<media-menu-checkbox-item
				:checked.prop="lowLatency"
				class="media-menu-radio-item"
				@checked-change="setLowLatency">
				<media-icon name="speed" class="media-menu-radio-item-icon"></media-icon>
				<span>Low Latency</span>
				<media-menu-item-indicator force-mount class="media-menu-item-indicator">
					<media-icon name="check" class="media-menu-radio-item-icon"></media-icon>
				</media-menu-item-indicator>
			</media-menu-checkbox-item>
			<media-menu-item v-if="showSource" commandfor="settings-source-content" class="media-menu-trigger-item">
				<media-icon name="globe" class="media-menu-trigger-item-icon"></media-icon>
				Source
				<span class="media-menu-hint">
					<span class="media-menu-hint-label">{{ sourceLabel }}</span>
					<media-icon name="chevron" class="media-menu-forward-chevron"></media-icon>
				</span>
			</media-menu-item>
			<media-menu-item
				v-if="effectiveSource === 'angelthump'"
				commandfor="settings-region-content"
				class="media-menu-trigger-item">
				<media-icon name="switches" class="media-menu-trigger-item-icon"></media-icon>
				CDN
				<span class="media-menu-hint">
					<span class="media-menu-hint-label">{{ regionLabel }}</span>
					<media-icon name="chevron" class="media-menu-forward-chevron"></media-icon>
				</span>
			</media-menu-item>
		</template>
		<template #settings-menu>
			<media-menu-content v-if="showSource" id="settings-source-content" class="media-menu-content">
				<media-menu-item class="media-menu-back-item">
					<media-icon name="chevron" class="media-menu-back-chevron"></media-icon>
					Source
				</media-menu-item>
				<media-menu-separator class="media-menu-separator"></media-menu-separator>
				<media-menu-radio-group ref="sourceGroup" :value="sourceSetting" class="media-menu-radio-group">
					<media-menu-radio-item
						v-for="(config, id) in SOURCES"
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
			<media-menu-content
				v-if="effectiveSource === 'angelthump'"
				id="settings-region-content"
				class="media-menu-content">
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
