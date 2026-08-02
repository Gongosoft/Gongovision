<script setup lang="ts">
import STOPTAPE from '@/assets/images/emotes/7tv/STOPTAPE.avif';

defineEmits<{
	refresh: [];
}>();
</script>

<template>
	<div id="stoptape-container">
		<img :src="STOPTAPE" alt="Offline" id="stoptape-image" @click="$emit('refresh')" />
	</div>
</template>

<style scoped>
#stoptape-container {
	flex: 1;
	width: 100%;
	min-height: 0;
	position: relative;
	overflow: hidden;
}

#stoptape-image {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: contain;
	cursor: pointer;
}
</style>
