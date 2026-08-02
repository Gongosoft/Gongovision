<script setup lang="ts">
import { get } from '@vueuse/core';
import { useScript } from '@unhead/vue';
import { onUnmounted, useTemplateRef } from 'vue';

const { channel = TWITCH_CHANNEL, interactive = true } = defineProps<{
	channel?: string;
	interactive?: boolean;
}>();

const parent = location.hostname;

const containerRef = useTemplateRef<HTMLDivElement>('containerRef');
let embed: Twitch.Embed | null = null;

function createEmbed(): void {
	const element = get(containerRef);
	if (!element) {
		return;
	}
	embed = new Twitch.Embed(element.id, {
		channel,
		layout: 'video',
		width: '100%',
		height: '100%',
		autoplay: true,
		muted: false,
		parent: [parent],
		theme: 'dark'
	});
}

const { onLoaded } = useScript({ src: 'https://embed.twitch.tv/embed/v1.js', crossorigin: false });
onLoaded(createEmbed);

onUnmounted((): void => {
	if (embed) {
		embed = null;
	}
});
</script>

<template>
	<iframe
		v-if="!interactive"
		id="twitch-embed"
		allow="autoplay"
		allowfullscreen
		:src="`https://player.twitch.tv/?channel=${channel}&parent=${parent}`" />
	<div v-else id="twitch-embed" ref="containerRef" />
</template>

<style scoped>
#twitch-embed {
	width: 100%;
	height: 100%;
	border: none;
}
</style>
