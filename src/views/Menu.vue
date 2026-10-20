<script setup lang="ts">
import MenuTile from '@/components/MenuTile.vue';
import backSVG from '@/assets/images/arrow-left.svg?raw';
import { computed } from 'vue';
import { get } from '@vueuse/core';
import { useMenu } from '@/composables/useMenu.ts';

const { items, back } = useMenu();

const columns = computed(() => ([2, 4].includes(get(items).length) ? 2 : 3));
const shortRow = computed(() => get(items).length % get(columns));

function gridColumn(index: number): string | undefined {
	if (!get(shortRow)) {
		return undefined;
	}
	if (index === 0) {
		return `${get(columns) - get(shortRow) + 1} / span 2`;
	}
	return index === get(shortRow) ? '1 / span 2' : undefined;
}
</script>

<template>
	<nav id="menu" :style="{ '--half-columns': columns * 2 }">
		<template v-for="(item, index) in items" :key="index">
			<component :is="item.component" v-if="'component' in item" :style="{ gridColumn: gridColumn(index) }" />
			<MenuTile v-else v-bind="item" :style="{ gridColumn: gridColumn(index) }" />
		</template>
		<MenuTile
			v-if="back"
			id="menu-back"
			:icon="backSVG"
			label="Back"
			:to="back"
			:style="{ gridColumn: `${columns} / span 2` }" />
	</nav>
</template>

<style scoped>
#menu {
	display: grid;
	grid-auto-rows: var(--menu-tile-height);
	grid-template-columns: repeat(var(--half-columns), var(--menu-half-column));
	left: 50%;
	position: fixed;
	row-gap: var(--menu-row-gap);
	top: var(--menu-top);
	transform: translateX(-50%);
	z-index: 3;

	& > * {
		grid-column: span 2;
	}

	& #menu-back {
		grid-row: 3;
		margin-top: calc(12 * var(--menu-unit));
	}
}
</style>
