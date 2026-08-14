<script setup lang="ts">
import '@/styles/scene.css';
import { useHead } from '@unhead/vue';
import Blotter from '@/components/Blotter.vue';
import GIGADOOR from '@/assets/images/emotes/7tv/GIGADOOR.avif';
import { useFavicon, useMediaQuery } from '@vueuse/core';

const favicons = Object.values(
	import.meta.glob<string>(
		[
			'./7tv/))).avif',
			'./7tv/auSnowman.avif',
			'./7tv/catOK.avif',
			'./7tv/dataMug.avif',
			'./7tv/duh.avif',
			'./7tv/egg.avif',
			'./7tv/GIGADOOR.avif',
			'./7tv/Glerm.avif',
			'./7tv/Gongor.avif',
			'./7tv/gregSinks.avif',
			'./7tv/Hehe.avif',
			'./7tv/idk.avif',
			'./7tv/kenCosty.avif',
			'./7tv/kenDisgust.avif',
			'./7tv/kingBust.avif',
			'./7tv/MemoryStank.avif',
			'./7tv/nyAngy.avif',
			'./7tv/OSMOPOTENT.avif',
			'./7tv/oye.avif',
			'./7tv/princessKitty.avif',
			'./7tv/SillyCat.avif',
			'./7tv/STOPTAPE.avif',
			'./bttv/buhCat.webp',
			'./bttv/catSittingPolitely.webp',
			'./bttv/catSnail.webp',
			'./bttv/daxMug.webp'
		],
		{
			base: '../assets/images/emotes',
			eager: true,
			import: 'default',
			query: '?url'
		}
	)
);

useFavicon(favicons[Math.floor(Math.random() * favicons.length)]);
useHead({ title: "WHAT'S THE PASSWORD?" });

const isWide = useMediaQuery('(min-width: 985px)');
</script>

<template>
	<div class="scene scene-end">
		<Blotter
			v-if="isWide"
			id="blotter-404"
			text="WHAT'S THE PASSWORD?"
			material="channelSplit"
			font-family="Gohu"
			:font-size="69"
			:material-uniforms="{ uOffset: 0.1, uRotation: 135, uApplyBlur: 1, uAnimateNoise: 0.5 }" />
		<img :src="GIGADOOR" alt="404" title="GIGADOOR" />
	</div>
</template>

<style scoped>
.scene {
	& #blotter-404 {
		align-self: center;
		margin-left: 2rem;
	}

	& img {
		flex-shrink: 0;
		margin-left: auto;
		object-fit: contain;
		width: auto;
		height: 100%;
	}
}
</style>
