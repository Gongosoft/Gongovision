<script setup lang="ts">
import '@/styles/scene.css';
import '@/styles/status.css';
import '@videojs/html/video/skin';
import '@videojs/html/video/player';
import { get } from '@vueuse/core';
import { useRoute } from 'vue-router';
import { useHead } from '@unhead/vue';
import { computed, ref, watchEffect } from 'vue';
import { stripVODExtension, stripVODPrefix, useVODs } from '@/composables/useVODs.ts';

const { vods, loading } = useVODs();
const route = useRoute();
const title = computed(() => decodeURIComponent(String(route.params.title)));
const error = ref<string | null>(null);
const vod = computed(() => get(vods).find((v) => stripVODPrefix(v.title) === get(title)));

watchEffect(() => {
	error.value = !get(loading) && !get(vod) ? `VOD not found: ${get(title)}` : null;
});

useHead({ title: computed(() => stripVODExtension(stripVODPrefix(get(title)))) });
</script>

<template>
	<div class="scene scene-dark">
		<div v-if="loading || error || !vod" class="status">
			<span v-if="loading">loading VOD...</span>
			<span v-else class="status-error">{{ error || 'VOD not found' }}</span>
			<a v-if="!loading" href="/vods" class="status-retry">back to VODs</a>
		</div>
		<div v-else class="aspect-fit aspect-16-9 vod-wrapper">
			<video-player v-if="vod.videoURL">
				<video-skin>
					<video :src="vod.videoURL" :poster="vod.thumbnailURL || undefined" autoplay playsinline />
				</video-skin>
			</video-player>
		</div>
	</div>
</template>

<style scoped>
.vod-wrapper {
	background: var(--color-black);
	min-height: 0;
}
</style>
