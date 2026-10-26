<script setup lang="ts">
import STOPTAPE from '@/components/STOPTAPE.vue';
import SplitPane from '@/components/SplitPane.vue';
import TwitchChat from '@/components/TwitchChat.vue';
import StreamPlayer from '@/components/StreamPlayer.vue';
import SplitPaneEdges from '@/components/SplitPaneEdges.vue';
import { computed } from 'vue';
import { get } from '@vueuse/core';
import { useRouteHash } from '@vueuse/router';
import { useStreamSource } from '@/composables/useStreamSource.ts';

const { angelthumpLive, isStreamLive } = useStreamSource();

const hash = useRouteHash();
const renderIFrame = computed(() => get(hash) === '#iframe');
const showIFrame = computed(() => get(angelthumpLive) !== false && get(renderIFrame));
const showPlayer = computed(() => !get(showIFrame) && get(isStreamLive) !== false);

const { PLAYER, CHANNEL: SPHYNX } = ANGELTHUMP;
</script>

<template>
	<SplitPane>
		<SplitPaneEdges v-if="!showPlayer" />
		<iframe
			v-if="showIFrame"
			class="frame"
			:src="`${PLAYER}/?channel=${SPHYNX}`"
			allow="autoplay; fullscreen"
			allowfullscreen />
		<StreamPlayer v-else-if="showPlayer">
			<template #overlay>
				<SplitPaneEdges />
			</template>
		</StreamPlayer>
		<STOPTAPE v-else />
		<template #side><TwitchChat /></template>
	</SplitPane>
</template>

<style scoped>
.frame {
	border: none;
	flex: 1;
	min-height: 0;
}
</style>
