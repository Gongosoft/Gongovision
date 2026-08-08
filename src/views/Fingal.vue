<script setup lang="ts">
import '@/styles/scene.css';
import '@videojs/html/video';
import src from '@/assets/video/fingal.webm';
import favicon from '@/assets/images/emotes/bttv/FinGasm.webp';
import { useFavicon } from '@vueuse/core';
import { useHead, useSeoMeta } from '@unhead/vue';

const type = 'video/webm';

useFavicon(favicon);

useHead({
	title: 'fingal',
	link: [{ rel: 'preload', href: src, as: 'video', type }]
});

useSeoMeta({
	author: 'j__e__r__m',
	description: 'fingal',
	ogUrl: '/fingal',
	ogVideo: src,
	ogVideoType: type,
	ogVideoWidth: 958,
	ogVideoHeight: 720
});
</script>

<template>
	<div class="scene">
		<div class="aspect-fit aspect-4-3">
			<video-player>
				<video-skin>
					<video :src="src" autoplay loop playsinline />
				</video-skin>
			</video-player>
		</div>
	</div>
</template>
