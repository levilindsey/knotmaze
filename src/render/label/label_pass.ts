// K868 S3a2: the label pass's GL resources and its two draws (module map:
// label_app.ts). Raw WebGL2 on the caller's context; the caller restores
// its own state afterwards (pixi: renderer.resetState()).
//
// Targets, all the size of the canvas in device pixels:
//   L   the label: R32UI packed (4 B/px), or RGBA32UI wide (16 B/px)
//   D2  DEPTH_COMPONENT32F texture (4 B/px), sampleable (K915's band pass)
//   T   a copy of L after the tubes (4 or 16 B/px): the fill pass reads the
//       tube label there, since WebGL2 cannot sample the target it draws to
//   S   packed only (K868 S3a3): the tubes' exact s, float bits in R32UI
//       (4 B/px), drawn by the tube pass as a second target (fboTube) and
//       sampled by the fill pass, whose framebuffer (fboL) leaves it out,
//       so it needs no copy. The fill's yield reads s there; the band pass
//       keeps reading the packed word.
// Packed: 16 B/px in all; wide: 36 B/px (its word carries s exactly).
//
// Per render: clear L (0 = paper), S and D2 (1); draw the tubes (LESS,
// depth written per fragment); blit L to T; draw the fills into L and D2.
//
// K868 S3a7, the GPU pieces (labelGpu): setTables() uploads the tables
// (label_tables.ts) each frame, rows in use only, and the tube draw is one
// instance per chain segment (label_glsl.ts GPU_TUBE_VS/FS) in place of
// buildLabelPieces' tubes; the pieces then carry only the fills and the
// rank keys (keysOnly).
//
// K868 S3a8a: with gpuFills (the GPU pieces' window records), the fills draw
// with the GPU_FILLS fill program, which reads the tables too (uTbl): the
// foot's segment, its s (the tube's s[k] + t segLen[k]) and the exact depth.
import { DATA_W, FILL_FLOATS, TUBE_FLOATS, type LabelPieces } from "./label_pieces";
import { labelGpuSources, labelSources } from "./label_glsl";
import { SEG_FLOATS, TBL_W, type LabelTables } from "./label_tables";

/** The fill instance's attributes: name, size, offset in floats. */
const FILL_ATTRS: [string, number, number][] = [
  ["aQ", 4, 0],
  ["aU", 4, 4],
  ["aJ", 4, 8],
  ["aO", 4, 12],
  ["aX", 2, 16],
];

/** One instanced VAO over buf with the program's attribute locations. */
function bindAttrs(gl: WebGL2RenderingContext, p: Prog, vao: WebGLVertexArrayObject, buf: WebGLBuffer, stride: number, list: [string, number, number][]): void {
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  for (const [n, size, off] of list) {
    const loc = gl.getAttribLocation(p.prog, n);
    if (loc < 0) continue;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4);
    gl.vertexAttribDivisor(loc, 1);
  }
  gl.bindVertexArray(null);
}

/** World to device pixels: dev = (a x + c y + tx, b x + d y + ty). */
export interface LabelCamera {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export interface Prog {
  prog: WebGLProgram;
  u: (n: string) => WebGLUniformLocation | null;
}

export function compile(gl: WebGL2RenderingContext, vs: string, fs: string, name: string): Prog {
  const sh = (type: number, src: string): WebGLShader => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(`label ${name} shader: ${log}`);
    }
    return s;
  };
  const prog = gl.createProgram()!;
  const v = sh(gl.VERTEX_SHADER, vs);
  const f = sh(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(prog, v);
  gl.attachShader(prog, f);
  gl.linkProgram(prog);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`label ${name} link: ${gl.getProgramInfoLog(prog)}`);
  const cache = new Map<string, WebGLUniformLocation | null>();
  return {
    prog,
    u: (n) => {
      if (!cache.has(n)) cache.set(n, gl.getUniformLocation(prog, n));
      return cache.get(n)!;
    },
  };
}

export class LabelPass {
  readonly packed: boolean;
  private gl: WebGL2RenderingContext;
  private tube: Prog;
  private fill: Prog;
  private tubeVao: WebGLVertexArrayObject;
  private fillVao: WebGLVertexArrayObject;
  private tubeBuf: WebGLBuffer;
  private fillBuf: WebGLBuffer;
  private dataTex: WebGLTexture;
  private L: WebGLTexture | null = null;
  private D2: WebGLTexture | null = null;
  private T: WebGLTexture | null = null;
  private fboL: WebGLFramebuffer | null = null;
  private fboT: WebGLFramebuffer | null = null;
  private S: WebGLTexture | null = null;
  private fboTube: WebGLFramebuffer | null = null;
  private pieces: LabelPieces | null = null;
  private tables: LabelTables | null = null;
  private gpuTube: Prog | null = null;
  private segVao: WebGLVertexArrayObject | null = null;
  private segBuf: WebGLBuffer | null = null;
  private segCap = 0;
  private tblTex: WebGLTexture | null = null;
  private tblRows = 0;
  private gpuFill: Prog | null = null;
  private gpuFillVao: WebGLVertexArrayObject | null = null;
  width = 0;
  height = 0;

  constructor(gl: WebGL2RenderingContext, packed = true) {
    this.gl = gl;
    this.packed = packed;
    const src = labelSources(packed, DATA_W);
    this.tube = compile(gl, src.tubeVs, src.tubeFs, "tube");
    this.fill = compile(gl, src.fillVs, src.fillFs, "fill");
    this.tubeBuf = gl.createBuffer()!;
    this.fillBuf = gl.createBuffer()!;
    this.tubeVao = gl.createVertexArray()!;
    this.fillVao = gl.createVertexArray()!;
    const attrs = (p: Prog, vao: WebGLVertexArrayObject, buf: WebGLBuffer, stride: number, list: [string, number, number][]): void =>
      bindAttrs(gl, p, vao, buf, stride, list);
    attrs(this.tube, this.tubeVao, this.tubeBuf, TUBE_FLOATS, [
      ["aAB", 4, 0],
      ["aS", 4, 4],
      ["aK", 4, 8],
      ["aN", 4, 12],
      ["aC", 2, 16],
    ]);
    attrs(this.fill, this.fillVao, this.fillBuf, FILL_FLOATS, FILL_ATTRS);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.dataTex = gl.createTexture()!;
  }

  /** Upload one scene's pieces (label_pieces.ts). */
  setPieces(p: LabelPieces): void {
    const gl = this.gl;
    this.pieces = p;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tubeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, p.tubes, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillBuf);
    gl.bufferData(gl.ARRAY_BUFFER, p.fills.length ? p.fills : new Float32Array(FILL_FLOATS), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dataTex);
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, DATA_W, p.dataRows, 0, gl.RGBA, gl.FLOAT, p.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /** K868 S3a7, the GPU pieces: upload one frame's tables (label_tables.ts),
   * the rows in use only, and its segment instances. null: master's tubes. */
  setTables(T: LabelTables | null): void {
    this.tables = T;
    if (!T) return;
    const gl = this.gl;
    if (!this.gpuTube) {
      const src = labelGpuSources(this.packed, TBL_W);
      this.gpuTube = compile(gl, src.tubeVs, src.tubeFs, "gpu tube");
      this.segBuf = gl.createBuffer()!;
      this.segVao = gl.createVertexArray()!;
      gl.bindVertexArray(this.segVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.segBuf);
      const loc = gl.getAttribLocation(this.gpuTube.prog, "aSeg");
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, SEG_FLOATS * 4, 0);
        gl.vertexAttribDivisor(loc, 1);
      }
      gl.bindVertexArray(null);
      this.tblTex = gl.createTexture()!;
      const fsrc = labelSources(this.packed, DATA_W, true, TBL_W);
      this.gpuFill = compile(gl, fsrc.fillVs, fsrc.fillFs, "gpu fill");
      this.gpuFillVao = gl.createVertexArray()!;
      bindAttrs(gl, this.gpuFill, this.gpuFillVao, this.fillBuf, FILL_FLOATS, FILL_ATTRS);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    const n = T.nSegs * SEG_FLOATS;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.segBuf);
    if (this.segCap < Math.max(n, 1)) {
      this.segCap = Math.ceil(Math.max(n, 1) * 1.25) + SEG_FLOATS;
      gl.bufferData(gl.ARRAY_BUFFER, this.segCap * 4, gl.DYNAMIC_DRAW);
    }
    if (n) gl.bufferSubData(gl.ARRAY_BUFFER, 0, T.segs, 0, n);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tblTex);
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    if (this.tblRows < T.rows) {
      this.tblRows = Math.ceil(T.rows * 1.25) + 1;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, TBL_W, this.tblRows, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    // The builder's data grows in whole rows, so T.rows rows are there.
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TBL_W, T.rows, gl.RGBA, gl.FLOAT, T.data, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /** Bytes the targets hold now. */
  get targetBytes(): number {
    return this.width * this.height * (this.packed ? 16 : 36);
  }

  private ensureTargets(w: number, h: number): void {
    if (this.L && w === this.width && h === this.height) return;
    const gl = this.gl;
    this.freeTargets();
    const tex = (internal: number, format: number, type: number): WebGLTexture => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, 1, internal, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      void format;
      void type;
      return t;
    };
    const fmt = this.packed ? gl.R32UI : gl.RGBA32UI;
    this.L = tex(fmt, 0, 0);
    this.T = tex(fmt, 0, 0);
    this.D2 = tex(gl.DEPTH_COMPONENT32F, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.fboL = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboL);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.L, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.D2, 0);
    const okL = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    this.fboT = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboT);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.T, 0);
    const okT = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    let okS: number = gl.FRAMEBUFFER_COMPLETE;
    if (this.packed) {
      this.S = tex(gl.R32UI, 0, 0);
      gl.bindTexture(gl.TEXTURE_2D, null);
      this.fboTube = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboTube);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.L, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.S, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.D2, 0);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      okS = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (okL !== gl.FRAMEBUFFER_COMPLETE || okT !== gl.FRAMEBUFFER_COMPLETE || okS !== gl.FRAMEBUFFER_COMPLETE)
      throw new Error(`label targets incomplete (${okL}, ${okT}, ${okS})`);
    this.width = w;
    this.height = h;
  }

  /** Draw the label for one camera into targets of w x h device pixels.
   * fills = false stops after the tubes (the probes' tube-only counts). */
  render(cam: LabelCamera, w: number, h: number, fills = true): void {
    const p = this.pieces;
    if (!p) return;
    const gl = this.gl;
    this.ensureTargets(w, h);
    // Packed tubes draw L and S together (fboTube); the fills draw L alone.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.packed ? this.fboTube : this.fboL);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    gl.colorMask(true, true, true, true);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthRange(0, 1);
    gl.clearBufferuiv(gl.COLOR, 0, new Uint32Array([0, 0, 0, 0]));
    if (this.packed) gl.clearBufferuiv(gl.COLOR, 1, new Uint32Array([0, 0, 0, 0]));
    gl.clearBufferfv(gl.DEPTH, 0, new Float32Array([1]));
    const det = Math.abs(cam.a * cam.d - cam.b * cam.c);
    const pxWorld = det > 0 ? 1 / Math.sqrt(det) : 1;
    const M = new Float32Array([cam.a, cam.b, 0, cam.c, cam.d, 0, cam.tx, cam.ty, 1]);
    const common = (pr: Prog): void => {
      gl.useProgram(pr.prog);
      gl.uniformMatrix3fv(pr.u("uM"), false, M);
      gl.uniform2f(pr.u("uSize"), w, h);
      gl.uniform1f(pr.u("uH"), p.h);
      gl.uniform1f(pr.u("uZmin"), p.zmin);
      gl.uniform1f(pr.u("uZinv"), 1 / p.zr);
      gl.uniform1f(pr.u("uRinv"), 1 / p.nKeys);
      gl.uniform1f(pr.u("uSinv"), 1 / p.smax);
    };
    const tbl = this.tables;
    if (p.keysOnly) {
      // K868 S3a7: the GPU tubes, one instance per chain segment.
      if (tbl && this.gpuTube && tbl.nSegs) {
        const g = this.gpuTube;
        common(g);
        gl.uniform1f(g.u("uEps"), 0.05 * pxWorld);
        gl.uniform1f(g.u("uWin"), tbl.win);
        gl.uniform1f(g.u("uRho"), tbl.rho);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.tblTex);
        gl.uniform1i(g.u("uTbl"), 0);
        gl.bindVertexArray(this.segVao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, tbl.nSegs);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }
    } else if (p.nTubes) {
      common(this.tube);
      gl.uniform1f(this.tube.u("uEps"), 0.05 * pxWorld);
      gl.bindVertexArray(this.tubeVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, p.nTubes);
    }
    // K868 S3a8a: the GPU pieces' records need the GPU_FILLS program.
    const gf = p.gpuFills === true && !!tbl && !!this.gpuFill && !!this.gpuFillVao && !!this.tblTex;
    if (fills && p.nFills && (gf || p.gpuFills !== true)) {
      const fp = gf ? this.gpuFill! : this.fill;
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fboL);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fboT);
      gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboL);
      common(fp);
      gl.uniform1f(fp.u("uSigma"), p.sigma);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.T);
      gl.uniform1i(fp.u("uT"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.dataTex);
      gl.uniform1i(fp.u("uData"), 1);
      if (this.packed) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.S);
        gl.uniform1i(fp.u("uS"), 2);
      }
      if (gf && tbl) {
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.tblTex);
        gl.uniform1i(fp.u("uTbl"), 3);
        gl.uniform1f(fp.u("uWin"), tbl.win);
        gl.uniform1f(fp.u("uRho"), tbl.rho);
      }
      gl.bindVertexArray(gf ? this.gpuFillVao : this.fillVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, p.nFills);
      // K868 S3a8a: each unit by name. With GPU_FILLS the active unit here is
      // 3, and an unbind that assumed unit 2 left the R32UI S texture bound
      // there: pixi's next draws failed (GL_INVALID_OPERATION, a sampler type
      // mismatch; seen on muse at lbp=1). The end state without GPU_FILLS is
      // unchanged: units 0-2 unbound, unit 0 active.
      if (gf) {
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }
      if (this.packed) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    gl.bindVertexArray(null);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** Read L back: one u32 per pixel (packed) or four (wide), row 0 first. */
  read(): Uint32Array {
    const gl = this.gl;
    const w = this.width;
    const h = this.height;
    const all = new Uint32Array(w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboL);
    gl.readPixels(0, 0, w, h, gl.RGBA_INTEGER, gl.UNSIGNED_INT, all);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!this.packed) return all;
    const out = new Uint32Array(w * h);
    for (let i = 0; i < out.length; i++) out[i] = all[i * 4];
    return out;
  }

  /** The label, depth and copy textures (K915's band pass reads L and D2),
   * and the label tables (K868 S3a8b2: the band's GPU edges read them;
   * null until setTables has had tables). */
  get textures(): { L: WebGLTexture | null; D2: WebGLTexture | null; tbl: WebGLTexture | null } {
    return { L: this.L, D2: this.D2, tbl: this.tblTex };
  }

  private freeTargets(): void {
    const gl = this.gl;
    for (const t of [this.L, this.T, this.D2, this.S]) if (t) gl.deleteTexture(t);
    for (const f of [this.fboL, this.fboT, this.fboTube]) if (f) gl.deleteFramebuffer(f);
    this.L = this.T = this.D2 = this.S = null;
    this.fboL = this.fboT = this.fboTube = null;
    this.width = this.height = 0;
  }

  dispose(): void {
    const gl = this.gl;
    this.freeTargets();
    gl.deleteTexture(this.dataTex);
    gl.deleteBuffer(this.tubeBuf);
    gl.deleteBuffer(this.fillBuf);
    gl.deleteVertexArray(this.tubeVao);
    gl.deleteVertexArray(this.fillVao);
    gl.deleteProgram(this.tube.prog);
    gl.deleteProgram(this.fill.prog);
    if (this.gpuTube) gl.deleteProgram(this.gpuTube.prog);
    if (this.gpuFill) gl.deleteProgram(this.gpuFill.prog);
    if (this.gpuFillVao) gl.deleteVertexArray(this.gpuFillVao);
    this.gpuFill = null;
    this.gpuFillVao = null;
    if (this.segBuf) gl.deleteBuffer(this.segBuf);
    if (this.segVao) gl.deleteVertexArray(this.segVao);
    if (this.tblTex) gl.deleteTexture(this.tblTex);
    this.gpuTube = null;
    this.segBuf = null;
    this.segVao = null;
    this.tblTex = null;
    this.segCap = this.tblRows = 0;
    this.tables = null;
    this.pieces = null;
  }
}
