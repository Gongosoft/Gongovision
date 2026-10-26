<script setup lang="ts">
import '@videojs/html/media/hlsjs-video';
import VideoJS from '@/components/VideoJS.vue';
import { useHead, useSeoMeta } from '@unhead/vue';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useStreamInfo } from '@/composables/useStreamInfo.ts';
import { useClipRecorder } from '@/composables/useClipRecorder.ts';
import { useWatchingStream } from '@/composables/useWatchingStream.ts';
import { usePlaybackMetrics } from '@/composables/usePlaybackMetrics.ts';
import { useStreamSourceSetting } from '@/composables/usePlayerSettings.ts';
import { REGIONS, useStreamSource } from '@/composables/useStreamSource.ts';
import { SLEEP_TIMERS, useSleepTimer } from '@/composables/useSleepTimer.ts';
import type { Region } from '@/types/angelthump.d.ts';
import {
	get,
	useDateFormat,
	useEventListener,
	useFavicon,
	useIntervalFn,
	useLocalStorage,
	useTimestamp
} from '@vueuse/core';
import type { StreamSource } from '@/types/stream.d.ts';

const SOURCES: Record<StreamSource, { label: string }> = {
	owncast: { label: 'Owncast' },
	angelthump: { label: 'AngelThump' }
};

const sleeping = ref(false);
const clipRecorder = useClipRecorder();
const sourceSetting = useStreamSourceSetting();
const stream = useTemplateRef<HTMLVideoElement>('stream');
const sleepGroup = useTemplateRef<HTMLElement>('sleepGroup');
const lowLatency = useLocalStorage('stream:lowLatency', true);
const sourceGroup = useTemplateRef<HTMLElement>('sourceGroup');
const regionGroup = useTemplateRef<HTMLElement>('regionGroup');
const { angelthumpLive, owncastLive, effectiveSource, region, src } = useStreamSource();

const {
	value: sleepValue,
	label: sleepLabel,
	select: selectSleep
} = useSleepTimer(stream, () => {
	sleeping.value = true;
});

function wake(): void {
	sleeping.value = false;
}

const sourceLabel = computed(() => SOURCES[get(sourceSetting)].label);
const regionLabel = computed(() => REGIONS[get(region) ?? 'auto'].label);

const live = { owncast: owncastLive, angelthump: angelthumpLive } as const;

const { info, uptime } = useStreamInfo(effectiveSource);
const { sessionId } = usePlaybackMetrics(stream, effectiveSource);
useWatchingStream(stream, effectiveSource);

const showSource = computed(() => get(live.owncast) === true && get(live.angelthump) === true);

const LOW_LATENCY = {
	lowLatencyMode: true,
	liveSyncDurationCount: 2,
	liveMaxLatencyDurationCount: 6,
	maxLiveSyncPlaybackRate: 1.1
};

const source = computed(() => ({
	src: src.value,
	engine: {
		hlsJs: {
			enableWorker: true,
			startLevel: -1,
			fLoader: clipRecorder.fLoader,
			...(get(lowLatency) ? LOW_LATENCY : { lowLatencyMode: false }),
			...(get(effectiveSource) === 'owncast' ? { cmcd: { sessionId } } : {})
		}
	}
}));

watch(src, clipRecorder.clear);

async function saveClip(): Promise<void> {
	const video = get(stream);
	if (!video) {
		return;
	}
	const stamp = get(useDateFormat(new Date(), 'YYYY-MM-DD-HH-mm-ss'));
	try {
		await clipRecorder.save(video.currentTime, `gongo-${stamp}`);
	} catch (error) {
		console.error('clip', error);
	}
}

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

useEventListener(sleepGroup, 'value-change', (event: CustomEvent<{ value: string }>) => {
	selectSleep(event.detail.value);
});

useEventListener(regionGroup, 'value-change', (event: CustomEvent<{ value: string }>) => {
	const { value } = event.detail;
	if (value in REGIONS) {
		region.value = value as Region;
	}
});

const autoplayed = new WeakSet<Element>();

useEventListener(stream, 'canplay', async () => {
	const video = get(stream);
	if (!video || autoplayed.has(video)) {
		return;
	}
	autoplayed.add(video);
	try {
		await video.play();
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
</script>

<template>
	<VideoJS :show-playback-rate="false" :uptime="uptime" @click="wake">
		<template #media>
			<hlsjs-video
				v-if="!sleeping"
				:key="src"
				:source.prop="source"
				stream-type="live"
				ref="stream"
				playsinline />
		</template>
		<template #overlay>
			<slot name="overlay"></slot>
		</template>
		<template #controls>
			<button
				type="button"
				class="media-button"
				:disabled="clipRecorder.saving.value"
				:title="clipRecorder.saving.value ? 'Saving clip...' : 'Clip'"
				@click="saveClip">
				<media-icon
					:name="clipRecorder.saving.value ? 'spinner' : 'clip'"
					class="media-button-icon"></media-icon>
			</button>
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
			<media-menu-item commandfor="settings-sleep-content" class="media-menu-trigger-item">
				<media-icon name="sleep" class="media-menu-trigger-item-icon"></media-icon>
				Sleep Timer
				<span class="media-menu-hint">
					<span class="media-menu-hint-label">{{ sleepLabel }}</span>
					<media-icon name="chevron" class="media-menu-forward-chevron"></media-icon>
				</span>
			</media-menu-item>
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
			<media-menu-content id="settings-sleep-content" class="media-menu-content">
				<media-menu-item class="media-menu-back-item">
					<media-icon name="chevron" class="media-menu-back-chevron"></media-icon>
					Sleep Timer
				</media-menu-item>
				<media-menu-separator class="media-menu-separator"></media-menu-separator>
				<media-menu-radio-group ref="sleepGroup" :value="sleepValue" class="media-menu-radio-group">
					<media-menu-radio-item
						v-for="option in SLEEP_TIMERS"
						:key="option.value"
						:value="option.value"
						class="media-menu-radio-item">
						<span data-part="label">{{ option.label }}</span>
						<media-menu-item-indicator force-mount class="media-menu-item-indicator">
							<media-icon name="check" class="media-menu-radio-item-icon"></media-icon>
						</media-menu-item-indicator>
					</media-menu-radio-item>
				</media-menu-radio-group>
			</media-menu-content>
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
