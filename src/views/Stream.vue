<script setup lang="ts">
import '@/styles/status.css';
import Chat from '@/components/TwitchChat.vue';
import STOPTAPE from '@/components/STOPTAPE.vue';
import TwitchEmbed from '@/components/TwitchEmbed.vue';
import AngelThumpPlayer from '@/components/AngelThumpPlayer.vue';
import { computed } from 'vue';
import { get, usePointerSwipe } from '@vueuse/core';
import { useSplitPane } from '@/composables/useSplitPane.ts';
import { useStreamSource } from '@/composables/useStreamSource.ts';

const { isGreatSphynxLive, twitchChannels, loading, errorMessage, refresh } = useStreamSource();
const fallback = computed(() => get(twitchChannels)[0] ?? null);

const chatChannel = computed(() => {
	if (get(isGreatSphynxLive)) {
		return TWITCH_CHANNEL;
	}
	const fallbackValue = get(fallback);
	if (fallbackValue) {
		return fallbackValue;
	}
	return TWITCH_CHANNEL;
});

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

		<div v-if="loading" class="status"></div>

		<template v-else>
			<div class="video">
				<AngelThumpPlayer v-if="isGreatSphynxLive" />
				<TwitchEmbed v-else-if="fallback && !errorMessage" :channel="fallback" />
				<STOPTAPE v-else @refresh="refresh" />
				<div v-if="errorMessage" class="error-overlay">
					<span class="status-error">{{ errorMessage }}</span>
					<button class="status-retry" @click="refresh">retry</button>
				</div>
			</div>

			<div
				v-if="!hidden"
				class="divider"
				:class="{ active: dragging }"
				:style="dividerStyle"
				@pointerdown="onPointerDown"
				@pointermove="onPointerMove"
				@pointerup="onPointerUp"
				@pointercancel="onPointerUp"
				@click.ctrl="snapTo16ᱺ9"
				@dblclick="flip" />

			<div v-if="!hidden" class="chat" :style="chatStyle"><Chat :channel="chatChannel" /></div>
		</template>
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

		& .divider {
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

		& .video {
			flex: 1 1 0;
			min-height: 0;
		}
		& .chat {
			flex: 0 0 auto;
		}

		& .divider {
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
		& .video {
			order: 1;
		}
		& .chat {
			order: 0;
		}
	}

	&.side-end {
		& .video {
			order: 0;
		}
		& .chat {
			order: 1;
		}
	}
}

.video {
	flex: 1 1 0;
	min-width: 0;
	min-height: 0;
	display: flex;
	flex-direction: column;
	position: relative;
	overflow: hidden;
}

.error-overlay {
	position: absolute;
	inset: 0;
	z-index: 2;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 1rem;
	background: var(--color-overlay);
	color: var(--color-text-muted);
	font-size: 1rem;
}

.chat {
	flex: 0 0 25%;
	overflow: hidden;
	min-width: 0;
	min-height: 0;
}

.divider {
	position: absolute;
	z-index: 4;
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
	z-index: 4;
	cursor: pointer;
	touch-action: none;

	&:hover {
		background: var(--color-edge-hover);
	}
}
</style>
