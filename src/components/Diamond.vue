<script setup lang="ts">
import '@videojs/html/media/hlsjs-video';
import Blotter from '@/components/Blotter.vue';
import Background from '@/components/Background.vue';
import DiamondBorder from '@/components/DiamondBorder.vue';
import { RouterLink, useRoute } from 'vue-router';
import { computed, ref, useTemplateRef } from 'vue';
import { useStreamSource } from '@/composables/useStreamSource.ts';
import { useDiamondHeader } from '@/composables/useDiamondHeader.ts';
import { get, useElementBounding, useEventListener, useMediaQuery, useWindowSize } from '@vueuse/core';

const { title: headerTitle } = useDiamondHeader();
const { isStreamLive, src } = useStreamSource();
const offline = computed(() => get(isStreamLive) === false);
const route = useRoute();

const {
	video = true,
	transparent = false,
	scale = 1
} = defineProps<{
	video?: boolean;
	transparent?: boolean;
	scale?: number;
}>();

const diamond = useTemplateRef<HTMLDivElement>('diamond');
const header = useTemplateRef<HTMLDivElement>('header');
const stream = useTemplateRef<HTMLVideoElement>('stream');
const autoplayBlocked = ref(false);
const muted = computed(() => get(autoplayBlocked) || Boolean(route.meta.muted));

useEventListener(stream, 'canplay', async () => {
	const element = get(stream);
	try {
		await element?.play();
	} catch {
		autoplayBlocked.value = true;
		if (element) {
			element.muted = true;
			await element.play();
		}
	}
});

const headerBounds = useElementBounding(header);
const diamondBounds = useElementBounding(diamond);
const { width: viewportWidth } = useWindowSize();
const isDesktop = useMediaQuery('(min-width: 900px)');
const MIN_HEADER_SIZE = 22;
const HEADER_MARGIN = 8;
const GLYPH = 0.6;

const blotterHeader = computed(() => {
	const override = headerTitle.value;
	const max = get(isDesktop) ? 92.16 : 69;
	if (!override) {
		return { text: null, size: max };
	}
	const room = Math.max(get(viewportWidth) * 0.86 - 32, 120);
	const size = Math.max(MIN_HEADER_SIZE, Math.floor(Math.min(max, room / (override.length * GLYPH))));
	const chars = Math.max(4, Math.floor(room / (size * GLYPH)));
	return {
		text: override.length > chars ? `${override.slice(0, chars - 1)}...` : override,
		size
	};
});

const blotterScale = computed(() => {
	const width = get(headerBounds.width);
	const height = get(headerBounds.height);
	const bottom = get(headerBounds.bottom);
	const diamondWidth = get(diamondBounds.width);
	const diamondHeight = get(diamondBounds.height);
	const diamondTop = get(diamondBounds.top);
	const viewport = get(viewportWidth);

	if (!width || !height || !bottom || !diamondWidth || !diamondHeight) {
		return 1;
	}

	const taper = (2 * diamondWidth) / diamondHeight;
	const room = diamondWidth - HEADER_MARGIN * 2 - taper * (diamondTop + diamondHeight / 2 - bottom);
	const fit = Math.min(
		(bottom - HEADER_MARGIN) / height, // keep the top edge on screen
		(viewport - HEADER_MARGIN * 2) / width, // keep it inside the viewport
		room / (width + taper * height) // keep it inside the diamond
	);

	return Math.max(0, Math.min(1, fit));
});
</script>

<template>
	<div
		id="diamond"
		ref="diamond"
		:class="{ 'diamond-transparent': transparent }"
		:style="{ transform: `translate(-50%, -50%) scale(${scale})` }">
		<template v-if="video">
			<Background v-if="offline" contained />
			<div v-else id="diamond-video">
				<hlsjs-video ref="stream" :src="src" :muted.prop="muted" stream-type="live" playsinline />
			</div>
		</template>

		<RouterLink v-if="video" to="/stream" id="diamond-link" />

		<slot />
	</div>

	<DiamondBorder :target="diamond" />

	<div
		id="blotter-header"
		ref="header"
		:class="{ 'blotter-override': blotterHeader.text }"
		:style="{ '--blotter-scale': blotterScale }">
		<Blotter
			v-if="blotterHeader.text || isStreamLive !== null"
			:text="blotterHeader.text ?? (isStreamLive ? 'LIVE' : 'OFFLINE')"
			material="liquidDistort"
			font-family="VCR OSD"
			:font-size="blotterHeader.size"
			:material-uniforms="{ uSpeed: 0.16, uVolatility: 0.02 }" />
	</div>
</template>

<style scoped>
/*
 * rhombus with 75° left/right vertices and 105° top/bottom vertices
 * has diagonal ratio dᵥ/dₕ = tan(37.5°) ≈ 0.7673
 * the bounding box therefore needs aspect-ratio (w/h) = 1 / 0.7673 ≈ 1.303
 */

#diamond {
	aspect-ratio: 1.303;
	background: var(--color-black);
	clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
	display: grid;
	left: 50%;
	overflow: hidden;
	position: fixed;
	top: 50%;
	width: var(--diamond-width);
	z-index: 1;

	& > * {
		grid-area: 1 / 1;
	}

	& #diamond-link {
		z-index: 2;
	}

	&.diamond-transparent {
		background: var(--color-overlay-glass);
	}

	& #diamond-video {
		aspect-ratio: 16 / 9;
		height: 100%;
		left: 50%;
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		z-index: 1;
	}
}

/*
 * bottom-anchored above the menu's top row, with a hard 3px outline: a filter because Blotter draws
 * onto a canvas, and max-content stops the box being squeezed to half the screen width on phones
 *
 * the canvas is scaled inside this wrapper rather than on it, so the wrapper keeps reporting the
 * canvas' natural size to the scale calculation; measuring its transformed box would feed back
 */
#blotter-header {
	filter: drop-shadow(3px 0 0 #000) drop-shadow(-3px 0 0 #000) drop-shadow(0 3px 0 #000) drop-shadow(0 -3px 0 #000);
	left: 0;
	margin-inline: auto;
	pointer-events: none;
	position: fixed;
	right: 0;
	top: calc(var(--menu-top) - var(--menu-header-gap));
	transform: translateY(-100%);
	width: max-content;
	z-index: 3;

	/* a page's own title sits above its content, which starts higher than the menu rows */
	&.blotter-override {
		top: var(--menu-title-bottom);
	}

	& :deep(canvas) {
		transform: scale(var(--blotter-scale, 1));
		transform-origin: 50% 100%;
	}
}
</style>
