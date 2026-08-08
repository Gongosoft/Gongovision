<script setup lang="ts">
import '@/styles/scene.css';
import '@/styles/status.css';
import STOPTAPE from '@/components/STOPTAPE.vue';
import TwitchEmbed from '@/components/TwitchEmbed.vue';
import AngelThumpPlayer from '@/components/AngelThumpPlayer.vue';
import { computed } from 'vue';
import { get } from '@vueuse/core';
import { useStreamSource } from '@/composables/useStreamSource.ts';

const { isGreatSphynxLive, twitchChannels, loading, refresh } = useStreamSource();
const fallback = computed(() => get(twitchChannels)[0]);
</script>

<template>
	<div class="scene scene-dark">
		<div v-if="loading" class="status"></div>
		<AngelThumpPlayer v-else-if="isGreatSphynxLive" />
		<TwitchEmbed v-else-if="fallback" :channel="fallback" :interactive="false" />
		<div v-else class="status status-fill">
			<STOPTAPE @refresh="refresh" />
		</div>
	</div>
</template>

<style scoped>
.status-fill {
	height: 100%;
}
</style>
