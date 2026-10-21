<script setup lang="ts">
import Blotter from '@/components/Blotter.vue';
import DiamondBorder from '@/components/DiamondBorder.vue';
import { RouterLink } from 'vue-router';
import { computed, useTemplateRef } from 'vue';
import { useStreamSource } from '@/composables/useStreamSource.ts';
import { get, useElementBounding, useMediaQuery, useWindowSize } from '@vueuse/core';

const { isStreamLive } = useStreamSource();

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

const isDesktop = useMediaQuery('(min-width: 900px)');

const HEADER_MARGIN = 8;
const headerBounds = useElementBounding(header);
const diamondBounds = useElementBounding(diamond);
const { width: viewportWidth } = useWindowSize();

/**
 * Blotter bakes its text into a fixed-size buffer at the font size it was built with,
 * so the canvas has to be scaled to fit instead (https://github.com/bradley/Blotter/issues/38).
 * The header sits above the diamond's centre, making its top edge the narrowest part of the diamond it has to clear.
 */
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
	// width the diamond has left where the header's bottom edge sits, minus the outline's room
	const room = diamondWidth - HEADER_MARGIN * 2 - taper * (diamondTop + diamondHeight / 2 - bottom);
	// at scale s the top edge is `height * s` higher, where the diamond is another `taper * height * s` narrower
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
		<iframe v-if="video" id="diamond-video" src="/stream/video#iframe" allow="autoplay" title="Stream" />

		<RouterLink v-if="video" to="/stream" id="diamond-link" />

		<slot />
	</div>

	<DiamondBorder :target="diamond" />

	<div id="blotter-header" ref="header" :style="{ '--blotter-scale': blotterScale }">
		<Blotter
			v-if="isStreamLive !== null"
			:text="isStreamLive ? 'YAY' : 'OFFLINE'"
			material="liquidDistort"
			font-family="VCR OSD"
			:font-size="isDesktop ? 92.16 : 69"
			:material-uniforms="{
				uSpeed: 0.16,
				uVolatility: 0.02
			}" />
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
		border: none;
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
	left: 50%;
	pointer-events: none;
	position: fixed;
	top: calc(var(--menu-top) - var(--menu-header-gap));
	transform: translate(-50%, -100%);
	width: max-content;
	z-index: 3;

	& :deep(canvas) {
		transform: scale(var(--blotter-scale, 1));
		transform-origin: 50% 100%;
	}
}
</style>
