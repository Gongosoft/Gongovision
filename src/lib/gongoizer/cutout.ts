import { MARGIN, uniformsCut } from '@/lib/gongoizer/uniforms.ts';
import { deleteTarget, makeHalfTarget } from '@/lib/gongoizer/gl.ts';
import type { GLProgram, GLTarget, GongoizerParams } from '@/types/gongoizer.d.ts';

export class CutoutField {
	private readonly gl: WebGL2RenderingContext;
	private readonly prog: GLProgram;
	private readonly vao: WebGLVertexArrayObject;
	private target: GLTarget | null = null;
	private key = '';

	public constructor(gl: WebGL2RenderingContext, prog: GLProgram, vao: WebGLVertexArrayObject) {
		this.gl = gl;
		this.prog = prog;
		this.vao = vao;
	}

	public get texture(): GLTarget | null {
		return this.target;
	}

	/** Re-bake when the shape, its settings or the grid change. */
	public update(params: GongoizerParams, simW: number, simH: number, aspect: number): void {
		if (!(params.cutout > 0)) {
			return;
		}
		const key = [
			params.cutout,
			params.cutoutSize,
			params.cutoutStretch,
			params.cutoutRotate,
			params.cutoutX,
			params.cutoutY,
			aspect,
			simW,
			simH
		].join(',');
		if (key === this.key) {
			return;
		}
		const { gl } = this;
		if (!this.target || this.target.w !== simW || this.target.h !== simH) {
			if (this.target) {
				deleteTarget(gl, this.target);
			}
			this.target = makeHalfTarget(gl, simW, simH);
		}
		const { u } = this.prog;
		gl.useProgram(this.prog.p);
		gl.bindVertexArray(this.vao);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.target.fbo);
		gl.viewport(0, 0, simW, simH);
		gl.uniform2f(u.uSimSize!, simW, simH);
		gl.uniform3f(u.uDomain!, aspect + 2 * MARGIN, 1 + 2 * MARGIN, MARGIN);
		uniformsCut(gl, u, params, aspect);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		this.key = key;
	}
}
