<script setup lang="ts">
import { inject, useTemplateRef } from 'vue';
import { usePointerSwipe } from '@vueuse/core';
import { splitPaneKey } from '@/composables/useSplitPane.ts';

const splitPane = inject(splitPaneKey);
if (!splitPane) {
	throw new Error('SplitPaneEdges must be rendered inside SplitPane');
}
const { isMobile, edgesShown, showEdge } = splitPane;

usePointerSwipe(useTemplateRef('edgeStart'), { onSwipeEnd: () => showEdge('start') });
usePointerSwipe(useTemplateRef('edgeEnd'), { onSwipeEnd: () => showEdge('end') });
</script>

<template>
	<template v-if="edgesShown">
		<button
			ref="edgeStart"
			type="button"
			class="edge edge-start"
			:class="isMobile ? 'mobile' : 'desktop'"
			aria-label="Show chat"
			data-interactive
			@click="showEdge('start')" />
		<button
			ref="edgeEnd"
			type="button"
			class="edge edge-end"
			:class="isMobile ? 'mobile' : 'desktop'"
			aria-label="Show chat"
			data-interactive
			@click="showEdge('end')" />
	</template>
</template>

<style scoped>
.edge {
	appearance: none;
	background: transparent;
	border: 0;
	cursor: pointer;
	padding: 0;
	position: absolute;
	touch-action: none;
	z-index: 2;

	&:hover {
		background: var(--color-edge-hover);
	}

	&.desktop {
		bottom: 0;
		top: 0;
		width: 60px;

		&.edge-start {
			left: 0;
		}
		&.edge-end {
			right: 0;
		}
	}

	&.mobile {
		height: 50px;
		left: 0;
		right: 0;

		&.edge-start {
			top: 0;
		}
		&.edge-end {
			bottom: 0;
			height: calc(50px + var(--media-spacing, 4px) * 14);
		}
	}
}
</style>
