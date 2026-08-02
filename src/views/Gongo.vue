<script setup lang="ts">
import '@/styles/embed.css';
import favicon from '@/assets/images/g.avif';
import { useFavicon } from '@vueuse/core';
import { useHead, useSeoMeta } from '@unhead/vue';

useFavicon(favicon);

useHead({
	title: 'gongo',
	link: [{ rel: 'preconnect', href: 'https://gongo.bergbok.party' }]
});

useSeoMeta({
	description:
		'Gongo is a 2D side-scrolling platformer where the player goes through levels killing enemies and saving the princess. Each level has amazing hand-picked worlds. On each of the levels, a princess is hidden, which must be rescued and delivered to your castle, cleaning up enemies along the way.',
	ogUrl: '/gongo',
	publisher: 'Reforged Group'
});
</script>

<template>
	<div class="embed-wrapper">
		<iframe src="https://gongo.bergbok.party"></iframe>
	</div>
</template>
