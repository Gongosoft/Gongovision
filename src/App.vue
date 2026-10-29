<script setup lang="ts">
import 'unfonts.css';
import '@/styles/menu.css';
import '@/styles/theme.css';
import '@/styles/animations.css';
import AFK from '@/components/AFK.vue';
import Cursor from '@/components/Cursor.vue';
import Diamond from '@/components/Diamond.vue';
import Gohu from '@/assets/fonts/gohu.woff2?url';
import EmoteWall from '@/components/EmoteWall.vue';
import Background from '@/components/Background.vue';
import Gongoverlay from '@/components/Gongoverlay.vue';
import ServiceWorker from '@/components/ServiceWorker.vue';
import VCROSD from '@/assets/fonts/vcr-osd-mono.woff2?url';
import BackgroundImage from '@/assets/images/background.avif';
import { computed } from 'vue';
import { useHead, useSeoMeta } from '@unhead/vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useKonamiCode } from '@/composables/useKonamiCode.ts';

const route = useRoute();
const router = useRouter();
const showDiamond = computed(() => Boolean(route.meta.menu));
const isFullscreen = computed(() => Boolean(route.meta.fullscreen));

const titles = new Set([
	'aongo',
	'bongo',
	'congo',
	'dongo',
	'eongo',
	'fongo',
	'gongo',
	'hongo',
	'iongo',
	'jongo',
	'kongo',
	'longo',
	'mongo',
	'nongo',
	'oongo',
	'pongo',
	'qongo',
	'rongo',
	'songo',
	'tongo',
	'uongo',
	'vongo',
	'wongo',
	'xongo',
	'yongo',
	'zongo',
	'blongo',
	'gonglop',
	'gongunkulous',
	'lord give me gongo',
	'it is gongo my dudes',
	"gong'd up and gong'd out",
	"my gongo's bongo'd",
	"woke up gong'd"
]);

useHead({
	title: [...titles][Math.floor(Math.random() * titles.size)],
	link: [
		{
			rel: 'license',
			title: 'ISC',
			href: 'https://github.com/Gongosoft/Gongovision/blob/main/LICENSE.md'
		},
		{
			rel: 'preload',
			as: 'image',
			type: 'image/avif',
			href: BackgroundImage
		},
		{
			rel: 'preload',
			as: 'font',
			type: 'font/woff2',
			href: Gohu,
			crossorigin: 'anonymous'
		},
		{
			rel: 'preload',
			as: 'font',
			type: 'font/woff2',
			href: VCROSD,
			crossorigin: 'anonymous'
		},
		{
			rel: 'search',
			type: 'application/opensearchdescription+xml',
			title: 'Sphynx Bluesky',
			href: '/opensearch.xml'
		},
		{
			rel: 'alternate',
			type: 'application/rss+xml',
			title: 'gongo',
			href: '/rss/xml'
		},
		{
			rel: 'alternate',
			type: 'application/rss+xml',
			title: 'Stream RSS',
			href: '/stream/rss'
		}
	]
});

useSeoMeta({
	author: 'GreatSphynx',
	description:
		'Gongo is a 2D side-scrolling platformer where the player goes through levels killing enemies and saving the princess. Each level has amazing hand-picked worlds. On each of the levels, a princess is hidden, which must be rescued and delivered to your castle, cleaning up enemies along the way.',
	ogType: 'website',
	ogUrl: '/',
	ogAudio: '/deltasleep',
	// @ts-expect-error
	ogAudioType: 'audio/flac',
	ogImage: '/opengraph.avif',
	ogImageType: 'image/avif',
	ogImageWidth: '400',
	ogImageHeight: '263',
	ogSiteName: 'Gongovision',
	ogLocale: 'en_ZA'
});

useKonamiCode({
	callback: () => {
		void router.push('/gongoizer');
	}
});
</script>

<template>
	<template v-if="!isFullscreen">
		<header>
			<Gongoverlay position="top" />
			<ServiceWorker />
		</header>
		<main>
			<Background />
			<EmoteWall />
			<Diamond v-if="showDiamond" />
			<RouterView />
			<Cursor />
			<AFK />
		</main>
		<footer>
			<Gongoverlay position="bottom" />
		</footer>
	</template>
	<RouterView v-else />
</template>

<style>
html,
body {
	margin: 0;
	padding: 0;
}

body {
	accent-color: var(--color-accent);
	background-color: var(--color-bg);
	font-family: 'Gohu';
}

video-player,
gongo-player {
	--media-border-radius: 0;
	--media-video-border-radius: 0;
}
</style>
