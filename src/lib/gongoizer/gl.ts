import type { GLProgram, GLTarget } from '@/types/gongoizer.d.ts';

function setTextureParams(gl: WebGL2RenderingContext, filter: GLenum): void {
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function makeTarget(
	gl: WebGL2RenderingContext,
	w: number,
	h: number,
	internal: GLenum,
	format: GLenum,
	type: GLenum,
	filter: GLenum
): GLTarget {
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
	setTextureParams(gl, filter);
	const fbo = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
	return { tex, fbo, w, h };
}

/** R32F simulation target, sampled with nearest (the phase is interpolated by hand). */
export function makeFloatTarget(gl: WebGL2RenderingContext, w: number, h: number): GLTarget {
	return makeTarget(gl, w, h, gl.R32F, gl.RED, gl.FLOAT, gl.NEAREST);
}

/** RGBA16F target, used for the baked cutout distance field. */
export function makeHalfTarget(gl: WebGL2RenderingContext, w: number, h: number): GLTarget {
	return makeTarget(gl, w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR);
}

/** RGBA8 colour target for the post chain. */
export function makeColorTarget(gl: WebGL2RenderingContext, w: number, h: number): GLTarget {
	return makeTarget(gl, w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
}

export function deleteTarget(gl: WebGL2RenderingContext, target: GLTarget): void {
	gl.deleteTexture(target.tex);
	gl.deleteFramebuffer(target.fbo);
}

export function createProgram(gl: WebGL2RenderingContext, vertexSrc: string, fragmentSrc: string): GLProgram {
	const p = gl.createProgram();
	const vsh = gl.createShader(gl.VERTEX_SHADER)!;
	const fsh = gl.createShader(gl.FRAGMENT_SHADER)!;
	gl.shaderSource(vsh, vertexSrc);
	gl.compileShader(vsh);
	gl.shaderSource(fsh, fragmentSrc);
	gl.compileShader(fsh);
	gl.attachShader(p, vsh);
	gl.attachShader(p, fsh);
	gl.linkProgram(p);
	return { p, vsh, fsh, u: {} };
}

export function finishProgram(gl: WebGL2RenderingContext, prog: GLProgram, allowPending = false): boolean {
	if (!gl.getProgramParameter(prog.p, gl.LINK_STATUS)) {
		const log = gl.getShaderInfoLog(prog.fsh) || gl.getShaderInfoLog(prog.vsh) || gl.getProgramInfoLog(prog.p);
		if (!log && allowPending && !gl.isContextLost()) {
			return false;
		}
		throw new Error(log || (gl.isContextLost() ? 'WebGL context lost' : 'shader link failed'));
	}
	const count = gl.getProgramParameter(prog.p, gl.ACTIVE_UNIFORMS) as number;
	for (let i = 0; i < count; i++) {
		const info = gl.getActiveUniform(prog.p, i);
		if (info) {
			prog.u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(prog.p, info.name);
		}
	}
	return true;
}
