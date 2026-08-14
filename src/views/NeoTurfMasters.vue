<script setup lang="ts">
import '@/styles/scene.css';
import EmulatorJS from '@/components/EmulatorJS.vue';
import favicon from '@/assets/images/emotes/7tv/adamsNah.avif';
import { useFavicon } from '@vueuse/core';
import { useHead, useSeoMeta } from '@unhead/vue';

window.EJS_core = 'arcade';
window.EJS_gameName = 'Neo Turf Masters';
window.EJS_gameUrl = '/r2/turfmast.zip';
window.EJS_biosUrl = '/neogeo.zip';
window.EJS_dontExtractBIOS = true;

useFavicon(favicon);

useHead({
	title: 'Neo Turf Masters'
});

useSeoMeta({
	description: 'Big Tournament Golf',
	ogUrl: '/neoturfmasters',
	publisher: 'SNK'
});
</script>

<template>
	<div class="scene">
		<div class="aspect-fit aspect-4-3">
			<EmulatorJS />
		</div>
	</div>
</template>
