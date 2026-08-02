<script setup lang="ts">
import '@/styles/embed.css';
import favicon from '@/assets/images/holomatch.avif';
import { useFavicon } from '@vueuse/core';
import { useHead, useSeoMeta } from '@unhead/vue';

useFavicon(favicon);

useHead({
	title: 'Star Trek: Voyager - Elite Force',
	link: [{ rel: 'preconnect', href: 'https://holomatch.bergbok.party' }]
});

useSeoMeta({
	description: 'star trek sucks',
	ogUrl: '/holomatch'
});
</script>

<template>
	<div class="embed-wrapper">
		<iframe src="https://holomatch.bergbok.party"></iframe>
	</div>
</template>
