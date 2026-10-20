<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useScanlineBorder } from '@/composables/useScanlineBorder.ts';

const {
	target,
	lines = 240,
	width = 3,
	blur = 1.25,
	initialColor = '#ff5e8c'
} = defineProps<{
	target: HTMLElement | null;
	lines?: number;
	width?: number;
	blur?: number;
	initialColor?: string;
}>();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const { style } = useScanlineBorder(
	canvas,
	() => target,
	() => ({ lines, width, blur, color: initialColor })
);
</script>

<template>
	<canvas ref="canvas" :style />
</template>

<style scoped>
canvas {
	animation: hueCycle 12s linear infinite;
	image-rendering: pixelated;
	pointer-events: none;
	position: fixed;
	z-index: 1;
}

@keyframes hueCycle {
	to {
		filter: hue-rotate(360deg);
	}
}
</style>
