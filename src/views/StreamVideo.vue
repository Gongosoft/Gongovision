<script setup lang="ts">
import '@/styles/scene.css';
import '@/styles/status.css';
import STOPTAPE from '@/components/STOPTAPE.vue';
import TwitchEmbed from '@/components/TwitchEmbed.vue';
import AngelThumpPlayer from '@/components/AngelThumpPlayer.vue';
import { computed } from 'vue';
import { get } from '@vueuse/core';
import { useRouteHash } from '@vueuse/router';
import { useStreamSource } from '@/composables/useStreamSource.ts';

const { isGreatSphynxLive, twitchChannels, loading, refresh } = useStreamSource();
const fallback = computed(() => get(twitchChannels)[0]);

const hash = useRouteHash();
const renderIFrame = computed(() => get(hash) === '#iframe');

const { PLAYER, CHANNEL: SPHYNX } = ANGELTHUMP;
</script>

<template>
	<div class="scene scene-dark">
		<div v-if="loading" class="status"></div>
		<iframe
			v-else-if="isGreatSphynxLive && renderIFrame"
			class="frame"
			:src="`${PLAYER}/?channel=${SPHYNX}`"
			allow="autoplay; fullscreen"
			allowfullscreen />
		<AngelThumpPlayer v-else-if="isGreatSphynxLive" />
		<TwitchEmbed v-else-if="fallback" :channel="fallback" :interactive="false" />
		<div v-else class="status status-fill">
			<STOPTAPE @refresh="refresh" />
		</div>
	</div>
</template>

<style scoped>
.frame {
	border: none;
	width: 100%;
	height: 100%;
}

.status-fill {
	height: 100%;
}
</style>
