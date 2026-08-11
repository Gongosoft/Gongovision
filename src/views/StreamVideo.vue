<script setup lang="ts">
import '@/styles/scene.css';
import '@/styles/status.css';
import STOPTAPE from '@/components/STOPTAPE.vue';
import AngelThumpPlayer from '@/components/AngelThumpPlayer.vue';
import { computed } from 'vue';
import { get } from '@vueuse/core';
import { useRouteHash } from '@vueuse/router';
import { useStreamSource } from '@/composables/useStreamSource.ts';

const { isGreatSphynxLive } = useStreamSource();

const hash = useRouteHash();
const renderIFrame = computed(() => get(hash) === '#iframe');

const { PLAYER, CHANNEL: SPHYNX } = ANGELTHUMP;
</script>

<template>
	<div class="scene scene-dark">
		<iframe
			v-if="isGreatSphynxLive && renderIFrame"
			class="frame"
			:src="`${PLAYER}/?channel=${SPHYNX}`"
			allow="autoplay; fullscreen"
			allowfullscreen />
		<AngelThumpPlayer v-else-if="isGreatSphynxLive" />
		<div v-else class="status status-fill">
			<STOPTAPE />
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
