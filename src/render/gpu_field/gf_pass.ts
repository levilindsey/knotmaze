// K1362 s2: the GPU pass. Packs the tables (gf_pack.ts) into one RGBA32F
// texture and draws gf_glsl.ts's fragment shader over a scissored rectangle
// of a target: the app's RGBA8 target (ink, coverage), or the probe's three
// RGBA32F targets (read back against eval.ts's GfEval).
//
// Timing: EXT_disjoint_timer_query_webgl2 brackets the draw, and an empty
// query (begin, end, no draw) right after it gives the floor the readings
// subtract. Results arrive frames later (poll()).
import { GF_TILE_VS, GF_VS, gfFs, type GfTier } from "./gf_glsl";
import { GF_TW, packTables, type GfPacked } from "./gf_pack";
import type { GfTables } from "./tables";
import { buildTileRoute, type GfTileRoute } from "./gf_tiles";

export type GfMap = [number, number, number, number];

interface TimerExt { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }

export function compileProgram(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const mk = (type: number, src: string): WebGLShader => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(`gf shader: ${log}`);
    }
    return s;
  };
  const p = gl.createProgram()!;
  const v = mk(gl.VERTEX_SHADER, vs);
  const f = mk(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`gf link: ${gl.getProgramInfoLog(p)}`);
  return p;
}

/** A framebuffer of n colour textures (RGBA8, or RGBA32F for the probe). */
export class GfTarget {
  readonly gl: WebGL2RenderingContext;
  readonly fbo: WebGLFramebuffer;
  readonly tex: WebGLTexture[] = [];
  readonly n: number;
  readonly float: boolean;
  /** K1362 s4: the depth-stencil the tiers' route needs (GfPass.draw adds it on first use). */
  private ds: WebGLRenderbuffer | null = null;
  w = 0; h = 0;
  constructor(gl: WebGL2RenderingContext, n: number, float: boolean) {
    this.gl = gl; this.n = n; this.float = float;
    if (float && !gl.getExtension("EXT_color_buffer_float")) throw new Error("no EXT_color_buffer_float");
    this.fbo = gl.createFramebuffer()!;
    for (let i = 0; i < n; i++) this.tex.push(gl.createTexture()!);
  }
  resize(w: number, h: number): void {
    if (w === this.w && h === this.h) return;
    const gl = this.gl;
    this.w = w; this.h = h;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    const bufs: number[] = [];
    for (let i = 0; i < this.n; i++) {
      gl.bindTexture(gl.TEXTURE_2D, this.tex[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, this.float ? gl.RGBA32F : gl.RGBA8, w, h, 0, gl.RGBA, this.float ? gl.FLOAT : gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, this.tex[i], 0);
      bufs.push(gl.COLOR_ATTACHMENT0 + i);
    }
    gl.drawBuffers(bufs);
    if (this.ds) this.sizeStencil();
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`gf target incomplete (${st})`);
  }
  /** Attach a depth-stencil renderbuffer (once); the framebuffer must be bound. */
  ensureStencil(): void {
    if (this.ds) return;
    this.ds = this.gl.createRenderbuffer()!;
    this.sizeStencil();
    const st = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (st !== this.gl.FRAMEBUFFER_COMPLETE) throw new Error(`gf target incomplete with stencil (${st})`);
  }
  private sizeStencil(): void {
    const gl = this.gl;
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.ds);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, Math.max(1, this.w), Math.max(1, this.h));
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.ds);
  }
  /** Read colour attachment i (RGBA32F targets) into out (w*h*4). */
  read(i: number, out: Float32Array): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fbo);
    gl.readBuffer(gl.COLOR_ATTACHMENT0 + i);
    gl.readPixels(0, 0, this.w, this.h, gl.RGBA, gl.FLOAT, out);
  }
  dispose(): void {
    const gl = this.gl;
    gl.deleteFramebuffer(this.fbo);
    if (this.ds) gl.deleteRenderbuffer(this.ds);
    for (const t of this.tex) gl.deleteTexture(t);
  }
}

/**
 * K1362 s4: the tiers drawn before the full program (gf_glsl.ts GfTier). Each pixel is drawn by the first program
 * that holds it; the stencil (0 = not drawn yet) routes the rest on. Stage 4 measured them on the Pixel
 * (docs/design/K1362_s4_shader.md, handoff): p3/k2 with ramps, then the full program on the rest (0.2% of def's px,
 * 0.1% of muse_hash's), is def 19.7 / muse 24.6 / fat 11.8 ms against the full program's 33.0 / 42.3 / 21.5 (sync4,
 * 822x1506, 1286 MHz); same pixels. A routed middle program costs a whole pass (it writes the route with a discard,
 * so its stencil test runs late), so one tier is the default.
 */
export const GF_TIERS: GfTier[] = [{ p: 3, k: 2, ramps: true }];
/**
 * K1362 s5: the tile route (gf_tiles.ts). tc > 0 cuts the grid into world tiles of tc x tc cells and draws each tile,
 * as an instanced quad, with the first of the tiers that holds the tile's bound, else the full program; tiles nothing
 * reaches are not drawn. No stencil, and every pixel is drawn once. 0 = stage 4's stencil route over GF_TIERS. The
 * probe program always takes the stencil route (its counters are the full program's own).
 */
export const GF_TILE_CELLS = 0;
/**
 * The fallback (buildTileRoute's opt: 0 none, the exact bound; 1 a group = one piece; 2 also no ramp test): tiles go to a tier by the optimistic bound, the tiers mark the pixels they draw in
 * the stencil, and the full program draws once over every reached tile with stencil EQUAL 0 and KEEP (tested before the
 * shader on the Pixel). Exact by the tiers' overflow discard (stage 4), not by the bound.
 */
export const GF_TILE_FALLBACK = 2;
export const GF_TILE_TIERS: GfTier[] = [{ p: 1, k: 1, ramps: false }, { p: 2, k: 2, ramps: false }, { p: 3, k: 2, ramps: true }];
const UNIFORMS = ["uD", "uOCh", "uOV", "uOPin", "uOArm", "uOK", "uOChk", "uOCell", "uOChL", "uOKL", "uH", "uW", "uAA", "uSigma", "uZt", "uWin", "uRc", "uGrid", "uGDim", "uMap", "uView"];
interface GfProg { prog: WebGLProgram; u: Map<string, WebGLUniformLocation | null>; tier: GfTier | null }

export class GfPass {
  readonly gl: WebGL2RenderingContext;
  /** The tiers' programs, then the full program (last; it draws whatever no tier held). */
  private progs: GfProg[];
  private vao: WebGLVertexArrayObject;
  private tex: WebGLTexture;
  private packed: GfPacked | null = null;
  private T: GfTables | null = null;
  private texRows = 0;
  private ext: TimerExt | null;
  private pending: { q: WebGLQuery; e: WebGLQuery }[] = [];
  /** GPU pass times and the empty query's, ms, as they arrive. */
  readonly gpuMs: number[] = [];
  readonly emptyMs: number[] = [];
  disjoint = 0;
  packMs = 0;
  uploadMs = 0;

  readonly probe: boolean;
  /** The tile route's cells per tile side (0 = the stencil route), its tiers, and the last upload's classification. */
  readonly tc: number;
  /** The tile route classifies optimistically and the full program redraws, by stencil, what the tiers discarded. */
  readonly fb: number;
  readonly tiers: GfTier[];
  route: GfTileRoute | null = null;
  routeMs = 0;
  private tileBuf: WebGLBuffer | null = null;
  /**
   * tiers: GF_TIERS (stencil route) or GF_TILE_TIERS (tile route) by default; [] draws the full program alone (stage 2's
   * pass). fs: a program's source override (benches). tc: GF_TILE_CELLS by default; the probe always routes by stencil.
   */
  constructor(gl: WebGL2RenderingContext, probe: boolean, tiers?: GfTier[], fs?: (tier: GfTier | null) => string, tc = GF_TILE_CELLS, fb = GF_TILE_FALLBACK) {
    this.gl = gl; this.probe = probe;
    this.tc = probe ? 0 : tc;
    this.fb = this.tc > 0 ? fb : 0;
    // the tile route classifies against the tiers it draws: no half (mediump-index) tiers there, which depend on the tables
    this.tiers = (tiers ?? (this.tc > 0 ? GF_TILE_TIERS : GF_TIERS)).filter((t) => this.tc === 0 || !t.half);
    const vs = this.tc > 0 ? GF_TILE_VS : GF_VS;
    this.progs = [...this.tiers, null].map((tier) => {
      const prog = compileProgram(gl, vs, fs ? fs(tier) : gfFs(probe, true, tier ?? undefined));
      const u = new Map<string, WebGLUniformLocation | null>();
      for (const n of UNIFORMS) u.set(n, gl.getUniformLocation(prog, n));
      return { prog, u, tier };
    });
    this.vao = gl.createVertexArray()!;
    if (this.tc > 0) {
      this.tileBuf = gl.createBuffer()!;
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tileBuf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribDivisor(0, 1);
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    this.tex = gl.createTexture()!;
    this.ext = gl.getExtension("EXT_disjoint_timer_query_webgl2") as TimerExt | null;
  }

  get timed(): boolean { return !!this.ext; }

  upload(T: GfTables): void {
    const gl = this.gl;
    const t0 = performance.now();
    this.packed = packTables(T, this.packed ?? undefined);
    const t1 = performance.now();
    this.T = T;
    const { data, rows } = this.packed;
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    const view = data.subarray(0, rows * GF_TW * 4);
    if (rows !== this.texRows) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GF_TW, rows, 0, gl.RGBA, gl.FLOAT, view);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      this.texRows = rows;
    } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GF_TW, rows, gl.RGBA, gl.FLOAT, view);
    this.packMs = t1 - t0;
    this.uploadMs = performance.now() - t1;
    if (this.tc > 0) {
      // the tiles are in world space: the classification follows the tables, not the camera
      const prevRects = this.route?.rects;
      this.route = buildTileRoute(T, this.tiers, this.tc, this.route ?? undefined, undefined, this.fb);
      this.routeMs = this.route.ms;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tileBuf);
      if (this.route.rects === prevRects) gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.route.rects);
      else gl.bufferData(gl.ARRAY_BUFFER, this.route.rects, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
  }

  /** The tables' grid, mapped to target pixels by the inverse of map: [x0, y0, x1, y1] clamped to w x h. */
  gridRect(map: GfMap, w: number, h: number): [number, number, number, number] {
    const T = this.T!;
    const xs = [(T.gx0 - map[1]) / map[0], (T.gx0 + T.gW * T.G - map[1]) / map[0]];
    const ys = [(T.gy0 - map[3]) / map[2], (T.gy0 + T.gH * T.G - map[3]) / map[2]];
    const x0 = Math.max(0, Math.floor(Math.min(xs[0], xs[1]))); const x1 = Math.min(w, Math.ceil(Math.max(xs[0], xs[1])));
    const y0 = Math.max(0, Math.floor(Math.min(ys[0], ys[1]))); const y1 = Math.min(h, Math.ceil(Math.max(ys[0], ys[1])));
    return [x0, y0, Math.max(x0, x1), Math.max(y0, y1)];
  }

  /** Draw into target (bound and cleared here) over rect; the world point of fragment (fx, fy) is map's. */
  draw(target: GfTarget, map: GfMap, rect: [number, number, number, number], time = true): void {
    const gl = this.gl;
    const T = this.T;
    const P = this.packed;
    if (!T || !P) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, target.w, target.h);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
    // The programs to draw: a half (mediump-int) tier only while every index fits mediump's 16 bits.
    const halfOk = Math.max(T.nV, T.nK, T.nA, T.nCh) < 32000;
    const route = this.tc > 0 ? this.route : null;
    if (this.tc > 0 && !route) return;
    const progs = route ? this.progs : this.progs.filter((g) => !g.tier || !g.tier.half || halfOk);
    const routed = !route && progs.length > 1;
    const fb = !!route && this.fb > 0 && progs.length > 1;
    if (routed || fb) target.ensureStencil();
    if (target.float) for (let i = 0; i < target.n; i++) gl.clearBufferfv(gl.COLOR, i, [0, 0, 0, 0]);
    else { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    if (routed || fb) { gl.stencilMask(0xff); gl.clearBufferfi(gl.DEPTH_STENCIL, 0, 1, 0); }
    const [x0, y0, x1, y1] = rect;
    if (x1 <= x0 || y1 <= y0) return;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x0, y0, x1 - x0, y1 - y0);
    if (routed) {
      // stencil 0 = no program has drawn the pixel yet; a program that draws it (does not discard) moves it to 1
      gl.enable(gl.STENCIL_TEST);
      gl.stencilFunc(gl.EQUAL, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.bindVertexArray(this.vao);
    const ext = time ? this.ext : null;
    let q: WebGLQuery | null = null; let e: WebGLQuery | null = null;
    if (ext) { q = gl.createQuery()!; gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }
    if (route) {
      // the program's output where nothing reaches (no piece, no corner): the tiles left undrawn keep it
      if (target.float) gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 1]);
      else { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.clearColor(0, 0, 0, 0); }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tileBuf);
    }
    const last = progs.length - 1;
    let reached = 0; if (route) for (const n of route.count) reached += n;
    if (fb) {
      // the tiers mark what they draw (1); a discard (overflow, or a ramp in a NORAMP tier) leaves 0 for the full program
      gl.enable(gl.STENCIL_TEST);
      gl.stencilFunc(gl.ALWAYS, 1, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    }
    for (let pi = 0; pi < progs.length; pi++) {
      const g = progs[pi];
      // with the fallback the full program covers every reached tile (the rects are in class order, from 0)
      const nInst = !route ? 0 : fb && pi === last ? reached : route.count[pi];
      const first = !route ? 0 : fb && pi === last ? 0 : route.first[pi];
      if (route && nInst === 0) continue;
      // the last program writes no route: KEEP lets the stencil test run before the shader even though it discards
      if (routed && pi === last) gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      if (fb && pi === last) { gl.stencilFunc(gl.EQUAL, 0, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP); }
      gl.useProgram(g.prog);
      const u = (n: string): WebGLUniformLocation | null => g.u.get(n) ?? null;
      gl.uniform1i(u("uD"), 0);
      const o = P.o;
      gl.uniform1i(u("uOCh"), o.ch); gl.uniform1i(u("uOV"), o.v); gl.uniform1i(u("uOPin"), o.pin); gl.uniform1i(u("uOArm"), o.arm);
      gl.uniform1i(u("uOK"), o.k); gl.uniform1i(u("uOChk"), o.chk); gl.uniform1i(u("uOCell"), o.cell); gl.uniform1i(u("uOChL"), o.chl); gl.uniform1i(u("uOKL"), o.kl);
      gl.uniform1f(u("uH"), T.h); gl.uniform1f(u("uW"), T.W); gl.uniform1f(u("uAA"), T.aa); gl.uniform1f(u("uSigma"), T.sigma);
      gl.uniform1f(u("uZt"), T.zt); gl.uniform1f(u("uWin"), T.win); gl.uniform1f(u("uRc"), T.rc);
      gl.uniform4f(u("uGrid"), T.gx0, T.gy0, T.G, 0);
      gl.uniform2i(u("uGDim"), T.gW, T.gH);
      gl.uniform4f(u("uMap"), map[0], map[1], map[2], map[3]);
      if (route) {
        gl.uniform2f(u("uView"), target.w, target.h);
        gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 16 * first);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, nInst);
      } else gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (route) gl.bindBuffer(gl.ARRAY_BUFFER, null);
    if (routed || fb) {
      gl.disable(gl.STENCIL_TEST);
      // the route is per pass: a tile-based GPU need not store it
      gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.DEPTH_STENCIL_ATTACHMENT]);
    }
    if (ext && q) {
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      e = gl.createQuery()!;
      gl.beginQuery(ext.TIME_ELAPSED_EXT, e);
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      this.pending.push({ q, e });
    }
    gl.bindVertexArray(null);
    gl.disable(gl.SCISSOR_TEST);
  }

  /** Collect finished timer queries. */
  poll(): void {
    const gl = this.gl;
    const ext = this.ext;
    if (!ext) return;
    while (this.pending.length) {
      const { q, e } = this.pending[0];
      if (!gl.getQueryParameter(e, gl.QUERY_RESULT_AVAILABLE) || !gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      this.pending.shift();
      if (gl.getParameter(ext.GPU_DISJOINT_EXT)) this.disjoint++;
      else {
        this.gpuMs.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
        this.emptyMs.push(gl.getQueryParameter(e, gl.QUERY_RESULT) / 1e6);
      }
      gl.deleteQuery(q);
      gl.deleteQuery(e);
    }
  }

  dispose(): void {
    const gl = this.gl;
    for (const { q, e } of this.pending) { gl.deleteQuery(q); gl.deleteQuery(e); }
    this.pending = [];
    for (const g of this.progs) gl.deleteProgram(g.prog);
    gl.deleteVertexArray(this.vao);
    if (this.tileBuf) gl.deleteBuffer(this.tileBuf);
    gl.deleteTexture(this.tex);
  }
}

// The app's composite: the pass's (ink, coverage) target over the canvas,
// premultiplied (ink over the fill).
const COMP_FS = `#version 300 es
precision highp float;
uniform sampler2D uC;
uniform vec3 uFill;
uniform vec3 uInk;
out vec4 o;
void main() {
  vec4 c = texelFetch(uC, ivec2(gl_FragCoord.xy), 0);
  float ink = c.x; float cov = c.y;
  o = vec4(uInk * ink + uFill * cov * (1.0 - ink), ink + (1.0 - ink) * cov);
}`;

export class GfComposite {
  private prog: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private uC: WebGLUniformLocation | null; private uFill: WebGLUniformLocation | null; private uInk: WebGLUniformLocation | null;
  readonly gl: WebGL2RenderingContext;
  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.prog = compileProgram(gl, GF_VS, COMP_FS);
    this.vao = gl.createVertexArray()!;
    this.uC = gl.getUniformLocation(this.prog, "uC");
    this.uFill = gl.getUniformLocation(this.prog, "uFill");
    this.uInk = gl.getUniformLocation(this.prog, "uInk");
  }
  /** Into the currently bound framebuffer (the canvas), viewport w x h. */
  draw(src: GfTarget, fill: [number, number, number], ink: [number, number, number]): void {
    const gl = this.gl;
    gl.viewport(0, 0, src.w, src.h);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
    gl.useProgram(this.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex[0]);
    gl.uniform1i(this.uC, 0);
    gl.uniform3f(this.uFill, fill[0], fill[1], fill[2]);
    gl.uniform3f(this.uInk, ink[0], ink[1], ink[2]);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
  dispose(): void {
    this.gl.deleteProgram(this.prog);
    this.gl.deleteVertexArray(this.vao);
  }
}
