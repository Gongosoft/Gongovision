<script setup lang="ts">
import src from '@/assets/images/offline.avif';
import Background from '@/components/Background.vue';
import { useStreamSource } from '@/composables/useStreamSource.ts';

const { refresh } = useStreamSource();
</script>

<template>
	<div id="STOPTAPE">
		<Background />
		<img :src alt="Offline" @click="refresh" />
	</div>
</template>

<style scoped>
#STOPTAPE {
	flex: 1;
	min-height: 0;
	overflow: hidden;
	position: relative;
	width: 100%;

	& img {
		cursor: pointer;
		height: 100%;
		inset: 0;
		object-fit: contain;
		position: absolute;
		width: 100%;
	}
}
</style>
