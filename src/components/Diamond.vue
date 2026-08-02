<script setup lang="ts">
import Blotter from '@/components/Blotter.vue';
import { RouterLink } from 'vue-router';
import { useScreenShare } from '@/composables/useScreenShare.ts';

const {
	video = true,
	transparent = false,
	scale = 1
} = defineProps<{
	video?: boolean;
	transparent?: boolean;
	scale?: number;
}>();

const { stream: screenStream } = useScreenShare();
</script>

<template>
	<div
		id="diamond"
		:class="{ 'diamond-transparent': transparent }"
		:style="{ transform: `translate(-50%, -50%) scale(${scale})` }">
		<video
			v-if="video && screenStream"
			id="diamond-video"
			:srcObject="screenStream"
			autoplay
			muted
			playsinline
			title="Stream" />

		<iframe v-else-if="video" id="diamond-video" src="/stream/video" allow="autoplay" title="Stream" />

		<RouterLink v-if="video" to="/stream" id="diamond-link" />

		<slot />
	</div>

	<Blotter
		text="SOON"
		material="liquidDistort"
		font-family="Gohu"
		:font-size="69"
		:material-uniforms="{
			uSpeed: 0.16,
			uVolatility: 0.02
		}"
		id="blotter-soon" />
</template>

<style scoped>
/*
 * rhombus with 75° left/right vertices and 105° top/bottom vertices
 * has diagonal ratio dᵥ/dₕ = tan(37.5°) ≈ 0.7673
 * the bounding box therefore needs aspect-ratio (w/h) = 1 / 0.7673 ≈ 1.303
 *
 * sizing: width = min(max(85vw, 130vmin), calc(130vh * 1.303))
 *   85vw        - fills most width on landscape screens
 *   130vmin     - prevents the diamond becoming tiny on narrow/tall screens
 *   130vh cap   - keeps vertical overflow reasonable on ultrawide displays
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
	width: min(max(85vw, 130vmin), calc(130vh * 1.303));
	z-index: 1;

	& > * {
		grid-area: 1 / 1;
	}

	& #diamond-link {
		z-index: 3;
	}

	&.diamond-transparent {
		background: var(--color-overlay-glass);
	}

	& #diamond-video {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		height: 100%;
		aspect-ratio: 16 / 9;
		border: none;
		z-index: 1;
	}

	& video#diamond-video {
		rotate: -6deg;
		left: 42%;
	}
}
</style>

<style scoped>
#blotter-soon {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	margin-top: -18dvh;
	z-index: 5;
	pointer-events: none;

	@media (max-width: 480px) {
		margin-top: -12dvh;
	}
}
</style>
