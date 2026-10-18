import { PALETTE_OPTIONS } from '@/lib/gongoizer/palettes.ts';
import type { ListParamDef, NumberParamDef, NumericParamKey, ParamGroup, StringParamDef } from '@/types/gongoizer.d.ts';

export const FLOW_MODES = ['straight', 'radial out', 'radial in'] as const;
export const MIRRORS = ['off', 'left/right', 'four-way', 'kaleidoscope'] as const;
export const CUT_MODES = ['shape only', 'emitter', 'obstacle', 'emitter + obstacle'] as const;
export const SHAPES = ['none', 'diamond', 'circle', 'oval', 'square', 'rectangle', 'hexagon', 'star'] as const;

const num = (
	key: NumericParamKey,
	label: string,
	min: number,
	max: number,
	step: number,
	hint: string,
	randomRange?: readonly [number, number]
): NumberParamDef => ({ key, label, min, max, step, hint, randomRange });

const list = (key: NumericParamKey, label: string, options: readonly string[], hint: string): ListParamDef => ({
	key,
	label,
	options,
	hint
});

const paletteList = (key: 'palette' | 'palette2', label: string, hint: string): StringParamDef => ({
	key,
	label,
	options: PALETTE_OPTIONS,
	hint
});

export const GROUPS: ParamGroup[] = [
	{
		name: 'Flow',
		rows: [
			list(
				'flowMode',
				'mode',
				FLOW_MODES,
				'Stripes scrolling across, rings expanding outward, or spirals draining into the centre.'
			),
			num('flowAngle', 'angle', 0, 360, 1, 'Which edge new stripes come from (straight mode only).'),
			num('speed', 'speed', 0, 0.3, 0.001, 'How fast everything moves.', [0.025, 0.14]),
			num(
				'stripePeriod',
				'stripe period',
				0.03,
				3,
				0.001,
				'Stripe thickness: the distance between newly born stripes.',
				[0.05, 0.3]
			),
			num(
				'tilt',
				'birth tilt',
				-12,
				12,
				0.005,
				'Slants the stripes at the edge; winds radial modes into spiral arms.',
				[-0.4, 0.4]
			),
			num('crossDrift', 'cross drift', -0.2, 0.2, 0.001, 'Slides the whole pattern sideways.', [-0.03, 0.03]),
			num('swirl', 'swirl', -6, 6, 0.05, 'Spins the radial modes round and round.', [-3, 3]),
			num('r0', 'radius', 0, 0.6, 0.005, 'Size of the empty middle in radial modes.', [0.02, 0.2])
		]
	},
	{
		name: 'Birth Edge',
		rows: [
			num('wobAmp', 'wobble', 0, 1, 0.01, 'Wavy instead of straight new stripes.', [0, 0.5]),
			num('wobScale', 'wobble scale', 0.1, 8, 0.05, 'Many small wiggles, or a few big swells.', [0.5, 5]),
			num('wobRate', 'wobble rate', 0, 0.5, 0.005, 'How quickly the swells shift around.', [0.01, 0.15])
		]
	},
	{
		name: 'Transition',
		rows: [
			num('ampFrom', 'starts at', -0.5, 1.5, 0.01, 'Where the calm part of the flow ends.', [-0.1, 0.8]),
			num(
				'ampTo',
				'full at',
				-0.5,
				2,
				0.01,
				'Where the turbulence is at full strength; nearer "starts at" means a more sudden change.',
				[0.3, 1.2]
			),
			num('ampStart', 'turb. before', 0, 2, 0.01, 'Some wobble even in the calm part.', [0, 0.8]),
			num('ampEnd', 'turb. after', 0, 2, 0.01, 'How wild the turbulent part gets.', [0.3, 1.5]),
			num('splitVar', 'split wander', 0, 0.5, 0.005, 'Makes the split line wander about.', [0, 0.2]),
			num(
				'accel',
				'stretch',
				0,
				6,
				0.05,
				'Stretches the flow after the split, so the bands get thicker lower down.',
				[0, 3]
			),
			num('tiltGain', 'lean', -4, 4, 0.05, 'The "/" lean the lower bands pick up.', [-1.5, 1.5]),
			num(
				'shear',
				'shear',
				-8,
				8,
				0.05,
				'Smears the bands sideways after the split; winds radial modes into spiral arms.',
				[-3, 3]
			)
		]
	},
	{
		name: 'Turbulence',
		rows: [
			num('longAmp', 'along', 0, 3, 0.01, 'Stripes bunch up and spread out.', [0, 1.4]),
			num('transAmp', 'across', 0, 4, 0.01, 'S-hooks and folds in the stripes.', [0.2, 2.5]),
			num('noiseScale', 'scale', 0.2, 8, 0.05, 'Small busy curls, or big lazy bends.', [0.8, 4]),
			num('noiseStretch', 'stretch', 0.1, 4, 0.05, 'Elongated streaks, or rounder blobs.', [0.4, 2]),
			num('noiseRate', 'evolve rate', 0, 0.5, 0.005, 'Calm and settled, or restless and churning.', [0.01, 0.15]),
			num('waveAmp', 'saw wave', 0, 2, 0.01, 'Regular repeating waves rippling through the flow.', [0, 0.5]),
			num('waveFreq', 'saw freq', 0.2, 8, 0.05, 'How many waves fit across the screen.', [0.5, 5]),
			num('waveDrift', 'saw drift', -0.3, 0.3, 0.005, 'Makes the waves travel sideways.', [-0.08, 0.08]),
			num('waveWarp', 'saw warp', 0, 4, 0.05, 'Makes the waves irregular and less mechanical.', [0, 2]),
			num('waveSharp', 'saw sharp', 0, 1, 0.01, 'Smooth rolling waves at 0, hooked sawtooth waves at 1.'),
			num('rowVar', 'row speeds', 0, 2, 0.01, 'Long streaks with tapered tips.', [0, 0.6]),
			num('rowScale', 'row scale', 0.5, 20, 0.1, 'Thin, fine streaks, or wide ones.', [2, 10]),
			num('diffuse', 'soften', 0, 1, 0.01, 'Softens and blurs the stripe shapes.', [0, 0.4])
		]
	},
	{
		name: 'Variation',
		rows: [
			num('vary', 'amount', 0, 2, 0.01, 'The look keeps wandering instead of settling.', [0, 1.5]),
			num('varyRate', 'rate', 0, 5, 0.05, 'How quickly the look wanders.', [0.3, 2])
		]
	},
	{
		name: 'Colour',
		rows: [
			paletteList('palette', 'palette', 'The base colour scheme.'),
			paletteList('palette2', 'palette 2', 'The colour scheme the morph blends toward.'),
			num('hueSpeed', 'hue speed', -10, 10, 0.001, 'Colours cycle around the wheel.', [-2, 2]),
			num('hueOffset', 'hue offset', 0, 1, 0.005, 'Shifts every colour around the wheel.'),
			num(
				'stripeHue',
				'stripe hue',
				-0.5,
				0.5,
				0.001,
				'Rainbow stripes that travel with the flow.',
				[-0.12, 0.12]
			),
			num('hueSpreadX', 'hue across', -2, 2, 0.01, 'A rainbow sweep across the screen.', [-0.5, 0.5]),
			num('hueSpreadY', 'hue down', -2, 2, 0.01, 'A rainbow sweep down the screen.', [-0.5, 0.5]),
			num('morph', 'morph', 0, 1, 0.01, 'Mixes the two palettes.'),
			num(
				'morphRate',
				'morph rate',
				0,
				0.3,
				0.001,
				'Colours slowly shift back and forth between the two palettes.',
				[0, 0.05]
			),
			num('palReps', 'palette reps', 1, 6, 1, 'Thinner, more frequent colour bands.', [1, 3]),
			num('grain', 'grain', 0, 0.2, 0.001, 'Film or video grain.', [0, 0.05])
		]
	},
	{
		name: 'Effects',
		rows: [
			num('glow', 'glow', 0, 2, 0.01, 'Neon glow hugging the bright stripes.', [0.3, 1.2]),
			num('glowRadius', 'glow radius', 0.25, 4, 0.05, 'How far the glow spreads from the stripes.', [0.6, 2.5]),
			num('bloom', 'bloom', 0, 2, 0.01, 'A big soft halo of light spilling out.', [0.3, 1]),
			num(
				'glowThreshold',
				'glow threshold',
				0,
				0.9,
				0.01,
				'Only the brightest parts glow the higher you go.',
				[0.1, 0.5]
			),
			num('glowPulse', 'glow pulse', 0, 1, 0.01, 'Makes the glow breathe in and out.', [0.1, 0.6]),
			num('glowPulseRate', 'pulse rate', 0.02, 2, 0.01, 'How fast the glow breathes.', [0.1, 0.6]),
			num('blur', 'blur', 0, 1, 0.01, 'Soft focus.', [0.15, 0.6]),
			num('trails', 'trails', 0, 0.98, 0.01, 'Echoes and afterimages of the frames before.', [0.6, 0.95]),
			num(
				'contour',
				'contour',
				-1,
				1,
				0.01,
				'Outlines the bands: positive draws bright lines, negative draws dark ones.',
				[-1, 1]
			),
			num('haze', 'haze', 0, 3, 0.01, 'Heat shimmer.', [0.3, 1.5]),
			num('posterize', 'paint', 0, 16, 1, 'Flat stepped bands - the AVE5 "paint" effect.', [3, 10]),
			num('mosaic', 'mosaic', 0, 60, 1, 'Chunky mosaic pixels.', [4, 24]),
			num(
				'strobe',
				'strobe',
				0,
				30,
				0.5,
				'Choppy stepped motion; below ~15 it can just look like lag.',
				[15, 30]
			),
			num('negative', 'negative', 0, 1, 0.01, 'Inverts the colours.', [1, 1]),
			num('chroma', 'chroma bleed', 0, 4, 0.01, 'Analog colour bleed.', [0.3, 1.5]),
			num('scan', 'scanlines', 0, 1, 0.01, 'CRT / VHS scanlines and jitter.', [0.2, 0.8]),
			num('curve', 'crt curve', 0, 1, 0.01, 'Curved CRT glass.', [0.05, 0.3]),
			num('vignette', 'vignette', 0, 1.5, 0.01, 'Darker corners.', [0.2, 0.8]),
			list('mirror', 'mirror', MIRRORS, 'Reflects the picture into symmetric patterns.')
		]
	},
	{
		name: 'Cutout',
		rows: [
			list('cutout', 'shape', SHAPES, 'Which shape sits in the middle.'),
			list('cutoutMode', 'influence', CUT_MODES, 'Stripes radiate from the shape, flow around it, or both.'),
			num('cutoutShow', 'show', 0, 1, 1, 'Draws the shape filled, to line it up with a site cutout.'),
			num('cutoutSize', 'size', 0.05, 0.8, 0.005, 'How big the shape is.', [0.15, 0.45]),
			num('cutoutStretch', 'stretch', 0.3, 3, 0.01, 'Wider or narrower shape.', [0.7, 1.6]),
			num('cutoutRotate', 'rotate', -180, 180, 1, 'Tilts the shape.', [-45, 45]),
			num('cutoutX', 'offset x', -1, 1, 0.005, 'Moves the shape sideways.', [-0.2, 0.2]),
			num('cutoutY', 'offset y', -0.5, 0.5, 0.005, 'Moves the shape up or down.', [-0.15, 0.15]),
			num('cutoutPush', 'push', -3, 6, 0.05, 'How far the rings travel before being swept away.', [0.5, 3]),
			num('cutoutSoft', 'softness', 0, 0.2, 0.005, 'Softer shape edge.', [0, 0.05])
		]
	},
	{
		name: 'Reactive',
		rows: [
			list('reactive', 'reactive', ['off', 'on'], 'Master switch for everything below.'),
			num('stir', 'stir', 0, 3, 0.01, 'Drag to smear the stripes.', [0.3, 1.5]),
			num('stirRadius', 'stir radius', 0.02, 0.5, 0.005, 'How wide an area the drag smears.', [0.06, 0.2]),
			num(
				'magnet',
				'magnet',
				-1.5,
				1.5,
				0.01,
				'Stripes bend around the cursor: positive pushes them away, negative pulls them in.',
				[-0.5, 0.6]
			),
			num(
				'magnetRadius',
				'magnet radius',
				0.02,
				0.5,
				0.005,
				'How wide an area the magnet reaches.',
				[0.08, 0.22]
			),
			num(
				'burst',
				'click ripple',
				0,
				3,
				0.01,
				'Click to blow ripples and bubbles out of the cursor.',
				[0.4, 1.5]
			),
			num('wheel', 'wheel wind', 0, 3, 0.01, 'Scroll to blow the whole flow around.', [0.5, 1.5]),
			num('energy', 'energy', 0, 3, 0.01, 'Moving the mouse makes everything wilder.', [0, 1]),
			num(
				'audio',
				'audio',
				0,
				3,
				0.01,
				'Pulses with music: the level drives the flow, bass beats drop ripples and kick the hue (needs mic or desktop audio).',
				[0.5, 1.5]
			)
		]
	},
	{
		name: 'Engine',
		rows: [
			num('simLines', 'sim lines', 90, 720, 10, 'Lower is softer and faster, higher gives finer detail.'),
			num('timeScale', 'time scale', 0, 4, 0.01, 'Slow motion or fast forward.'),
			num(
				'adaptive',
				'auto quality',
				0,
				1,
				1,
				'Drops the resolution when frames run slow and raises it again when they recover - keeps things fluid on weaker devices.'
			)
		]
	}
];

/** Groups the randomizer never touches. */
export const NO_RANDOM = new Set(['Engine']);

/**
 * Params where 0 means "off": randomize rolls these against EFFECT_ODDS instead of picking a value, so effects don't
 * all switch on at once.
 */
export const OFF_IS_ZERO = new Set([
	'glow',
	'bloom',
	'glowPulse',
	'blur',
	'trails',
	'contour',
	'haze',
	'posterize',
	'mosaic',
	'strobe',
	'negative',
	'chroma',
	'scan',
	'curve',
	'vignette',
	'mirror',
	'stripeHue',
	'hueSpreadX',
	'hueSpreadY',
	'morph',
	'waveAmp',
	'rowVar',
	'cutout'
]);

/** Chance that a random roll switches each zero-off effect on. */
export const EFFECT_ODDS: Record<string, number> = {
	glow: 0.3,
	bloom: 0.25,
	glowPulse: 0.2,
	blur: 0.15,
	trails: 0.2,
	contour: 0.15,
	haze: 0.12,
	posterize: 0.1,
	mosaic: 0.08,
	strobe: 0.06,
	negative: 0.05,
	chroma: 0.15,
	scan: 0.1,
	curve: 0.12,
	vignette: 0.25,
	mirror: 0.15,
	stripeHue: 0.3,
	hueSpreadX: 0.3,
	hueSpreadY: 0.15,
	morph: 0.35,
	waveAmp: 0.35,
	rowVar: 0.25,
	cutout: 0.25
};
