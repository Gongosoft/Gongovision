<script setup lang="ts">
import frame1 from '@/assets/images/background.avif';
import GongoizerCanvas from '@/components/GongoizerCanvas.vue';
import { computed, useTemplateRef } from 'vue';
import { useGongoizer } from '@/composables/useGongoizer.ts';
import { useBackgroundPreset } from '@/composables/useBackgroundPreset.ts';

const { contained = false } = defineProps<{ contained?: boolean }>();

const { preset, params, ready } = useBackgroundPreset(contained ? 'contained' : 'page');
const canvasRef = useTemplateRef<InstanceType<typeof GongoizerCanvas>>('shader');
const canvas = computed(() => canvasRef.value?.canvas ?? null);

useGongoizer({ canvas, preset, params, gate: ready });
</script>

<template>
	<div id="background" :class="{ contained }">
		<img :src="frame1" />
		<GongoizerCanvas v-if="ready" ref="shader" />
	</div>
</template>

<style scoped>
#background {
	display: grid;
	grid-template: 100% / 100%;
	inset: 0;
	position: fixed;
	z-index: 0;

	&.contained {
		position: absolute;
	}

	& > * {
		grid-area: 1 / 1;
	}

	& img {
		height: 100%;
		object-fit: cover;
		width: 100%;
	}
}
</style>
