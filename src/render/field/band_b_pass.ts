// K1040 S4a: the band pass - form B's foot term (band_b_glsl.ts) on the GPU.
//
// No target of its own: draw() renders into whatever framebuffer the caller
// has bound, at the caller's viewport, with MAX blending (the frame's own
// pass in the app; the probe's canvas). A full-size target costs the Pixel
// about 1.5 ms to bind before it draws anything (K1040 S3f2's split, and
// none of S3f5's attachment variants lowered it), so a band with its own
// pass would pay that again. It reads the label pass's L (R32UI, the same
// size as the viewport) and its own copies of label_b's PTS, CHAIN and SPAN
// beside band_b.ts's tables.
//
// State: draw() sets what it uses (program, VAO, its texture units 0-10,
// blend MAX on, depth/scissor/cull off) and leaves blend off, the equation
// FUNC_ADD and the VAO unbound; the caller owns the rest, as with the label
// pass's no-host mode. Nothing in the app constructs it (the probe's switch).

import type { LabelBTables } from "./label_b";
import { TEX_W } from "./label_b";
import type { Affine } from "./label_b_pass";
import type { BandBTables } from "./band_b";
import { bandBSources, type BandBSources } from "./band_b_glsl";

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const mk = (type: number, src: string): WebGLShader => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`band_b shader: ${gl.getShaderInfoLog(sh)}`);
    return sh;
  };
  const pr = gl.createProgram()!;
  const v = mk(gl.VERTEX_SHADER, vs);
  const f = mk(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(pr, v);
  gl.attachShader(pr, f);
  gl.bindAttribLocation(pr, 0, "aInst");
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(`band_b link: ${gl.getProgramInfoLog(pr)}`);
  gl.deleteShader(v);
  gl.deleteShader(f);
  return pr;
}

const TABS = ["uPts", "uChain", "uSpan", "uNb2", "uArm", "uCarm", "uAix", "uGrp", "uGw", "uCrn"] as const;
const UNIS = ["uM0", "uM1", "uI0", "uI1", "uView", "uH", "uW", "uAa", "uSig", "uLam", "uDel", "uR", "uPad", "uLabel", "uInvK", "uCell"] as const;

export class BandBPass {
  readonly gl: WebGL2RenderingContext;
  private pr: WebGLProgram;
  /** K1040 S4b: the corner quads' program (band_b_glsl.ts CORNER_*). */
  private prC: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private vaoC: WebGLVertexArrayObject;
  private ibuf: WebGLBuffer;
  private tex: WebGLTexture[] = [];
  private loc: (WebGLUniformLocation | null)[];
  private locC: (WebGLUniformLocation | null)[];
  private nInst = 0;
  private B: BandBTables | null = null;
  /** K1040 S4b: off draws the strips only (S4a2's band, for A/Bs). */
  corners = true;

  constructor(gl: WebGL2RenderingContext, src: BandBSources = bandBSources()) {
    this.gl = gl;
    this.pr = compile(gl, src.vs, src.fs);
    this.prC = compile(gl, src.cornerVs, src.cornerFs);
    this.loc = UNIS.map((n) => gl.getUniformLocation(this.pr, n));
    this.locC = UNIS.map((n) => gl.getUniformLocation(this.prC, n));
    for (const [pr, L] of [
      [this.pr, this.loc],
      [this.prC, this.locC],
    ] as const) {
      gl.useProgram(pr);
      TABS.forEach((n, i) => gl.uniform1i(gl.getUniformLocation(pr, n), i));
      gl.uniform1i(L[13], TABS.length);
    }
    this.vaoC = gl.createVertexArray()!;
    this.vao = gl.createVertexArray()!;
    this.ibuf = gl.createBuffer()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ibuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
    gl.vertexAttribDivisor(0, 1);
    gl.bindVertexArray(null);
    for (let i = 0; i < TABS.length; i++) this.tex.push(gl.createTexture()!);
  }

  private table(i: number, data: Float32Array, rows: number): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, this.tex[i]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, TEX_W, rows, 0, gl.RGBA, gl.FLOAT, data.subarray(0, TEX_W * rows * 4));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  upload(T: LabelBTables, B: BandBTables): void {
    const gl = this.gl;
    this.table(0, T.pts, T.ptsRows);
    this.table(1, T.chain, T.chainRows);
    this.table(2, T.span, T.spanRows);
    this.table(3, B.nb2, B.nb2Rows);
    this.table(4, B.arm, B.armRows);
    this.table(5, B.carm, B.carmRows);
    this.table(6, B.aix, B.aixRows);
    this.table(7, B.grp, B.grpRows);
    this.table(8, B.gw, B.gwRows);
    this.table(9, B.crn, B.crnRows);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ibuf);
    gl.bufferData(gl.ARRAY_BUFFER, B.inst.subarray(0, B.nInst * 3), gl.STATIC_DRAW);
    this.nInst = B.nInst;
    this.B = B;
  }

  /** Draws the band for camera M into the bound framebuffer (viewport w x h, the label's size). */
  draw(M: Affine, label: WebGLTexture, w: number, h: number): void {
    const gl = this.gl;
    const B = this.B;
    if (!B || this.nInst === 0) return;
    const [a, b, c, d, e, f] = M;
    const det = a * d - b * c;
    const ia = d / det;
    const ib = -b / det;
    const ic = -c / det;
    const id = a / det;
    const ie = -(ia * e + ic * f);
    const iff = -(ib * e + id * f);
    const ppd = Math.sqrt(Math.abs(det));
    const unis = (L: (WebGLUniformLocation | null)[]) => {
      gl.uniform4f(L[0], a, b, c, d);
      gl.uniform2f(L[1], e, f);
      gl.uniform4f(L[2], ia, ib, ic, id);
      gl.uniform2f(L[3], ie, iff);
      gl.uniform2f(L[4], w, h);
      gl.uniform1f(L[5], B.h);
      gl.uniform1f(L[6], B.W);
      gl.uniform1f(L[7], B.aa);
      gl.uniform1f(L[8], B.sigma);
      gl.uniform1f(L[9], B.lambda);
      gl.uniform1f(L[10], B.delta);
      gl.uniform1f(L[11], B.R);
      gl.uniform1f(L[12], 2 / Math.max(ppd, 1e-9));
      gl.uniform1f(L[14], B.invK);
      gl.uniform1f(L[15], B.cell);
    };
    gl.useProgram(this.pr);
    unis(this.loc);
    for (let i = 0; i < TABS.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.tex[i]);
    }
    gl.activeTexture(gl.TEXTURE0 + TABS.length);
    gl.bindTexture(gl.TEXTURE_2D, label);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.MAX);
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.nInst);
    if (this.corners && B.nCorners > 0) {
      // K1040 S4b: the corner terms, one quad per corner.
      gl.useProgram(this.prC);
      unis(this.locC);
      gl.bindVertexArray(this.vaoC);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, B.nCorners);
    }
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
  }

  dispose(): void {
    const gl = this.gl;
    for (const t of this.tex) gl.deleteTexture(t);
    gl.deleteBuffer(this.ibuf);
    gl.deleteVertexArray(this.vao);
    gl.deleteVertexArray(this.vaoC);
    gl.deleteProgram(this.prC);
    gl.deleteProgram(this.pr);
  }
}
