import type { GongoizerParams, PresetInfo } from '@/types/gongoizer.d.ts';

export const BASE: GongoizerParams = {
	flowMode: 0,
	flowAngle: 90,
	speed: 0.054,
	stripePeriod: 0.113,
	tilt: 0.03,
	crossDrift: 0.0,
	swirl: 0.0,
	r0: 0.06,
	wobAmp: 0.12,
	wobScale: 1.5,
	wobRate: 0.05,
	ampStart: 0.0,
	ampEnd: 1.0,
	ampFrom: 0.42,
	ampTo: 0.62,
	splitVar: 0.12,
	accel: 2.5,
	tiltGain: 0.85,
	shear: 0.0,
	longAmp: 0.5,
	transAmp: 1.5,
	noiseScale: 2.0,
	noiseStretch: 1.0,
	noiseRate: 0.05,
	waveAmp: 0.0,
	waveFreq: 1.8,
	waveDrift: 0.04,
	waveWarp: 1.5,
	waveSharp: 1.0,
	rowVar: 0.0,
	rowScale: 6.0,
	diffuse: 0.15,
	vary: 1.0,
	varyRate: 1.0,
	palette: 'cyan',
	palette2: 'violet',
	morph: 0,
	morphRate: 0,
	palReps: 1,
	stripeHue: 0,
	hueSpreadX: 0,
	hueSpreadY: 0,
	hueSpeed: 0.998,
	hueOffset: 0.0,
	grain: 0.02,
	posterize: 0,
	mosaic: 0,
	strobe: 0,
	negative: 0,
	chroma: 0,
	scan: 0,
	curve: 0,
	vignette: 0,
	mirror: 0,
	contour: 0,
	haze: 0,
	glow: 0,
	glowRadius: 1,
	bloom: 0,
	glowThreshold: 0.15,
	glowPulse: 0,
	glowPulseRate: 0.25,
	blur: 0,
	trails: 0,
	cutout: 0,
	cutoutMode: 1,
	cutoutSize: 0.38,
	cutoutStretch: 1,
	cutoutRotate: 0,
	cutoutX: 0,
	cutoutY: 0,
	cutoutSoft: 0.02,
	cutoutPush: 1,
	cutoutShow: 0,
	reactive: 0,
	stir: 0,
	stirRadius: 0.12,
	magnet: 0,
	magnetRadius: 0.15,
	burst: 0,
	wheel: 0,
	energy: 0,
	audio: 0,
	simLines: 300,
	timeScale: 1.0,
	adaptive: 1
};

const Gongify = (overrides: Partial<GongoizerParams> = {}): GongoizerParams => ({ ...BASE, ...overrides });

const GLASS: Partial<GongoizerParams> = {
	speed: 0.035,
	stripePeriod: 0.06,
	tilt: 0.12,
	wobAmp: 0.35,
	wobScale: 0.8,
	wobRate: 0.03,
	ampStart: 0.15,
	ampEnd: 0.35,
	ampFrom: 0.2,
	ampTo: 1.0,
	transAmp: 0.6,
	longAmp: 0.3,
	noiseScale: 1.2,
	noiseRate: 0.02,
	accel: 0.6,
	tiltGain: 0.3,
	splitVar: 0.05
};
const RIPTIDE: Partial<GongoizerParams> = {
	speed: 0.09,
	stripePeriod: 0.1,
	ampStart: 0.6,
	ampFrom: 0.0,
	ampTo: 0.4,
	transAmp: 2.4,
	longAmp: 0.9,
	noiseScale: 2.8,
	noiseRate: 0.09,
	accel: 1.2,
	tiltGain: 0.5,
	diffuse: 0.3
};
const TUNNEL: Partial<GongoizerParams> = {
	flowMode: 1,
	speed: 0.06,
	stripePeriod: 0.09,
	tilt: 0,
	r0: 0.06,
	ampFrom: 0.25,
	ampTo: 0.75,
	shear: 4.0,
	tiltGain: 0,
	transAmp: 1.0,
	longAmp: 0.4,
	accel: 0.8,
	splitVar: 0.06,
	waveAmp: 0.35,
	waveFreq: 5,
	waveDrift: 0.01,
	waveWarp: 0.5
};

export const FEATURED: Record<string, Partial<GongoizerParams>> = {
	Gongo: {},
	Longo: {
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
		cutoutSize: 0.53,
		cutoutStretch: 1.3
	},
	Gongi: {
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
	},
	Sticky: { reactive: 1, burst: 1, stir: 0.3, palette: 'violet', hueOffset: 0.7 },
	Goopy: { ...RIPTIDE, hueOffset: 0.55 }
};

export const PRESETS: Record<string, GongoizerParams> = {
	...Object.fromEntries(Object.entries(FEATURED).map(([key, params]) => [key, Gongify(params)])),
	'Geepy': Gongify({
		...RIPTIDE,
		palette: 'coral-reef',
		speed: 0.05,
		blur: 0.15,
		bloom: 0.4,
		glowThreshold: 0.3,
		hueSpeed: 0.2
	}),
	'Gloopy': Gongify({
		...GLASS,
		palette: 'pico-8',
		stripePeriod: 0.2,
		reactive: 1,
		stir: 1.4,
		stirRadius: 0.08,
		hueSpeed: 0.2
	}),
	'FIRE': Gongify({
		palette: 'ember',
		flowAngle: 270,
		speed: 0.12,
		stripePeriod: 0.09,
		tilt: 0.0,
		ampStart: 0.5,
		ampEnd: 1.4,
		ampFrom: 0.0,
		ampTo: 0.7,
		transAmp: 1.4,
		longAmp: 0.8,
		noiseScale: 3.0,
		noiseStretch: 0.5,
		noiseRate: 0.15,
		accel: 1.5,
		tiltGain: 0,
		rowVar: 0.3,
		rowScale: 8,
		waveAmp: 0.2,
		waveFreq: 3,
		hueSpeed: 0.15
	}),
	'Geogaddi': Gongify({
		mirror: 3,
		palette: 'sunset',
		palReps: 2,
		speed: 0.06,
		stripePeriod: 0.12,
		ampStart: 0.4,
		ampFrom: 0.0,
		ampTo: 0.6,
		transAmp: 2.0,
		longAmp: 0.7,
		noiseScale: 2.4,
		accel: 1.0,
		tiltGain: 0.6,
		diffuse: 0.25
	}),
	'Gongorb': Gongify({
		...GLASS,
		cutout: 2,
		cutoutMode: 3,
		cutoutPush: 1.3,
		cutoutSize: 0.3,
		stripePeriod: 0.16,
		palette: 'spectrum',
		glow: 0.45,
		glowRadius: 1.2,
		bloom: 0.35,
		glowThreshold: 0.45,
		hueSpeed: 0.6
	}),
	'Prism': Gongify({ palette: 'oilslick', stripeHue: 0.085, hueSpreadX: 0.15, speed: 0.06, hueSpeed: 0.4 }),
	'Killy Chudder': Gongify({
		...TUNNEL,
		palette: 'peacock',
		palReps: 2,
		stripePeriod: 0.12,
		shear: 2.5,
		hueSpeed: 0.15
	}),
	'Mindjammin': Gongify({
		flowAngle: 45,
		mirror: 2,
		palette: 'mall-90s',
		palReps: 2,
		speed: 0.06,
		stripePeriod: 0.1,
		ampFrom: 0.3,
		ampTo: 0.7,
		transAmp: 1.6,
		tiltGain: 0.6,
		curve: 0.1,
		hueSpeed: 0.2
	}),
	'Sour Worms': Gongify({ ...GLASS, palette: 'arcade-80s', mosaic: 8, glow: 0.7, stripePeriod: 0.13, hueSpeed: 0.3 })
};

export const PRESET_INFO: Record<string, PresetInfo> = Object.fromEntries(
	Object.entries(PRESETS).map(([key, params]) => {
		const reactive = (params.reactive ?? 0) > 0;
		return [
			key,
			{
				reactive,
				strobe: (params.strobe ?? 0) > 0,
				cutout: (params.cutout ?? 0) > 0,
				audio: reactive && (params.audio ?? 0) > 0
			}
		];
	})
);

export function presetIcons(key: string): string {
	const info = PRESET_INFO[key];
	if (!info) {
		return '';
	}
	return (
		(info.reactive ? ' 🗲' : '') + (info.audio ? ' 🕪' : '') + (info.strobe ? ' ◐' : '') + (info.cutout ? ' ◆' : '')
	);
}

export function presetKeys(): string[] {
	return Object.keys(PRESETS);
}

export const DEFAULT_PRESET = presetKeys()[0] ?? 'Gongo';

export function resolvePreset(key: string): string {
	return PRESETS[key] ? key : DEFAULT_PRESET;
}

export function registerPresets(presets: Record<string, Partial<GongoizerParams>>): void {
	for (const [key, params] of Object.entries(presets)) {
		const full = { ...BASE, ...params };
		PRESETS[key] = full;
		PRESET_INFO[key] = {
			reactive: (full.reactive ?? 0) > 0,
			strobe: (full.strobe ?? 0) > 0,
			cutout: (full.cutout ?? 0) > 0,
			audio: (full.reactive ?? 0) > 0 && (full.audio ?? 0) > 0
		};
	}
}
