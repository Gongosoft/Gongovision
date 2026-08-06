<script setup lang="ts">
import blotterᱹjs from 'blotter.js/build/blotter.min.js?url';
import { get } from '@vueuse/core';
import { useScript } from '@unhead/vue';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import type { BlotterMaterial, BlotterRenderScope, MaterialKind } from '@/types/blotter.d.ts';

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
	text: string;
	material?: MaterialKind;
	materialUniforms?: Record<string, number | number[]>;
	fontFamily?: string;
	fontFill?: string;
	fontSize?: number;
}>();

const container = ref<HTMLDivElement>();
let scope: BlotterRenderScope | null = null;
let setupCount = 0;

function teardown(): void {
	const element = get(container);
	if (scope && element) {
		element.innerHTML = '';
	}
	scope = null;
}

async function setup(): Promise<void> {
	const count = ++setupCount;
	const element = get(container);
	if (!element || !text) {
		teardown();
		return;
	}

	const { Blotter } = window;

	if (!Blotter) {
		return;
	}

	try {
		await document.fonts.load(`${fontSize}px ${fontFamily}`);
	} catch {
		/*_*/
	}

	if (count !== setupCount) {
		return;
	}

	teardown();

	const blotterText = new Blotter.Text(text.toUpperCase(), {
		family: fontFamily,
		size: fontSize,
		fill: fontFill,
		paddingLeft: 16,
		paddingRight: 16,
		paddingTop: 8,
		paddingBottom: 8
	});

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

	const instance = new Blotter(material, { texts: blotterText });
	const newScope = instance.forText(blotterText);
	newScope.appendTo(element);
	scope = newScope;
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
		{ key: `blotter-${kind}` }
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
		(): string => text,
		(): Record<string, number | number[]> => materialUniforms,
		(): string => fontFamily,
		(): string => fontFill,
		(): number => fontSize
	],
	setup
);
</script>

<template>
	<div v-if="text" ref="container" class="blotter" />
</template>

<style scoped>
.blotter {
	pointer-events: none;

	&:deep(canvas) {
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		display: block;
	}
}
</style>
