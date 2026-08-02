<script setup lang="ts">
import { get } from '@vueuse/core';
import { onMounted, onUnmounted, useTemplateRef } from 'vue';
import { characterCursor, fairyDustCursor } from 'cursor-effects';
import type { CursorEffectResult } from 'cursor-effects';

const effectsContainerRef = useTemplateRef<HTMLDivElement>('effectsContainer');
const effects: CursorEffectResult[] = [];
const colors = [
	'#4e85ff',
	'#52cd3e',
	'#5451e6',
	'#4effb7',
	'#e28616',
	'#d83d5c',
	'#613dd3',
	'#176c5b',
	'#28ff15',
	'#18b44a',
	'#98ff17',
	'#dd007a',
	'#54c4e8',
	'#f17d06',
	'#982346',
	'#fcf60b',
	'#654000',
	'#ec218c',
	'#d30039'
];

onMounted(() => {
	const effectsContainer = get(effectsContainerRef);
	if (!effectsContainer) {
		return;
	}

	effects.push(characterCursor({ characters: ['g', 'o', 'n', 'g', 'o'], colors, font: 'Gohu' }));
	effects.push(
		fairyDustCursor({
			colors
		})
	);

	const cursors = document.querySelectorAll<HTMLCanvasElement>('body > canvas');
	for (const canvas of cursors) {
		effectsContainer.appendChild(canvas);
	}
});

onUnmounted(() => {
	for (const effect of effects) {
		effect.destroy();
	}
});
</script>

<template>
	<div id="cursor">
		<div ref="effectsContainer" id="cursor-effects"></div>
	</div>
</template>

<style scoped>
#cursor-effects {
	height: 100%;
	left: 0;
	pointer-events: none;
	position: fixed;
	top: 0;
	width: 100%;
	z-index: 1;
}
</style>
