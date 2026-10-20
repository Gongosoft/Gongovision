<script setup lang="ts">
import Blotter from '@/components/Blotter.vue';
import DiamondBorder from '@/components/DiamondBorder.vue';
import { useTemplateRef } from 'vue';
import { RouterLink } from 'vue-router';
import { useStreamSource } from '@/composables/useStreamSource.ts';

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

	<Blotter
		v-if="isStreamLive !== null"
		:text="isStreamLive ? 'LIVE' : 'OFFLINE'"
		material="liquidDistort"
		font-family="VCR OSD"
		:font-size="69"
		:material-uniforms="{
			uSpeed: 0.16,
			uVolatility: 0.02
		}"
		id="blotter-header" />
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
}
</style>
