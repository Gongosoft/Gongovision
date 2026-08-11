<script setup lang="ts">
import '@videojs/html/media/background-video';
import frame1 from '@/assets/images/background.avif';
</script>

<template>
	<div id="background">
		<img :src="frame1" />
		<background-video src="/r2/background.mp4"></background-video>
	</div>
</template>

<style scoped>
#background {
	display: grid;
	inset: 0;
	position: fixed;
	z-index: 0;

	& > * {
		grid-area: 1 / 1;
	}

	& background-video {
		--media-object-fit: cover;
	}
}
</style>
