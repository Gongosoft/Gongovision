<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { computed, ref, watch } from 'vue';
import type { MenuTileProps } from '@/types/menu.d.ts';

const { icon, label, title, fill, animated = true, to, href } = defineProps<MenuTileProps>();

const tag = computed(() => {
	if (to) {
		return RouterLink;
	}
	return href === undefined ? 'button' : 'a';
});

const attributes = computed(() => {
	if (to) {
		return { to };
	}
	if (href !== undefined) {
		return { href, target: href.startsWith('https://') ? '_blank' : undefined };
	}
	return { type: 'button' };
});

const isSVG = computed(() => icon?.trimStart().startsWith('<') ?? false);

/** each icon starts its colour cycle at a random point the first time it's hovered */
const hueDelay = ref<string>();

function onHover(): void {
	hueDelay.value ??= `-${Math.random() * 30}s`;
}

watch(
	(): string | undefined => icon,
	() => {
		hueDelay.value = undefined;
	}
);
</script>

<template>
	<component :is="tag" v-bind="attributes" class="menu-tile" :title="title ?? label" @mouseenter="onHover">
		<span
			v-if="isSVG"
			class="icon"
			:class="{ 'icon-animated': animated }"
			:style="{ '--icon-fill': fill, '--hue-delay': hueDelay }"
			v-html="icon" />
		<img v-else-if="icon" class="icon-image" :src="icon" />
		<span class="label" :style="{ '--menu-label-chars': label.length }">{{ label }}</span>
	</component>
</template>

<style scoped>
.menu-tile {
	all: unset;
	align-items: center;
	cursor: pointer;
	display: flex;
	flex-direction: column;
	gap: var(--menu-tile-gap);

	&:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 0.25rem;
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}

	/* --px is one icon pixel, so the hard shadow stays on the icon's pixel grid */
	& .icon,
	& .icon-image {
		--px: calc(var(--menu-icon-size) / 24);
		--shadow: drop-shadow(calc(var(--px) * 2) calc(var(--px) * 2) 0 #000);
		display: block;
		filter: var(--shadow);
		height: var(--menu-icon-size);
		transition: filter 0.25s ease-out;
		width: var(--menu-icon-size);
	}

	& .icon-image {
		object-fit: contain;
	}

	& .icon :deep(svg) {
		animation-delay: var(--hue-delay, 0s);
		fill: var(--icon-fill, var(--color-text));
		height: 100%;
		transition: fill 0.25s ease-out;
		width: 100%;

		& * {
			fill: inherit;
		}
	}

	&:hover .icon,
	&:hover .icon-image {
		filter: var(--shadow) drop-shadow(0 0 2px #fff) drop-shadow(0 0 6px rgb(255 255 255 / 0.8))
			drop-shadow(0 0 14px rgb(255 255 255 / 0.45));
	}

	&:hover .icon :deep(svg) {
		animation-play-state: running;
	}

	& .label {
		--px: 0.09765625em;
		background: rgb(0 0 0 / 0.55);
		border-radius: 0.25rem;
		font-family: 'VCR OSD';
		font-size: min(
			var(--menu-label-size),
			calc((var(--menu-half-column) * 2 - var(--menu-label-size) * 0.7) / (0.586 * var(--menu-label-chars)))
		);
		line-height: calc(var(--menu-label-size) * 1.2);
		padding: var(--menu-label-padding) calc(var(--menu-label-size) * 0.35);
		text-shadow:
			var(--px) 0 #000,
			calc(var(--px) * -1) 0 #000,
			0 var(--px) #000,
			0 calc(var(--px) * -1) #000,
			var(--px) var(--px) #000,
			calc(var(--px) * -1) var(--px) #000,
			var(--px) calc(var(--px) * -1) #000,
			calc(var(--px) * -1) calc(var(--px) * -1) #000;
		white-space: nowrap;
	}
}
</style>
