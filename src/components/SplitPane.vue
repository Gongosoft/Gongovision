<script setup lang="ts">
import { computed, provide } from 'vue';
import { splitPaneKey, useSplitPane } from '@/composables/useSplitPane.ts';

/** `collapsed` hides the side pane entirely with no way to unhide */
const { collapsed = false } = defineProps<{ collapsed?: boolean }>();

const {
	isMobile,
	side,
	hidden,
	dragging,
	chatStyle,
	dividerStyle,
	onPointerDown,
	onPointerUp,
	onPointerMove,
	showEdge,
	snapTo16ᱺ9,
	flip
} = useSplitPane();

provide(splitPaneKey, { isMobile, edgesShown: computed(() => hidden.value && !collapsed), showEdge });
</script>

<template>
	<div class="split" :class="[isMobile ? 'mobile' : 'desktop', `side-${side}`]">
		<div class="gongo">
			<slot />
		</div>

		<div
			v-if="!hidden && !collapsed"
			class="divider"
			:class="{ active: dragging }"
			:style="dividerStyle"
			@pointerdown="onPointerDown"
			@pointermove="onPointerMove"
			@pointerup="onPointerUp"
			@pointercancel="onPointerUp"
			@click.ctrl="snapTo16ᱺ9"
			@dblclick="flip" />

		<div v-if="!hidden && !collapsed" class="ohmies" :style="chatStyle"><slot name="side" /></div>
	</div>
</template>

<style scoped>
.split {
	background: var(--color-black);
	display: flex;
	overflow: hidden;
	position: relative;
	width: 100%;
	height: 100dvh;

	&.desktop {
		flex-direction: row;

		& .divider {
			cursor: col-resize;
			top: 0;
			width: 12px;
			height: 100%;
		}
	}

	&.mobile {
		flex-direction: column;

		& .gongo {
			flex: 1 1 0;
			min-height: 0;
		}
		& .ohmies {
			flex: 0 0 auto;
		}

		& .divider {
			cursor: row-resize;
			left: 0;
			width: 100%;
			height: 12px;
		}
	}

	&.side-start {
		& .gongo {
			order: 1;
		}
		& .ohmies {
			order: 0;
		}
	}

	&.side-end {
		& .gongo {
			order: 0;
		}
		& .ohmies {
			order: 1;
		}
	}
}

.gongo {
	display: flex;
	flex-direction: column;
	flex: 1 1 0;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
	position: relative;
	user-select: none;
}

.ohmies {
	flex: 0 0 25%;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
	z-index: 1;
}

.divider {
	background: transparent;
	position: absolute;
	touch-action: none;
	transition: background 0.25s;
	z-index: 2;

	&.active {
		animation: backgroundShift 30s linear infinite;
	}

	@media (hover: hover) {
		&:hover {
			animation: backgroundShift 30s linear infinite;
		}
	}
}
</style>
