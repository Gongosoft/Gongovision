import { alnumDist } from '@/lib/emotewall/alnum.ts';
import { rndFromRange } from '@/lib/emotewall/random.ts';
import { cfg, kappaDuration, timing } from '@/lib/emotewall/config.ts';
import { cubeGeometry, emoteHeight, emoteWidth, envelope, segmented, styleFor } from '@/lib/emotewall/styles.ts';
import type { EmoteStyle, KappaStyle, Rnd, SpawnSpec, WallEmote } from '@/types/emotewall.d.ts';

/** simulation frame time in ms, not reliant on frame rate like the original, which would desync viewers */
const FRAME_MS = 16;
/** column heights of pyramids, left to right */
const pyramidDist = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;
/** widest glyph column, cached once like the original's `_mL` */
const GLYPH_WIDTH = Math.max(...Object.values(alnumDist).map((glyph) => glyph[0]?.length ?? 0));

interface KappaContext {
	rnd: Rnd;
	sW: number;
	sH: number;
	emotes: WallEmote[];
	count: number;
	text: string;
}

function pick(rnd: Rnd, emotes: WallEmote[]): WallEmote {
	return emotes[rnd(emotes.length)]!;
}

/** `_kAcTime`: `perFrame` emotes go out together when they don't fit one per frame, else one every `frames` */
interface Pace {
	perFrame: number;
	frames: number;
}

function pace(count: number, duration: number): Pace {
	const frames = Math.max(1, Math.floor(duration / FRAME_MS));
	const gap = frames / Math.max(1, count);
	return gap > 1 ? { perFrame: 1, frames: Math.ceil(gap) } : { perFrame: Math.ceil(1 / gap), frames: 1 };
}

/** when the `index`th emote goes out under `p` */
function pacedAt(p: Pace, index: number): number {
	return FRAME_MS * (p.perFrame > 1 ? Math.floor(index / p.perFrame) : index * p.frames);
}

/** the point `Burst` spreads from and `Fountain` spouts from; drawn once, then scaled to each emote */
function originOf(
	style: KappaStyle,
	ctx: KappaContext
): ((emote: WallEmote, eH: number) => { x: number; y: number }) | undefined {
	const { rnd, sW, sH } = ctx;
	if (style === 'Burst') {
		const { left, top } = timing.kappa.Burst;
		const across = rndFromRange(rnd, left);
		const down = rndFromRange(rnd, top);
		return (emote, eH) => ({ x: across * (sW - Math.ceil(emoteWidth(emote, eH) / 2)), y: down * (sH - eH) });
	}
	if (style === 'Fountain') {
		const { left, top } = timing.kappa.Fountain;
		const x = rndFromRange(rnd, left) * sW;
		const y = rndFromRange(rnd, top) * sH;
		return () => ({ x, y });
	}
	return undefined;
}

/** replays a display style as a kappagen; `kappa` only supplies the duration to pace over */
function emoteStyle(ctx: KappaContext, style: EmoteStyle, kappa: KappaStyle): SpawnSpec[] {
	const { rnd, sW, sH, emotes, count } = ctx;
	const eH = emoteHeight(sW, sH, style === 'Confetti' ? cfg.emote.ratio.small : cfg.emote.ratio.normal);
	const p = pace(count, kappaDuration(kappa));
	const origin = originOf(kappa, ctx);
	const specs: SpawnSpec[] = [];
	for (let i = 0; i < count; i++) {
		const emote = pick(rnd, emotes);
		const spec = styleFor(style)({ rnd, sW, sH, eH, emote, ...origin?.(emote, eH) });
		spec.at = pacedAt(p, i);
		specs.push(spec);
	}
	return specs;
}

function planFireworks(ctx: KappaContext): SpawnSpec[] {
	const { rnd, sW, sH, emotes, count } = ctx;
	const t = timing.kappa.Fireworks;
	const eH = emoteHeight(sW, sH, cfg.emote.ratio.small);
	const tMS = Math.floor(cfg.emote.time * 1000 * t.time);
	const lift = Math.floor(tMS * t.speed.rocket);
	const cX = sW * t.dest.x[rnd(t.dest.x.length)]!;
	const cY = sH * t.dest.y[rnd(t.dest.y.length)]!;
	// the ring cadence is measured over the burst, which is much shorter than the rocket's flight
	const p = pace(count, Math.floor(tMS * t.speed.burst));

	const rocket = pick(rnd, emotes);
	const rocketW = emoteWidth(rocket, eH);
	const startX = sW * t.origin.x[rnd(t.origin.x.length)]! - Math.ceil(rocketW / 2);
	const startY = sH * t.origin.y[rnd(t.origin.y.length)]!;
	const specs: SpawnSpec[] = [
		{
			eH,
			eW: rocketW,
			life: lift,
			style: { transform: `translate(${startX}px, ${startY}px)` },
			anims: [
				{
					keyframes: [
						{ transform: `translate(${startX}px, ${startY}px)` },
						{ transform: `translate(${cX - Math.ceil(rocketW / 2)}px, ${cY}px)` }
					],
					options: { duration: lift, easing: 'linear', fill: 'both' }
				}
			],
			emote: rocket
		}
	];

	/** one sparkler flying out of the burst centre; the original hard-codes their fades */
	const sparkle = (radius: number, at: number): SpawnSpec => {
		const emote = pick(rnd, emotes);
		const eW = emoteWidth(emote, eH);
		const x = cX - Math.ceil(eW / 2);
		const angle = rnd() * Math.PI * 2;
		return {
			eH,
			eW,
			at,
			life: tMS,
			style: { transform: `translate(${x}px, ${cY}px)` },
			anims: [
				{
					keyframes: [
						{ transform: `translate(${x}px, ${cY}px)` },
						{
							transform: `translate(${Math.floor(x + radius * Math.cos(angle))}px, ${Math.floor(cY + radius * Math.sin(angle))}px)`
						}
					],
					options: { duration: tMS, easing: 'ease-out', fill: 'both' }
				},
				...envelope(tMS, eH, { fadeIn: true, zoomIn: false, fadeOut: true, zoomOut: false })
			],
			emote
		};
	};

	const base = Math.min(sW, sH) * t.radius.base;
	const inner = Math.max(3, Math.floor(count * t.quantity.small));
	const core = Math.floor(count * t.quantity.medium);
	const outer = Math.max(3, Math.floor(count * t.quantity.large));

	// a tight flash, then a slower spray, then the far sparks once both have played out
	for (let i = 0; i < inner; i++) {
		specs.push(sparkle(base * t.radius.small, pacedAt(p, i)));
	}
	const corePace: Pace = { perFrame: Math.max(1, Math.ceil(p.perFrame / t.spread)), frames: 1 };
	const coreAt = Math.floor(tMS * t.delays.small);
	for (let i = 0; i < core; i++) {
		specs.push(sparkle(base * t.radius.medium, coreAt + pacedAt(corePace, i)));
	}
	const outerAt = coreAt + pacedAt(corePace, Math.max(0, core - 1)) + FRAME_MS + Math.floor(tMS * t.delays.large);
	// the far ring pops out at the same cadence as the inner flash, like the original's outer loop
	for (let i = 0; i < outer; i++) {
		specs.push(sparkle(base * t.radius.large, outerAt + pacedAt(p, i)));
	}
	return specs;
}

function planSpiral(ctx: KappaContext): SpawnSpec[] {
	const { rnd, sW, sH, emotes, count } = ctx;
	const t = timing.kappa.Spiral;
	const eH = emoteHeight(sW, sH, cfg.emote.ratio.small);
	const tMS = Math.floor(cfg.emote.time * 1000 * t.time);
	const widest = Math.max(...emotes.map((emote) => emoteWidth(emote, eH)));
	const centreX = rnd(sW - widest);
	const centreY = rnd(sH - eH);
	const radius = Math.min(sW, sH);
	const extra = (rnd(5) + 1) / 7;
	// fewer emotes than turns: shorten the spiral instead of drawing one that never closes
	let turns = rndFromRange(rnd, t.vectors) + extra;
	if (turns > count) {
		turns = count * 0.75 + extra;
	}
	turns = Math.max(1, turns);
	const step = (Math.PI * 2) / turns;
	let angle = rnd() * Math.PI * 2;
	const clockwise = rnd(2) === 0;
	const p = pace(count, tMS);
	p.perFrame = Math.min(p.perFrame, t.bulk);

	const specs: SpawnSpec[] = [];
	for (let i = 0; i < count; i++) {
		angle = clockwise ? angle + step : angle - step;
		const emote = pick(rnd, emotes);
		const eW = emoteWidth(emote, eH);
		const x = centreX - Math.ceil(eW / 2);
		specs.push({
			eH,
			eW,
			at: pacedAt(p, i),
			life: tMS,
			style: { transform: `translate(${x}px, ${centreY}px)` },
			anims: [
				{
					keyframes: [
						{ transform: `translate(${x}px, ${centreY}px)` },
						{
							transform: `translate(${Math.floor(x + radius * Math.cos(angle))}px, ${Math.floor(centreY + radius * Math.sin(angle))}px)`
						}
					],
					options: { duration: tMS, easing: 'ease-out', fill: 'both' }
				},
				...envelope(tMS, eH, { fadeIn: true, zoomIn: false, fadeOut: true, zoomOut: false })
			],
			emote
		});
	}
	return specs;
}

function planPyramid(ctx: KappaContext, small: boolean): SpawnSpec[] {
	const { rnd, sW, sH, emotes } = ctx;
	const t = timing.kappa[small ? 'SmallPyramid' : 'Pyramid'];
	const blocks = pyramidDist.reduce((sum, n) => sum + n, 0);
	const eH = small
		? Math.min(
				sW / pyramidDist.length,
				Math.floor(sW * cfg.emote.ratio.small),
				Math.floor(sH * cfg.emote.ratio.small)
			)
		: sW / pyramidDist.length;
	const tMS = Math.floor(cfg.emote.time * 1000 * t.time);
	const perBlock = Math.max(Math.floor((tMS * t.show.total) / blocks), t.show.min);
	const entryEnd = perBlock * blocks;
	const dropGap = Math.floor(tMS * t.pause);
	const dropMS = Math.floor(tMS * t.hide);
	const offsetX = small ? rnd(sW - eH * pyramidDist.length) : 0;

	const drawn = Array.from({ length: pyramidDist.length }, () => 0);
	const specs: SpawnSpec[] = [];
	let time = 0;
	for (let i = 0; i < blocks; i++) {
		let column = 0;
		do {
			column = rnd(pyramidDist.length);
		} while (drawn[column]! >= pyramidDist[column]!);
		drawn[column]! += 1;

		const restingY = sH - eH * drawn[column]!;
		const dropAt = Math.floor(time / 10 + entryEnd + dropGap);
		const life = dropAt + dropMS;
		specs.push({
			eH,
			eW: eH,
			life,
			style: { left: `${Math.round(offsetX + eH * column)}px`, top: '-2px' },
			anims: [
				{
					keyframes: segmented(
						[
							{ offset: 0, transform: `translateY(${-eH}px)` },
							{ offset: Math.min(1, time / life), transform: `translateY(${-eH}px)` },
							{ offset: Math.min(1, (time + perBlock) / life), transform: `translateY(${restingY}px)` },
							{ offset: Math.min(1, dropAt / life), transform: `translateY(${restingY}px)` },
							{ offset: 1, transform: `translateY(${sH + 2}px)` }
						],
						'ease-in'
					),
					options: { duration: life, fill: 'both' }
				}
			],
			emote: pick(rnd, emotes)
		});
		time += perBlock;
	}
	return specs;
}

/** `_buildMsgArr`: every glyph is a run of 9-tall strips, with a blank strip between letters */
function buildMessage(text: string): number[][] {
	const blank = (): number[] => Array.from({ length: GLYPH_WIDTH }, () => 0);
	const strips: number[][] = [];
	for (let index = 0; index < text.length; index++) {
		const char = text[index]!;
		if (index > 0) {
			strips.push(blank());
		}
		if (char === ' ') {
			strips.push(blank(), blank());
			continue;
		}
		const glyph = alnumDist[char];
		if (!glyph) {
			continue;
		}
		for (const strip of glyph) {
			strips.push([...strip]);
		}
	}
	return strips;
}

function planText(ctx: KappaContext): SpawnSpec[] {
	const { rnd, sW, sH, emotes, text } = ctx;
	const t = timing.kappa.Text;
	const strips = buildMessage(text);
	const columns = strips.length;
	if (columns === 0) {
		return [];
	}
	const cells = strips.reduce((sum, strip) => sum + strip.length, 0);
	const raised = strips.reduce((sum, strip) => sum + strip.filter((cell) => cell !== 0).length, 0);
	const eH = Math.min(
		Math.floor(sW / (columns + 2)),
		Math.floor(sW * cfg.emote.ratio.small),
		Math.floor(sH * cfg.emote.ratio.small)
	);
	const holdMS = Math.floor(cfg.display.kappa.textTime * 1000 * t.time);
	const perBlock = Math.max(Math.floor((holdMS * t.show.total) / cells), t.show.min);
	const entryEnd = perBlock * raised;
	const dropMS = Math.floor(holdMS * t.hide);
	const height = strips[0]!.length;
	const baseY = rnd(sH - eH * height) + eH * height;
	const offsetX = rnd(sW - eH * columns);

	const drawn = Array.from({ length: columns }, () => 0);
	const specs: SpawnSpec[] = [];
	let time = 0;
	for (let i = 0; i < cells; i++) {
		let column = 0;
		do {
			column = rnd(columns);
		} while (drawn[column]! >= strips[column]!.length);
		const depth = drawn[column]! + 1;
		const lit = strips[column]![depth - 1] !== 0;
		drawn[column]! += 1;
		if (!lit) {
			continue;
		}

		const restingY = baseY - eH * depth;
		const dropAt = entryEnd + holdMS + Math.floor(time / 10);
		const life = dropAt + dropMS;
		specs.push({
			eH,
			eW: eH,
			life,
			style: { left: `${Math.round(offsetX + eH * column)}px`, top: '-2px' },
			anims: [
				{
					keyframes: segmented(
						[
							{ offset: 0, transform: `translateY(${-eH}px)` },
							{ offset: Math.min(1, time / life), transform: `translateY(${-eH}px)` },
							{ offset: Math.min(1, (time + perBlock) / life), transform: `translateY(${restingY}px)` },
							{ offset: Math.min(1, dropAt / life), transform: `translateY(${restingY}px)` },
							{ offset: 1, transform: `translateY(${sH + 2}px)` }
						],
						'ease-in'
					),
					options: { duration: life, fill: 'both' }
				}
			],
			emote: pick(rnd, emotes)
		});
		time += perBlock;
	}
	return specs;
}

function planCodeLines(ctx: KappaContext): SpawnSpec[] {
	const { rnd, sW, sH, emotes, count } = ctx;
	const t = timing.kappa.CodeLines;
	const eH = emoteHeight(sW, sH, cfg.emote.ratio.small);
	const rows = Math.max(1, Math.floor(sH / eH));
	const cols = Math.max(1, Math.floor(sW / eH));
	const rowGap = rows > 1 ? (sH - rows * eH) / (rows - 1) : 0;
	const colGap = cols > 1 ? (sW - cols * eH) / (cols - 1) : 0;
	const width = Math.max(Math.min(Math.ceil(count / rows), Math.min(cols, 8)), 2);
	const tMS = Math.floor(cfg.emote.time * 1000 * t.time);
	const columnMS = Math.floor(tMS / width);
	const fadeMS = Math.floor(tMS * t.fade);
	// a column takes `columnMS` to fill, and the columns start an overlap-step apart
	const startStep = Math.max(FRAME_MS, Math.floor(columnMS / t.overlap));
	// flashing one after another means each column lights up once per rotation
	const flashEvery = startStep * width;

	// distinct columns, like the original's `_codeCols` bookkeeping
	const free = Array.from({ length: cols }, (_, i) => i);
	const chosen: number[] = [];
	while (chosen.length < width && free.length > 0) {
		chosen.push(free.splice(rnd(free.length), 1)[0]!);
	}

	const specs: SpawnSpec[] = [];
	for (const [index, column] of chosen.entries()) {
		const start = index * startStep;
		for (let row = 0; row < rows; row++) {
			const entry = start + Math.floor((row * columnMS) / rows);
			const events: [number, number][] = [
				[0, 0],
				[entry, 0],
				[entry + FRAME_MS, 1],
				[entry + FRAME_MS + fadeMS, t.opacity]
			];
			let lastFlash = 0;
			for (let at = start + flashEvery; at + FRAME_MS + fadeMS < tMS; at += flashEvery) {
				if (at >= entry + FRAME_MS + fadeMS) {
					events.push([at, t.opacity], [at + FRAME_MS, 1], [at + FRAME_MS + fadeMS, t.opacity]);
					lastFlash = at + FRAME_MS + fadeMS;
				}
			}
			// the original ends each column with one last full flash fading all the way out
			if (lastFlash > 0) {
				events[events.length - 1] = [lastFlash, 0];
			} else {
				events.push([tMS, 0]);
			}
			specs.push({
				eH,
				eW: eH,
				life: tMS,
				style: { left: `${Math.round(column * (eH + colGap))}px`, top: `${Math.round(row * (eH + rowGap))}px` },
				anims: [
					{
						keyframes: events.map(([at, opacity]) => ({ offset: Math.min(1, at / tMS), opacity })),
						options: { duration: tMS, easing: 'ease-out', fill: 'both' }
					}
				],
				emote: pick(rnd, emotes)
			});
		}
	}
	return specs;
}

function planStampede(ctx: KappaContext): SpawnSpec[] {
	const { rnd, sW, sH, emotes, count } = ctx;
	const t = timing.kappa.Stampede;
	const eH = emoteHeight(sW, sH, cfg.emote.ratio.normal);
	const widest = Math.max(...emotes.map((emote) => emoteWidth(emote, eH)));
	const tMS = Math.floor(cfg.emote.time * 1000 * t.time);
	const runMS = Math.floor(tMS * t.speed);
	const bandHeight = eH * t.height;
	const bandTop = rnd(sH - bandHeight + eH * t.top.min + eH * t.top.max) - eH * t.top.min;
	const leftward = rnd(2) === 0;
	const first = rndFromRange(rnd, t.bunch[1]);
	const second = rnd(t.bunch[2] - first) + first;
	const fourth = rndFromRange(rnd, t.bunch[4]);
	const p = pace(count, tMS);
	p.perFrame = Math.min(p.perFrame, t.maxdensity);

	const specs: SpawnSpec[] = [];
	const from = leftward ? -2 * widest : sW + widest;
	const to = leftward ? sW + widest : -2 * widest;
	let time = 0;

	/** queues `size` runners and returns when the last starts */
	const run = (size: number, at: (index: number) => number): number => {
		let last = time;
		for (let i = 0; i < size; i++) {
			const emote = pick(rnd, emotes);
			const y = Math.round(bandTop + rnd(bandHeight));
			last = at(i);
			specs.push({
				eH,
				eW: emoteWidth(emote, eH),
				at: last,
				life: runMS,
				style: {},
				anims: [
					{
						keyframes: [
							{ transform: `translate(${from}px, ${y}px)` },
							{ transform: `translate(${to}px, ${y}px)` }
						],
						options: { duration: runMS, easing: 'linear', fill: 'both' }
					}
				],
				emote
			});
		}
		return last;
	};

	/** the loose bunches shuffle out one at a time, each with its own pause */
	const shuffle = (size: number): void => {
		run(size, () => {
			const at = time;
			time += Math.floor(rndFromRange(rnd, t.sleep));
			return at;
		});
	};

	shuffle(first);
	time += Math.floor(runMS * t.pause[1]);
	shuffle(second);
	time += Math.floor(runMS * t.pause[2]);
	// batches pause a random number of frames, so the herd gallops instead of marching
	const mainEnd = run(count, (index) => {
		const at = time;
		if (index % p.perFrame === p.perFrame - 1) {
			const frames = p.frames === 1 ? rnd(3) : p.frames * ((rnd() * 3) / 2);
			if (frames !== 0) {
				time += Math.ceil(frames) * FRAME_MS;
			}
		}
		return at;
	});
	// the fourth bunch only charges once the main one has left the screen.
	if (Math.ceil(fourth) > 0) {
		time = mainEnd + runMS;
		shuffle(fourth);
	}
	return specs;
}

/** `avoidMiddle` keeps conga lines in the top and bottom bands */
function pickRow(rnd: Rnd, rows: number, avoid: number): number {
	if (!avoid) {
		return rnd(rows);
	}
	const half = Math.floor(avoid / 2);
	const slot = rnd(avoid);
	return slot >= half ? Math.max(0, rows - 1 - (slot - half)) : slot;
}

function planConga(ctx: KappaContext): SpawnSpec[] {
	const { rnd, sW, sH, emotes } = ctx;
	const t = timing.kappa.Conga;
	const eH = emoteHeight(sW, sH, cfg.emote.ratio.normal);
	const box = Math.ceil(eH * t.size);
	const segment = Math.floor(eH * t.height);
	const rows = Math.max(1, Math.floor(sH / segment));
	const top = pickRow(rnd, rows, cfg.display.kappa.conga.avoidMiddle ? t.avoidMiddle : 0) * segment;
	// alternating rows conga the opposite way
	const rightward = (top / segment) % 2 === 0;
	const dancers = Math.max(1, Math.floor(sW / box));
	const offset = Math.floor((sW - dancers * box) / 2);
	const showMS = Math.floor(cfg.emote.time * 1000 * t.time.show);
	const holdMS = cfg.display.kappa.conga.time * 1000;
	const hideMS = Math.floor(cfg.emote.time * 1000 * t.time.hide);
	const life = showMS + holdMS + hideMS;

	const specs: SpawnSpec[] = [];
	for (let column = 0; column < dancers; column++) {
		const start = (rightward ? box * (dancers - 1 - column) : box * column) + offset;
		const enterFrom = rightward ? start + sW : start - sW;
		const leaveTo = rightward ? start - sW : start + sW;
		specs.push({
			eH,
			eW: eH,
			box,
			life,
			dancer: true,
			// rows are painted in order: a lower row's higher `top` also puts it in front
			style: { 'left': '0px', 'top': `${top}px`, 'z-index': `${top}`, 'transform': `translateX(${enterFrom}px)` },
			anims: [
				{
					keyframes: [
						{ offset: 0, transform: `translateX(${enterFrom}px)` },
						{ offset: showMS / life, transform: `translateX(${start}px)` },
						// the original's exit class eases in, so the line accelerates away
						{ offset: (showMS + holdMS) / life, transform: `translateX(${start}px)`, easing: 'ease-in' },
						{ offset: 1, transform: `translateX(${leaveTo}px)` }
					],
					options: { duration: life, easing: 'linear', fill: 'both' }
				}
			],
			emote: pick(rnd, emotes)
		});
	}
	return specs;
}

function planCoaster(ctx: KappaContext): SpawnSpec[] {
	const { rnd, sW, sH, emotes, count } = ctx;
	const t = timing.kappa.Coaster;
	const eH = emoteHeight(sW, sH, cfg.emote.ratio.small);
	const widest = Math.max(...emotes.map((emote) => emoteWidth(emote, eH)));
	const tMS = cfg.emote.time * 1000 * t.time;
	const leftward = rnd(2) === 0;
	const yBase = Math.floor(sH * rndFromRange(rnd, t.bottom));
	const yCrest = Math.floor(sH * rndFromRange(rnd, t.top));
	const xAt = Math.floor((sW + widest) * rndFromRange(rnd, t.at));
	const distance = xAt + (yBase - yCrest) * Math.PI;
	const speed = tMS / distance;
	const straightMS = Math.floor(speed * xAt);
	const loopMS = Math.floor(speed * (yBase - yCrest) * Math.PI);
	const life = straightMS + loopMS;
	// the car always spins the way it is travelling
	const rotate = leftward ? 360 : -360;
	// half a pixel matters here: the loop's radius is exactly half the travel between bottom and crest
	const originY = (yBase - yCrest) / 2;
	const track = (offset: number): string =>
		`perspective(10px) translateZ(0px) translateX(${leftward ? -xAt : xAt}px) rotate(${offset}deg) translateZ(0px)`;

	const specs: SpawnSpec[] = [];
	let time = 0;
	for (let i = 0; i < count; i++) {
		const emote = pick(rnd, emotes);
		const eW = emoteWidth(emote, eH);
		specs.push({
			eH,
			eW,
			at: time,
			life,
			style: {
				'left': `${leftward ? sW : -widest}px`,
				'top': `${yBase}px`,
				'transform-origin': `center -${originY}px`
			},
			anims: [
				{
					keyframes: [
						{
							offset: 0,
							transform: 'perspective(10px) translateZ(0px) translateX(0px) rotate(0deg) translateZ(0px)'
						},
						{ offset: straightMS / life, transform: track(0) },
						{
							offset: 1,
							transform: `perspective(10px) translateZ(0px) translateX(${leftward ? -xAt : xAt}px) rotate(${rotate}deg) translateZ(7px)`
						}
					],
					options: { duration: life, easing: 'linear', fill: 'both' }
				}
			],
			emote
		});
		// each car launches once the previous one has cleared its own width
		time += Math.max(FRAME_MS, Math.ceil(eW * speed));
	}
	return specs;
}

function planCube(ctx: KappaContext): SpawnSpec[] {
	const { rnd, sW, sH, emotes } = ctx;
	const { size, center, faces } = cfg.cube;
	const eH = Math.floor(Math.min(sW, sH) * size);
	const half = Math.ceil(eH / 2);
	const tMS = Math.floor(cfg.emote.time * 1000 * timing.kappa.TheCube.time);
	const h = center ? Math.floor(sW / 2 - half) : rnd(sW - eH);
	const v = center ? Math.floor(sH / 2 - half) : rnd(sH - eH);
	// drawn before the faces so the seeded sequence matches the original's draw order exactly
	const geometry = cubeGeometry(eH, h, v, tMS, rnd);
	const face = pick(rnd, emotes);
	const cube = Array.from({ length: 6 }, () => (faces ? pick(rnd, emotes) : face));
	return [
		{
			eH,
			eW: eH,
			life: tMS,
			cube,
			style: geometry.style,
			anims: envelope(tMS, eH, { zoomIn: false, zoomOut: false }),
			cubeAnims: geometry.cubeAnims,
			emote: face
		}
	];
}

/** the replay styles reuse a display style, the rest have their own planner */
const kappagens: Record<KappaStyle, (ctx: KappaContext) => SpawnSpec[]> = {
	StraightLine: (ctx) => emoteStyle(ctx, 'StraightLine', 'StraightLine'),
	Rise: (ctx) => emoteStyle(ctx, 'Rise', 'Rise'),
	Speed: (ctx) => emoteStyle(ctx, 'Speed', 'Speed'),
	Crazy: (ctx) => emoteStyle(ctx, 'Crazy', 'Crazy'),
	Burst: (ctx) => emoteStyle(ctx, 'StraightLine', 'Burst'),
	Fireworks: planFireworks,
	Spiral: planSpiral,
	Pyramid: (ctx) => planPyramid(ctx, false),
	SmallPyramid: (ctx) => planPyramid(ctx, true),
	CodeLines: planCodeLines,
	Fountain: (ctx) => emoteStyle(ctx, 'Fountain', 'Fountain'),
	Stampede: planStampede,
	Confetti: (ctx) => emoteStyle(ctx, 'Confetti', 'Confetti'),
	Conga: planConga,
	Coaster: planCoaster,
	TheCube: planCube,
	Text: planText
};

export function planKappa(style: KappaStyle, ctx: KappaContext): SpawnSpec[] {
	return kappagens[style](ctx);
}
