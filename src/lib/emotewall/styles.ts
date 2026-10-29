import { cubicBezier } from 'animejs';
import { rndFromRange } from '@/lib/emotewall/random.ts';
import { cfg, emoteDuration, timing } from '@/lib/emotewall/config.ts';
import type { AnimSpec, EmoteStyle, Rnd, SpawnSpec, WallEmote } from '@/types/emotewall.d.ts';

interface StyleContext {
	rnd: Rnd;
	sW: number;
	sH: number;
	eH: number;
	emote: WallEmote;
	/** fixed origin, for kappagen variants such as Burst */
	x?: number;
	y?: number;
	/** draw the screen-sized copies a path needs when it leaves an edge */
	torus?: boolean;
}

type StyleFn = (ctx: StyleContext) => SpawnSpec;

const RADIUS = Math.PI * 2;
/** % of the emote's time, from the original `_tAnim` */
const T_ANIM = { fade: { in: 8, out: 8 }, zoom: { in: 17, out: 8 } };

// natural aspect ratios, remembered after the first load like the original's `shared.ec` size cache
const aspects = new Map<string, number>();

function aspectOf(url: string): number {
	return aspects.get(url) ?? 1;
}

export function rememberAspect(url: string, width: number, height: number): void {
	if (width > 0 && height > 0) {
		aspects.set(url, width / height);
	}
}

function clamp(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high);
}

/** a rotating cube has to finish on screen, so its path angle is re-rolled rather than clamped */
function onScreenAngle(rnd: Rnd, h: number, v: number, r: number, sW: number, sH: number, eH: number): number {
	for (let tries = 0; tries < 20; tries++) {
		const th = rnd() * RADIUS;
		const hD = Math.floor(h + r * Math.cos(th));
		const vD = Math.floor(v + r * Math.sin(th));
		if (hD >= 0 && hD <= sW - eH && vD >= 0 && vD <= sH - eH) {
			return th;
		}
	}
	return rnd() * RADIUS;
}

export function emoteHeight(sW: number, sH: number, ratio: number): number {
	return Math.max(8, Math.floor(Math.min(sW, sH) * ratio));
}

export function emoteWidth(emote: WallEmote, eH: number): number {
	return Math.ceil(eH * aspectOf(emote.url));
}

export function cubeGeometry(
	eH: number,
	h: number,
	v: number,
	tMS: number,
	rnd: Rnd
): {
	style: Record<string, string>;
	cubeAnims: AnimSpec[];
} {
	const half = Math.ceil(eH / 2);
	let rX = 0;
	let rY = 0;
	while (Math.abs(rX) + Math.abs(rY) < 45) {
		rX = (360 - rnd() * 720) * cfg.cube.rotations;
		rY = (360 - rnd() * 720) * cfg.cube.rotations;
	}
	return {
		style: {
			'--cube-depth': `${half}px`,
			'perspective': `${eH * 3}px`,
			'transform': `translate(${h}px, ${v}px)`
		},
		cubeAnims: [
			{
				keyframes: [
					{ transform: `translateZ(-${half}px) rotateX(0deg) rotateY(0deg)` },
					{ transform: `translateZ(-${half}px) rotateX(${rX}deg) rotateY(${rY}deg)` }
				],
				options: { duration: tMS, easing: 'linear', fill: 'both' }
			}
		]
	};
}

function widthOf(ctx: StyleContext, eH: number): number {
	return emoteWidth(ctx.emote, eH);
}

function zoomPad(eH: number, scale: number): string {
	return `${(eH - eH * scale) / 2}px 0`;
}

interface Fades {
	fadeIn?: boolean;
	zoomIn?: boolean;
	fadeOut?: boolean;
	zoomOut?: boolean;
	/** shift the fade/zoom-out to end at a different time than `tMS` (Throw, Pop) */
	outEnd?: number;
	/** span the out-animation duration is a percentage of */
	outSpan?: number;
}

/** `_styleEmote`'s shared fade/zoom envelope */
export function envelope(tMS: number, eH: number, fades: Fades = {}): AnimSpec[] {
	const {
		fadeIn = cfg.emote.in.fade,
		zoomIn = cfg.emote.in.zoom,
		fadeOut = cfg.emote.out.fade,
		zoomOut = cfg.emote.out.zoom,
		outEnd = tMS,
		outSpan = outEnd
	} = fades;
	const anims: AnimSpec[] = [];
	if (fadeIn) {
		anims.push({
			keyframes: [{ opacity: 0 }, { opacity: 1 }],
			options: { duration: Math.floor((tMS * T_ANIM.fade.in) / 100), easing: 'ease-in', fill: 'both' }
		});
	}
	if (zoomIn) {
		const pads = [0.1, 1, 0.8, 1, 0.95, 1];
		const offsets = [0, 0.24, 0.47, 0.71, 0.88, 1];
		anims.push({
			keyframes: pads.map((scale, i) => ({
				offset: offsets[i],
				padding: scale === 1 ? '0' : zoomPad(eH, scale)
			})),
			options: { duration: Math.floor((tMS * T_ANIM.zoom.in) / 100), easing: 'linear', fill: 'both' }
		});
	}
	if (fadeOut) {
		const duration = Math.floor((outSpan * T_ANIM.fade.out) / 100);
		anims.push({
			keyframes: [{ opacity: 1 }, { opacity: 0 }],
			options: { delay: outEnd - duration, duration, easing: 'ease-out', fill: 'forwards' }
		});
	} else {
		anims.push({
			keyframes: [
				{ offset: 0.99, opacity: 1 },
				{ offset: 1, opacity: 0 }
			],
			options: { delay: outEnd - 50, duration: 50, easing: 'ease-out', fill: 'forwards' }
		});
	}
	if (zoomOut) {
		const duration = Math.floor((outSpan * T_ANIM.zoom.out) / 100);
		anims.push({
			keyframes: [{ padding: '0' }, { padding: zoomPad(eH, 0.1) }],
			options: { delay: outEnd - duration, duration, easing: 'linear', fill: 'forwards' }
		});
	}
	return anims;
}

/** CSS `animation-timing-function` eases each keyframe segment */
export function segmented(keyframes: Keyframe[], easing: string): Keyframe[] {
	return keyframes.map((keyframe) => ({ ...keyframe, easing }));
}

/** `screens` repeats in `sign` direction, or nothing when that edge is never left */
function repeats(leaves: boolean, screens: number, sign: number): number[] {
	return leaves ? Array.from({ length: Math.max(0, screens) }, (_, index) => (index + 1) * sign) : [];
}

/** [Liang–Barsky algorithm](https://w.wiki/fGan) */
function touches(
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	left: number,
	top: number,
	right: number,
	bottom: number
): boolean {
	const dx = x1 - x0;
	const dy = y1 - y0;
	const slopes = [-dx, dx, -dy, dy];
	const bounds = [x0 - left, right - x0, y0 - top, bottom - y0];
	let enter = 0;
	let exit = 1;
	for (const [index, slope] of slopes.entries()) {
		const bound = bounds[index]!;
		if (slope === 0) {
			if (bound < 0) {
				return false;
			}
			continue;
		}
		const at = bound / slope;
		if (slope < 0) {
			enter = Math.max(enter, at);
		} else {
			exit = Math.min(exit, at);
		}
		if (enter > exit) {
			return false;
		}
	}
	return true;
}

/**
 * `StraightLine` copies: the original repeats the path once for every screen it runs past the edge it leaves,
 * so an emote crossing an edge continues in at the opposite one. Repeats that never cross the screen are
 * dropped, as the original's `_csClip` does, which is most of them.
 */
function pathCopies(
	sW: number,
	sH: number,
	eW: number,
	eH: number,
	from: readonly [number, number],
	to: readonly [number, number]
): [number, number][] {
	const [h, v] = from;
	const [hD, vD] = to;
	const xs = [
		0,
		...repeats(h < hD && hD > sW - eW, Math.floor(hD / sW), -1),
		...repeats(h > hD && hD < 0, Math.floor((Math.abs(hD) + sW) / sW), 1)
	];
	const ys = [
		0,
		...repeats(v < vD && vD > sH - eH, Math.floor(vD / sH), -1),
		...repeats(v > vD && vD < 0, Math.floor((Math.abs(vD) + sH) / sH), 1)
	];
	const copies: [number, number][] = [];
	for (const dx of xs) {
		for (const dy of ys) {
			const x = dx * sW;
			const y = dy * sH;
			// the 1px inset is the original's `_csClip` shrink (a path that only grazes the edge pixel is not a wrap)
			if ((x === 0 && y === 0) || !touches(h + x, v + y, hD + x, vD + y, -eW + 1, -eH + 1, sW - 1, sH - 1)) {
				continue;
			}
			copies.push([x, y]);
		}
	}
	return copies;
}

/** `Rise` and `Drop` keep their horizontal position, so the original repeats them on the opposite side only */
function sideCopies(sW: number, h: number, eW: number): [number, number][] {
	const copies: [number, number][] = [];
	if (h < eW) {
		copies.push([sW, 0]);
	}
	if (h > sW - eW) {
		copies.push([-sW, 0]);
	}
	return copies;
}

const Still: StyleFn = (ctx) => {
	const { rnd, sW, sH, eH } = ctx;
	const eW = widthOf(ctx, eH);
	const tMS = emoteDuration('Still');
	return {
		eH,
		eW,
		life: tMS,
		style: { left: `${rnd(sW - eW)}px`, top: `${rnd(sH - eH)}px` },
		anims: envelope(tMS, eH),
		emote: ctx.emote
	};
};

const StraightLine: StyleFn = (ctx) => {
	const { rnd, sW, sH, eH, x, y } = ctx;
	const eW = widthOf(ctx, eH);
	const h = x ?? rnd(sW) - Math.ceil(eW / 2);
	const v = y ?? rnd(sH) - Math.ceil(eH / 2);
	const r = Math.min(sW, sH) * (rnd() + 1);
	const th = rnd() * RADIUS;
	const hD = Math.floor(h + r * Math.cos(th));
	const vD = Math.floor(v + r * Math.sin(th));
	const tMS = emoteDuration('StraightLine');
	return {
		eH,
		eW,
		life: tMS,
		style: {},
		copies: ctx.torus ? pathCopies(sW, sH, eW, eH, [h, v], [hD, vD]) : [],
		anims: [
			{
				keyframes: [{ transform: `translate(${h}px, ${v}px)` }, { transform: `translate(${hD}px, ${vD}px)` }],
				options: { duration: tMS, easing: 'linear', fill: 'both' }
			},
			...envelope(tMS, eH)
		],
		emote: ctx.emote
	};
};

const Rise: StyleFn = (ctx) => {
	const { rnd, sW, sH, eH } = ctx;
	const eW = widthOf(ctx, eH);
	const t = timing.display.Rise;
	const h = rnd(sW) - Math.ceil(eW / 2);
	const v = Math.floor(sH * rndFromRange(rnd, t.origin));
	const vD = Math.floor(sH * rndFromRange(rnd, t.dest));
	const shift = rnd(2) === 0 ? -50 : 50;
	const tMS = emoteDuration('Rise');
	const delay = Math.floor(tMS * rndFromRange(rnd, t.wiggle.delay));
	const wiggle = Math.floor(tMS * rndFromRange(rnd, t.wiggle));
	const end = cfg.emote.out.fade || cfg.emote.out.zoom ? vD : -eH;
	return {
		eH,
		eW,
		life: tMS,
		style: { left: `${h}px` },
		copies: ctx.torus ? sideCopies(sW, h, eW) : [],
		anims: [
			{
				keyframes: segmented(
					[
						{ offset: 0, transform: 'none' },
						{ offset: 0.33, transform: `translateX(${shift}%)` },
						{ offset: 0.66, transform: `translateX(${-shift}%)` },
						{ offset: 1, transform: 'none' }
					],
					'ease-in-out'
				),
				options: { delay, duration: wiggle, iterations: Infinity, fill: 'both' }
			},
			// the original drives this with offset-path; `translate` composes with the wiggle's `transform`
			{
				keyframes: [{ translate: `0 ${v}px` }, { translate: `0 ${end}px` }],
				options: { duration: tMS, easing: 'linear', fill: 'both' }
			},
			...envelope(tMS, eH)
		],
		emote: ctx.emote
	};
};

const Bounce: StyleFn = (ctx) => {
	const { rnd, sW, sH, eH } = ctx;
	const eW = widthOf(ctx, eH);
	const t = timing.display.Bounce;
	const half = Math.ceil(eW / 2);
	let bX = Math.floor(rnd(sW) - half);
	let bY = Math.floor(sH * rndFromRange(rnd, t.origin));
	const tMS = emoteDuration('Bounce');
	const vMS = tMS / 300 / (16 + 2 / 3);
	let velH = rndFromRange(rnd, t.velocity.h);
	let velV = rndFromRange(rnd, t.velocity.v);
	if (bX + half > Math.ceil(sW / 2)) {
		velH *= -1;
	}
	// the original steps this physics loop per 16ms frame; precomputing it makes the path frame-rate independent and seekable
	const floor = sH - eH;
	const steps = Math.ceil(tMS / 16);
	const keyframes: Keyframe[] = [{ offset: 0, transform: `translate(${bX}px, ${bY}px)` }];
	for (let step = 1; step <= steps; step++) {
		bX += velH / vMS;
		bY += velV / vMS;
		velV += t.gravity / vMS;
		if (bY >= floor) {
			bY = floor;
			velV = Math.floor(velV * -1 * (1 - t.velocity.loss));
		}
		if (step % 2 === 0 || step === steps) {
			keyframes.push({ offset: Math.min(1, (step * 16) / tMS), transform: `translate(${bX}px, ${bY}px)` });
		}
	}
	return {
		eH,
		eW,
		life: tMS,
		style: {},
		anims: [{ keyframes, options: { duration: tMS, easing: 'linear', fill: 'both' } }, ...envelope(tMS, eH)],
		emote: ctx.emote
	};
};

const Speed: StyleFn = (ctx) => {
	const { rnd, sW, sH, eH } = ctx;
	const eW = widthOf(ctx, eH);
	const t = timing.display.Speed;
	const half = Math.ceil(eW / 2);
	const h = rnd(sW) - half;
	const v = Math.floor(sH * rndFromRange(rnd, t.origin));
	const leftward = h + half > Math.ceil(sW / 2);
	const tMS = emoteDuration('Speed');
	const delay = Math.floor(tMS * t.delay);
	return {
		eH,
		eW,
		life: tMS,
		style: { left: `${h}px`, top: `${v}px`, transformOrigin: leftward ? 'right center' : 'left center' },
		anims: [
			{
				keyframes: segmented(
					[
						{ offset: 0, transform: 'scale(1, 1)' },
						{ offset: 0.1, transform: 'scale(0.6, 1)' },
						{ offset: 0.15, transform: 'scale(0.6, 1)' },
						{ offset: 0.2, transform: 'scale(1, 0.4)' },
						{ offset: 1, transform: `scale(1, 0.4) translate(${(leftward ? -4 : 4) * sW}px, 0)` }
					],
					'ease-in'
				),
				options: { delay, duration: tMS - delay, fill: 'forwards' }
			},
			...envelope(tMS, eH)
		],
		emote: ctx.emote
	};
};

const Drop: StyleFn = (ctx) => {
	const { rnd, sW, sH, eH } = ctx;
	const eW = widthOf(ctx, eH);
	const h = rnd(sW) - Math.ceil(eW / 2);
	const left = rnd(2) === 0;
	const sign = left ? 1 : -1;
	const tMS = emoteDuration('Drop');
	return {
		eH,
		eW,
		life: tMS,
		style: { left: `${h}px`, transformOrigin: left ? 'left top' : 'right top' },
		copies: ctx.torus ? sideCopies(sW, h, eW) : [],
		anims: [
			{
				keyframes: segmented(
					[
						{ offset: 0, transform: 'translateY(-100%)' },
						{ offset: 0.1, transform: 'translateY(0%)' },
						{ offset: 0.2, transform: 'translateY(0%)' },
						{ offset: 0.25, transform: `translateY(0%) rotate(${sign * 45}deg)` },
						{ offset: 0.27, transform: `translateY(0%) rotate(${sign * 35}deg)` },
						{ offset: 0.3, transform: `translateY(0%) rotate(${sign * 45}deg)` },
						{ offset: 1, transform: `translateY(${sH}px) rotate(${sign * 350}deg)` }
					],
					'ease-in'
				),
				options: { duration: tMS, fill: 'forwards' }
			},
			...envelope(tMS, eH, { fadeIn: false, zoomIn: false })
		],
		emote: ctx.emote
	};
};

const CONFETTI_AXES = ['0.25, 0.5, 0', '0.25, 0, 0', '0.25, -0.5, 0'] as const;

const Confetti: StyleFn = (ctx) => {
	const { rnd, sW, sH, eH } = ctx;
	const eW = widthOf(ctx, eH);
	const h = rnd(sW) - Math.ceil(eW / 2);
	const axis = CONFETTI_AXES[rnd(3)]!;
	const tMS = emoteDuration('Confetti');
	return {
		eH,
		eW,
		life: tMS,
		style: { left: `${h}px` },
		anims: [
			{
				keyframes: [
					{ transform: 'translateY(-100%) rotate3d(0.25, 0.5, 0, 0deg)' },
					{ transform: `translateY(${sH}px) rotate3d(${axis}, -4500deg)` }
				],
				options: { duration: tMS, easing: 'linear', fill: 'forwards' }
			},
			...envelope(tMS, eH, { fadeIn: false, zoomIn: false, zoomOut: false })
		],
		emote: ctx.emote
	};
};

/** squash per wall, from the original's `_Squash`/`_Origin` */
const WALLS = [
	{ sx: 1, sy: 1 },
	{ sx: 0.7, sy: 2 }, // left
	{ sx: 2, sy: 0.7 }, // top
	{ sx: 0.7, sy: 2 }, // right
	{ sx: 2, sy: 0.7 } // bottom
] as const;

const Crazy: StyleFn = (ctx) => {
	const { rnd, sW, sH, eH } = ctx;
	const eW = widthOf(ctx, eH);
	const t = timing.display.Crazy;
	const sR = sW - eW;
	const sB = sH - eH;
	const h0 = rnd(sR - 5) + 10;
	const v0 = rnd(sB - 5) + 10;
	const tMS = emoteDuration('Crazy');
	const rate = Math.sqrt(t.distance ** 2 / 2) / tMS;
	let trajX = 0;
	let trajY = 0;
	while (trajX === 0 && trajY === 0) {
		trajX = rnd() * (rate * 2) - rate;
		trajY = rnd() * (rate * 2) - rate;
	}
	const squash = Math.floor(tMS * t.squash.time);

	// bake the bounce path: travel to a wall, squash, unsquash, repeat
	const bounces: { x: number; y: number; travel: number; wall: number }[] = [];
	let x = h0;
	let y = v0;
	let travel = 0;
	let count = 0;
	let last = 0;
	while (count * squash * 2 + travel < tMS) {
		x += trajX;
		y += trajY;
		travel += 1;
		let wall = 0;
		if (x <= 0) {
			x = 0;
			trajX *= -1;
			wall = 1;
		} else if (x >= sR) {
			x = sR;
			trajX *= -1;
			wall = 3;
		}
		if (y <= 0) {
			y = 0;
			trajY *= -1;
			wall = 2;
		} else if (y >= sB) {
			y = sB;
			trajY *= -1;
			wall = 4;
		}
		if (wall !== 0) {
			count++;
			bounces.push({ x: Math.floor(x), y: Math.floor(y), travel: travel - last, wall });
			last = travel;
		}
	}
	bounces.push({ x, y, travel: travel - last, wall: 0 });

	// squash about the centre, then shift so the wall edge stays put
	const squashed = (bx: number, by: number, wall: number): string => {
		const { sx, sy } = WALLS[wall]!;
		let dx = 0;
		let dy = 0;
		if (wall === 1) {
			dx = -(eW * (1 - sx)) / 2;
		} else if (wall === 3) {
			dx = (eW * (1 - sx)) / 2;
		} else if (wall === 2) {
			dy = -(eH * (1 - sy)) / 2;
		} else if (wall === 4) {
			dy = (eH * (1 - sy)) / 2;
		}
		return `translate(${bx + dx}px, ${by + dy}px) scale(${sx}, ${sy})`;
	};

	const keyframes: Keyframe[] = [{ offset: 0, transform: `translate(${h0}px, ${v0}px) scale(1, 1)` }];
	let time = 0;
	let px = h0;
	let py = v0;
	for (const bounce of bounces) {
		time += bounce.travel;
		px = bounce.x;
		py = bounce.y;
		keyframes.push({ offset: Math.min(1, time / tMS), transform: `translate(${px}px, ${py}px) scale(1, 1)` });
		if (bounce.wall === 0) {
			continue;
		}
		time += squash;
		keyframes.push({ offset: Math.min(1, time / tMS), transform: squashed(px, py, bounce.wall) });
		time += squash;
		keyframes.push({ offset: Math.min(1, time / tMS), transform: `translate(${px}px, ${py}px) scale(1, 1)` });
	}
	keyframes.push({ offset: 1, transform: `translate(${px}px, ${py}px) scale(1, 1)` });

	return {
		eH,
		eW,
		life: tMS,
		style: {},
		anims: [
			{ keyframes: segmented(keyframes, 'linear'), options: { duration: tMS, fill: 'both' } },
			...envelope(tMS, eH)
		],
		emote: ctx.emote
	};
};

const Throw: StyleFn = (ctx) => {
	const { rnd, sW, sH, eH } = ctx;
	const eW = widthOf(ctx, eH);
	const t = timing.display.Throw;
	const sR = sW - eW;
	const sB = sH - eH;
	const h = rnd(2) === 0 ? -eW : sW;
	const v = rnd(sH + eH) - eH;
	const hD = Math.floor(sR * rndFromRange(rnd, t.dest.h));
	const vD = Math.floor(sB * rndFromRange(rnd, t.dest.v));
	const dH = rnd() * eH;
	const tMS = emoteDuration('Throw');
	const tTwist = Math.floor(tMS * t.twist);
	const t2 = Math.floor(tMS * t.toss);
	const t3 = Math.floor(tMS * t.drop);
	const rotate = h > 0 ? -360 : 360;
	return {
		eH,
		eW,
		life: tMS,
		style: { transform: `translate(${h}px, ${v}px)` },
		anims: [
			{
				keyframes: [
					{
						offset: 0,
						transform: `translate(${h}px, ${v}px) rotate(0deg)`,
						easing: 'cubic-bezier(0.32, 0, 0.67, 0)'
					},
					// the twist transition lands on its destination long before the drop is triggered
					{ offset: tTwist / tMS, transform: `translate(${hD}px, ${vD}px) rotate(0deg)` },
					{
						offset: t2 / tMS,
						transform: `translate(${hD}px, ${vD}px) rotate(0deg)`,
						easing: 'cubic-bezier(0.5, 0, 0.75, 0)'
					},
					{ offset: 1, transform: `translate(${hD}px, ${sH - dH}px) rotate(${rotate}deg)` }
				],
				options: { duration: tMS, fill: 'both' }
			},
			...envelope(tMS, eH, { fadeIn: false, zoomIn: false, outEnd: t3 })
		],
		emote: ctx.emote
	};
};

const Pop: StyleFn = (ctx) => {
	const { rnd, sW, sH, eH } = ctx;
	const eW = widthOf(ctx, eH);
	const t = timing.display.Pop;
	const h = rnd(sW - eW);
	const vT = Math.floor(sH * rndFromRange(rnd, t.top));
	const vB = Math.floor(sH * rndFromRange(rnd, t.bottom));
	const tMS = emoteDuration('Pop');
	const t1 = Math.floor(tMS * t.peek.up);
	const t2 = Math.floor(tMS * t.peek.pause);
	const t3 = Math.floor(tMS * t.peek.down);
	const t4 = Math.floor(tMS * t.pause);
	const t5 = Math.floor(tMS * t.jump.up);
	const t6 = Math.floor(tMS * t.jump.pause);
	const t7 = Math.floor(tMS * t.jump.down);
	const at = (ms: number): number => Math.min(1, ms / tMS);
	return {
		eH,
		eW,
		life: tMS,
		style: { left: `${h}px` },
		anims: [
			{
				keyframes: [
					{ offset: 0, transform: `translateY(${sH}px)`, easing: 'ease-in-out' },
					{ offset: at(t1), transform: `translateY(${sH - eH}px)`, easing: 'linear' },
					{ offset: at(t1 + t2), transform: `translateY(${sH - eH}px)`, easing: 'ease-out' },
					{ offset: at(t1 + t2 + t3), transform: `translateY(${sH}px)`, easing: 'linear' },
					{ offset: at(t1 + t2 + t3 + t4), transform: `translateY(${sH}px)`, easing: 'ease-out' },
					{ offset: at(t1 + t2 + t3 + t4 + t5), transform: `translateY(${vT}px)`, easing: 'linear' },
					{ offset: at(t1 + t2 + t3 + t4 + t5 + t6), transform: `translateY(${vT}px)`, easing: 'ease-in' },
					{ offset: 1, transform: `translateY(${vB}px)` }
				],
				options: { duration: tMS, fill: 'both' }
			},
			...envelope(tMS, eH, {
				fadeIn: false,
				zoomIn: false,
				outEnd: t1 + t2 + t3 + t4 + t5 + t6 + t7,
				outSpan: t7
			})
		],
		emote: ctx.emote
	};
};

const Cube: StyleFn = (ctx) => {
	const { rnd, sW, sH, eH } = ctx;
	const half = Math.ceil(eH / 2);
	const tMS = emoteDuration('Cube');
	const h = rnd(sW) - half;
	const v = rnd(sH) - half;
	const r = Math.min(sW, sH) * (rnd() + 1);
	const th = onScreenAngle(rnd, h, v, r, sW, sH, eH);
	const hD = clamp(Math.floor(h + r * Math.cos(th)), 0, sW - eH);
	const vD = clamp(Math.floor(v + r * Math.sin(th)), 0, sH - eH);
	const cube = cubeGeometry(eH, h, v, tMS, rnd);
	return {
		eH,
		eW: eH,
		life: tMS,
		cube: [ctx.emote, ctx.emote, ctx.emote, ctx.emote, ctx.emote, ctx.emote],
		style: cube.style,
		anims: [
			{
				keyframes: [{ transform: `translate(${h}px, ${v}px)` }, { transform: `translate(${hD}px, ${vD}px)` }],
				options: { duration: tMS, easing: 'linear', fill: 'both' }
			},
			...envelope(tMS, eH, { zoomIn: false, zoomOut: false })
		],
		cubeAnims: cube.cubeAnims,
		emote: ctx.emote
	};
};

const fountainEase = cubicBezier(0, 0.9, 1, 0.15);
const fountainDrift = 'cubic-bezier(0, 0, 0.58, 1)';

const Fountain: StyleFn = (ctx) => {
	const { rnd, sW, sH, eH, x, y } = ctx;
	const eW = widthOf(ctx, eH);
	const sR = sW - eW;
	const sB = sH - eH;
	const h = x ?? Math.floor(rnd() * (sR * 0.33) + sR * 0.33);
	const hD = rnd(2) === 0 ? h - rnd(sR * 0.2) : h + rnd(sR * 0.2);
	const apex = Math.floor((y ?? Math.floor(rnd() * sH)) + rnd(sB / 2));
	const tMS = emoteDuration('Fountain');
	const up = sH - apex;
	const total = up + (sH + eH - apex);
	const steps = 16;
	const path: Keyframe[] = Array.from({ length: steps + 1 }, (_, index) => {
		const t = index / steps;
		const distance = fountainEase(t) * total;
		const yAt = distance <= up ? sH - distance : apex + (distance - up);
		return { offset: t, translate: `0 ${Math.round(yAt)}px` };
	});
	return {
		eH,
		eW,
		life: tMS,
		style: { left: `${h}px` },
		anims: [
			{ keyframes: path, options: { duration: tMS, easing: 'linear', fill: 'both' } },
			{
				keyframes: [
					{ offset: 0, transform: 'translateX(0px)', easing: fountainDrift },
					{ offset: 1, transform: `translateX(${hD - h}px)` }
				],
				options: { duration: tMS, fill: 'both' }
			},
			...envelope(tMS, eH, { fadeIn: false, zoomIn: false })
		],
		emote: ctx.emote
	};
};

const ported: Record<EmoteStyle, StyleFn> = {
	Still,
	StraightLine,
	Rise,
	Bounce,
	Speed,
	Drop,
	Crazy,
	Confetti,
	Throw,
	Pop,
	Cube,
	Fountain
};

export function styleFor(style: EmoteStyle): StyleFn {
	return ported[style];
}
