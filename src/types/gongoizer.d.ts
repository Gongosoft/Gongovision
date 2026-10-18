import type { MaybeRefOrGetter, Ref } from 'vue';

/** Distances are in units of screen height (H), times in seconds. */
export interface GongoizerParams {
	// Flow
	/** Stripes scrolling across, rings expanding outward, or spirals draining into the centre. */
	flowMode: number;
	/** Which edge new stripes come from (straight mode only). */
	flowAngle: number;
	/** How fast everything moves. */
	speed: number;
	/** Stripe thickness: the distance between newly born stripes. */
	stripePeriod: number;
	/** Slants the stripes at the edge; winds radial modes into spiral arms. */
	tilt: number;
	/** Slides the whole pattern sideways. */
	crossDrift: number;
	/** Spins the radial modes round and round. */
	swirl: number;
	/** Size of the empty middle in radial modes. */
	r0: number;

	// Birth edge
	/** Wavy instead of straight new stripes. */
	wobAmp: number;
	/** Many small wiggles, or a few big swells. */
	wobScale: number;
	/** How quickly the swells shift around. */
	wobRate: number;

	// Transition (laminar -> turbulent, measured downstream of the birth edge)
	/** Some wobble even in the calm part. */
	ampStart: number;
	/** How wild the turbulent part gets. */
	ampEnd: number;
	/** Where the calm part of the flow ends. */
	ampFrom: number;
	/** Where the turbulence is at full strength; nearer `ampFrom` means a more sudden change. */
	ampTo: number;
	/** Makes the split line wander about. */
	splitVar: number;
	/** Stretches the flow after the split, so the bands get thicker lower down. */
	accel: number;
	/** The "/" lean the lower bands pick up. */
	tiltGain: number;
	/** Smears the bands sideways after the split; winds radial modes into spiral arms. */
	shear: number;

	// Turbulence
	/** Stripes bunch up and spread out. */
	longAmp: number;
	/** S-hooks and folds in the stripes. */
	transAmp: number;
	/** Small busy curls, or big lazy bends. */
	noiseScale: number;
	/** Elongated streaks, or rounder blobs. */
	noiseStretch: number;
	/** Calm and settled, or restless and churning. */
	noiseRate: number;
	/** Regular repeating waves rippling through the flow. */
	waveAmp: number;
	/** How many waves fit across the screen. */
	waveFreq: number;
	/** Makes the waves travel sideways. */
	waveDrift: number;
	/** Makes the waves irregular and less mechanical. */
	waveWarp: number;
	/** Smooth rolling waves at 0, hooked sawtooth waves at 1. */
	waveSharp: number;
	/** Long streaks with tapered tips. */
	rowVar: number;
	/** Thin, fine streaks, or wide ones. */
	rowScale: number;
	/** Softens and blurs the stripe shapes. */
	diffuse: number;

	// Variation
	/** The look keeps wandering instead of settling. */
	vary: number;
	/** How quickly the look wanders. */
	varyRate: number;

	// Colour
	/** The base colour scheme. */
	palette: string;
	/** The colour scheme the morph blends toward. */
	palette2: string;
	/** Mixes the two palettes. */
	morph: number;
	/** Colours slowly shift back and forth between the two palettes. */
	morphRate: number;
	/** Thinner, more frequent colour bands. */
	palReps: number;
	/** Rainbow stripes that travel with the flow. */
	stripeHue: number;
	/** A rainbow sweep across the screen. */
	hueSpreadX: number;
	/** A rainbow sweep down the screen. */
	hueSpreadY: number;
	/** Colours cycle around the wheel. */
	hueSpeed: number;
	/** Shifts every colour around the wheel. */
	hueOffset: number;
	/** Film or video grain. */
	grain: number;

	// Effects (WJ-AVE5 digital effects + analog flavour)
	/** Flat stepped bands - the AVE5 "paint" effect. */
	posterize: number;
	/** Chunky mosaic pixels. */
	mosaic: number;
	/** Choppy stepped motion; below ~15 it can just look like lag. */
	strobe: number;
	/** Inverts the colours. */
	negative: number;
	/** Analog colour bleed. */
	chroma: number;
	/** CRT / VHS scanlines and jitter. */
	scan: number;
	/** Curved CRT glass. */
	curve: number;
	/** Darker corners. */
	vignette: number;
	/** Reflects the picture into symmetric patterns. */
	mirror: number;
	/** Outlines the bands: positive draws bright lines, negative draws dark ones. */
	contour: number;
	/** Heat shimmer. */
	haze: number;
	/** Neon glow hugging the bright stripes. */
	glow: number;
	/** How far the glow spreads from the stripes. */
	glowRadius: number;
	/** A big soft halo of light spilling out. */
	bloom: number;
	/** Only the brightest parts glow the higher you go. */
	glowThreshold: number;
	/** Makes the glow breathe in and out. */
	glowPulse: number;
	/** How fast the glow breathes. */
	glowPulseRate: number;
	/** Soft focus. */
	blur: number;
	/** Echoes and afterimages of the frames before. */
	trails: number;

	// Cutout
	/** Which shape sits in the middle. */
	cutout: number;
	/** Stripes radiate from the shape, flow around it, or both. */
	cutoutMode: number;
	/** How big the shape is. */
	cutoutSize: number;
	/** Wider or narrower shape. */
	cutoutStretch: number;
	/** Tilts the shape. */
	cutoutRotate: number;
	/** Moves the shape sideways. */
	cutoutX: number;
	/** Moves the shape up or down. */
	cutoutY: number;
	/** Softer shape edge. */
	cutoutSoft: number;
	/** How far the rings travel before being swept away. */
	cutoutPush: number;
	/** Draws the shape filled, to line it up with a site cutout. */
	cutoutShow: number;

	// Reactive (all scaled by `reactive`, 0 = off)
	/** Master switch for everything below. */
	reactive: number;
	/** Drag to smear the stripes. */
	stir: number;
	/** How wide an area the drag smears. */
	stirRadius: number;
	/** Stripes bend around the cursor: positive pushes them away, negative pulls them in. */
	magnet: number;
	/** How wide an area the magnet reaches. */
	magnetRadius: number;
	/** Click to blow ripples and bubbles out of the cursor. */
	burst: number;
	/** Scroll to blow the whole flow around. */
	wheel: number;
	/** Moving the mouse makes everything wilder. */
	energy: number;
	/** Pulses with music: the level drives the flow, bass beats drop ripples and kick the hue. */
	audio: number;

	// Engine
	/** Lower is softer and faster, higher gives finer detail. */
	simLines: number;
	/** Slow motion or fast forward. */
	timeScale: number;
	/** Drops the resolution when frames run slow and raises it again when they recover. */
	adaptive: number;
}

/** A palette as flat RGB triplets, ready for a LUT texture upload. */
export type PaletteLut = Uint8Array;

/** [position 0..1, r, g, b] stop, eased between, wrapping from the last stop back to the first. */
export type PaletteStop = readonly [number, number, number, number];

export interface PresetInfo {
	reactive: boolean;
	strobe: boolean;
	cutout: boolean;
	audio: boolean;
}

export type ParamKey = keyof GongoizerParams;

/** Params whose value is a number (everything except the two palette names). */
export type NumericParamKey = Exclude<ParamKey, 'palette' | 'palette2'>;

/** A parameter edited with a numeric slider. */
export interface NumberParamDef {
	key: NumericParamKey;
	label: string;
	min: number;
	max: number;
	step: number;
	/** the parameter's tooltip text */
	hint: string;
	/** limits "random" to sensible values (defaults to min..max) */
	randomRange?: readonly [number, number];
}

/** A parameter edited with a dropdown (value = index into options). */
export interface ListParamDef {
	key: NumericParamKey;
	label: string;
	options: readonly string[];
	hint: string;
}

/** A string-valued parameter edited with a dropdown (the two palette names). */
export interface StringParamDef {
	key: 'palette' | 'palette2';
	label: string;
	options: readonly string[];
	hint: string;
}

export type ParamDef = NumberParamDef | ListParamDef | StringParamDef;

export interface ParamGroup {
	name: string;
	rows: ParamDef[];
}

export type RandomizeMode = 'random' | 'variant';

export type AudioSource = 'mic' | 'desktop';

export interface AudioReactive {
	source: AudioSource;
	readonly ended: boolean;
	/** level/bass roughly 0..1, beat true on a bass onset */
	read: () => { level: number; bass: number; beat: boolean };
	stop: () => void;
}

export interface GLProgram {
	p: WebGLProgram;
	vsh: WebGLShader;
	fsh: WebGLShader;
	/** cached uniform locations by name (arrays lose their "[0]") */
	u: Record<string, WebGLUniformLocation | null>;
}

/** A texture + framebuffer pair of a given size. */
export interface GLTarget {
	tex: WebGLTexture;
	fbo: WebGLFramebuffer;
	w: number;
	h: number;
}

export interface GongoizerShaderOptions {
	preset?: string;
	params?: Partial<GongoizerParams>;
	maxPixels?: number;
	seed?: number | null;
}
