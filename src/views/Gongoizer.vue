<script setup lang="ts">
import favicon from '@/assets/images/osmo/OSMOPOTENT.avif';
import GongoizerCanvas from '@/components/GongoizerCanvas.vue';
import GongoizerControls from '@/components/GongoizerControls.vue';
import { useHead } from '@unhead/vue';
import { useFavicon } from '@vueuse/core';
import { computed, useTemplateRef } from 'vue';
import { DEFAULT_PRESET } from '@/lib/gongoizer/presets.ts';
import { useGongoizer } from '@/composables/useGongoizer.ts';

const canvasRef = useTemplateRef<InstanceType<typeof GongoizerCanvas>>('canvas');
const canvas = computed(() => canvasRef.value?.canvas ?? null);
const gongoizer = useGongoizer({ canvas, preset: DEFAULT_PRESET, persist: true });

useFavicon(favicon);

useHead({ title: 'Gongoizer' });
</script>

<template>
	<div class="scene">
		<GongoizerCanvas ref="canvas" />
		<GongoizerControls :gongoizer="gongoizer" />
	</div>
</template>

<style scoped>
.scene {
	position: fixed;
	inset: 0;
	background: #0b0900;
	overflow: hidden;

	& > :deep(canvas) {
		position: fixed;
		inset: 0;
	}
}
</style>
