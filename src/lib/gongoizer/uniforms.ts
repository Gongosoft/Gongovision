import type { GLProgram, GLTarget, GongoizerParams } from '@/types/gongoizer.d.ts';

/** simulate this far (in H) past each screen edge so edge effects stay off-screen */
export const MARGIN = 0.1;

export interface Burst {
	x: number;
	y: number;
	age: number;
	strength: number;
}

/** The engine-owned state the flow uniforms read. */
export interface UniformState {
	aspect: number;
	simW: number;
	simH: number;
	pointer: { x: number; y: number; vx: number; vy: number };
	push: { x: number; y: number };
	bursts: readonly Burst[];
}

export interface Modulation {
	/** simulation time, for the slow drift */
	time: number;
	/** pointer activity 0..1 */
	activity: number;
	audioLevel: number;
	audioBass: number;
}

/** Audio slider response: gentle at 1, about three times stronger at the max (3). */
export function audioGain(a: number): number {
	return a * (1 + 2 * (a / 3) ** 2);
}

/** Slow, smooth wander in [-1, 1] (three incommensurate sines per channel). */
function lfo(rate: number, channel: number, t: number): number {
	return (
		(Math.sin(t * rate * 0.071 + channel * 1.7) +
			Math.sin(t * rate * 0.0313 + channel * 4.1) * 0.7 +
			Math.sin(t * rate * 0.0177 + channel * 2.3) * 0.5) /
		2.2
	);
}

/** Params with the slow "vary" drift and the reactive/audio modulation applied. */
export function effectiveParams(params: GongoizerParams, mod: Modulation): GongoizerParams {
	const { vary, varyRate } = params;
	const e: GongoizerParams = { ...params };
	if (vary) {
		const shift = 0.08 * vary * lfo(varyRate, 3, mod.time);
		e.tiltGain *= 1 + 0.35 * vary * lfo(varyRate, 0, mod.time);
		e.accel *= 1 + 0.3 * vary * lfo(varyRate, 1, mod.time);
		e.transAmp *= 1 + 0.4 * vary * lfo(varyRate, 2, mod.time);
		e.longAmp *= 1 + 0.4 * vary * lfo(varyRate, 4, mod.time);
		e.ampFrom += shift;
		e.ampTo += shift;
	}
	if (params.reactive) {
		const gain = audioGain(params.audio);
		const boost = Math.min(6, 1 + params.energy * 2 * mod.activity + gain * 2.5 * mod.audioBass);
		e.transAmp *= boost;
		e.longAmp *= boost;
		e.speed *= Math.min(4, 1 + gain * 1.2 * mod.audioLevel);
	}
	return e;
}

export function uniformsCut(
	gl: WebGL2RenderingContext,
	u: Record<string, WebGLUniformLocation | null>,
	params: GongoizerParams,
	aspect: number
): void {
	const mode = Math.trunc(params.cutoutMode);
	gl.uniform1i(u.uCutShape!, Math.trunc(params.cutout));
	gl.uniform4f(u.uCut!, aspect / 2 + params.cutoutX, 0.5 + params.cutoutY, params.cutoutSize, params.cutoutStretch);
	gl.uniform4f(
		u.uCutB!,
		(params.cutoutRotate * Math.PI) / 180,
		params.cutoutSoft,
		mode % 2 ? 1 : 0,
		mode >= 2 ? 1 : 0
	);
}

/** Every uniform the simulation shader needs, including the cutout field it samples. */
export function uniformsFlow(
	gl: WebGL2RenderingContext,
	prog: GLProgram,
	params: GongoizerParams,
	state: UniformState,
	cut: GLTarget | null
): void {
	const { u } = prog;
	const radial = params.flowMode > 0;
	const angle = (params.flowAngle * Math.PI) / 180;
	const fx = Math.cos(angle);
	const fy = Math.sin(angle);
	// straight mode: birth edge passes through the screen corner that's furthest upstream
	const ox = fx < -1e-3 ? state.aspect : 0;
	const oy = fy < -1e-3 ? 1 : 0;
	const cx = state.aspect / 2;
	const cy = 0.5;
	const r0 = params.flowMode === 2 ? Math.hypot(cx, cy) + MARGIN + params.r0 : params.r0;
	// radial: whole numbers of stripes/waves/lean per turn so the seam disappears
	const kc = params.tilt / params.stripePeriod;
	gl.uniform2f(u.uSimSize!, state.simW, state.simH);
	gl.uniform1f(u.uAspect!, state.aspect);
	gl.uniform3f(u.uDomain!, state.aspect + 2 * MARGIN, 1 + 2 * MARGIN, MARGIN);
	gl.uniform1i(u.uMode!, Math.trunc(params.flowMode));
	gl.uniform2f(u.uFlow!, fx, fy);
	gl.uniform2f(u.uOrigin!, ox, oy);
	gl.uniform2f(u.uCenter!, cx, cy);
	gl.uniform1f(u.uR0!, r0);
	gl.uniform1f(u.uSpeed!, params.speed);
	gl.uniform1f(u.uFInj!, params.speed / params.stripePeriod);
	gl.uniform1f(u.uKc!, radial ? Math.round(kc) : kc);
	gl.uniform1f(u.uSwirl!, params.swirl);
	gl.uniform3f(u.uWob!, params.wobAmp, params.wobScale, params.wobRate);
	gl.uniform4f(u.uAmp!, params.ampStart, params.ampEnd, params.ampFrom, params.ampTo);
	gl.uniform4f(u.uNoise!, params.longAmp, params.transAmp, params.noiseScale, params.noiseRate);
	gl.uniform1f(u.uStretch!, params.noiseStretch);
	gl.uniform1f(u.uCrossDrift!, params.crossDrift);
	gl.uniform1f(u.uAccel!, params.accel);
	gl.uniform1f(u.uShear!, params.shear);
	gl.uniform1f(u.uSplitVar!, params.splitVar);
	// radial modes get their spirals from shear instead (a phase lean would leave a seam)
	gl.uniform1f(u.uTiltGain!, radial ? 0 : params.tiltGain);
	gl.uniform1f(u.uRowVar!, params.rowVar);
	gl.uniform1f(u.uRowScale!, params.rowScale);
	// lean is measured from the middle of the birth edge so neither side gets an outsized gradient
	const crossLen = Math.abs(fx) + Math.abs(fy) * state.aspect;
	gl.uniform1f(u.uCrossMid!, radial ? 0 : 0.5 * crossLen);
	const waveFreq = radial ? Math.round(params.waveFreq) : params.waveFreq;
	gl.uniform4f(u.uWave!, params.waveAmp, waveFreq, params.waveDrift * waveFreq, params.waveWarp);
	gl.uniform1f(u.uWaveSharp!, params.waveSharp);
	const reactive = params.reactive ? 1 : 0;
	const { pointer } = state;
	gl.uniform4f(u.uPointer!, pointer.x, pointer.y, pointer.vx, pointer.vy);
	gl.uniform4f(u.uReact!, reactive * params.stir, params.stirRadius, reactive * params.magnet, params.magnetRadius);
	gl.uniform2f(u.uPush!, reactive * params.wheel * state.push.x, reactive * params.wheel * state.push.y);
	const burstData = new Float32Array(16);
	if (reactive) {
		for (const [i, burst] of state.bursts.entries()) {
			burstData.set(
				[burst.x, burst.y, burst.age, burst.strength * Math.max(params.burst, params.audio ? 0.8 : 0)],
				i * 4
			);
		}
	}
	gl.uniform4fv(u.uBursts!, burstData);
	gl.uniform1i(u.uN2!, 2);
	gl.uniform1i(u.uN4!, 4);
	gl.uniform1i(u.uN5!, 5);
	gl.uniform1i(u.uNBursts!, reactive ? state.bursts.length : 0);
	uniformsCut(gl, u, params, state.aspect);
	gl.uniform1f(u.uCutPush!, params.cutout && params.cutoutMode % 2 ? params.cutoutPush : 0);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, cut ? cut.tex : null);
	gl.uniform1i(u.uCutTex!, 1);
}
