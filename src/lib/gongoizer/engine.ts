// Modelled on captures of a Panasonic WJ-AVE5 internal feedback loop. The mixer re-enters its
// own output every frame with a small spatial offset, so the picture behaves like a fluid
// flowing through the frame store: fresh stripes are "born" at an upstream edge and get
// sheared/folded further downstream. We simulate that as a scalar phase field that is
// advected (semi-Lagrangian) at low resolution, then map phase -> colour through a palette
// at full display resolution, so edges stay crisp.
//
// Stored field:  phi = theta + fInj * t   (theta = material phase, conserved along the flow)
// Only phi mod 1 is ever displayed, so sampling is done "circularly" (neighbours unwrapped to
// within half a cycle). That lets radial/spiral flows have a seam with an integer jump and lets
// the stored value wrap so it never grows.
import VS from '@/lib/gongoizer/shaders/vertex.glsl';
import CUT_FS from '@/lib/gongoizer/shaders/cut.frag';
import SIM_FS from '@/lib/gongoizer/shaders/sim.frag';
import DOWN_FS from '@/lib/gongoizer/shaders/down.frag';
import BLUR_FS from '@/lib/gongoizer/shaders/blur.frag';
import FINAL_FS from '@/lib/gongoizer/shaders/final.frag';
import TRAIL_FS from '@/lib/gongoizer/shaders/trail.frag';
import DISPLAY_FS from '@/lib/gongoizer/shaders/display.frag';
import { CutoutField } from '@/lib/gongoizer/cutout.ts';
import { paletteLut } from '@/lib/gongoizer/palettes.ts';
import { BASE, DEFAULT_PRESET, PRESETS, resolvePreset } from '@/lib/gongoizer/presets.ts';
import { audioGain, effectiveParams, MARGIN, uniformsCut, uniformsFlow } from '@/lib/gongoizer/uniforms.ts';
import { createProgram, deleteTarget, finishProgram, makeColorTarget, makeFloatTarget } from '@/lib/gongoizer/gl.ts';
import type {
	AudioReactive,
	AudioSource,
	GLProgram,
	GLTarget,
	GongoizerParams,
	GongoizerShaderOptions
} from '@/types/gongoizer.d.ts';

const SIM_HZ = 60;
/** seconds of simulation run before the first reveal, so turbulence has formed */
const WARMUP = 24;
/** big steps while warming up (semi-Lagrangian stays stable) */
const WARM_DT = 1 / 10;
const FADE_TIME = 0.6;
const QUALITY = [1, 0.85, 0.72, 0.6, 0.5];
/** a power of two keeps the float bits exact */
const PHASE_WRAP = 256;
/** pointer speed cap in H/s, so a fast flick doesn't tear the field */
const POINTER_MAX_SPEED = 3;
const MAX_BURSTS = 4;
const BURST_LIFETIME = 3;
const DEFAULT_MAX_PIXELS = 1920 * 1200;
/** seconds of slow frames before stepping quality down / up */
const ADAPT_SLOW_TIME = 1.5;
const ADAPT_FAST_TIME = 12;

type StatePair = [GLTarget, GLTarget];

interface PostPrograms {
	trail: GLProgram;
	down: GLProgram;
	blur: GLProgram;
	final: GLProgram;
}

interface PostTargets {
	w: number;
	h: number;
	cur: number;
	scene: GLTarget;
	/** last frame of the previous look, for crossfades */
	snap: GLTarget;
	out: StatePair;
	q: StatePair;
	/** 1/8, 1/16, 1/32 for bloom */
	mips: [StatePair, StatePair, StatePair];
}

interface Burst {
	x: number;
	y: number;
	age: number;
	strength: number;
}

interface InputBindings {
	target: Window;
	move: (e: PointerEvent) => void;
	down: (e: PointerEvent) => void;
	wheel: (e: WheelEvent) => void;
	leave: () => void;
}

/** WebGL2 video-feedback renderer driven by a flat GongoizerParams object. */
export class GongoizerShader {
	public canvas: HTMLCanvasElement;
	public params: GongoizerParams;
	public onError: ((error: unknown) => void) | null = null;

	/** true once shaders are compiled and the field exists (warm-up may still be running) */
	public ready = false;
	public running = false;
	/** adaptive quality ladder position and current scale (see `adapt`) */
	public qIndex = 0;
	public quality = 1;
	public simW = 0;
	public simH = 0;
	/** canvas aspect ratio in H units (width / height) */
	public aspect = 1;
	public audio: AudioReactive | null = null;

	private readonly gl: WebGL2RenderingContext;
	private readonly parallel: { COMPLETION_STATUS_KHR: GLenum } | null;
	private readonly seed: number | null;
	private readonly maxPixels: number;
	private readonly sim: GLProgram;
	private readonly display: GLProgram;
	private readonly post: PostPrograms;
	private readonly cutProg: GLProgram;
	private readonly cutout: CutoutField;
	private readonly vao: WebGLVertexArrayObject;
	private lut: WebGLTexture;
	private lut2: WebGLTexture;
	private state: StatePair | null = null;
	private targets: PostTargets | null = null;
	/** preset crossfade: { t } while fading in, after a hidden warm-up */
	private fade: { t: number } | null = null;
	private readonly perf = { ema: 0, min: 1, slow: 0, fast: 0, cool: 2 };
	private warmLeft = 0;
	private revealed = false;
	private warmSteps = 6;
	private simTime = 0;
	private clock = 0;
	private clock0 = 0;
	private acc = 0;
	private frame = 0;
	private last = 0;
	private lastShown = -1;
	private fInj = 0;
	private lastDt = 1 / SIM_HZ;
	private phaseOffset = 0;
	private simAspect = 1;
	private readonly pointer = { x: -10, y: -10, vx: 0, vy: 0, t: 0, activity: 0 };
	private readonly push = { x: 0, y: 0 };
	private bursts: Burst[] = [];
	private hueKick = 0;
	private audioLevel = 0;
	private audioBass = 0;
	private input: InputBindings | null = null;
	private readonly resizeObserver = new ResizeObserver(() => {
		if (this.ready) {
			this.resize();
		}
	});

	public constructor(canvas: HTMLCanvasElement, options: GongoizerShaderOptions = {}) {
		const { preset = DEFAULT_PRESET, params = {}, maxPixels = DEFAULT_MAX_PIXELS, seed = null } = options;
		this.canvas = canvas;
		this.seed = seed;
		this.maxPixels = maxPixels;
		this.params = { ...BASE, ...(PRESETS[resolvePreset(preset)] ?? PRESETS[DEFAULT_PRESET]!), ...params };
		const gl = canvas.getContext('webgl2', {
			alpha: false,
			antialias: false,
			depth: false,
			stencil: false,
			powerPreference: 'low-power'
		});
		if (!gl) {
			throw new Error('WebGL2 unavailable');
		}
		if (!gl.getExtension('EXT_color_buffer_float')) {
			throw new Error('float render targets unavailable');
		}
		this.gl = gl;
		this.parallel = gl.getExtension('KHR_parallel_shader_compile');
		this.sim = createProgram(gl, VS, SIM_FS);
		this.display = createProgram(gl, VS, DISPLAY_FS);
		this.post = {
			trail: createProgram(gl, VS, TRAIL_FS),
			down: createProgram(gl, VS, DOWN_FS),
			blur: createProgram(gl, VS, BLUR_FS),
			final: createProgram(gl, VS, FINAL_FS)
		};
		this.cutProg = createProgram(gl, VS, CUT_FS);
		this.vao = gl.createVertexArray()!;
		this.cutout = new CutoutField(gl, this.cutProg, this.vao);
		this.lut = this.makeLut(paletteLut(this.params.palette));
		this.lut2 = this.makeLut(paletteLut(this.params.palette2));
		// transparent until the canvas fades in, so whatever is behind (e.g. a still poster) shows meanwhile
		canvas.style.opacity = '0';
		canvas.style.transition = 'opacity 0.8s ease';
		this.resizeObserver.observe(canvas);
		if (!this.parallel) {
			this.finishInit();
		}
	}

	private programs(): GLProgram[] {
		return [this.sim, this.display, this.cutProg, this.post.trail, this.post.down, this.post.blur, this.post.final];
	}

	/** true once every shader has finished compiling (never blocks when the extension exists) */
	private compiled(): boolean {
		if (!this.parallel) {
			return true;
		}
		return this.programs().every((prog) =>
			Boolean(this.gl.getProgramParameter(prog.p, this.parallel!.COMPLETION_STATUS_KHR))
		);
	}

	private finishInit(): void {
		if (this.ready) {
			return;
		}
		for (const prog of this.programs()) {
			if (!finishProgram(this.gl, prog, this.parallel !== null)) {
				return;
			}
		}
		this.ready = true;
		this.resize(true);
	}

	public async whenReady(): Promise<void> {
		// oxlint-disable-next-line promise/avoid-new
		await new Promise<void>((resolve, reject) => {
			const check = (): void => {
				try {
					if (!this.ready && this.compiled()) {
						this.finishInit();
					}
				} catch (error) {
					reject(error);
					return;
				}
				if (this.ready) {
					resolve();
				} else {
					setTimeout(check, 16);
				}
			};
			check();
		});
	}

	public finishWarmup(): void {
		while (this.warmLeft > 0) {
			this.step(WARM_DT);
			this.warmLeft -= WARM_DT;
		}
		this.step(1 / SIM_HZ);
	}

	public start(): void {
		if (!this.running) {
			this.running = true;
			this.last = performance.now();
			requestAnimationFrame(this.onFrame);
		}
	}

	public stop(): void {
		this.running = false;
	}

	public destroy(): void {
		this.stop();
		this.resizeObserver.disconnect();
		this.detachInput();
		this.audio?.stop();
		this.gl.getExtension('WEBGL_lose_context')?.loseContext();
	}

	public reset(): void {
		if (!this.ready) {
			return;
		}
		if (!this.revealed) {
			this.resize(true);
			return;
		}
		this.snapshot();
		this.resize(true);
		this.fade = { t: 0 };
	}

	public setParams(params: Partial<GongoizerParams>): void {
		const rebuild = 'simLines' in params && params.simLines !== this.params.simLines;
		const newPalette = 'palette' in params && params.palette !== this.params.palette;
		const newPalette2 = 'palette2' in params && params.palette2 !== this.params.palette2;
		Object.assign(this.params, params);
		if (newPalette) {
			this.gl.deleteTexture(this.lut);
			this.lut = this.makeLut(paletteLut(this.params.palette));
		}
		if (newPalette2) {
			this.gl.deleteTexture(this.lut2);
			this.lut2 = this.makeLut(paletteLut(this.params.palette2));
		}
		if (rebuild) {
			this.resize();
		}
	}

	public switchTo(params: Partial<GongoizerParams>): void {
		if (!this.ready || !this.revealed) {
			this.setParams(params);
			this.reset();
			return;
		}
		this.snapshot();
		this.setParams(params);
		this.resize(true);
		this.fade = { t: 0 };
	}

	public attachInput(target: Window = window): void {
		if (this.input) {
			return;
		}
		const toScreen = (event: MouseEvent): [number, number] => {
			const rect = this.canvas.getBoundingClientRect();
			return [(event.clientX - rect.left) / rect.height, (event.clientY - rect.top) / rect.height];
		};
		const move = (event: PointerEvent): void => {
			const [x, y] = toScreen(event);
			const now = performance.now() / 1000;
			const { pointer } = this;
			const dt = Math.max(now - pointer.t, 1 / 240);
			if (pointer.t && now - pointer.t < 0.2) {
				const k = Math.min(1, dt * 20);
				pointer.vx += ((x - pointer.x) / dt - pointer.vx) * k;
				pointer.vy += ((y - pointer.y) / dt - pointer.vy) * k;
				const speed = Math.hypot(pointer.vx, pointer.vy);
				if (speed > POINTER_MAX_SPEED) {
					pointer.vx *= POINTER_MAX_SPEED / speed;
					pointer.vy *= POINTER_MAX_SPEED / speed;
				}
			}
			pointer.x = x;
			pointer.y = y;
			pointer.t = now;
		};
		const down = (event: PointerEvent): void => {
			const [x, y] = toScreen(event);
			this.addBurst(x, y, 1);
		};
		const wheel = (event: WheelEvent): void => {
			const h = this.canvas.getBoundingClientRect().height || 1;
			const dy = (event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY) / h;
			this.push.y -= dy * 1.5;
			this.push.x -= ((event.deltaMode === 1 ? event.deltaX * 16 : event.deltaX) / h) * 1.5;
		};
		const leave = (): void => {
			this.pointer.x = -10;
			this.pointer.y = -10;
		};
		target.addEventListener('pointermove', move, { passive: true });
		target.addEventListener('pointerdown', down, { passive: true });
		target.addEventListener('wheel', wheel, { passive: true });
		document.documentElement.addEventListener('mouseleave', leave);
		this.input = { target, move, down, wheel, leave };
	}

	public detachInput(): void {
		const { input } = this;
		if (!input) {
			return;
		}
		input.target.removeEventListener('pointermove', input.move);
		input.target.removeEventListener('pointerdown', input.down);
		input.target.removeEventListener('wheel', input.wheel);
		document.documentElement.removeEventListener('mouseleave', input.leave);
		this.input = null;
	}

	public addBurst(x: number, y: number, strength: number): void {
		this.bursts.push({ x, y, age: 0, strength });
		if (this.bursts.length > MAX_BURSTS) {
			this.bursts.shift();
		}
	}

	public async enableAudio(stream: MediaStream, source: AudioSource = 'mic'): Promise<boolean> {
		this.disableAudio();
		const { startAudio } = await import('@/lib/gongoizer/audio.ts');
		this.audio = startAudio(stream, source);
		return true;
	}

	public disableAudio(): void {
		this.audio?.stop();
		this.audio = null;
		this.audioLevel = 0;
		this.audioBass = 0;
	}

	private updateInput(dt: number): void {
		const { pointer } = this;
		const decay = Math.exp(-dt * 6);
		pointer.vx *= decay;
		pointer.vy *= decay;
		const speed = Math.min(1, Math.hypot(pointer.vx, pointer.vy) / 1.5);
		pointer.activity +=
			(speed - pointer.activity) * (speed > pointer.activity ? Math.min(1, dt * 4) : Math.min(1, dt * 0.5));
		const pushDecay = Math.exp(-dt * 2.5);
		this.push.x *= pushDecay;
		this.push.y *= pushDecay;
		for (const burst of this.bursts) {
			burst.age += dt;
		}
		this.bursts = this.bursts.filter((burst) => burst.age < BURST_LIFETIME);
		if (this.audio?.ended) {
			this.disableAudio();
		}
		if (this.audio && this.params.reactive && this.params.audio > 0) {
			const a = this.audio.read();
			this.audioLevel += (a.level - this.audioLevel) * Math.min(1, dt * 10);
			this.audioBass += (a.bass - this.audioBass) * Math.min(1, dt * 12);
			if (a.beat) {
				const gain = audioGain(this.params.audio);
				this.addBurst(Math.random() * this.aspect, Math.random(), Math.min(3, 0.8 * gain));
				this.hueKick += Math.min(0.25, 0.06 * gain);
			}
		} else {
			this.audioLevel *= decay;
			this.audioBass *= decay;
		}
	}

	private makeLut(data: Uint8Array): WebGLTexture {
		const { gl } = this;
		const n = data.length / 3;
		const px = new Uint8Array(n * 4);
		for (let i = 0; i < n; i++) {
			px.set(data.subarray(i * 3, i * 3 + 3), i * 4);
			px[i * 4 + 3] = 255;
		}
		const tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, n, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return tex;
	}

	private resize(force = false): void {
		const { canvas } = this;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const { quality } = this;
		const clientW = Math.max(1, canvas.clientWidth);
		const clientH = Math.max(1, canvas.clientHeight);
		const w = Math.round(clientW * dpr);
		const h = Math.round(clientH * dpr);
		const scale = Math.min(1, Math.sqrt((this.maxPixels * quality * quality) / (w * h)));
		canvas.width = Math.round(w * scale);
		canvas.height = Math.round(h * scale);
		this.aspect = clientW / clientH;
		let simH = Math.round(this.params.simLines * quality * (1 + 2 * MARGIN));
		let simW = Math.max(16, Math.round((simH * (this.aspect + 2 * MARGIN)) / (1 + 2 * MARGIN)));
		const maxCells = (simH * simH * (16 / 9 + 2 * MARGIN)) / (1 + 2 * MARGIN);
		if (simW * simH > maxCells) {
			const k = Math.sqrt(maxCells / (simW * simH));
			simW = Math.max(16, Math.round(simW * k));
			simH = Math.max(16, Math.round(simH * k));
		}
		if (!force && this.state && Math.abs(simW - this.simW) / this.simW < 0.08 && simH === this.simH) {
			return;
		}
		const fresh = !this.state;
		const old =
			!force && this.state ? { state: this.state, w: this.simW, h: this.simH, aspect: this.simAspect } : null;
		if (this.state && !old) {
			for (const target of this.state) {
				deleteTarget(this.gl, target);
			}
		}
		this.simW = simW;
		this.simH = simH;
		this.simAspect = this.aspect;
		this.state = [makeFloatTarget(this.gl, simW, simH), makeFloatTarget(this.gl, simW, simH)];
		if (fresh) {
			this.simTime = 1000 + ((this.seed ?? Math.random() * 1000) % 1000);
			this.clock = this.simTime;
			this.clock0 = this.clock;
		}
		if (old) {
			this.step(0, 2, old);
			for (const target of old.state) {
				deleteTarget(this.gl, target);
			}
			this.step(1 / SIM_HZ);
			return;
		}
		this.step(0, 1);
		this.step(1 / SIM_HZ);
		this.warmLeft = WARMUP;
	}

	private warmFrame(frameDt: number): void {
		if (frameDt > 0.034) {
			this.warmSteps = Math.max(1, Math.floor(this.warmSteps * 0.6));
		} else if (frameDt < 0.022) {
			this.warmSteps = Math.min(48, this.warmSteps + 3);
		}
		for (let i = 0; i < this.warmSteps && this.warmLeft > 0; i++) {
			this.step(WARM_DT);
			this.warmLeft -= WARM_DT;
		}
		if (this.warmLeft <= 0) {
			this.step(1 / SIM_HZ);
		}
	}

	private effective(): GongoizerParams {
		return effectiveParams(this.params, {
			time: this.simTime,
			activity: this.pointer.activity,
			audioLevel: this.audioLevel,
			audioBass: this.audioBass
		});
	}

	private step(
		dt: number,
		init = 0,
		old: { state: StatePair; w: number; h: number; aspect: number } | null = null
	): void {
		const { gl, sim } = this;
		this.simTime += dt;
		const e = this.effective();
		this.cutout.update(e, this.simW, this.simH, this.aspect);
		this.fInj = e.speed / e.stripePeriod;
		const [src, dst] = this.state!;
		gl.useProgram(sim.p);
		gl.bindVertexArray(this.vao);
		uniformsFlow(
			gl,
			sim,
			e,
			{
				aspect: this.aspect,
				simW: this.simW,
				simH: this.simH,
				pointer: this.pointer,
				push: this.push,
				bursts: this.bursts
			},
			this.cutout.texture
		);
		gl.uniform1f(sim.u.uTime!, this.simTime);
		gl.uniform1f(sim.u.uDt!, dt);
		gl.uniform1f(sim.u.uDiffuse!, e.diffuse);
		gl.uniform1f(sim.u.uBurstKick!, 1.2);
		gl.uniform1i(sim.u.uInit!, Math.trunc(init));
		if (old) {
			gl.uniform3f(sim.u.uOldDomain!, old.aspect + 2 * MARGIN, 1 + 2 * MARGIN, MARGIN);
			gl.uniform2f(sim.u.uOldSize!, old.w, old.h);
		}
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, old ? old.state[0].tex : src.tex);
		gl.uniform1i(sim.u.uState!, 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
		gl.viewport(0, 0, this.simW, this.simH);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		this.state = [dst, src];
		this.lastDt = dt;
		if (init === 1) {
			this.phaseOffset = this.fInj * this.simTime;
		} else {
			this.phaseOffset += this.fInj * dt;
		}
	}

	/** RGBA8 colour targets for the post chain, (re)made when the canvas size changes. */
	private ensureTargets(): PostTargets {
		const { width: w, height: h } = this.canvas;
		const { targets: current } = this;
		if (current && current.w === w && current.h === h) {
			return current;
		}
		if (current) {
			for (const target of [current.scene, current.snap, ...current.out, ...current.q, ...current.mips.flat()]) {
				deleteTarget(this.gl, target);
			}
		}
		const qw = Math.max(1, Math.floor(w / 4));
		const qh = Math.max(1, Math.floor(h / 4));
		const pair = (shift: number): StatePair => [
			makeColorTarget(this.gl, Math.max(1, Math.floor(w / 2 ** shift)), Math.max(1, Math.floor(h / 2 ** shift))),
			makeColorTarget(this.gl, Math.max(1, Math.floor(w / 2 ** shift)), Math.max(1, Math.floor(h / 2 ** shift)))
		];
		this.targets = {
			w,
			h,
			cur: 0,
			scene: makeColorTarget(this.gl, w, h),
			snap: makeColorTarget(this.gl, w, h),
			out: [makeColorTarget(this.gl, w, h), makeColorTarget(this.gl, w, h)],
			q: [makeColorTarget(this.gl, qw, qh), makeColorTarget(this.gl, qw, qh)],
			mips: [pair(3), pair(4), pair(5)]
		};
		return this.targets;
	}

	private pass(
		prog: GLProgram,
		target: GLTarget | null,
		setup: (u: Record<string, WebGLUniformLocation | null>) => void
	): void {
		const { gl } = this;
		gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
		const w = target ? target.w : this.canvas.width;
		const h = target ? target.h : this.canvas.height;
		gl.viewport(0, 0, w, h);
		gl.useProgram(prog.p);
		gl.uniform2f(prog.u.uOut!, w, h);
		setup(prog.u);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	private bind(unit: number, tex: WebGLTexture, loc: WebGLUniformLocation | null): void {
		const { gl } = this;
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.uniform1i(loc, unit);
	}

	private render(out: GLTarget | null = null): void {
		const { gl, display } = this;
		const { params: p } = this;
		const [cur, prev] = this.state!;
		const alpha = Math.min(1, this.acc * SIM_HZ);
		const tDisplay = this.clock;
		const off = this.phaseOffset - this.fInj * this.lastDt * (1 - alpha);
		const post = p.glow > 0 || p.blur > 0 || p.trails > 0 || p.bloom > 0 || Boolean(out) || Boolean(this.fade);
		const targets = post ? this.ensureTargets() : null;
		gl.bindFramebuffer(gl.FRAMEBUFFER, post ? targets!.scene.fbo : null);
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.useProgram(display.p);
		gl.bindVertexArray(this.vao);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, prev.tex);
		gl.uniform1i(display.u.uPrev!, 0);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, cur.tex);
		gl.uniform1i(display.u.uCur!, 1);
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.lut);
		gl.uniform1i(display.u.uLut!, 2);
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, this.lut2);
		gl.uniform1i(display.u.uLut2!, 3);
		const morph =
			p.morphRate > 0 ? p.morph * (0.5 - 0.5 * Math.cos(2 * Math.PI * tDisplay * p.morphRate)) : p.morph;
		gl.uniform1f(display.u.uMorph!, morph);
		gl.uniform3f(display.u.uHueField!, p.hueSpreadX, p.hueSpreadY, p.stripeHue);
		gl.uniform2f(display.u.uSimSize!, this.simW, this.simH);
		gl.uniform1f(display.u.uAspect!, this.aspect);
		gl.uniform3f(display.u.uDomain!, this.aspect + 2 * MARGIN, 1 + 2 * MARGIN, MARGIN);
		gl.uniform2f(display.u.uCanvas!, this.canvas.width, this.canvas.height);
		gl.uniform1f(display.u.uAlpha!, alpha);
		gl.uniform1f(display.u.uPhaseOffset!, ((off % PHASE_WRAP) + PHASE_WRAP) % PHASE_WRAP);
		const hue = ((((tDisplay - this.clock0) * p.hueSpeed * 0.01 + p.hueOffset + this.hueKick) % 1) + 1) % 1;
		gl.uniform1f(display.u.uHue!, hue);
		gl.uniform1f(display.u.uGrain!, p.grain);
		gl.uniform1f(display.u.uFrame!, this.frame++ % 1000);
		gl.uniform1f(display.u.uPosterize!, p.posterize);
		gl.uniform1f(display.u.uMosaic!, p.mosaic);
		gl.uniform1f(display.u.uNegative!, p.negative);
		gl.uniform1f(display.u.uChroma!, p.chroma);
		gl.uniform1f(display.u.uScan!, p.scan);
		gl.uniform1f(display.u.uCurve!, p.curve);
		gl.uniform1f(display.u.uVignette!, p.vignette);
		gl.uniform1f(display.u.uPalReps!, Math.max(1, Math.round(p.palReps)));
		gl.uniform1i(display.u.uMirror!, Math.trunc(p.mirror));
		gl.uniform1f(display.u.uContour!, p.contour);
		gl.uniform1f(display.u.uHaze!, p.haze);
		gl.uniform1f(display.u.uTimeD!, tDisplay % 1000);
		gl.uniform1f(display.u.uCutShow!, p.cutoutShow);
		uniformsCut(gl, display.u, p, this.aspect);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		if (post) {
			this.postChain(targets!, p, out);
		}
	}

	private snapshot(): void {
		const targets = this.ensureTargets();
		this.render(targets.snap);
	}

	private showSnapshot(): void {
		const targets = this.ensureTargets();
		this.pass(this.post.final, null, (u) => {
			this.bind(0, targets.snap.tex, u.uSrc!);
			this.bind(5, targets.snap.tex, u.uSnap!);
			this.gl.uniform1f(u.uHasBl!, 0);
			this.gl.uniform1f(u.uSnapMix!, 1);
		});
	}

	private postChain(targets: PostTargets, p: GongoizerParams, out: GLTarget | null = null): void {
		const { post } = this;
		let src = targets.scene;
		if (p.trails > 0) {
			const prevOut = targets.out[targets.cur]!;
			const next = targets.out[1 - targets.cur]!;
			this.pass(post.trail, next, (u) => {
				this.bind(0, src.tex, u.uCur!);
				this.bind(1, prevOut.tex, u.uPrev!);
				this.gl.uniform1f(u.uTrail!, Math.min(p.trails, 0.985));
			});
			targets.cur = 1 - targets.cur;
			src = next;
		}
		const needBlur = p.glow > 0 || p.blur > 0 || p.bloom > 0;
		const blurPair = (pair: StatePair, k: number): void => {
			const [a, b] = pair;
			this.pass(post.blur, b, (u) => {
				this.bind(0, a.tex, u.uTex!);
				this.gl.uniform2f(u.uDir!, k / a.w, 0);
			});
			this.pass(post.blur, a, (u) => {
				this.bind(0, b.tex, u.uTex!);
				this.gl.uniform2f(u.uDir!, 0, k / a.h);
			});
		};
		const down = (from: GLTarget, to: GLTarget): void =>
			this.pass(post.down, to, (u) => {
				this.bind(0, from.tex, u.uTex!);
				this.gl.uniform2f(u.uSrcTexel!, 1 / from.w, 1 / from.h);
			});
		if (needBlur) {
			const r = Math.max(0.25, p.glowRadius);
			down(src, targets.q[0]);
			for (let i = 0; i < 2; i++) {
				blurPair(targets.q, r * (i + 1));
			}
			if (p.bloom > 0) {
				let [prev] = targets.q;
				for (const mips of targets.mips) {
					const [head] = mips;
					down(prev, head);
					blurPair(mips, 1.5);
					prev = head;
				}
			}
		}
		const pulse =
			1 +
			p.glowPulse * Math.sin(2 * Math.PI * this.clock * p.glowPulseRate) +
			(p.reactive ? Math.min(3, audioGain(p.audio) * 1.5 * this.audioLevel) : 0);
		const mix = this.fade && !out ? Math.min(1, this.fade.t / FADE_TIME) : 1;
		this.pass(post.final, out, (u) => {
			this.bind(0, src.tex, u.uSrc!);
			// (never sample the snapshot while writing into it)
			this.bind(5, out === targets.snap ? src.tex : targets.snap.tex, u.uSnap!);
			this.gl.uniform1f(u.uSnapMix!, mix * mix * (3 - 2 * mix));
			this.bind(1, targets.q[0].tex, u.uBl!);
			this.bind(2, targets.mips[0][0].tex, u.uM1!);
			this.bind(3, targets.mips[1][0].tex, u.uM2!);
			this.bind(4, targets.mips[2][0].tex, u.uM3!);
			this.gl.uniform1f(u.uGlow!, p.glow * pulse);
			this.gl.uniform1f(u.uBloom!, p.bloom * pulse);
			this.gl.uniform1f(u.uThresh!, p.glowThreshold);
			this.gl.uniform1f(u.uBlur!, p.blur);
			this.gl.uniform1f(u.uHasBl!, needBlur ? 1 : 0);
		});
	}

	/**
	 * Adaptive quality: when frames run well below the device's normal rate for a while, lower the
	 * simulation grid and output resolution a step; after a long smooth stretch, try a step back up.
	 * "Normal rate" is the fastest recent frame, so 30 Hz-capped displays aren't seen as struggling,
	 * and anything running at 50+ fps is left alone.
	 */
	private adapt(frameDt: number): void {
		const { perf } = this;
		if (!this.params.adaptive || frameDt <= 0 || frameDt > 0.5) {
			return;
		}
		perf.cool -= frameDt;
		perf.ema = perf.ema ? perf.ema * 0.93 + frameDt * 0.07 : frameDt;
		perf.min = Math.min(perf.min, frameDt) + 0.0004 * frameDt;
		const ratio = perf.ema / Math.max(perf.min, 1 / 240);
		perf.slow = ratio > 1.35 && perf.ema > 1 / 50 ? perf.slow + frameDt : 0;
		perf.fast = ratio < 1.12 || perf.ema < 1 / 58 ? perf.fast + frameDt : 0;
		if (perf.cool > 0) {
			return;
		}
		if (perf.slow > ADAPT_SLOW_TIME && this.qIndex < QUALITY.length - 1) {
			this.setQuality(this.qIndex + 1, 12);
		} else if (perf.fast > ADAPT_FAST_TIME && this.qIndex > 0) {
			this.setQuality(this.qIndex - 1, 4);
		}
	}

	private setQuality(index: number, cooldown: number): void {
		this.qIndex = index;
		this.quality = QUALITY[index]!;
		Object.assign(this.perf, { slow: 0, fast: 0, ema: 0, cool: cooldown });
		this.resize();
	}

	private readonly onFrame = (now: number): void => {
		if (!this.running) {
			return;
		}
		const frameDt = (now - this.last) / 1000;
		const real = Math.min(frameDt, 0.1);
		const dt = real * this.params.timeScale;
		this.last = now;
		if (!this.ready) {
			try {
				if (this.compiled()) {
					this.finishInit();
				}
			} catch (error) {
				this.running = false;
				if (this.onError) {
					this.onError(error);
				} else {
					console.error(error);
				}
				return;
			}
			requestAnimationFrame(this.onFrame);
			return;
		}
		this.clock += dt;
		if (this.warmLeft > 0) {
			this.warmFrame(frameDt);
			if (this.fade) {
				this.showSnapshot();
			} else if (this.revealed) {
				this.render();
			} else if (this.warmLeft <= 0) {
				this.render();
				this.canvas.style.opacity = '1';
				this.revealed = true;
			}
			requestAnimationFrame(this.onFrame);
			return;
		}
		if (this.fade && (this.fade.t += real) >= FADE_TIME) {
			this.fade = null;
		} else if (!this.fade) {
			this.adapt(frameDt);
		}
		this.updateInput(real);
		this.acc += dt;
		const step = 1 / SIM_HZ;
		let n = 0;
		while (this.acc >= step && n < 3) {
			this.step(step);
			this.acc -= step;
			n++;
		}
		if (n === 3) {
			this.acc = 0;
		}
		const hold = this.params.strobe > 0 ? 1 / this.params.strobe : 0;
		if (!hold || now / 1000 - this.lastShown >= hold) {
			this.render();
			this.lastShown = now / 1000;
		}
		requestAnimationFrame(this.onFrame);
	};
}
