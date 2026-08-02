<script setup lang="ts">
const { channel = TWITCH_CHANNEL } = defineProps<{ channel?: string }>();

const { hostname } = location;
</script>

<template>
	<iframe
		id="ohmies"
		:src="`https://www.twitch.tv/embed/${channel}/chat?parent=${hostname}&darkpopout`"
		height="100%"
		width="100%">
	</iframe>
</template>

<style scoped>
#ohmies {
	border: none;
	width: 100%;
	height: 100%;
}
</style>
