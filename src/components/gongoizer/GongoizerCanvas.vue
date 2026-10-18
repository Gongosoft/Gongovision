<script setup lang="ts">
import { ref } from 'vue';

const canvas = ref<HTMLCanvasElement | null>(null);

defineExpose({ canvas });
</script>

<template>
	<canvas ref="canvas" />
</template>

<style scoped>
canvas {
	display: block;
	inset: 0;
	position: absolute;
	width: 100%;
	height: 100%;
}
</style>
