<script setup lang="ts">
import { parsePreset } from '@/lib/gongoizer/validate.ts';
import { PALETTE_OPTIONS } from '@/lib/gongoizer/palettes.ts';
import { GROUPS, NO_RANDOM } from '@/lib/gongoizer/schema.ts';
import { createPane, flashTitle, hint } from '@/utils/tweakpane.ts';
import { useTweakpaneDrag } from '@/composables/useTweakpaneDrag.ts';
import { presetIcons, presetKeys } from '@/lib/gongoizer/presets.ts';
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { get, useClipboard, useFps, useIdle, useRafFn, useThrottleFn } from '@vueuse/core';
import type { ListItem } from '@tweakpane/core';
import type { ParamDef } from '@/types/gongoizer.d.ts';
import type { FpsGraphBladeApi } from '@tweakpane/plugin-essentials';
import type { FolderApi, ListInputBindingApi, Pane } from 'tweakpane';
import type { UseGongoizerReturn } from '@/composables/useGongoizer.ts';

const { gongoizer } = defineProps<{
	gongoizer: UseGongoizerReturn;
}>();

const { params } = gongoizer;
const { copied, copy } = useClipboard();

const fps = useFps({ every: 10 });

/** panel width and screen-edge gap in px (the width must match .gongoizer-panel in the styles below) */
const PANEL_WIDTH = 320;
const PANEL_MARGIN = 12;
const PALETTE_ITEMS: ListItem<string>[] = PALETTE_OPTIONS.map((text) => ({ text, value: text }));

const sections: FolderApi[] = [];
const container = ref<HTMLElement | null>(null);
const dragHandle = shallowRef<HTMLElement | null>(null);
let pane: Pane | null = null;
let fpsGraph: FpsGraphBladeApi | null = null;
let micButton: ReturnType<Pane['addButton']> | null = null;
let copyButton: ReturnType<Pane['addButton']> | null = null;
let pasteButton: ReturnType<Pane['addButton']> | null = null;
let desktopButton: ReturnType<Pane['addButton']> | null = null;
let rafPause: (() => void) | null = null;
let rafResume: (() => void) | null = null;

/** title-bar readouts */
let gridSpan: HTMLElement | null = null;
let fpsSpan: HTMLElement | null = null;

const visible = ref(true);
const { idle } = useIdle(3000);
watch([idle, (): boolean => pane?.expanded ?? true], () => {
	visible.value = !idle.value || pane === null || pane.expanded;
});

const { dragStyle, onPointerDownCapture, onClickCapture } = useTweakpaneDrag({
	container,
	handle: dragHandle,
	width: PANEL_WIDTH,
	margin: PANEL_MARGIN
});

watch(visible, (shown) => {
	if (shown) {
		rafResume?.();
	} else {
		rafPause?.();
	}
});

watch(
	params,
	useThrottleFn(() => pane?.refresh(), 250),
	{ deep: true }
);

/** preset dropdown options: a blank "no preset" entry, then the ID plus its capability icons */
function presetOptions(): ListItem<string>[] {
	return [{ text: '', value: '' }, ...presetKeys().map((key) => ({ text: `${key}${presetIcons(key)}`, value: key }))];
}

function addRow(folder: FolderApi, def: ParamDef): void {
	if (def.key === 'palette' || def.key === 'palette2') {
		const binding = folder.addBinding(params, def.key, { options: PALETTE_ITEMS, label: def.label });
		hint(binding, def.hint);
		return;
	}
	if ('options' in def) {
		const binding = folder.addBinding(params, def.key, {
			options: def.options.map((text, value) => ({ text, value })),
			label: def.label
		});
		hint(binding, def.hint);
		return;
	}
	const binding = folder.addBinding(params, def.key, {
		min: def.min,
		max: def.max,
		step: def.step,
		label: def.label
	});
	hint(binding, def.hint);
}

watch(copied, (value) => {
	if (value) {
		flashTitle(copyButton, 'copied');
	}
});

async function pasteSettings(): Promise<void> {
	let text: string | null = null;
	try {
		text = await navigator.clipboard.readText();
	} catch {
		text = prompt('paste settings JSON:');
	}
	if (!text) {
		return;
	}
	const changes = parsePreset(text);
	if (!changes) {
		flashTitle(pasteButton, 'not a preset');
		return;
	}
	gongoizer.apply(changes);
	flashTitle(pasteButton, 'pasted');
}

function syncAudioButtons(): void {
	const source = gongoizer.audioSource.value;
	if (micButton) {
		micButton.element.classList.toggle('on', source === 'mic');
	}
	if (desktopButton) {
		desktopButton.element.classList.toggle('on', source === 'desktop');
	}
}

watch(gongoizer.audioSource, syncAudioButtons);

async function toggleAudio(source: 'mic' | 'desktop'): Promise<void> {
	try {
		await gongoizer.toggleAudio(source);
	} catch (error) {
		flashTitle(source === 'mic' ? micButton : desktopButton, 'audio unavailable');
		console.error('gongoizer audio:', error);
	}
}

onMounted(() => {
	if (!container.value) {
		return;
	}
	const { pane: gongoPane, handle } = createPane(container.value, 'Gongoizer');
	pane = gongoPane;
	dragHandle.value = handle;

	const titleEl = pane.element.querySelector<HTMLElement>('.tp-rotv_t');
	if (titleEl) {
		const grid = document.createElement('span');
		grid.className = 'gongoizer-grid';
		const fpsLabel = document.createElement('span');
		fpsLabel.className = 'gongoizer-fps';
		titleEl.replaceChildren(grid, fpsLabel);
		gridSpan = grid;
		fpsSpan = fpsLabel;
	}

	fpsGraph = pane.addBlade({ view: 'fpsgraph' }) as FpsGraphBladeApi;

	const presetState = { preset: gongoizer.preset.value };
	const presetPicker = pane.addBinding(presetState, 'preset', {
		options: presetOptions(),
		label: 'preset'
	}) as unknown as ListInputBindingApi<string>;
	presetPicker.on('change', (event) => {
		// ignore the blank entry and programmatic syncs (undo, presets, defaults)
		if (!event.value || event.value === gongoizer.preset.value) {
			return;
		}
		gongoizer.loadPreset(event.value);
	});
	watch(gongoizer.preset, (key) => {
		presetState.preset = key;
		presetPicker.refresh();
	});
	presetPicker.element.classList.add('gongoizer-preset-row');

	const savePresetButton = document.createElement('button');
	savePresetButton.type = 'button';
	savePresetButton.className = 'gongoizer-save';
	savePresetButton.textContent = '+';
	savePresetButton.title = 'save the current look as a preset';
	savePresetButton.addEventListener('click', () => {
		let name = prompt('preset name:');
		while (name !== null) {
			if (!name.trim()) {
				name = prompt('preset name:');
				continue;
			}
			const key = gongoizer.savePreset(name);
			if (key) {
				presetPicker.options = presetOptions();
				gongoizer.preset.value = key;
				flashTitle(savePresetButton, 'saved');
				return;
			}
			name = prompt('name taken, try another:');
		}
	});
	presetPicker.element.querySelector('.tp-lblv_v')?.appendChild(savePresetButton);

	const actionBar = pane.addFolder({ title: 'Actions', expanded: true });
	actionBar.element.classList.add('gongoizer-btnrow');
	actionBar.addButton({ title: 'randomize' }).on('click', () => {
		gongoizer.random();
	});
	actionBar.addButton({ title: 'nudge' }).on('click', () => {
		gongoizer.variant();
	});
	actionBar.addButton({ title: 'undo' }).on('click', () => {
		gongoizer.undo();
	});
	actionBar.addButton({ title: 'restart' }).on('click', () => {
		gongoizer.restart();
	});
	const pauseButton = actionBar.addButton({ title: gongoizer.paused.value ? 'play' : 'pause' });
	pauseButton.on('click', () => {
		gongoizer.paused.value = !gongoizer.paused.value;
		pauseButton.title = gongoizer.paused.value ? 'play' : 'pause';
	});
	actionBar.addButton({ title: 'defaults' }).on('click', () => {
		gongoizer.restoreDefaults();
	});
	copyButton = actionBar.addButton({ title: 'copy' });
	copyButton.on('click', () => {
		void copy(JSON.stringify(params, null, 2));
	});
	pasteButton = actionBar.addButton({ title: 'paste' });
	pasteButton.on('click', () => {
		void pasteSettings();
	});
	micButton = actionBar.addButton({ title: 'mic' });
	micButton.on('click', () => {
		void toggleAudio('mic');
	});
	desktopButton = actionBar.addButton({ title: 'desktop audio' });
	desktopButton.on('click', () => {
		void toggleAudio('desktop');
	});
	syncAudioButtons();
	const expandButton = actionBar.addButton({ title: 'expand all' });
	expandButton.on('click', () => {
		const expand = !sections.every((folder) => folder.expanded);
		for (const folder of sections) {
			folder.expanded = expand;
		}
		expandButton.title = expand ? 'collapse all' : 'expand all';
	});

	for (const group of GROUPS) {
		const folder = pane.addFolder({ title: group.name, expanded: false });
		folder.element.classList.add('gongoizer-btnrow');
		sections.push(folder);
		if (!NO_RANDOM.has(group.name)) {
			folder.addButton({ title: 'randomize' }).on('click', () => {
				gongoizer.randomSection(group.name);
			});
			folder.addButton({ title: 'nudge' }).on('click', () => {
				gongoizer.variantSection(group.name);
			});
		}
		for (const def of group.rows) {
			addRow(folder, def);
		}
	}

	const { pause, resume } = useRafFn(() => {
		fpsGraph?.begin();
		fpsGraph?.end();
		if (gridSpan) {
			const grid = `${gongoizer.simSize.value}${gongoizer.quality.value < 1 ? ` · q${gongoizer.quality.value}` : ''}`;
			if (gridSpan.textContent !== grid) {
				gridSpan.textContent = grid;
			}
		}
		if (fpsSpan) {
			const label = `${Math.round(get(fps))} fps`;
			if (fpsSpan.textContent !== label) {
				fpsSpan.textContent = label;
			}
		}
	});
	rafPause = pause;
	rafResume = resume;
});

onBeforeUnmount(() => {
	pane?.dispose();
});
</script>

<template>
	<div
		v-show="visible"
		ref="container"
		id="gongoizer-panel"
		:style="dragStyle"
		@pointerdown.capture="onPointerDownCapture"
		@click.capture="onClickCapture" />
</template>

<style scoped>
#gongoizer-panel {
	/* useDraggable writes left/top - width must match PANEL_WIDTH */
	position: fixed;
	z-index: 1;
	width: 320px;
	max-width: calc(100vw - 24px);
	max-height: 100dvh;
	overflow: auto;
	pointer-events: auto;

	/* tweakpane theme tweaks: bigger text and roomier rows (defaults live on .tp-rotv) */
	& :deep(.tp-rotv) {
		font-size: 13px;
		--tp-blade-value-width: 150px;
		--tp-container-unit-size: 24px;
	}

	& :deep(.tp-rotv_b) {
		cursor: grab;
		padding-left: 24px;
		padding-right: 24px;
		touch-action: none;
		user-select: none;

		&:active {
			cursor: grabbing;
		}
	}

	& :deep(.tp-rotv_t) {
		align-items: center;
		display: grid;
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		grid-template-columns: 1fr auto 1fr;
	}

	& :deep(.gongoizer-grid),
	& :deep(.gongoizer-fps) {
		font-weight: 600;
	}

	& :deep(.gongoizer-grid) {
		grid-column: 2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	& :deep(.gongoizer-fps) {
		grid-column: 3;
		justify-self: end;
	}

	& :deep(.gongoizer-preset-row .tp-lblv_v) {
		align-items: center;
		display: flex;
		gap: 4px;
		width: calc(var(--bld-vw) + var(--cnt-usz) + 4px);
	}

	& :deep(.gongoizer-preset-row .tp-lstv) {
		flex: 1 1 auto;
		min-width: 0;
	}

	& :deep(.gongoizer-save) {
		background: var(--btn-bg);
		border: 0;
		border-radius: var(--bld-br);
		color: var(--btn-fg);
		cursor: pointer;
		flex: 0 0 var(--cnt-usz);
		font: inherit;
		font-size: 15px;
		font-weight: 700;
		height: var(--cnt-usz);
		line-height: 1;
		padding: 0;

		&:hover {
			background: var(--btn-bg-h);
		}

		&:active {
			background: var(--btn-bg-a);
		}
	}

	& :deep(.gongoizer-btnrow > .tp-fldv_c) {
		display: flex;
		flex-wrap: wrap;
		gap: var(--cnt-usp, 4px);

		> * {
			flex: 1 1 100%;
			margin-top: 0;
		}

		> .tp-lblv-nol {
			box-sizing: border-box;
			flex: 1 1 calc(50% - var(--cnt-usp, 4px));
		}
	}

	/* mic / desktop audio toggle state */
	& :deep(.tp-lblv.on .tp-btnv_b) {
		background: #fff;
		color: var(--btn-fg);
	}
}
</style>
