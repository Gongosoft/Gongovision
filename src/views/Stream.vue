<script setup lang="ts">
import STOPTAPE from '@/components/STOPTAPE.vue';
import TwitchChat from '@/components/TwitchChat.vue';
import AngelThumpPlayer from '@/components/AngelThumpPlayer.vue';
import { computed } from 'vue';
import { useRouteHash } from '@vueuse/router';
import { get, usePointerSwipe } from '@vueuse/core';
import { useSplitPane } from '@/composables/useSplitPane.ts';
import { useStreamSource } from '@/composables/useStreamSource.ts';

const { isGreatSphynxLive } = useStreamSource();

const hash = useRouteHash();
const renderIFrame = computed(() => get(hash) === '#iframe');

const { PLAYER, CHANNEL: SPHYNX } = ANGELTHUMP;

const {
	isMobile,
	side,
	hidden,
	dragging,
	chatStyle,
	dividerStyle,
	edgeStartEl,
	edgeEndEl,
	onPointerDown,
	onPointerUp,
	onPointerMove,
	showEdge,
	snapTo16ᱺ9,
	flip
} = useSplitPane();

usePointerSwipe(edgeStartEl, { onSwipeEnd: () => showEdge('start') });
usePointerSwipe(edgeEndEl, { onSwipeEnd: () => showEdge('end') });
</script>

<template>
	<div class="scene" :class="[isMobile ? 'mobile' : 'desktop', `side-${side}`]">
		<div v-if="hidden" class="edge edge-start" ref="edgeStartEl" @click="showEdge('start')" />
		<div v-if="hidden" class="edge edge-end" ref="edgeEndEl" @click="showEdge('end')" />

		<div id="gongo">
			<iframe
				v-if="isGreatSphynxLive !== false && renderIFrame"
				class="frame"
				:src="`${PLAYER}/?channel=${SPHYNX}`"
				allow="autoplay; fullscreen"
				allowfullscreen />
			<AngelThumpPlayer v-else-if="isGreatSphynxLive !== false" />
			<STOPTAPE v-else />
		</div>

		<div
			v-if="!hidden"
			id="divider"
			:class="{ active: dragging }"
			:style="dividerStyle"
			@pointerdown="onPointerDown"
			@pointermove="onPointerMove"
			@pointerup="onPointerUp"
			@pointercancel="onPointerUp"
			@click.ctrl="snapTo16ᱺ9"
			@dblclick="flip" />

		<div v-if="!hidden" id="ohmies" :style="chatStyle"><TwitchChat /></div>
	</div>
</template>

<style scoped>
.scene {
	background: var(--color-black);
	display: flex;
	height: 100dvh;
	overflow: hidden;
	position: relative;
	width: 100%;

	&.desktop {
		flex-direction: row;

		& #divider {
			top: 0;
			width: 12px;
			height: 100%;
			cursor: col-resize;
		}

		& .edge {
			top: 0;
			bottom: 0;
			width: 60px;
		}

		& .edge-start {
			left: 0;
		}
		& .edge-end {
			right: 0;
		}
	}

	&.mobile {
		flex-direction: column;

		& #gongo {
			flex: 1 1 0;
			min-height: 0;
		}
		& #ohmies {
			flex: 0 0 auto;
		}

		& #divider {
			left: 0;
			height: 12px;
			width: 100%;
			cursor: row-resize;
		}

		& .edge {
			left: 0;
			right: 0;
			height: 50px;
		}

		& .edge-start {
			top: 0;
		}
		& .edge-end {
			bottom: 0;
		}
	}

	&.side-start {
		& #gongo {
			order: 1;
		}
		& #ohmies {
			order: 0;
		}
	}

	&.side-end {
		& #gongo {
			order: 0;
		}
		& #ohmies {
			order: 1;
		}
	}
}

#gongo {
	flex: 1 1 0;
	min-width: 0;
	min-height: 0;
	display: flex;
	flex-direction: column;
	position: relative;
	overflow: hidden;
	user-select: none;

	& .frame {
		border: none;
		flex: 1;
		min-height: 0;
	}
}

#ohmies {
	flex: 0 0 25%;
	overflow: hidden;
	min-width: 0;
	min-height: 0;
	z-index: 1;
}

#divider {
	position: absolute;
	z-index: 2;
	background: transparent;
	transition: background 0.25s;
	touch-action: none;

	&.active {
		animation: backgroundShift 30s linear infinite;
	}

	@media (hover: hover) {
		&:hover {
			animation: backgroundShift 30s linear infinite;
		}
	}
}

.edge {
	position: absolute;
	z-index: 2;
	cursor: pointer;
	touch-action: none;

	&:hover {
		background: var(--color-edge-hover);
	}
}
</style>
