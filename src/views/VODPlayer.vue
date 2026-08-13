<script setup lang="ts">
import '@/styles/scene.css';
import '@/styles/status.css';
import '@videojs/html/video/skin';
import '@videojs/html/video/player';
import { get } from '@vueuse/core';
import { useRoute } from 'vue-router';
import { useHead } from '@unhead/vue';
import { computed, ref, watchEffect } from 'vue';
import { useVODs } from '@/composables/useVODs.ts';

const { vods, loading } = useVODs();
const route = useRoute();
const title = computed(() => decodeURIComponent(String(route.params.title)));
const error = ref<string | null>(null);
const vod = computed(() => get(vods).find((v) => v.name === get(title)));

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
					<video :src="vod.url" :poster="vod.thumbnail || undefined" autoplay playsinline />
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
