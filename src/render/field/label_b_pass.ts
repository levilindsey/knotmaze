// K1040 S3: the label pass's GL side - form B's top surface per pixel.
//
// Targets (this pass's own framebuffer, sized by resize()):
//   L  R32UI, the packed word (label_b.ts header), 0 = paper
//   D  DEPTH_COMPONENT32F texture, sampleable: 0.5 - key * keyScale (1 = paper)
//   G  debug only: RGBA32F (key, s, d, fill) for the probes' verdicts
// Draws: the capsules (one instance per segment, static: the instance buffer
// is rebuilt only when label_b's layout key changes, K985) and the corner
// fills, depth-tested LESS on the cone key. The caller's GL state is saved
// and restored around draw(). Timer queries (EXT_disjoint_timer_query_webgl2)
// bracket the two draws when the extension exists.

import type { LabelBTables } from "./label_b";
import { TEX_W } from "./label_b";
import { labelBSources } from "./label_b_glsl";

/** World -> device px: u = a x + c y + e, v = b x + d y + f (FieldScene's worldToCss times dpr). */
export type Affine = [number, number, number, number, number, number];

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const mk = (type: number, src: string) => {
    const sh = gl.createShader(type) as WebGLShader;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`label_b shader: ${gl.getShaderInfoLog(sh)}`);
    return sh;
  };
  const pr = gl.createProgram() as WebGLProgram;
  gl.attachShader(pr, mk(gl.VERTEX_SHADER, vs));
  gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(pr, 0, "aSeg");
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(`label_b link: ${gl.getProgramInfoLog(pr)}`);
  return pr;
}

interface Tex {
  tex: WebGLTexture;
  rows: number;
}

export class LabelBPass {
  readonly gl: WebGL2RenderingContext;
  readonly debug: boolean;
  private capsule: WebGLProgram;
  private fillPr: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private instBuf: WebGLBuffer;
  private layoutKey = "";
  private nInst = 0;
  private nFills = 0;
  private fbo: WebGLFramebuffer;
  private L: WebGLTexture | null = null;
  private D: WebGLTexture | null = null;
  private G: WebGLTexture | null = null;
  private tabs: Record<"pts" | "chain" | "span" | "fill" | "nb", Tex>;
  private h = 0;
  private invK = 0;
  private keyScale = 1;
  private foldR = 0;
  width = 0;
  height = 0;
  /** Instance rebuilds so far (K985: only on a segment-count change). */
  instanceBuilds = 0;
  private tq: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
  private pending: WebGLQuery[] = [];
  /** GPU times (ms) of finished draws, oldest first. */
  readonly times: number[] = [];

  constructor(gl: WebGL2RenderingContext, debug = false) {
    this.gl = gl;
    this.debug = debug;
    if (debug && !gl.getExtension("EXT_color_buffer_float")) throw new Error("label_b debug: no EXT_color_buffer_float");
    const src = labelBSources(debug);
    this.capsule = compile(gl, src.capsuleVs, src.capsuleFs);
    this.fillPr = compile(gl, src.fillVs, src.fillFs);
    this.vao = gl.createVertexArray() as WebGLVertexArrayObject;
    this.instBuf = gl.createBuffer() as WebGLBuffer;
    this.fbo = gl.createFramebuffer() as WebGLFramebuffer;
    const mkTab = (): Tex => ({ tex: gl.createTexture() as WebGLTexture, rows: 0 });
    this.tabs = { pts: mkTab(), chain: mkTab(), span: mkTab(), fill: mkTab(), nb: mkTab() };
    this.tq = gl.getExtension("EXT_disjoint_timer_query_webgl2");
  }

  private target(internal: number, format: number, type: number): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture() as WebGLTexture;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, this.width, this.height, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  resize(w: number, h: number): void {
    if (w === this.width && h === this.height) return;
    const gl = this.gl;
    const prevTex = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const prevFb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    for (const t of [this.L, this.D, this.G]) if (t) gl.deleteTexture(t);
    this.width = w;
    this.height = h;
    this.L = this.target(gl.R32UI, gl.RED_INTEGER, gl.UNSIGNED_INT);
    this.D = this.target(gl.DEPTH_COMPONENT32F, gl.DEPTH_COMPONENT, gl.FLOAT);
    this.G = this.debug ? this.target(gl.RGBA32F, gl.RGBA, gl.FLOAT) : null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.L, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.D, 0);
    if (this.G) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.G, 0);
    gl.drawBuffers(this.G ? [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1] : [gl.COLOR_ATTACHMENT0]);
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, prevFb);
    gl.bindTexture(gl.TEXTURE_2D, prevTex);
    if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`label_b framebuffer incomplete: 0x${st.toString(16)}`);
  }

  get label(): WebGLTexture | null {
    return this.L;
  }

  get depth(): WebGLTexture | null {
    return this.D;
  }

  private uploadTab(t: Tex, data: Float32Array, rows: number): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    if (t.rows !== rows) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, TEX_W, rows, 0, gl.RGBA, gl.FLOAT, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      t.rows = rows;
    } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TEX_W, rows, gl.RGBA, gl.FLOAT, data);
  }

  /** Uploads a frame's tables; rebuilds the instances only on a layout change (K985). */
  upload(T: LabelBTables): void {
    const gl = this.gl;
    const prevTex = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const prevBuf = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
    const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    this.uploadTab(this.tabs.pts, T.pts, T.ptsRows);
    this.uploadTab(this.tabs.chain, T.chain, T.chainRows);
    this.uploadTab(this.tabs.span, T.span, T.spanRows);
    this.uploadTab(this.tabs.fill, T.fill, T.fillRows);
    this.uploadTab(this.tabs.nb, T.nb, T.ptsRows);
    if (T.layoutKey !== this.layoutKey) {
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
      gl.bufferData(gl.ARRAY_BUFFER, T.inst, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(0, 1);
      this.layoutKey = T.layoutKey;
      this.nInst = T.nInst;
      this.instanceBuilds++;
    }
    this.nFills = T.nFills;
    this.h = T.h;
    this.invK = T.invK;
    this.keyScale = T.keyScale;
    this.foldR = T.foldR;
    gl.bindVertexArray(prevVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, prevBuf);
    gl.bindTexture(gl.TEXTURE_2D, prevTex);
  }

  private uniforms(pr: WebGLProgram, M: Affine, pad: number): void {
    const gl = this.gl;
    const [a, b, c, d, e, f] = M;
    const det = a * d - b * c;
    // Inverse: x = (d (u - e) - c (v - f)) / det, y = (-b (u - e) + a (v - f)) / det.
    const ia = d / det;
    const ib = -b / det;
    const ic = -c / det;
    const id = a / det;
    const ie = -(ia * e + ic * f);
    const iff = -(ib * e + id * f);
    const u = (n: string) => gl.getUniformLocation(pr, n);
    gl.uniform4f(u("uM0"), a, b, c, d);
    gl.uniform2f(u("uM1"), e, f);
    gl.uniform4f(u("uI0"), ia, ib, ic, id);
    gl.uniform2f(u("uI1"), ie, iff);
    gl.uniform2f(u("uView"), this.width, this.height);
    gl.uniform1f(u("uH"), this.h);
    gl.uniform1f(u("uInvK"), this.invK);
    gl.uniform1f(u("uKeyScale"), this.keyScale);
    gl.uniform1f(u("uPad"), pad);
    gl.uniform1f(u("uFold"), this.foldR);
    const names = ["uPts", "uChain", "uSpan", "uFill", "uNb"] as const;
    const keys = ["pts", "chain", "span", "fill", "nb"] as const;
    names.forEach((n, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.tabs[keys[i]].tex);
      gl.uniform1i(u(n), i);
    });
  }

  /** Draws the label for camera M (world -> device px). Restores the caller's state. */
  draw(M: Affine): void {
    const gl = this.gl;
    const save = {
      fb: gl.getParameter(gl.FRAMEBUFFER_BINDING),
      vp: gl.getParameter(gl.VIEWPORT) as Int32Array,
      prog: gl.getParameter(gl.CURRENT_PROGRAM),
      vao: gl.getParameter(gl.VERTEX_ARRAY_BINDING),
      depthTest: gl.isEnabled(gl.DEPTH_TEST),
      depthFunc: gl.getParameter(gl.DEPTH_FUNC),
      depthMask: gl.getParameter(gl.DEPTH_WRITEMASK),
      blend: gl.isEnabled(gl.BLEND),
      scissor: gl.isEnabled(gl.SCISSOR_TEST),
      cull: gl.isEnabled(gl.CULL_FACE),
      active: gl.getParameter(gl.ACTIVE_TEXTURE),
      tex: [0, 1, 2, 3, 4].map((i) => {
        gl.activeTexture(gl.TEXTURE0 + i);
        return gl.getParameter(gl.TEXTURE_BINDING_2D);
      }),
    };
    const q = this.tq ? gl.createQuery() : null;
    if (q && this.tq) gl.beginQuery(this.tq.TIME_ELAPSED_EXT, q);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.width, this.height);
    gl.disable(gl.BLEND);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.clearBufferuiv(gl.COLOR, 0, [0, 0, 0, 0]);
    if (this.G) gl.clearBufferfv(gl.COLOR, 1, [-1e30, 0, 0, 0]);
    gl.clearBufferfv(gl.DEPTH, 0, [1]);
    const ppd = Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2]));
    const pad = 2 / Math.max(ppd, 1e-9);
    gl.bindVertexArray(this.vao);
    gl.useProgram(this.capsule);
    this.uniforms(this.capsule, M, pad);
    if (this.nInst > 0) gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.nInst);
    if (this.nFills > 0) {
      gl.useProgram(this.fillPr);
      this.uniforms(this.fillPr, M, pad);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.nFills);
    }
    if (q && this.tq) {
      gl.endQuery(this.tq.TIME_ELAPSED_EXT);
      this.pending.push(q);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, save.fb);
    gl.viewport(save.vp[0], save.vp[1], save.vp[2], save.vp[3]);
    gl.useProgram(save.prog);
    gl.bindVertexArray(save.vao);
    if (!save.depthTest) gl.disable(gl.DEPTH_TEST);
    gl.depthFunc(save.depthFunc);
    gl.depthMask(save.depthMask);
    if (save.blend) gl.enable(gl.BLEND);
    if (save.scissor) gl.enable(gl.SCISSOR_TEST);
    if (save.cull) gl.enable(gl.CULL_FACE);
    save.tex.forEach((t, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
    });
    gl.activeTexture(save.active);
  }

  /** Collects finished timer queries into times; returns how many are still pending. */
  poll(): number {
    const gl = this.gl;
    if (!this.tq) return 0;
    const disjoint = gl.getParameter(this.tq.GPU_DISJOINT_EXT);
    while (this.pending.length) {
      const q = this.pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
      if (!disjoint) this.times.push(ns / 1e6);
      gl.deleteQuery(q);
      this.pending.shift();
    }
    return this.pending.length;
  }

  get hasTimer(): boolean {
    return !!this.tq;
  }

  /** Reads back the word (row 0 = the top row), and in debug the (key, s, d, fill) target. */
  read(): { word: Uint32Array; dbg: Float32Array | null } {
    const gl = this.gl;
    const W = this.width;
    const H = this.height;
    const prevFb = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fbo);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    const raw = new Uint32Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA_INTEGER, gl.UNSIGNED_INT, raw);
    const word = new Uint32Array(W * H);
    for (let j = 0; j < H; j++) {
      const src = (H - 1 - j) * W * 4;
      for (let i = 0; i < W; i++) word[j * W + i] = raw[src + 4 * i];
    }
    let dbg: Float32Array | null = null;
    if (this.G) {
      gl.readBuffer(gl.COLOR_ATTACHMENT1);
      const rf = new Float32Array(W * H * 4);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, rf);
      dbg = new Float32Array(W * H * 4);
      for (let j = 0; j < H; j++) dbg.set(rf.subarray((H - 1 - j) * W * 4, (H - j) * W * 4), j * W * 4);
    }
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prevFb);
    return { word, dbg };
  }

  /** One pixel read through the label's framebuffer (render sync, K923). */
  sync(): void {
    const gl = this.gl;
    const prevFb = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fbo);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    const px = new Uint32Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA_INTEGER, gl.UNSIGNED_INT, px);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prevFb);
  }

  dispose(): void {
    const gl = this.gl;
    for (const t of [this.L, this.D, this.G]) if (t) gl.deleteTexture(t);
    for (const t of Object.values(this.tabs)) gl.deleteTexture(t.tex);
    gl.deleteFramebuffer(this.fbo);
    gl.deleteBuffer(this.instBuf);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.capsule);
    gl.deleteProgram(this.fillPr);
  }
}
