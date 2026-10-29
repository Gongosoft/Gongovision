<script setup lang="ts">
import '@/styles/emotewall.css';
import { useIdle } from '@vueuse/core';
import { useEmoteWall } from '@/composables/useEmoteWall.ts';
import { useTweakpaneDrag } from '@/composables/useTweakpaneDrag.ts';
import { createPane, divider, flashTitle, hint, inlineButton, pretty } from '@/utils/tweakpane.ts';
import { onBeforeUnmount, onMounted, reactive, ref, shallowRef, useTemplateRef, watch } from 'vue';
import {
	applySettings,
	DEFAULT_SETTINGS,
	EMOTE_STYLES,
	KAPPAGEN_STYLES,
	sanitizeSettings
} from '@/lib/emotewall/config.ts';
import type { FolderApi, Pane } from 'tweakpane';
import type { EmoteList, EmoteStyle, KappaStyle, WallEmote, WallSettings } from '@/types/emotewall.d.ts';

/** must match `#emote-wall-panel`'s width */
const PANEL_WIDTH = 320;
const PANEL_MARGIN = 12;

const FALLBACK_EMOTES: WallEmote[] = [
	{ url: 'https://cdn.frankerfacez.com/emote/677107/4', zwe: [] },
	{ url: 'https://cdn.7tv.app/emote/01GQHKYBRR0007HP3X85ZD7WCG/4x.avif', zwe: [] },
	{ url: 'https://cdn.betterttv.net/emote/62f5f4b8ecbd41815423e43e/3x.webp', zwe: [] }
];

const wall = useTemplateRef<HTMLElement>('wall');
const { stage, settings: serverSettings } = useEmoteWall(() => wall.value);

const container = ref<HTMLElement | null>(null);
const dragHandle = shallowRef<HTMLElement | null>(null);
const previewEmotes = shallowRef<WallEmote[]>([]);

const settings = shallowRef<WallSettings>(DEFAULT_SETTINGS);
const dirty = ref(false);
const saved = shallowRef<WallSettings>(DEFAULT_SETTINGS);

const visible = ref(true);
const { idle } = useIdle(3000);

const { dragStyle, onPointerDownCapture, onClickCapture } = useTweakpaneDrag({
	container,
	handle: dragHandle,
	width: PANEL_WIDTH,
	margin: PANEL_MARGIN
});

let pane: Pane | null = null;
let saveButton: ReturnType<Pane['addButton']> | null = null;
let saveButtonInner: HTMLElement | null = null;
let settled = false;

watch(idle, () => {
	visible.value = !idle.value || (pane?.expanded ?? true);
});

/** editable mirror of the saved settings; Tweakpane binds to primitives, so lists become text */
interface Form {
	styles: Record<string, boolean>;
	kappaStyles: Record<string, boolean>;
	duplicates: number;
	holidayZWE: boolean;
	shadow: boolean;
	cubeSize: number;
	cubeCenter: boolean;
	cubeRotations: number;
	cubeFaces: boolean;
	kappaCount: number;
	congaContagious: boolean;
	congaTime: number;
	congaAvoidMiddle: boolean;
	textMessages: string;
	textTime: number;
	time: number;
	ratioNormal: number;
	ratioSmall: number;
	fadeIn: boolean;
	zoomIn: boolean;
	fadeOut: boolean;
	zoomOut: boolean;
}

/** splits a comma-separated text field back into a list */
function split(text: string): string[] {
	return text
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '');
}

function toForm(value: WallSettings): Form {
	const chosen = new Set<string>(value.styles);
	const kappaChosen = new Set<string>(value.kappaStyles);
	return {
		styles: Object.fromEntries(EMOTE_STYLES.map((style) => [style, chosen.has(style)])),
		kappaStyles: Object.fromEntries(KAPPAGEN_STYLES.map((style) => [style, kappaChosen.has(style)])),
		duplicates: value.duplicates,
		holidayZWE: value.holidayZWE,
		shadow: value.shadow,
		cubeSize: value.cube.size,
		cubeCenter: value.cube.center,
		cubeRotations: value.cube.rotations,
		cubeFaces: value.cube.faces,
		kappaCount: value.kappa.count,
		congaContagious: value.kappa.congaContagious,
		congaTime: value.kappa.congaTime,
		congaAvoidMiddle: value.kappa.congaAvoidMiddle,
		textMessages: value.kappa.textMessages.join(', '),
		textTime: value.kappa.textTime,
		time: value.emote.time,
		ratioNormal: value.emote.ratioNormal,
		ratioSmall: value.emote.ratioSmall,
		fadeIn: value.emote.fadeIn,
		zoomIn: value.emote.zoomIn,
		fadeOut: value.emote.fadeOut,
		zoomOut: value.emote.zoomOut
	};
}

function toSettings(form: Form): WallSettings {
	return sanitizeSettings({
		styles: EMOTE_STYLES.filter((style) => form.styles[style]),
		kappaStyles: KAPPAGEN_STYLES.filter((style) => form.kappaStyles[style]),
		duplicates: form.duplicates,
		holidayZWE: form.holidayZWE,
		shadow: form.shadow,
		cube: {
			size: form.cubeSize,
			center: form.cubeCenter,
			rotations: form.cubeRotations,
			faces: form.cubeFaces
		},
		kappa: {
			count: form.kappaCount,
			congaContagious: form.congaContagious,
			congaTime: form.congaTime,
			congaAvoidMiddle: form.congaAvoidMiddle,
			textMessages: split(form.textMessages),
			textTime: form.textTime
		},
		emote: {
			time: form.time,
			ratioNormal: form.ratioNormal,
			ratioSmall: form.ratioSmall,
			fadeIn: form.fadeIn,
			zoomIn: form.zoomIn,
			fadeOut: form.fadeOut,
			zoomOut: form.zoomOut
		}
	});
}

const form = reactive<Form>(toForm(DEFAULT_SETTINGS));

/** marks the save button while edits are unpublished; the flash captions never overwrite it */
function setDirty(value: boolean): void {
	dirty.value = value;
	saveButtonInner?.classList.toggle('dirty', value);
}

/** applies edits locally so the preview and this tab pick them up before saving */
function push(): void {
	const next = toSettings(form);
	settings.value = next;
	applySettings(next);
	setDirty(true);
}

function adopt(next: WallSettings): void {
	saved.value = next;
	settings.value = next;
	applySettings(next);
	// Tweakpane holds a reference to the style records, so they must be updated in place.
	const { styles, kappaStyles, ...rest } = toForm(next);
	Object.assign(form.styles, styles);
	Object.assign(form.kappaStyles, kappaStyles);
	Object.assign(form, rest);
	pane?.refresh();
	setDirty(false);
}

watch(serverSettings, (next) => {
	if (dirty.value) {
		applySettings(settings.value);
		return;
	}
	if (JSON.stringify(next) !== JSON.stringify(saved.value)) {
		adopt(next);
		if (settled) {
			flashTitle(saveButton, 'updated');
		}
	}
});

async function requestSettings(init?: RequestInit): Promise<WallSettings> {
	const response = await fetch('/emotewall/settings', { cache: 'no-store', ...init });
	if (!response.ok) {
		throw new Error(`${response.status} ${response.statusText}`);
	}
	return sanitizeSettings(await response.json());
}

async function load(): Promise<void> {
	try {
		adopt(await requestSettings());
		settled = true;
	} catch (error) {
		flashTitle(saveButton, 'load failed');
		console.error('emote wall settings:', error);
	}
}

async function save(): Promise<void> {
	const body = JSON.stringify(toSettings(form));
	try {
		adopt(await requestSettings({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body }));
		settled = true;
		flashTitle(saveButton, 'saved');
	} catch (error) {
		flashTitle(saveButton, 'save failed');
		console.error('emote wall settings:', error);
	}
}

async function loadEmotes(): Promise<void> {
	try {
		const response = await fetch('/emotes/list', { cache: 'no-store' });
		if (!response.ok) {
			throw new Error(`${response.status} ${response.statusText}`);
		}
		const list = (await response.json()) as EmoteList;
		previewEmotes.value = Object.values(list)
			.flat()
			.map(({ url }) => ({ url, zwe: [] }));
	} catch {
		/*_*/
	}
}

/** the fields every preview shares: a random seed and a start just ahead */
function previewSeed(): { seed: number; startAt: number } {
	return {
		seed: Math.floor(Math.random() * 0xff_ff_ff_ff),
		startAt: Date.now() + 200
	};
}

/** emotes for use in previews: the channel's own where they loaded, otherwise a predefined set */
function previewPool(): WallEmote[] {
	return previewEmotes.value.length > 0 ? previewEmotes.value : FALLBACK_EMOTES;
}

function previewEmote(style: EmoteStyle): void {
	const pool = previewPool();
	stage.value?.play(
		{ ...previewSeed(), kind: 'emote', style, emote: pool[Math.floor(Math.random() * pool.length)]! },
		0
	);
}

function previewKappa(style: KappaStyle): void {
	stage.value?.play(
		{
			...previewSeed(),
			kind: 'kappa',
			style,
			count: form.kappaCount,
			emotes: previewPool(),
			text: split(form.textMessages)[0] ?? ''
		},
		0
	);
}

const STYLE_HINTS: Record<EmoteStyle, string> = {
	Still: 'No movement at all.',
	StraightLine: 'Gentle movement in a random straight line.',
	Rise: 'Slowly rise to the top while wobbling back and forth.',
	Bounce: 'Fall from the top at an angle and bounce along the bottom (Windows Solitaire style).',
	Speed: 'Zoom across the screen.',
	Drop: 'Get stuck at the top and tumble down. No fade in or zoom in, only out.',
	Crazy: 'Bounce off the walls.',
	Confetti: 'Fall like confetti. No zoom, no fade in, only fade out.',
	Throw: 'Toss at the middle and tumble down. No fade in or zoom in, only out.',
	Pop: 'Jump from the bottom. No fade in or zoom in, only out.',
	Cube: 'Rotate a 3D cube of an emote. No zoom, only fade.',
	Fountain: 'Spout up from the bottom of the screen, then fall back down.'
};

const KAPPA_HINTS: Record<KappaStyle, string> = {
	StraightLine: 'Gentle movement in a random straight line.',
	Rise: 'Slowly rise to the top while wobbling back and forth.',
	Speed: 'Zoom across the screen.',
	Crazy: 'Bounce off the walls.',
	Burst: 'Expand from a centre point.',
	Fireworks: 'Burst out from a single emote, then always fade out. Small emotes.',
	Spiral: 'Burst out from a single emote in a spiral, always fading. Small emotes.',
	Pyramid: 'Build a pyramid. Emotes are always 1/19th of the screen width, with no fade or zoom.',
	SmallPyramid: 'Build a small pyramid from small emotes. No fade or zoom.',
	CodeLines: '"Matrix" code columns. Small emotes, no fade or zoom.',
	Fountain: 'Spout up from the bottom of the screen. No fade or zoom.',
	Stampede: 'A stampede of emotes charging across the screen. No fade or zoom.',
	Confetti: 'Fall like confetti, fading out only. Small emotes.',
	Conga: 'Start a conga line of dancers. No fade or zoom.',
	Coaster: 'Take a rollercoaster loop around the screen. No fade or zoom.',
	TheCube: 'Rotate a 3D cube of an emote. No zoom, only fade.',
	Text: 'Draw a message out of emotes. No fade or zoom.'
};

/** inline preview button & effect toggle */
function toggle(
	folder: FolderApi,
	values: Record<string, boolean>,
	key: EmoteStyle | KappaStyle,
	play: () => void,
	hintText: string
): void {
	const binding = hint(folder.addBinding(values, key, { label: pretty(key) }), hintText);
	// `order: -1` in the stylesheet puts the button in front of the checkbox
	inlineButton(binding, { label: `preview ${pretty(key)}`, text: '▶', className: 'ew-preview', onClick: play });
}

onMounted(() => {
	void load();
	void loadEmotes();

	if (!container.value) {
		return;
	}
	const { pane: wallPane, handle } = createPane(container.value, 'Emote Wall');
	pane = wallPane;
	dragHandle.value = handle;

	const styles = pane.addFolder({ title: 'Animations', expanded: true });
	for (const style of EMOTE_STYLES) {
		toggle(styles, form.styles, style, () => previewEmote(style), STYLE_HINTS[style]);
	}

	const kappa = pane.addFolder({ title: 'Kappagen', expanded: false });
	for (const style of KAPPAGEN_STYLES) {
		toggle(kappa, form.kappaStyles, style, () => previewKappa(style), KAPPA_HINTS[style]);
	}
	divider(kappa);
	hint(
		kappa.addBinding(form, 'kappaCount', { label: 'count', min: 1, max: 2000, step: 1 }),
		'The number of emotes to display per Kappagen. Some kappagens have unique counts (such as Pyramid) that cannot be modified.'
	);
	divider(kappa);
	hint(
		kappa.addBinding(form, 'congaContagious', { label: 'conga: contagious' }),
		'While one Conga is visible, all additional kappagens will also be Conga.'
	);
	hint(
		kappa.addBinding(form, 'congaTime', { label: 'conga: time (s)', min: 0, max: 60, step: 0.5 }),
		'The number of seconds the Conga should show up for. Longer lines are easier to keep going.'
	);
	hint(
		kappa.addBinding(form, 'congaAvoidMiddle', { label: 'conga: avoid middle' }),
		'Conga lines only show up on the top or bottom three rows, away from the middle of the screen.'
	);
	divider(kappa);
	hint(
		kappa.addBinding(form, 'textMessages', { label: 'text: glyphs' }),
		'Messages the Text kappagen can draw, separated by commas.'
	);
	hint(
		kappa.addBinding(form, 'textTime', { label: 'text: time (s)', min: 1, max: 30, step: 0.5 }),
		'How long the Text message stays up. Raise it for longer messages.'
	);
	// The Cube's rotation count is shared with the Cube animation style.
	divider(kappa);
	hint(
		kappa.addBinding(form, 'cubeSize', { label: 'cube: size', min: 0.1, max: 1, step: 0.01 }),
		'The height of The Cube kappagen, relative to the smallest screen dimension. 0.8 is suggested.'
	);
	hint(
		kappa.addBinding(form, 'cubeCenter', { label: 'cube: center' }),
		'Show The Cube kappagen in the exact centre of the screen.'
	);
	hint(
		kappa.addBinding(form, 'cubeRotations', { label: 'cube: rotations', min: 1, max: 20, step: 1 }),
		'The maximum number of rotations The Cube might spin while on screen.'
	);
	hint(
		kappa.addBinding(form, 'cubeFaces', { label: 'cube: faces' }),
		'Dynamic faces for The Cube kappagen: more emotes shown, but it may look less like a cube.'
	);

	const display = pane.addFolder({ title: 'Display', expanded: false });
	hint(
		display.addBinding(form, 'time', { label: 'lifetime (s)', min: 1, max: 60, step: 0.5 }),
		'The time an emote stays on screen, in seconds.'
	);
	hint(
		display.addBinding(form, 'duplicates', { label: 'duplicates', min: 0, max: 50, step: 1 }),
		'How many copies of the same emote to show from one message. 0 shows every copy, so each emote sent is drawn once.'
	);
	hint(display.addBinding(form, 'holidayZWE', { label: 'holiday overlays' }), 'Show festive hats on specific dates.');
	hint(
		display.addBinding(form, 'shadow', { label: 'drop shadow' }),
		'Add a shadow to all emotes on screen. Also removes the semitransparent faces of The Cube, so their square shadows do not tint it.'
	);
	divider(display);
	hint(
		display.addBinding(form, 'ratioNormal', { label: 'height ratio', min: 1 / 40, max: 1 / 4, step: 0.001 }),
		'The height of an emote, as a ratio of the smaller screen dimension.'
	);
	hint(
		display.addBinding(form, 'ratioSmall', { label: 'small ratio', min: 1 / 60, max: 1 / 8, step: 0.001 }),
		'The height of a small emote in some kappagens, as a ratio of the smaller screen dimension.'
	);
	divider(display);
	hint(display.addBinding(form, 'fadeIn', { label: 'fade in' }), 'Animation when showing an emote.');
	hint(display.addBinding(form, 'fadeOut', { label: 'fade out' }), 'Animation when hiding an emote.');
	divider(display);
	hint(display.addBinding(form, 'zoomIn', { label: 'zoom in' }), 'Animation when showing an emote.');
	hint(display.addBinding(form, 'zoomOut', { label: 'zoom out' }), 'Animation when hiding an emote.');

	saveButton = hint(pane.addButton({ title: 'save' }), 'Save these settings for the live wall.');
	saveButtonInner = saveButton.element.querySelector<HTMLElement>('.tp-btnv_b');
	saveButton.on('click', () => void save());

	pane.on('change', push);
});

onBeforeUnmount(() => {
	pane?.dispose();
	pane = null;
});
</script>

<template>
	<div id="emote-wall-settings">
		<div id="emote-wall" ref="wall" aria-hidden="true" :class="{ shadow: settings.shadow }" />
		<div
			id="emote-wall-panel"
			v-show="visible"
			ref="container"
			:style="dragStyle"
			@pointerdown.capture="onPointerDownCapture"
			@click.capture="onClickCapture" />
	</div>
</template>

<style scoped>
#emote-wall-settings {
	inset: 0;
	position: fixed;
}

:global(html:has(#emote-wall-settings)) {
	background: transparent;
}

#emote-wall-panel {
	/* useDraggable writes left/top - width must match PANEL_WIDTH */
	max-block-size: calc(100dvh - 24px);
	max-inline-size: calc(100vw - 24px);
	overflow: auto;
	overscroll-behavior: contain;
	pointer-events: auto;
	position: fixed;
	width: 320px;
	z-index: 10;

	& :deep(.tp-rotv) {
		font-size: 13px;
		--tp-blade-value-width: 120px;
		--tp-container-unit-size: 24px;
	}

	& :deep(.tp-rotv_t) {
		font-weight: 600;
	}

	& :deep(.tp-dfwv) {
		position: static;
		width: 100%;
	}

	& :deep(.tp-rotv_b) {
		cursor: grab;
		touch-action: none;
		user-select: none;

		&:active {
			cursor: grabbing;
		}
	}

	& :deep(.tp-divider) {
		--sprv-bg: rgb(255 255 255 / 14%);
		margin-block: 6px;
	}

	& :deep(.tp-lblv_v:has(> .tp-ckbv)) {
		align-items: center;
		display: flex;
		gap: 4px;
		justify-content: flex-end;
	}

	& :deep(.tp-btnv_b.dirty) {
		background: #e5b567;
		color: #000;
	}

	& :deep(.ew-preview) {
		align-self: center;
		flex: 0 0 auto;
		font-size: 9px;
		height: 18px;
		line-height: 1;
		min-width: 0;
		opacity: 0.65;
		order: -1;
		padding: 0;
		width: 22px;

		&:hover {
			opacity: 1;
		}
	}
}
</style>
