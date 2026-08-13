<script setup lang="ts">
const { channel = TWITCH_CHANNEL } = defineProps<{ channel?: string }>();

const { hostname } = location;
</script>

<template>
	<iframe
		:src="`https://www.twitch.tv/embed/${channel}/chat?parent=${hostname}&darkpopout`"
		height="100%"
		width="100%">
	</iframe>
</template>

<style scoped>
iframe {
	background: #212121;
	border: none;
}
</style>
