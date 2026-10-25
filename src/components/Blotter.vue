<script setup lang="ts">
import blotterᱹjs from 'blotter.js/build/blotter.min.js?url';
import { get } from '@vueuse/core';
import { useScript } from '@unhead/vue';
import { computed, onMounted, onUnmounted, useTemplateRef, watch } from 'vue';
import type { BlotterInstance, BlotterMaterial, MaterialKind } from '@/types/blotter.d.ts';

const { onLoaded: onBlotterLoaded } = useScript(blotterᱹjs);

const materials = {
	src: import.meta.glob<string>('../lib/blotter/*Material.js', { eager: true, query: '?url', import: 'default' }),
	controllers: {} as Record<MaterialKind, ReturnType<typeof useScript>>,
	defaults: {
		channelSplit: { uOffset: 0.05, uRotation: 45, uApplyBlur: 1, uAnimateNoise: 1 },
		flies: {
			uPointCellWidth: 0.04,
			uPointRadius: 0.75,
			uDodge: 0,
			uDodgePosition: [0.5, 0.5],
			uDodgeSpread: 0.25,
			uSpeed: 1
		},
		liquidDistort: { uSpeed: 1, uVolatility: 0.15, uSeed: 0.1 },
		rollingDistort: {
			uSineDistortSpread: 0.05,
			uSineDistortCycleCount: 2,
			uSineDistortAmplitude: 0.25,
			uNoiseDistortVolatility: 20,
			uNoiseDistortAmplitude: 0.01,
			uDistortPosition: [0.5, 0.5],
			uRotation: 170,
			uSpeed: 0.08
		},
		slidingDoor: {
			uDivisions: 5,
			uDivisionWidth: 0.25,
			uAnimateHorizontal: 0,
			uFlipAnimationDirection: 0,
			uSpeed: 0.2
		}
	}
};
for (const [path, url] of Object.entries(materials.src)) {
	const kind = path.split('/').pop()?.replace('Material.js', '') as MaterialKind;
	if (kind && !materials.controllers[kind]) {
		materials.controllers[kind] = useScript(url, { trigger: 'manual' });
	}
}

const {
	text,
	material: materialKind = 'liquidDistort',
	materialUniforms = {},
	fontFamily = 'monospace',
	fontFill = '#ffffff',
	fontSize = 42
} = defineProps<{
	text: string | string[];
	material?: MaterialKind;
	materialUniforms?: Record<string, number | number[]>;
	fontFamily?: string;
	fontFill?: string;
	/** a size per line when `text` is an array; the last one repeats */
	fontSize?: number | number[];
}>();

const container = useTemplateRef<HTMLDivElement>('container');
const lines = computed(() => [text].flat().filter(Boolean));
let current: BlotterInstance | null = null;
let setupCount = 0;

function teardown(): void {
	current?.teardown();
	current = null;
	get(container)?.replaceChildren();
}

async function setup(): Promise<void> {
	const count = ++setupCount;
	const element = get(container);
	const content = get(lines);
	if (!element || content.length === 0) {
		teardown();
		return;
	}

	const { Blotter } = window;

	if (!Blotter) {
		return;
	}

	const sizes = [fontSize].flat();

	try {
		await document.fonts.load(`${sizes[0]}px ${fontFamily}`);
	} catch {
		/*_*/
	}

	if (count !== setupCount) {
		return;
	}

	teardown();

	const blotterTexts = content.map(
		(value, index) =>
			new Blotter.Text(value.toUpperCase(), {
				family: fontFamily,
				size: sizes[index] ?? sizes.at(-1),
				fill: fontFill,
				paddingLeft: 16,
				paddingRight: 16,
				paddingTop: 8,
				paddingBottom: 8
			})
	);

	const MaterialConstructor = (Blotter as unknown as Record<string, new () => BlotterMaterial>)[
		`${materialKind.charAt(0).toUpperCase()}${materialKind.slice(1)}Material`
	];

	if (!MaterialConstructor) {
		return;
	}

	const material = new MaterialConstructor();
	const uniforms = { ...materials.defaults[materialKind], ...materialUniforms };
	for (const [key, value] of Object.entries(uniforms)) {
		const uniform = material.uniforms[key];
		if (uniform) {
			uniform.value = key === 'uSeed' ? value || Math.random() : value;
		}
	}

	const instance = new Blotter(material, { texts: blotterTexts });
	for (const blotterText of blotterTexts) {
		instance.forText(blotterText).appendTo(element);
	}
	current = instance;
}

const loadedKinds = new Set<MaterialKind>();

function loadMaterial(kind: MaterialKind): void {
	if (loadedKinds.has(kind)) {
		setup();
		return;
	}

	const controller = materials.controllers[kind];
	if (!controller) {
		return;
	}

	if (get(controller.status) === 'loaded') {
		loadedKinds.add(kind);
		setup();
		return;
	}

	controller.onLoaded(
		() => {
			loadedKinds.add(kind);
			setup();
		},
		{ key: `blotter-${crypto.randomUUID()}` }
	);

	if (get(controller.status) === 'awaitingLoad') {
		void controller.load();
	}
}

onBlotterLoaded(() => {
	loadMaterial(materialKind);
});

onMounted(setup);
onUnmounted(teardown);
watch(
	(): MaterialKind => materialKind,
	(kind: MaterialKind) => {
		loadMaterial(kind);
	}
);
watch(
	[
		(): string => get(lines).join('\n'),
		(): string => JSON.stringify(materialUniforms),
		(): string => fontFamily,
		(): string => fontFill,
		(): string => JSON.stringify(fontSize)
	],
	setup
);
</script>

<template>
	<div v-if="lines.length" ref="container" class="blotter" />
</template>

<style scoped>
.blotter {
	align-items: center;
	display: flex;
	flex-direction: column;
	pointer-events: none;

	&:deep(canvas) {
		display: block;
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
	}
}
</style>
