<script setup lang="ts">
import offline from '@/assets/images/offline.avif';
import Background from '@/components/Background.vue';
import { useStreamSource } from '@/composables/useStreamSource.ts';

const { showImage = true } = defineProps<{ showImage?: boolean }>();

const { refresh } = useStreamSource();
</script>

<template>
	<div id="STOPTAPE" title="Offline" @click="refresh">
		<Background contained />
		<img v-if="showImage" :src="offline" alt="Offline" />
	</div>
</template>

<style scoped>
#STOPTAPE {
	cursor: pointer;
	flex: 1;
	min-height: 0;
	overflow: hidden;
	position: relative;
	width: 100%;

	& img {
		height: 100%;
		inset: 0;
		object-fit: contain;
		position: absolute;
		width: 100%;
	}
}
</style>
