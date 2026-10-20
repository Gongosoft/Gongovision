<script setup lang="ts">
import '@/styles/scene.css';
import '@/styles/status.css';
import STOPTAPE from '@/components/STOPTAPE.vue';
import StreamPlayer from '@/components/StreamPlayer.vue';
import { computed } from 'vue';
import { get } from '@vueuse/core';
import { useRouteHash } from '@vueuse/router';
import { useStreamSource } from '@/composables/useStreamSource.ts';

const { angelthumpLive, isStreamLive } = useStreamSource();

const hash = useRouteHash();
const renderIFrame = computed(() => get(hash) === '#iframe');

const { PLAYER, CHANNEL: SPHYNX } = ANGELTHUMP;
</script>

<template>
	<div class="scene scene-dark">
		<iframe
			v-if="angelthumpLive !== false && renderIFrame"
			:src="`${PLAYER}/?channel=${SPHYNX}`"
			allow="autoplay; fullscreen"
			allowfullscreen
			class="frame" />
		<StreamPlayer v-else-if="isStreamLive !== false" />
		<div v-else class="status status-fill">
			<STOPTAPE :show-image="!renderIFrame" />
		</div>
	</div>
</template>
