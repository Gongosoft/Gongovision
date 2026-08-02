<script setup lang="ts">
import '@/styles/scene.css';
import '@/styles/video-js.css';
import src from '@/assets/video/fingal.webm';
import favicon from '@/assets/images/emotes/bttv/FinGasm.webp';
import { useFavicon } from '@vueuse/core';
import { VideoPlayer } from '@videojs-player/vue';
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
			<VideoPlayer
				aspect-ratio="4:3"
				autoplay="any"
				:controls="true"
				:loop="true"
				:sources="[{ src, type }]"
				:volume="0.8" />
		</div>
	</div>
</template>
