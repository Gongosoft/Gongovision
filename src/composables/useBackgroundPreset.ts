import { ref, watch } from 'vue';
import { get, useWindowSize } from '@vueuse/core';
import { BASE, registerPresets } from '@/lib/gongoizer/feedback-bg.js';
import type { Ref } from 'vue';

// The main looks, each saved from the tuning panel with "save as…". Every one is equally likely.
const FEATURED = {
	'gongo-1': {
		flowAngle: 180,
		speed: 0.134,
		stripePeriod: 2.5,
		tilt: 10,
		r0: 0.42,
		wobAmp: 0.1,
		wobScale: 3,
		wobRate: 0.06,
		ampStart: 1,
		ampEnd: 0,
		ampFrom: 0,
		ampTo: 0.2,
		splitVar: 0.03,
		accel: 0,
		tiltGain: 0,
		longAmp: 0.6,
		transAmp: 1.8,
		noiseScale: 3,
		noiseStretch: 0.5,
		noiseRate: 0.08,
		rowVar: 0.4,
		rowScale: 3,
		palette: 'violet',
		cutoutMode: 2,
		cutoutSize: 0.5311837422602381,
		cutoutStretch: 1.303
	},
	'gongo-2': {
		flowAngle: 147,
		speed: 0.025,
		crossDrift: -0.053,
		cutout: 1,
		cutoutSize: 0.5311837422602381,
		cutoutStretch: 1.303,
		cutoutPush: -0.8
	},
	'gongo-3': {
		flowAngle: 196,
		speed: 0.036,
		stripePeriod: 0.116,
		tilt: 0.015,
		crossDrift: -0.048,
		swirl: -0.85,
		r0: 0.045,
		wobAmp: 0.15,
		wobScale: 1.45,
		wobRate: 0.045,
		ampStart: 0.04,
		ampEnd: 1.25,
		ampFrom: 0.61,
		ampTo: 0.81,
		splitVar: 0.095,
		accel: 2.65,
		tiltGain: 0.65,
		shear: 1.1,
		longAmp: 0.44,
		transAmp: 1.79,
		noiseScale: 2.6,
		noiseStretch: 1.05,
		waveAmp: 0.17,
		waveFreq: 1.6,
		waveDrift: 0.02,
		waveWarp: 1.75,
		rowScale: 6.6,
		diffuse: 0.16,
		vary: 0.94,
		varyRate: 1.1,
		morph: 0.12,
		hueSpeed: 0.235,
		grain: 0.009,
		scan: 0.75,
		glowThreshold: 0,
		glowPulseRate: 0.02,
		cutout: 1,
		cutoutSize: 0.5311837422602381,
		cutoutStretch: 1.303,
		cutoutPush: -0.65,
		stir: 0.17,
		stirRadius: 0.145,
		magnet: 0.06,
		magnetRadius: 0.175,
		burst: 0.2,
		audio: 0.04
	},
	'gongo-4': {
		speed: 0.035,
		stripePeriod: 0.06,
		tilt: 0.12,
		wobAmp: 0.35,
		wobScale: 0.8,
		wobRate: 0.03,
		ampStart: 0.15,
		ampEnd: 0.35,
		ampFrom: 0.2,
		ampTo: 1,
		splitVar: 0.05,
		accel: 0.6,
		tiltGain: 0.3,
		longAmp: 0.3,
		transAmp: 0.6,
		noiseScale: 1.2,
		noiseRate: 0.02
	}
};

/** chance (0–1) that a visit gets a fully randomized look instead of a featured one */
const RANDOM_CHANCE = 0.2;

registerPresets(FEATURED);

const featuredKeys = Object.keys(FEATURED);

function pick<T>(list: T[]): T {
	return list[Math.floor(Math.random() * list.length)]!;
}

// Decided once per page load, so the page background and the offline screen match.
const randomized = Math.random() < RANDOM_CHANCE;
const preset = randomized ? '01' : pick(featuredKeys);

const params = ref<string | undefined>(undefined);
const ready = ref(!randomized);

// The randomizer lives in the panel module, so it only downloads on the rare randomized visit.
async function loadRandomParams(): Promise<void> {
	try {
		const { randomize } = await import('@/lib/gongoizer/feedback-panel.js');
		params.value = JSON.stringify(randomize({ ...BASE }));
	} catch {
		/*_*/
	} finally {
		ready.value = true;
	}
}

if (randomized) {
	void loadRandomParams();
}

interface UseBackgroundPresetReturn {
	preset: string;
	params: Ref<string | undefined>;
	ready: Ref<boolean>;
}

export function useBackgroundPreset(): UseBackgroundPresetReturn {
	return { preset, params, ready };
}

/** the parts of the running shader (`<feedback-background>.fb`) used here */
interface FeedbackInstance {
	params: { cutout: number };
	setParams: (params: Record<string, unknown>) => void;
}

export interface FeedbackBackgroundElement extends HTMLElement {
	fb?: FeedbackInstance | null;
}

/** width / height of the diamond's bounding box (see Diamond.vue) */
const DIAMOND_ASPECT = 1.303;

/**
 * how far the cutout's edges sit inside the diamond, in window heights
 * (0.007 ≈ 6 px on a 900 px-tall window: about two cells of the shader's grid, where its edge is stair-stepped)
 */
const CUTOUT_INSET = 0.007;

/**
 * Cutout settings that line up with the site's diamond in a window of this size.
 * Mirrors Diamond.vue's CSS: width = min(max(85vw, 130vmin), 130vh × 1.303).
 * The shader measures its cutout in window heights, centred on the screen.
 */
export function diamondCutout(width: number, height: number): Record<string, number> {
	const diamondWidth = Math.min(Math.max(0.85 * width, 1.3 * Math.min(width, height)), 1.3 * height * DIAMOND_ASPECT);
	return {
		// Shrinking the half-height by inset × √(1 + aspect²) / aspect moves each sloped edge in by exactly the inset.
		cutoutSize:
			diamondWidth / DIAMOND_ASPECT / 2 / height -
			(CUTOUT_INSET * Math.hypot(1, DIAMOND_ASPECT)) / DIAMOND_ASPECT,
		cutoutStretch: DIAMOND_ASPECT,
		cutoutRotate: 0,
		cutoutX: 0,
		cutoutY: 0
	};
}

/** Keeps diamond-shaped cutouts (shape 1) matched to the site's diamond through resizes and preset changes. */
export function useDiamondCutout(element: Readonly<Ref<FeedbackBackgroundElement | null>>): void {
	const { width, height } = useWindowSize();
	const originals = new WeakMap<FeedbackInstance, FeedbackInstance['setParams']>();

	function fit(fb: FeedbackInstance): void {
		const setParams = originals.get(fb);
		if (setParams && fb.params.cutout === 1) {
			setParams(diamondCutout(get(width), get(height)));
		}
	}

	watch(
		[element, width, height],
		() => {
			const fb = get(element)?.fb;
			if (!fb) {
				return;
			}
			// Every change (panel sliders, preset switches) goes through setParams, so re-fit after each one.
			if (!originals.has(fb)) {
				originals.set(fb, fb.setParams.bind(fb));
				fb.setParams = (changes): void => {
					originals.get(fb)!(changes);
					fit(fb);
				};
			}
			fit(fb);
		},
		{ flush: 'post', immediate: true }
	);
}
