<script setup lang="ts">
import STOPTAPE from '@/assets/images/emotes/7tv/STOPTAPE.avif';

defineEmits<{
	refresh: [];
}>();
</script>

<template>
	<div id="STOPTAPE">
		<img :src="STOPTAPE" alt="Offline" @click="$emit('refresh')" />
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
