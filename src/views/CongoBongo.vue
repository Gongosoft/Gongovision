<script setup lang="ts">
import '@/styles/scene.css';
import EmulatorJS from '@/components/EmulatorJS.vue';
import favicon from '@/assets/images/emotes/7tv/GongoBongo.avif';
import { useFavicon } from '@vueuse/core';
import { useHead, useSeoMeta } from '@unhead/vue';

window.EJS_core = 'arcade';
window.EJS_gameName = 'Congo Bongo';
window.EJS_gameUrl = '/r2/congo.zip';

useFavicon(favicon);

useHead({
	title: 'Congo Bongo'
});

useSeoMeta({
	description: 'Gongo Bongo',
	ogUrl: '/congobongo',
	publisher: 'SEGA'
});
</script>

<template>
	<div class="scene">
		<div class="aspect-fit aspect-3-4">
			<EmulatorJS />
		</div>
	</div>
</template>
