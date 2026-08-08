<script setup lang="ts">
import Color from 'color';
import { Pane } from 'tweakpane';
import { animate } from 'animejs';
import { useRouteHash } from '@vueuse/router';
import { get, useFps, useRafFn } from '@vueuse/core';
import { CRTScreen, Shader, SolidColor, Swirl } from 'shaders/vue';
import { css, plugins as essentialsPlugins, id } from '@tweakpane/plugin-essentials';
import { computed, onMounted, onUnmounted, reactive, useTemplateRef, watch } from 'vue';
import type { FpsGraphBladeApi } from '@tweakpane/plugin-essentials';

const anime = new Map<string, ReturnType<typeof animate>>();

const params = reactive({
	h: 360,
	s: 90,
	l: 45,
	coarseX: 50,
	coarseY: 50,
	mediumX: 50,
	mediumY: 50,
	fineX: 50,
	fineY: 50
});

const color = computed(() => Color.hsl(params.h, params.s, params.l));

function startAnimation(key: keyof typeof params, range: [number, number], duration: number): void {
	anime.set(key, animate(params, { [key]: range, duration, loop: true, alternate: true, easing: 'linear' }));
}

onMounted(() => {
	startAnimation('h', [200, 380], 45_000);
	startAnimation('s', [50, 100], 35_000);
	startAnimation('l', [35, 55], 40_000);
	startAnimation('coarseX', [40, 60], 22_000);
	startAnimation('coarseY', [40, 60], 24_000);
	startAnimation('mediumX', [45, 55], 18_000);
	startAnimation('mediumY', [45, 55], 20_000);
	startAnimation('fineX', [47, 53], 15_000);
	startAnimation('fineY', [47, 53], 16_000);
});

onUnmounted(() => {
	for (const a of anime.values()) {
		a.cancel();
	}
});

const fps = useFps();
const fpsBinding = { fps: 0 };
const hash = useRouteHash();
const paneElement = useTemplateRef<HTMLElement>('tweakpane');
const showControls = computed(() => get(hash) === '#controls');

const uiParams = { ...params };
let programmaticUpdate = false;

let pane: Pane | null = null;
let fpsGraph: FpsGraphBladeApi | null = null;

const { pause: pauseTweakpane, resume: resumeTweakpane } = useRafFn(
	() => {
		fpsGraph?.begin();
		fpsGraph?.end();
		fpsBinding.fps = get(fps);

		programmaticUpdate = true;
		Object.assign(uiParams, params);
		pane?.refresh();
		programmaticUpdate = false;
	},
	{ immediate: false }
);

watch(
	showControls,
	(show) => {
		const controls = get(paneElement);
		if (show && controls) {
			pane?.dispose();
			pane = new Pane({ container: controls, title: 'Background' });
			pane.registerPlugin({ id, css, plugins: essentialsPlugins });

			for (const key of ['h', 's', 'l'] as const) {
				pane.addBinding(uiParams, key, {
					min: key === 'h' ? 0 : 0,
					max: key === 'h' ? 360 : 100,
					step: 1,
					label: key
				}).on('change', () => {
					if (programmaticUpdate) {
						return;
					}
					anime.get(key)?.pause();
					anime.delete(key);
					params[key] = uiParams[key];
				});
			}

			for (const key of ['coarseX', 'coarseY', 'mediumX', 'mediumY', 'fineX', 'fineY'] as const) {
				pane.addBinding(uiParams, key, { min: 0, max: 100, step: 1, label: key }).on('change', () => {
					if (programmaticUpdate) {
						return;
					}
					anime.get(key)?.pause();
					anime.delete(key);
					params[key] = uiParams[key];
				});
			}

			pane.addBinding(fpsBinding, 'fps', { readonly: true, interval: 200, label: 'FPS' });
			fpsGraph = pane.addBlade({ view: 'fpsgraph', label: 'FPS', rows: 2 }) as FpsGraphBladeApi;

			resumeTweakpane();
		} else {
			pauseTweakpane();
			pane?.dispose();
			pane = null;
			fpsGraph = null;
		}
	},
	{ flush: 'post' }
);

onUnmounted(() => {
	pauseTweakpane();
	pane?.dispose();
});
</script>

<template>
	<Shader id="background" :disable-telemetry="true">
		<SolidColor color="#000000" mask-type="alpha" />
		<CRTScreen
			mask-type="alpha"
			:visible="true"
			:contrast="1.03"
			:pixel-size="8"
			:brightness="1.03"
			:color-shift="10"
			:vignette-intensity="0"
			:scanline-frequency="500"
			:scanline-intensity="0.05">
			<Swirl
				:color-a="color.hex()"
				color-b="#00000000"
				:detail="2.5"
				color-space="oklch"
				mask-type="alpha"
				:coarseX="params.coarseX"
				:coarseY="params.coarseY"
				:medium-x="params.mediumX"
				:medium-y="params.mediumY"
				:fine-x="params.fineX"
				:fine-y="params.fineY" />
			<Swirl
				:color-a="color.lighten(0.42).hex()"
				color-b="#00000000"
				:detail="2.5"
				color-space="oklch"
				mask-type="alpha"
				:coarseX="params.coarseX"
				:coarseY="params.coarseY"
				:medium-x="params.mediumX"
				:medium-y="params.mediumY"
				:fine-x="params.fineX"
				:fine-y="params.fineY" />
		</CRTScreen>
	</Shader>
	<div v-if="showControls" id="controls-panel" ref="tweakpane" />
</template>

<style scoped>
#background {
	inset: 0;
	position: fixed;
	z-index: -1;
}

#controls-panel {
	position: fixed;
	right: 12px;
	top: 50%;
	transform: translateY(-50%);
	z-index: 2;
}
</style>
