<script setup lang="ts">
import '@/lib/gongoizer/feedback-bg.js';
import frame1 from '@/assets/images/background.avif';
import { useTemplateRef } from 'vue';
import { useBackgroundPreset, useDiamondCutout } from '@/composables/useBackgroundPreset.ts';
import type { FeedbackBackgroundElement } from '@/composables/useBackgroundPreset.ts';

const { preset, params, ready } = useBackgroundPreset();
const shader = useTemplateRef<FeedbackBackgroundElement>('shader');

useDiamondCutout(shader);
</script>

<template>
	<div id="background">
		<img :src="frame1" />
		<feedback-background v-if="ready" ref="shader" :preset="preset" :params="params" :fallback="frame1" />
	</div>
</template>

<style scoped>
#background {
	display: grid;
	grid-template: 100% / 100%;
	inset: 0;
	position: fixed;
	z-index: 0;

	& > * {
		grid-area: 1 / 1;
	}

	& img,
	& feedback-background {
		height: 100%;
		object-fit: cover;
		width: 100%;
	}
}
</style>
