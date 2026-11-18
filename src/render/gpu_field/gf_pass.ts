// K1362 s2: the GPU pass. Packs the tables (gf_pack.ts) into one RGBA32F
// texture and draws gf_glsl.ts's fragment shader over a scissored rectangle
// of a target: the app's RGBA8 target (ink, coverage), or the probe's three
// RGBA32F targets (read back against eval.ts's GfEval).
//
// Timing: EXT_disjoint_timer_query_webgl2 brackets the draw, and an empty
// query (begin, end, no draw) right after it gives the floor the readings
// subtract. Results arrive frames later (poll()).
import { GF_VS, gfFs, homeForm, type GfTier } from "./gf_glsl";
import { GF_TW, packTables, type GfPacked } from "./gf_pack";
import { buildKeys } from "./gf_keys";
import { GfPieces } from "./gf_split";
import { revealForm, type GfRevealTable } from "./gf_reveal";
import type { GfExploreTable } from "./gf_explore";
import { knotUniformValues } from "../paint_model";
import { lookForm, LOOK_COMP_FS, type GfLookTable, type GfRimUniforms } from "./gf_look";
/** K1362 s7: the split's options. skip: empty pixels skip pass 2 (depth); keys: the keys run in pass 2 (gf_glsl.ts SPLITK). */
export interface GfSplitForm { skip?: boolean; keys?: boolean }
import type { GfTables } from "./tables";

export type GfMap = [number, number, number, number];

interface TimerExt { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }

// K1456 (26A): a program's link is issued without reading any status back. On a cold shader cache each
// of gf's 40-63k-char programs waits seconds in the GPU process, and the first status or uniform read
// blocks the main thread until it lands (105 s for the set on a fresh profile). Issued this way, the
// compile runs in the GPU process while the main thread only polls COMPLETION_STATUS_KHR once a frame
// (KHR_parallel_shader_compile; D3D11 exposes it), so today's renderer keeps drawing until gf's first
// program is ready. Without the extension the poll reads LINK_STATUS, which can still wait: that path
// is the fallback, not the measured desktop one.
export const COMPLETION_STATUS_KHR = 0x91b1;

export interface ProgJob {
  prog: WebGLProgram;
  vs: WebGLShader;
  fs: WebGLShader;
}

/** Issue a program's compile and link; no status is read, so this never waits for the GPU. */
export function startProgram(gl: WebGL2RenderingContext, vs: string, fs: string): ProgJob {
  const mk = (type: number, src: string): WebGLShader => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const v = mk(gl.VERTEX_SHADER, vs);
  const f = mk(gl.FRAGMENT_SHADER, fs);
  const p = gl.createProgram()!;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  return { prog: p, vs: v, fs: f };
}

/** Read a started program's statuses (instant once its completion has been reported); throws on failure. */
export function finishProgram(gl: WebGL2RenderingContext, job: ProgJob): WebGLProgram {
  for (const s of [job.vs, job.fs]) {
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      gl.deleteShader(job.vs); gl.deleteShader(job.fs); gl.deleteProgram(job.prog);
      throw new Error(`gf shader: ${log}`);
    }
  }
  gl.deleteShader(job.vs);
  gl.deleteShader(job.fs);
  if (!gl.getProgramParameter(job.prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(job.prog);
    gl.deleteProgram(job.prog);
    throw new Error(`gf link: ${log}`);
  }
  return job.prog;
}

export function compileProgram(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  return finishProgram(gl, startProgram(gl, vs, fs));
}

/** A framebuffer of n colour textures (RGBA8, RGBA32F for the probe, or RGBA32UI for the app's packed pass). */
export class GfTarget {
  readonly gl: WebGL2RenderingContext;
  readonly fbo: WebGLFramebuffer;
  readonly tex: WebGLTexture[] = [];
  readonly n: number;
  readonly float: boolean;
  /** K1468: RGBA32UI attachments (packForm's one output; packComp reads them). */
  readonly uint: boolean;
  /** K1362 s4: the depth-stencil the tiers' route needs (GfPass.draw adds it on first use). */
  private ds: WebGLRenderbuffer | null = null;
  w = 0; h = 0;
  constructor(gl: WebGL2RenderingContext, n: number, float: boolean, uint = false) {
    this.gl = gl; this.n = n; this.float = float; this.uint = uint && !float;
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
      if (this.uint) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32UI, w, h, 0, gl.RGBA_INTEGER, gl.UNSIGNED_INT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, this.float ? gl.RGBA32F : gl.RGBA8, w, h, 0, gl.RGBA, this.float ? gl.FLOAT : gl.UNSIGNED_BYTE, null);
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
  /** K1362 s7: the depth-stencil (after ensureStencil), shared with the split's pieces (gf_split.ts). */
  get depthStencil(): WebGLRenderbuffer | null { return this.ds; }
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
 * so its stencil test runs late), so one tier is the default. Stage 9 (docs/design/K1362_s9_layer_tables.md) capped
 * its surfaces at 3 (s; a pixel with more goes to full) and keeps the label's top surface as a running best (lab):
 * t32rlc3, def 13.95 / muse 18.38 / fat 9.33 ms against t32r's 16.85 / 22.45 / 11.5 on the Pixel (same bench), 0 px
 * on its 12 scenes there and on the desktop. Stage 10 (docs/design/K1362_s10_piece_arrays.md) keeps fewer per-piece
 * values: the ramp membership rides psurf (grp) and pkey reuses ps (ks), 33 piece slots down to 24: t32rlgyc3, def
 * 11.47 / muse 16.3 / fat 7.85 ms against t32rlc3's 12.9 / 17.65 / 8.82 on the Pixel (same bench), 0 px on its 12
 * scenes there and on the desktop. Stage 12 (docs/design/K1362_s12_corners_faces.md) draws a frame whose cells list
 * no corner with the corner code compiled out (kz "frame"): fat 6.80 ms against t32rlgyc3's 7.95-8.17 at 822x1506 and
 * 8.68 against 10.82-11.05 at 1079x1977 (sync4, 1286 MHz); def and muse_hash have corners and draw t32rlgyc3 itself.
 * 0 px on its 12 scenes on the Pixel and the desktop. Routing per cell (kz "route") was 3 ms slower on def.
 * Stage 13 (docs/design/K1362_s13_cell_order.md) skips, in the corner program, a face whose band cannot beat its
 * surface's running maximum (fs "c"): def 12.01 / muse 16.50 ms against 12.55 / 17.03 at 822x1506 and 16.35 / 22.76
 * against 16.66 / 23.25 at 1079x1977 (sync4, 1286 MHz, means of 7 runs over three benches); fat's frames draw the
 * corner-free program unchanged (7.07 / 7.03, 9.73 / 9.79). 0 px on its 12 scenes on the Pixel and the desktop.
 * Stage 14 (docs/design/K1362_s14_corner_loops.md) folds the tangent faces' D factor into that skip and bounds their
 * loop by it (kd): def 11.97 / muse 16.45 / fat 7.13 ms against 12.17 / 16.68 / 7.10 at 822x1506 (sync4, 1286 MHz,
 * means of 10 runs over three benches, p14f and p14h); level on the desktop. 0 px on its 12 scenes on both.
 */
export const GF_TIERS: GfTier[] = [{ p: 3, k: 2, ramps: true, s: 3, lab: true, grp: true, ks: true, kz: "frame", fs: "c", kd: true }];
const UNIFORMS = ["uD", "uOCh", "uOV", "uOPin", "uOArm", "uOK", "uOChk", "uOCell", "uOChL", "uOKL", "uOKC", "uOKB", "uOKA", "uOKP", "uH", "uW", "uAA", "uSigma", "uZt", "uWin", "uRc", "uGrid", "uGDim", "uMap", "uP0", "uP1", "uP2", "uP3", "uRv", "uORvK", "uLk", "uLkP", "uLkG", "uLkF", "uPt", "uGold", "uDyn", "uKPulseU", "uKReachU", "uPulseCol", "uTeleU", "uTeleAtU", "uTeleScale", "uPulseW", "uFx", "uFxStyle", "uFxPh", "uFxLive", "uEx", "uOExK", "uExLive", "uExLook", "uExTw", "uExOn", "uExBr", "uRimA", "uRimB", "uRimC", "uHov", "uGw", "uGwLive", "uRt"];
/** K1362 s12: a program drawn only in frames where some cell lists a corner ("corners") or none does ("none"). */
type GfWhen = "corners" | "none";
interface GfProg {
  prog: WebGLProgram | null;
  u: Map<string, WebGLUniformLocation | null>;
  tier: GfTier | null; split?: 1 | 2; when?: GfWhen;
  // K1456: the app's programs compile async (startProgram above): "spec" until issued, "compiling" until
  // a frame's poll reports completion, then "ready" (or "failed"; GfPass.compileError holds the message).
  // The probe, split and bench forms stay synchronous: state "ready" from construction.
  state: "spec" | "compiling" | "ready" | "failed";
  job: ProgJob | null;
  /** The fragment source, until the program is issued. */
  src: string;
}
/**
 * K1362 s12 kz (gf_glsl.ts cornerRoute): a tier's programs. "route" is free for the corner-free cells, then the tier
 * for the cells with corners (only in a frame where some cell has one); "frame" is free in a frame where no cell has
 * a corner, else the plain tier. Either way a pixel is drawn by a program that computes it as the tier does. Under
 * "frame", fj (the one-pass face loop) goes to the corner-free program only: with corners it was slower on the Pixel.
 * fs "c" (K1362 s13, the exact face skip) goes to the corner programs only: without corners (fat) it was slower.
 */
export function cornerPlan(t: GfTier): { tier: GfTier; when?: GfWhen }[] {
  // K1362 s15 zc: each program becomes its one-configuration form without ramps (P0, writes the depth class) and the
  // ramp tier itself (P1, drawn only on the pixels P0 classed as ramping); gf_glsl.ts zClass. zb (P0 only): zBur
  if (t.zc) {
    const plan = cornerPlan({ ...t, zc: undefined, zb: undefined, zk: undefined, zf: undefined });
    // zk: on corner frames P0 is the free program with the corner scan cut to a route (gf_glsl.ts ZK_SCAN), and P1
    // runs uncapped surfaces (P0 cannot see the corners' surfaces, so it cannot see P1's surface overflow). zf (P0
    // keeps one-piece pixels only, gf_glsl.ts zFast): a corner frame's P1 runs uncapped too; a free frame's P1 keeps
    // its cap, since there np <= p = s and nk == 0
    const free = plan.find((e) => e.when === "none");
    const zf = t.zf ? { zf: true } : {};
    return plan.flatMap((e) => t.zk && e.when === "corners" && free
      ? [{ ...e, tier: { ...free.tier, ramps: false, zc: true, zb: t.zb, ...zf, kz: "zk" as const } }, { ...e, tier: { ...e.tier, s: undefined } }]
      : [{ ...e, tier: { ...e.tier, ramps: false, zc: true, zb: t.zb, ...zf } }, t.zf && e.when === "corners" ? { ...e, tier: { ...e.tier, s: undefined } } : e]);
  }
  const free: GfTier = t.fs === "c" ? { ...t, kz: "free", fs: undefined } : { ...t, kz: "free" };
  if (free.kp || free.kt || free.ko || free.kg || free.ki || free.km || free.kd || free.kh) { free.kh = undefined; free.kp = undefined; free.kt = undefined; free.ko = undefined; free.kg = undefined; free.ki = undefined; free.km = undefined; free.kd = undefined; } // K1362 s14: corner-program forms (the free program has no corner code)
  if (t.kz === "route") return [{ tier: free }, { tier: { ...t, kz: "corner" }, when: "corners" }];
  if (t.kz === "frame") return [{ tier: free, when: "none" }, { tier: { ...t, kz: undefined, fj: undefined }, when: "corners" }];
  return [{ tier: t }];
}

export class GfPass {
  readonly gl: WebGL2RenderingContext;
  /** The tiers' programs, then the full program (last; it draws whatever no tier held). */
  private progs: GfProg[];
  /**
   * K1383 s1: the same programs in their reveal form (gf_reveal.ts revealForm), compiled on the first reveal and
   * drawn only while one runs (setReveal); otherwise the rest frame draws `progs`, unchanged.
   */
  private rprogs: GfProg[] | null = null;
  private rplan: (() => GfProg[]) | null = null;
  /**
   * K1389 s1: the look forms (gf_look.ts lookForm; index 0 plain, 1 over the reveal form), compiled on the first
   * frame that draws the look; the look table rides texture unit 6.
   */
  private lprogs: (GfProg[] | null)[] = [null, null];
  private lplan: ((reveal: boolean) => GfProg[]) | null = null;
  private lkTex: WebGLTexture | null = null;
  private lkRows = 0;
  private lkVer = -1;
  private lk: { gap: number; fade: number } | null = null;
  // K1389 s2: the sample positions (R32F, texture unit 7)
  private lkPTex: WebGLTexture | null = null;
  private lkPRows = 0;
  private lkPVer = -1;
  // K1405: the baked gold paint (R32F, texture unit 8), in the positions' layout
  private ptTex: WebGLTexture | null = null;
  private ptRows = 0;
  private ptVer = -1;
  // K1423: the baked gap window (R32F, texture unit 12), in the positions' layout
  private gwTex: WebGLTexture | null = null;
  private gwRows = 0;
  private gwVer = -1;
  private gwLive = false;
  // K1395 (24D): the baked reveal FX (RGBA32F, texture unit 10; gf_look.ts GfFxTable), live only while revealing
  private fxTex: WebGLTexture | null = null;
  private fxRows = 0;
  private fxVer = -1;
  private fxLive = false;
  // K1414 part 2 (24C): the baked pulse/telegraph geometry (RGBA32F, texture unit 9; gf_look.ts GfDynTable)
  private dynTex: WebGLTexture | null = null;
  private dynRows = 0;
  private dynVer = -1;
  // K1414: the route bands (RGBA32F, texture unit 13; gf_look.ts GfRouteTable)
  private rtTex: WebGLTexture | null = null;
  private rtRows = 0;
  private rtVer = -1;
  private teleAtU = 0;
  private rim: GfRimUniforms | null = null;
  /** K1389 s2: the last positions upload's ms. */
  lkPMs = 0;
  // K1396 (24E): the explore table (RGBA32F, texture unit 11; gf_explore.ts), live only while the renderer declares pieces
  private exTex: WebGLTexture | null = null;
  private exRows = 0;
  private ex: { oK: number; on: number; look: number; breath: number; tw: number } | null = null;
  private rvTex: WebGLTexture | null = null;
  private rvRows = 0;
  private rv: { oK: number } | null = null;
  private vao: WebGLVertexArrayObject;
  private tex: WebGLTexture;
  private packed: GfPacked | null = null;
  private T: GfTables | null = null;
  /** K1362 s12: whether some grid cell of the uploaded tables lists a corner (cornerPlan's per-frame choice). */
  private cellCorners = true;
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
  /** K1439: home membership (the `gfh=1` flag): homeForm on every program, the tables uploaded as T.homeOn, the fade
   * depth uHomeZ from homeFade (world units, the live fadeLength; no rebuild). Off: nothing here changes a program. */
  readonly home: boolean;
  homeFade = 0;
  /** K1362 s7: the split's pieces (gf_split.ts), when the one tier runs as two passes. */
  private pieces: GfPieces | null = null;
  // K1456: the app's compile queue (pollPrograms). khr is null until the first poll asks the context.
  private readonly asyncCompile: boolean = false;
  /** K1468: every program writes packForm's one RGBA32UI output (the app's pass). */
  readonly pack: boolean = false;
  private khr: boolean | null = null;
  private compileErr: string | null = null;
  private compileIssued = 0;
  private compileDone = 0;
  private compileT0 = 0;
  private compileFirstMs = -1;
  private uniformsOf: (prog: WebGLProgram) => Map<string, WebGLUniformLocation | null> = () => new Map();
  /**
   * K1362 s7 "skip": pass 1 also writes depth (1 where the pixel has nothing to draw, 0 elsewhere) and pass 2 is
   * routed by depth alone (0.5 GREATER, no stencil test), so pass 2 never runs on an empty pixel.
   */
  private skip = false;
  /**
   * tiers: GF_TIERS by default; [] draws the full program alone (stage 2's pass). fs: a program's source override
   * (benches; split programs get their pass as the second argument). split (K1362 s7): the one tier as two passes.
   */
  constructor(gl: WebGL2RenderingContext, probe: boolean, tiers: GfTier[] = GF_TIERS, fs?: (tier: GfTier | null, split?: 1 | 2) => string, split: boolean | "skip" | GfSplitForm = false, opts: { home?: boolean; pack?: boolean } = {}) {
    this.gl = gl; this.probe = probe; this.home = !!opts.home;
    const hf = this.home ? homeForm : (src: string): string => src; // K1439
    // K1468: the app's programs write one packed output (packForm) into a GfTarget(1, false, true)
    this.pack = !!opts.pack && !probe && !split && !fs;
    const pf = this.pack ? packForm : (src: string): string => src;
    if (split && (probe || tiers.length !== 1)) throw new Error("GfPass: split needs one tier and no probe");
    const sf: GfSplitForm = split === "skip" ? { skip: true } : typeof split === "object" ? split : {};
    this.skip = !!sf.skip; const keys = !!sf.keys;
    const plan: { tier: GfTier | null; split?: 1 | 2; when?: GfWhen }[] = split ? [{ tier: tiers[0], split: 1 }, { tier: tiers[0], split: 2 }, { tier: null }]
      : [...tiers.flatMap((t) => (probe ? [{ tier: t.zc ? { ...t, zc: undefined } : t }] : cornerPlan(t))), { tier: null }]; // the probe ignores kz and zc (gfFs)
    this.asyncCompile = !probe && !split && !fs;
    const uniformsOf = (prog: WebGLProgram): Map<string, WebGLUniformLocation | null> => {
      const u = new Map<string, WebGLUniformLocation | null>();
      for (const n of UNIFORMS) u.set(n, gl.getUniformLocation(prog, n));
      if (this.home) u.set("uHomeZ", gl.getUniformLocation(prog, "uHomeZ"));
      return u;
    };
    this.uniformsOf = uniformsOf;
    const make = (form: (src: string) => string): GfProg[] => plan.map(({ tier, split: s, when }) => {
      const src = hf(fs ? fs(tier, s) : gfFs(probe, true, tier ?? undefined, s ? { reg: tier?.reg, unroll: tier?.unroll, pack: tier?.pack, split: s, splitSkip: this.skip, splitKeys: keys } : undefined));
      const fsrc = pf(form(src));
      if (this.asyncCompile) return { prog: null, u: new Map(), tier, split: s, when, state: "spec" as const, job: null, src: fsrc };
      const prog = compileProgram(gl, GF_VS, fsrc);
      return { prog, u: uniformsOf(prog), tier, split: s, when, state: "ready" as const, job: null, src: "" };
    });
    this.progs = make((src) => src);
    // K1383 s1: the reveal form exists for the app's programs only (no probe, split or source override)
    if (!probe && !split && !fs) this.rplan = () => make(revealForm);
    if (!probe && !split && !fs) this.lplan = (reveal) => make(reveal ? (src) => lookForm(revealForm(src)) : lookForm);
    if (split) this.pieces = new GfPieces(gl, tiers[0].p, keys);
    this.vao = gl.createVertexArray()!;
    this.tex = gl.createTexture()!;
    this.ext = gl.getExtension("EXT_disjoint_timer_query_webgl2") as TimerExt | null;
  }

  // ---- K1456: the async compile queue (the app's pass only; synchronous passes never queue) ----

  private allSets(): (GfProg[] | null)[] {
    return [this.progs, this.rprogs, this.lprogs[0], this.lprogs[1]];
  }

  /** The set the current frame routes to (look over reveal over plain), creating its specs on demand. */
  private activeProgs(): GfProg[] {
    if (this.lk && this.lplan) {
      const i = this.rv ? 1 : 0;
      if (!this.lprogs[i]) this.lprogs[i] = this.lplan(!!this.rv);
      return this.lprogs[i]!;
    }
    if (this.rv && this.rplan) {
      if (!this.rprogs) this.rprogs = this.rplan();
      return this.rprogs;
    }
    return this.progs;
  }

  /** Sets draw() may fall back to, best first, while the routed set still compiles. */
  private drawSets(): GfProg[][] {
    const out: GfProg[][] = [];
    const add = (set: GfProg[] | null): void => { if (set && !out.includes(set)) out.push(set); };
    add(this.activeProgs());
    add(this.lprogs[0]); add(this.progs); add(this.rprogs); add(this.lprogs[1]);
    return out;
  }

  private static fullOf(set: GfProg[]): GfProg {
    return set.find((g) => !g.tier && g.split === undefined) ?? set[set.length - 1];
  }

  /** Issue order: the routed set's full program (it draws every pixel exactly on its own), then the
   *  tier this frame routes to, then that set's other tier, then the other sets the same way. During
   *  the reveal (K1472 s2) the full program of the set it ends on comes first: a cold link takes
   *  35-75 s and the reveal 12.5 s, so the reveal's own program first only delayed the switch (it
   *  landed after the reveal had ended); warm, both land within a few frames either way. */
  private priority(): GfProg[] {
    const active = this.activeProgs();
    const full = GfPass.fullOf(active);
    const now = active.filter((g) => g !== full && (!g.when || (g.when === "corners") === this.cellCorners));
    const out = [full, ...now, ...active.filter((g) => g !== full && !now.includes(g))];
    if (this.rv) {
      if (this.lk && this.lplan && !this.lprogs[0]) this.lprogs[0] = this.lplan(false);
      const rest = this.lk && this.lplan ? this.lprogs[0] : this.progs;
      if (rest && rest !== active) out.unshift(GfPass.fullOf(rest));
    }
    for (const set of this.allSets()) {
      if (!set || set === active) continue;
      const f = GfPass.fullOf(set);
      for (const g of [f, ...set.filter((x) => x !== f)]) if (!out.includes(g)) out.push(g);
    }
    return out;
  }

  /**
   * K1472 s2: the sources still to issue, in issue order (the compile worker compiles them in this
   * order, and the app links each only once the worker has, so its link reads the cache).
   */
  issueOrder(): string[] {
    if (!this.asyncCompile || this.compileErr) return [];
    return this.priority().filter((g) => g.state === "spec").map((g) => g.src);
  }

  private issue(g: GfProg): void {
    if (!this.compileT0) this.compileT0 = performance.now();
    g.job = startProgram(this.gl, GF_VS, g.src);
    g.state = "compiling";
    this.compileIssued++;
  }

  /** Create one not-yet-built set's specs (idle prewarm, one set a poll so its source build spreads out). */
  private prewarmNext(): void {
    if (!this.rplan || !this.lplan) return;
    if (!this.rprogs) { this.rprogs = this.rplan(); return; }
    if (!this.lprogs[0]) { this.lprogs[0] = this.lplan(false); return; }
    if (!this.lprogs[1]) { this.lprogs[1] = this.lplan(true); }
  }

  /**
   * K1456: one frame's compile step: finish every program the GPU reports complete, then issue the
   * next one in priority order (one at a time: the GPU compiles while the maze stays on screen, and
   * first-ready order stays the priority's). Never reads a status that can wait, except on a context
   * without KHR_parallel_shader_compile, where the completion poll is LINK_STATUS itself.
   */
  pollPrograms(prewarm = true): void {
    if (!this.asyncCompile || this.compileErr) return;
    const gl = this.gl;
    if (this.khr === null) this.khr = !!gl.getExtension("KHR_parallel_shader_compile");
    for (const set of this.allSets()) {
      for (const g of set ?? []) {
        if (g.state !== "compiling" || !g.job) continue;
        if (this.khr && !gl.getProgramParameter(g.job.prog, COMPLETION_STATUS_KHR)) continue;
        try {
          g.prog = finishProgram(gl, g.job);
          g.u = this.uniformsOf(g.prog);
        } catch (e) {
          g.state = "failed";
          g.job = null;
          this.compileErr = e instanceof Error ? e.message : String(e);
          return;
        }
        g.job = null;
        g.state = "ready";
        this.compileDone++;

        if (this.compileFirstMs < 0 && this.compileT0) this.compileFirstMs = performance.now() - this.compileT0;
      }
    }
    if (this.allSets().some((set) => (set ?? []).some((g) => g.state === "compiling"))) return;
    const next = this.priority().find((g) => g.state === "spec");
    if (next) { if (!this.compileGate || this.compileGate(next.src)) this.issue(next); return; }
    if (prewarm) this.prewarmNext();
  }

  /**
   * K1472 s2: when set, a program is issued only once this returns true for its source (the app's
   * compile worker has linked it, so the app's link reads the cache instead of compiling again).
   */
  compileGate: ((src: string) => boolean) | null = null;

  /** K1456: poll until every built set is ready (tests and probes on a stand-in context; a real one spins on the GPU). */
  flushPrograms(): void {
    // No prewarm: only the sets already built are flushed, and no idle set is created here.
    for (let i = 0; i < 100000 && this.pendingCompile(); i++) this.pollPrograms(false);
  }

  /** K1456: the routed set's full program can draw (the moment gf may take the screen over). */
  drawReady(): boolean {
    if (!this.asyncCompile) return true;
    return GfPass.fullOf(this.activeProgs()).state === "ready";
  }

  /** K1456: any built program still compiling, or a set still to prewarm. */
  pendingCompile(): boolean {
    if (!this.asyncCompile || this.compileErr) return false;
    return this.allSets().some((set) => (set ?? []).some((g) => g.state === "spec" || g.state === "compiling"));
  }

  compileError(): string | null { return this.compileErr; }

  /**
   * K1456: every program's (vertex, fragment) sources, the look set first (the first frame's route),
   * for the compile worker (gf_compile_worker.ts), which links them once on a KHR-free context so
   * they persist in the disk cache. Building the sets is source generation only; nothing compiles here.
   */
  compileSources(): [string, string][] {
    if (!this.asyncCompile) return [];
    this.prewarmNext(); this.prewarmNext(); this.prewarmNext();
    const out: [string, string][] = [];
    const seen = new Set<string>();
    for (const set of [this.lprogs[0], this.progs, this.rprogs, this.lprogs[1]]) {
      if (!set) continue;
      const full = GfPass.fullOf(set);
      for (const g of [full, ...set.filter((x) => x !== full)]) {
        if (seen.has(g.src)) continue;
        seen.add(g.src);
        out.push([GF_VS, g.src]);
      }
    }
    return out;
  }

  /** K1456: the queue's numbers for __knotGf.stats. */
  compileInfo(): { issued: number; ready: number; firstMs: number } {
    return { issued: this.compileIssued, ready: this.compileDone, firstMs: this.compileFirstMs };
  }

  get timed(): boolean { return !!this.ext; }

  /** K1383 s1: whether the reveal form can draw (the app's programs). */
  get revealable(): boolean { return !!this.rplan; }

  /**
   * K1383 s1: draw the reveal form over this reveal table until the next call; null draws the original programs.
   * The table rides texture unit 5 (the split's pieces use 1-4).
   */
  setReveal(R: GfRevealTable | null): void {
    if (!R || !this.rplan) { this.rv = null; return; }
    const gl = this.gl;
    if (!this.rprogs) this.rprogs = this.rplan();
    if (!this.rvTex) this.rvTex = gl.createTexture()!;
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this.rvTex);
    const view = R.data.subarray(0, R.rows * GF_TW * 4);
    if (R.rows !== this.rvRows) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GF_TW, R.rows, 0, gl.RGBA, gl.FLOAT, view);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      this.rvRows = R.rows;
    } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GF_TW, R.rows, gl.RGBA, gl.FLOAT, view);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0);
    this.rv = { oK: R.oK };
  }

  /**
   * K1396 (24E): draw the look form's explore sites over this explore table until the next call;
   * null leaves them reading as 1 (the mode-off frame). The table rides texture unit 11.
   */
  setExplore(E: GfExploreTable | null, on = 0, look = 0, breath = 1, tw = 0): void {
    if (!E) { this.ex = null; return; }
    const gl = this.gl;
    if (!this.exTex) this.exTex = gl.createTexture()!;
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.activeTexture(gl.TEXTURE11);
    gl.bindTexture(gl.TEXTURE_2D, this.exTex);
    const view = E.data.subarray(0, E.rows * GF_TW * 4);
    if (E.rows !== this.exRows) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GF_TW, E.rows, 0, gl.RGBA, gl.FLOAT, view);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      this.exRows = E.rows;
    } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GF_TW, E.rows, gl.RGBA, gl.FLOAT, view);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0);
    this.ex = { oK: E.oK, on, look, breath, tw };
  }

  /** K1389 s1: whether the look form can draw (the app's programs). */
  get lookable(): boolean { return !!this.lplan; }
  /** K1389 s1: the look table's texture (the composite reads the colours), null while the look is off. */
  get looking(): boolean { return !!this.lk; }

  /**
   * K1389 s1: draw the look form (o1 = the label's section colour, today's crossing gaps of width gap) over this
   * colour table and these sample positions (s2: gf_look.ts positions, pVer bumped with each new array) until the
   * next call; null draws the original programs. Each uploads only when it changed.
   */
  setLook(L: GfLookTable | null, gap = 0, P: Float32Array | null = null, pVer = 0, Pt: Float32Array | null = null, ptVer = 0, fade = 0, Dyn: Float32Array | null = null, dynVer = 0, teleAtU = 0, Fx: Float32Array | null = null, fxVer = 0, fxLive = false, rim: GfRimUniforms | null = null, Gw: Float32Array | null = null, gwVer = 0, Rt: { data: Float32Array; rows: number } | null = null, rtVer = 0): void {
    if (!L || !P || !this.lplan) { this.lk = null; this.fxLive = false; this.gwLive = false; return; }
    this.fxLive = fxLive;
    const gl = this.gl;
    if (!this.lkTex) this.lkTex = gl.createTexture()!;
    if (!this.lkPTex) this.lkPTex = gl.createTexture()!;
    if (pVer !== this.lkPVer) {
      const t0 = performance.now();
      const rows = Math.max(1, Math.ceil(Math.max(1, L.nPos) / GF_TW));
      gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.activeTexture(gl.TEXTURE7);
      gl.bindTexture(gl.TEXTURE_2D, this.lkPTex);
      const view = P.subarray(0, rows * GF_TW);
      if (rows !== this.lkPRows) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, GF_TW, rows, 0, gl.RED, gl.FLOAT, view);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        this.lkPRows = rows;
      } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GF_TW, rows, gl.RED, gl.FLOAT, view);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      this.lkPVer = pVer;
      this.lkPMs = performance.now() - t0;
    }
    // K1405: the baked gold paint rides unit 8 in the positions' layout (gf_look.ts GfPaintTable)
    if (!this.ptTex) this.ptTex = gl.createTexture()!;
    if (Pt && ptVer !== this.ptVer) {
      const rows = Math.max(1, Math.ceil(Math.max(1, L.nPos) / GF_TW));
      gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.activeTexture(gl.TEXTURE8);
      gl.bindTexture(gl.TEXTURE_2D, this.ptTex);
      const view = Pt.subarray(0, rows * GF_TW);
      if (rows !== this.ptRows) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, GF_TW, rows, 0, gl.RED, gl.FLOAT, view);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        this.ptRows = rows;
      } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GF_TW, rows, gl.RED, gl.FLOAT, view);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      this.ptVer = ptVer;
    }
    // K1414 part 2 (24C): the pulse/telegraph geometry rides unit 9 in the positions' layout (4 texels a sample, K1447)
    if (!this.dynTex) this.dynTex = gl.createTexture()!;
    this.teleAtU = teleAtU;
    if (Dyn && dynVer !== this.dynVer) {
      const rows = Math.max(1, Math.ceil((Math.max(1, L.nPos) * 4) / GF_TW));
      gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.activeTexture(gl.TEXTURE9);
      gl.bindTexture(gl.TEXTURE_2D, this.dynTex);
      const view = Dyn.subarray(0, rows * GF_TW * 4);
      // K1472: RGBA, as the shader's DT() reads it (9b48e44f made this R32F with the FX table below)
      if (rows !== this.dynRows) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GF_TW, rows, 0, gl.RGBA, gl.FLOAT, view);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        this.dynRows = rows;
      } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GF_TW, rows, gl.RGBA, gl.FLOAT, view);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      this.dynVer = dynVer;
    }
    // K1395 (24D): the baked reveal FX rides unit 10 in the positions' layout (2 texels a sample)
    if (!this.fxTex) this.fxTex = gl.createTexture()!;
    if (Fx && fxVer !== this.fxVer) {
      const rows = Math.max(1, Math.ceil((Math.max(1, L.nPos) * 2) / GF_TW));
      gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.activeTexture(gl.TEXTURE10);
      gl.bindTexture(gl.TEXTURE_2D, this.fxTex);
      const view = Fx.subarray(0, rows * GF_TW * 4);
      // K1472: RGBA, as the shader's FT() reads it (lkFx's .y is the reveal alpha that scales ink and
      // coverage). 9b48e44f made this R32F, so .y read 0 and the reveal drew no thread ink at all.
      if (rows !== this.fxRows) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GF_TW, rows, 0, gl.RGBA, gl.FLOAT, view);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        this.fxRows = rows;
      } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GF_TW, rows, gl.RGBA, gl.FLOAT, view);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      this.fxVer = fxVer;
    }
    if (L.version !== this.lkVer || L.rows !== this.lkRows) {
      gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, this.lkTex);
      const view = L.data.subarray(0, L.rows * GF_TW * 4);
      if (L.rows !== this.lkRows) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GF_TW, L.rows, 0, gl.RGBA, gl.FLOAT, view);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        this.lkRows = L.rows;
      } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GF_TW, L.rows, gl.RGBA, gl.FLOAT, view);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      this.lkVer = L.version;
    }
    // K1423: the baked gap window rides unit 12 in the positions' layout (gf_look.ts GfGapTable)
    if (!this.gwTex) this.gwTex = gl.createTexture()!;
    this.gwLive = !!Gw;
    if (Gw && gwVer !== this.gwVer) {
      const rows = Math.max(1, Math.ceil(Math.max(1, L.nPos) / GF_TW));
      gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.activeTexture(gl.TEXTURE12);
      gl.bindTexture(gl.TEXTURE_2D, this.gwTex);
      const view = Gw.subarray(0, rows * GF_TW * 4); // K1458: RGBA (winM, over chain, over arc, scan)
      if (rows !== this.gwRows) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GF_TW, rows, 0, gl.RGBA, gl.FLOAT, view);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        this.gwRows = rows;
      } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GF_TW, rows, gl.RGBA, gl.FLOAT, view);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      this.gwVer = gwVer;
    }
    // K1414: the route bands ride unit 13 (gf_look.ts GfRouteTable)
    if (!this.rtTex) this.rtTex = gl.createTexture()!;
    if (Rt && rtVer !== this.rtVer) {
      gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.activeTexture(gl.TEXTURE13);
      gl.bindTexture(gl.TEXTURE_2D, this.rtTex);
      const view = Rt.data.subarray(0, Rt.rows * GF_TW * 4);
      if (Rt.rows !== this.rtRows) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GF_TW, Rt.rows, 0, gl.RGBA, gl.FLOAT, view);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        this.rtRows = Rt.rows;
      } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GF_TW, Rt.rows, gl.RGBA, gl.FLOAT, view);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      this.rtVer = rtVer;
    }
    this.rim = rim;
    this.lk = { gap, fade };
  }

  upload(T: GfTables): void {
    const gl = this.gl;
    const t0 = performance.now();
    const Th = this.home && !T.homeOn ? { ...T, homeOn: true } : T; // K1439: the build differs from home: true only there
    this.packed = packTables(Th, this.packed ?? undefined, buildKeys(Th));
    const t1 = performance.now();
    this.T = T;
    let kc = false; for (let i = 0; i < T.cellKN.length && !kc; i++) kc = T.cellKN[i] > 0;
    this.cellCorners = kc;
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

  /** Draw into target (bound and cleared here) over rect; the world point of fragment (fx, fy) is map's.
   *  K1456: false when no program that may draw is ready yet (the caller keeps today's frame). */
  draw(target: GfTarget, map: GfMap, rect: [number, number, number, number], time = true): boolean {
    const gl = this.gl;
    const T = this.T;
    const P = this.packed;
    if (!T || !P) return false;
    if (this.pack !== target.uint && !target.float) throw new Error("GfPass: a packed pass draws into a uint target, and only it");
    if (this.asyncCompile) this.pollPrograms();
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
    // K1362 s12 kz: a program for frames with (or without) a corner in some cell (cornerPlan).
    const corners = this.cellCorners;
    const rv = this.rv;
    const lk = this.lk;
    // K1389 s2: the look form writes its colour to the target's second attachment; the original programs only o0.
    // K1468: a packed pass (one RGBA32UI attachment) keeps the target's [ATT0], the only layout ANGLE's D3D11 link compiles
    if (!target.float && !target.uint && target.n > 1) gl.drawBuffers(lk ? (target.n > 2 ? [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2] : [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]) : [gl.COLOR_ATTACHMENT0, gl.NONE]);
    if (lk && !this.lprogs[rv ? 1 : 0]) this.lprogs[rv ? 1 : 0] = this.lplan!(!!rv);
    // K1456: draw the routed set once its full program is ready; while a newly routed set (a reveal's
    // form, say) still compiles, the best ready set draws instead, so the maze never leaves the screen.
    let progs: GfProg[] | null = null;
    for (const set of this.drawSets()) {
      const cand = set.filter((g) => g.state === "ready" && (!g.tier || !g.tier.half || halfOk) && (!g.when || (g.when === "corners") === corners));
      if (cand.some((g) => !g.tier)) { progs = cand; break; }
    }
    if (!progs) return false;
    const routed = progs.length > 1;
    const pieces = this.pieces;
    if (routed) target.ensureStencil();
    if (target.float) for (let i = 0; i < target.n; i++) gl.clearBufferfv(gl.COLOR, i, [0, 0, 0, 0]);
    else if (target.uint) for (let i = 0; i < target.n; i++) gl.clearBufferuiv(gl.COLOR, i, [0, 0, 0, 0]);
    else { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    if (routed && !pieces) { gl.stencilMask(0xff); gl.depthMask(true); gl.clearBufferfi(gl.DEPTH_STENCIL, 0, 1, 0); }
    const [x0, y0, x1, y1] = rect;
    if (x1 <= x0 || y1 <= y0) return true;
    if (pieces) {
      // K1362 s7: pass 1 draws into the pieces (over the target's depth-stencil): their old contents are never read
      // (pass 2 reads only the pixels pass 1 just wrote), so a tile-based GPU need not load them
      pieces.bind(target.w, target.h, target.depthStencil!);
      gl.invalidateFramebuffer(gl.FRAMEBUFFER, pieces.tex.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
      gl.stencilMask(0xff); gl.depthMask(true); gl.clearBufferfi(gl.DEPTH_STENCIL, 0, 1, 0);
    }
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x0, y0, x1 - x0, y1 - y0);
    // K1362 s15 zc: the route is the depth class P0 writes (gf_glsl.ts zClass), with no stencil: P0 always, then the
    // ramp tier at depth 0 (GEQUAL: class 0 only) and full at depth 1 (LEQUAL: class 1 only), neither writing depth
    const zc = progs.some((g) => g.tier?.zc === true);
    if (zc) gl.enable(gl.DEPTH_TEST);
    if (routed && !zc) {
      // stencil 0 = no program has drawn the pixel yet; a program that draws it (does not discard) moves it to 1
      gl.enable(gl.STENCIL_TEST);
      gl.stencilFunc(gl.EQUAL, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
    }
    if (rv) { gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, this.rvTex); }
    if (lk) { gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, this.lkTex); gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, this.lkPTex); gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_2D, this.ptTex); gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, this.dynTex); gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, this.fxTex); if (this.exTex) { gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, this.exTex); } gl.activeTexture(gl.TEXTURE12); gl.bindTexture(gl.TEXTURE_2D, this.gwTex); gl.activeTexture(gl.TEXTURE13); gl.bindTexture(gl.TEXTURE_2D, this.rtTex); }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.bindVertexArray(this.vao);
    const ext = time ? this.ext : null;
    let q: WebGLQuery | null = null; let e: WebGLQuery | null = null;
    if (ext) { q = gl.createQuery()!; gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }
    for (let pi = 0; pi < progs.length; pi++) {
      const g = progs[pi];
      if (zc) {
        if (g.tier?.zc) { gl.depthFunc(gl.ALWAYS); gl.depthMask(true); gl.depthRange(0, 1); }
        else if (g.tier) { gl.depthFunc(gl.GEQUAL); gl.depthMask(false); gl.depthRange(0, 0); }
        else { gl.depthFunc(gl.LEQUAL); gl.depthMask(false); gl.depthRange(1, 1); }
      } else if (routed && pi === progs.length - 1) {
        // the last program writes no route: KEEP lets the stencil test run before the shader even though it discards
        gl.stencilFunc(gl.EQUAL, 0, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        if (this.skip) { gl.enable(gl.STENCIL_TEST); gl.disable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LESS); }
      }
      if (g.split === 1) {
        // pass 1 keeps a pixel (stencil 1) unless it discards; it runs on every pixel of the rect
        gl.stencilFunc(gl.ALWAYS, 1, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
        if (this.skip) { gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.ALWAYS); gl.depthMask(true); }
      } else if (g.split === 2) {
        // pass 2 draws exactly pass 1's pixels into the target, reading their pieces
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.stencilFunc(gl.EQUAL, 1, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        if (this.skip) { gl.disable(gl.STENCIL_TEST); gl.depthFunc(gl.GREATER); gl.depthMask(false); }
        // piece j at unit 1 + j, the corners at unit 4 (uP3); a piece the tier does not hold, nothing
        for (let i = 0; i < 4; i++) { gl.activeTexture(gl.TEXTURE1 + i); gl.bindTexture(gl.TEXTURE_2D, pieces!.unit(i)); }
        gl.activeTexture(gl.TEXTURE0);
      }
      gl.useProgram(g.prog);
      const u = (n: string): WebGLUniformLocation | null => g.u.get(n) ?? null;
      gl.uniform1i(u("uD"), 0);
      if (g.split === 2) for (let i = 0; i < 4; i++) gl.uniform1i(u(`uP${i}`), 1 + i);
      if (rv) { gl.uniform1i(u("uRv"), 5); gl.uniform1i(u("uORvK"), rv.oK); }
      if (lk) { gl.uniform1i(u("uLk"), 6); gl.uniform1i(u("uLkP"), 7); gl.uniform1f(u("uLkG"), lk.gap); gl.uniform1f(u("uLkF"), lk.fade); gl.uniform1i(u("uPt"), 8); const G = knotUniformValues().uKGold; gl.uniform3f(u("uGold"), G ? G[0] : 1, G ? G[1] : 0.8235, G ? G[2] : 0.2902); gl.uniform1i(u("uDyn"), 9); const U = knotUniformValues(); const KP = U.uKPulse; gl.uniform4f(u("uKPulseU"), KP ? KP[0] : 0, KP ? KP[1] : 0, KP ? KP[2] : 2.5, KP ? KP[3] : 1); const KR = U.uKReach; const KH = U.uKHead; gl.uniform4f(u("uKReachU"), KR ? KR[0] : 1e6, KR ? KR[1] : 1, U.uKPaint ? U.uKPaint[3] : 0.5, KH ? KH[0] : 0); const PC = U.uKHlPulse; gl.uniform3f(u("uPulseCol"), PC ? PC[0] : 1, PC ? PC[1] : 1, PC ? PC[2] : 1); const TU = U.uKTele; gl.uniform4f(u("uTeleU"), TU ? TU[0] : 0, TU ? TU[1] : 0, TU ? TU[2] : 0, TU ? TU[3] : 0); gl.uniform1f(u("uTeleAtU"), this.teleAtU); const HV = U.uKHlHover; gl.uniform1f(u("uTeleScale"), HV ? HV[3] : 1); const PW = U.uKPath; gl.uniform1f(u("uPulseW"), PW ? PW[2] : 1); gl.uniform1i(u("uFx"), 10); gl.uniform1f(u("uFxStyle"), U.uKFx ? U.uKFx[0] : 0); const FP = U.uKFx2; gl.uniform4f(u("uFxPh"), FP ? FP[0] : 0, FP ? FP[1] : 0, FP ? FP[2] : 0, FP ? FP[3] : 0); gl.uniform1f(u("uFxLive"), this.fxLive ? 1 : 0); const EX = this.ex; gl.uniform1i(u("uEx"), 11); gl.uniform1i(u("uOExK"), EX ? EX.oK : 0); gl.uniform1f(u("uExLive"), EX ? 1 : 0); gl.uniform1i(u("uExLook"), EX ? EX.look : 0); gl.uniform1f(u("uExTw"), EX ? EX.tw : 0); gl.uniform1f(u("uExOn"), EX ? EX.on : 0); gl.uniform1f(u("uExBr"), EX ? EX.breath : 1); const RM = this.rim; gl.uniform4f(u("uRimA"), RM ? RM.a[0] : -1, RM ? RM.a[1] : 0, RM ? RM.a[2] : 0, RM ? RM.a[3] : 0); gl.uniform4f(u("uRimB"), RM ? RM.b[0] : 0, RM ? RM.b[1] : 0, RM ? RM.b[2] : 1, RM ? RM.b[3] : 0); gl.uniform4f(u("uRimC"), RM ? RM.c[0] : 1, RM ? RM.c[1] : 0, RM ? RM.c[2] : 1, RM ? RM.c[3] : 0); gl.uniform3f(u("uHov"), RM ? RM.hov[0] : 1, RM ? RM.hov[1] : 1, RM ? RM.hov[2] : 1); gl.uniform1i(u("uGw"), 12); gl.uniform1f(u("uGwLive"), this.gwLive ? 1 : 0);  gl.uniform1i(u("uRt"), 13); }
      const o = P.o;
      gl.uniform1i(u("uOCh"), o.ch); gl.uniform1i(u("uOV"), o.v); gl.uniform1i(u("uOPin"), o.pin); gl.uniform1i(u("uOArm"), o.arm);
      gl.uniform1i(u("uOK"), o.k); gl.uniform1i(u("uOChk"), o.chk); gl.uniform1i(u("uOCell"), o.cell); gl.uniform1i(u("uOChL"), o.chl); gl.uniform1i(u("uOKL"), o.kl);
      gl.uniform1i(u("uOKC"), o.kc); gl.uniform1i(u("uOKB"), o.kb); gl.uniform1i(u("uOKA"), o.ka); gl.uniform1i(u("uOKP"), o.kp);
      gl.uniform1f(u("uH"), T.h); gl.uniform1f(u("uW"), T.W); gl.uniform1f(u("uAA"), T.aa); gl.uniform1f(u("uSigma"), T.sigma);
      gl.uniform1f(u("uZt"), T.zt); gl.uniform1f(u("uWin"), T.win); gl.uniform1f(u("uRc"), T.rc);
      if (this.home) gl.uniform1f(u("uHomeZ"), (Math.max(0, this.homeFade) * T.amp) / T.win);
      gl.uniform4f(u("uGrid"), T.gx0, T.gy0, T.G, 0);
      gl.uniform2i(u("uGDim"), T.gW, T.gH);
      gl.uniform4f(u("uMap"), map[0], map[1], map[2], map[3]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (routed) {
      gl.disable(gl.STENCIL_TEST);
      if (zc) { gl.disable(gl.DEPTH_TEST); gl.depthRange(0, 1); gl.depthMask(true); gl.depthFunc(gl.LESS); }
      // the route is per pass: a tile-based GPU need not store it
      gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.DEPTH_STENCIL_ATTACHMENT]);
    }
    if (pieces) {
      for (let i = 0; i < 4; i++) { gl.activeTexture(gl.TEXTURE1 + i); gl.bindTexture(gl.TEXTURE_2D, null); }
      gl.activeTexture(gl.TEXTURE0);
    }
    if (rv) { gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0); }
    if (lk) { gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE12); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE13); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0); }
    if (ext && q) {
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      e = gl.createQuery()!;
      gl.beginQuery(ext.TIME_ELAPSED_EXT, e);
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      this.pending.push({ q, e });
    }
    gl.bindVertexArray(null);
    gl.disable(gl.SCISSOR_TEST);
    return true;
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
    for (const set of this.allSets()) for (const g of set ?? []) {
      if (g.job) { gl.deleteProgram(g.job.prog); gl.deleteShader(g.job.vs); gl.deleteShader(g.job.fs); g.job = null; }
      if (g.prog) gl.deleteProgram(g.prog);
    }
    if (this.rvTex) gl.deleteTexture(this.rvTex);
    if (this.fxTex) gl.deleteTexture(this.fxTex);
    if (this.exTex) gl.deleteTexture(this.exTex);
    this.pieces?.dispose();
    gl.deleteVertexArray(this.vao);
    gl.deleteTexture(this.tex);
  }
}

// The app's composite: the pass's (ink, coverage) target over the canvas,
// premultiplied (ink over the fill).
export const COMP_FS = `#version 300 es
precision highp float;
uniform sampler2D uC;
uniform vec3 uFill;
uniform vec3 uInk;
uniform float uFlip;
out vec4 o;
void main() {
  ivec2 q = ivec2(gl_FragCoord.xy);
  if (uFlip > 0.5) q.y = textureSize(uC, 0).y - 1 - q.y;
  vec4 c = texelFetch(uC, q, 0);
  float ink = c.x; float cov = c.y;
  o = vec4(uInk * ink + uFill * cov * (1.0 - ink), ink + (1.0 - ink) * cov);
}`;

// K1468: ONE OUTPUT PER PROGRAM. ANGLE's D3D11 link compiles a pixel shader for one output layout only: the first
// output alone (GetDefaultOutputLayoutFromShader). The look forms wrote three targets, so their first draw compiled
// the [ATT0, ATT1, ATT2] variant synchronously on the GPU process's main thread: 50-70 s on a cold shader cache, and
// the GPU watchdog killed the process (context lost, gf recompiled, the loop repeated). KHR_parallel_shader_compile
// never reaches that compile. packForm gives every app program one RGBA32UI output instead (x, y, z = the three
// targets' bytes, w 0), and packComp reads it, so the link's variant is the one every draw uses.
// Bit-exact with the RGBA8 targets on the desktop's AMD (.claude/probes/K1468/exact.mjs, 697k values, NaN and
// infinities included): AMD exports colour to an 8-bit target as fp16 rounded toward zero, then rounds that to the
// byte, so gfB truncates the float to fp16's 10 mantissa bits before rounding (byte = fp16 * 255 + 0.5 has no ties).
// Other GPUs round the fp32 itself: there gfB's byte can be 1 lower where x * 255's fraction is in [0.5, 0.63).
// The read: RGBA8 -> float is k / 255 correctly rounded, which a shader division is not (504 of 1024 bytes 1 ulp off
// on D3D11), so the bytes index a table of those floats (GF_U8, exact).
const PACK_BLOCK = "layout(location = MAXP) out uvec2 o3;\n#else\n";
const PACK_END = "#if defined(SPLIT1) && defined(SPLITSKIP)\n";
const PACK_DECL = `layout(location = 0) out highp uvec4 oP; // K1468: packForm's one output
vec4 o0 = vec4(0.0); vec4 o1 = vec4(0.0); vec4 o2 = vec4(0.0);
highp uint gfB(highp vec4 v) {
  highp vec4 c = uintBitsToFloat(floatBitsToUint(clamp(v, 0.0, 1.0)) & 0xffffe000u);
  highp uvec4 b = uvec4(c * 255.0 + 0.5);
  return b.x | (b.y << 8) | (b.z << 16) | (b.w << 24);
}
`;
const PACK_WRITE = "#if !defined(PROBE) && !defined(SPLIT1)\n  oP = uvec4(gfB(o0), gfB(o1), gfB(o2), 0u); // K1468\n#endif\n";

/** K1468: a program's outputs (one to three vec4 targets: the plain and look forms) as one packed RGBA32UI output. */
export function packForm(src: string): string {
  const a = src.indexOf(PACK_BLOCK);
  const b = a < 0 ? -1 : src.indexOf("#endif\n", a);
  if (a < 0 || b < 0 || src.indexOf(PACK_BLOCK, a + 1) >= 0 || src.split(PACK_END).length !== 2) throw new Error("packForm: the output block or main's end moved");
  const head = a + PACK_BLOCK.length;
  if (!/^(?:(?:layout\(location = [0-2]\) )?out vec4 o[0-2];\n)+$/.test(src.slice(head, b))) throw new Error("packForm: unexpected outputs");
  return src.slice(0, head) + PACK_DECL + src.slice(b).replace(PACK_END, PACK_WRITE + PACK_END);
}

const GF_U8 = `const float GF_U8[256] = float[256](${Array.from({ length: 256 }, (_, k) => { const s = Math.fround(k / 255).toPrecision(9); return /[.e]/.test(s) ? s : `${s}.0`; }).join(", ")});
vec4 gfU8(highp uint w) { return vec4(GF_U8[w & 255u], GF_U8[(w >> 8) & 255u], GF_U8[(w >> 16) & 255u], GF_U8[w >> 24]); }
`;

/** K1468 s2: gf_look.ts LOOK_COMP_FS's fringe search after the generic rewrite, and its lazy form. */
const FRINGE: [string, string][] = [
  ["vec4 j = gfU8(texelFetch(uC, r, 0).y);", "highp uint jw = texelFetch(uC, r, 0).y;"],
  ["float bd = 1e9;", "float bd = 1e9; ivec2 rb = q;"],
  ["if (j.a > 0.0 && dd < bd) { bd = dd; k = j; hh = gfU8(texelFetch(uC, r, 0).z); }\n    }\n",
    "if ((jw >> 24) != 0u && dd < bd) { bd = dd; rb = r; }\n    }\n    if (bd < 1e9) { highp uvec2 wb = texelFetch(uC, rb, 0).yz; k = gfU8(wb.x); hh = gfU8(wb.y); }\n"],
];

/** K1468: a composite over the RGBA8 targets uC (o0), uCo (o1) and uHi (o2) made to read packForm's one uint target uC. */
export function packComp(fs: string): string {
  const lane: Record<string, string> = { uC: "x", uCo: "y", uHi: "z" };
  let out = fs.replace("uniform sampler2D uC;\n", "uniform highp usampler2D uC;\n" + GF_U8).replace("uniform sampler2D uCo;\n", "").replace("uniform sampler2D uHi;\n", "");
  out = out.replace(/texelFetch\((uC|uCo|uHi), ((?:[^(),]|\([^()]*\))+), 0\)/g, (_m, s: string, at: string) => `gfU8(texelFetch(uC, ${at}, 0).${lane[s]})`);
  out = out.replace(/textureSize\((uCo|uHi), 0\)/g, "textureSize(uC, 0)");
  // K1468 s2: the look composite's 5x5 fringe search tests each tap's label alpha only. Converting all four
  // bytes of 25 taps through GF_U8 doubled the composite's GPU time (0.25 vs 0.13 ms on link A, the RGBA8
  // targets' figure); the search now tests the alpha byte and converts the chosen texel once, same output.
  if (out.includes(FRINGE[0][0])) for (const [a, b] of FRINGE) {
    if (!out.includes(a)) throw new Error(`packComp: the fringe search changed (${a})`);
    out = out.replace(a, b);
  }
  if (!out.includes("usampler2D uC;") || /\buCo\b|\buHi\b|sampler2D uC;/.test(out.replace("usampler2D uC;", ""))) throw new Error("packComp: a target read was not converted");
  return out;
}

/**
 * K1389 s1: the look's composite inputs: the colour table's texture and first colour texel (GfLookTable.oK), the
 * thread look (0 fill, 1 border, 2 both) and the border colour (w 1 when one is set, else the section's own stroke).
 */
export interface GfLookComp { mode: number; bd: [number, number, number, number]; fx?: boolean }

export class GfComposite {
  // K1456: both composite programs compile async like the pass's (startProgram): on a cold cache even
  // this 525-char program waited 34 s in the queue behind gf's programs when its status was read.
  private job: ProgJob | null;
  private ljob: ProgJob | null;
  private prog: WebGLProgram | null = null;
  private lprog: WebGLProgram | null = null;
  private lu = new Map<string, WebGLUniformLocation | null>();
  private vao: WebGLVertexArrayObject;
  private uC: WebGLUniformLocation | null = null; private uFill: WebGLUniformLocation | null = null; private uInk: WebGLUniformLocation | null = null; private uFlip: WebGLUniformLocation | null = null;
  private khr: boolean | null = null;
  private err: string | null = null;
  readonly gl: WebGL2RenderingContext;
  /** K1468: reads a packed pass's one RGBA32UI target (packComp). */
  readonly packed: boolean;
  constructor(gl: WebGL2RenderingContext, opts: { packed?: boolean } = {}) {
    this.gl = gl;
    this.packed = !!opts.packed;
    const pc = this.packed ? packComp : (fs: string): string => fs;
    this.job = startProgram(gl, GF_VS, pc(COMP_FS));
    this.ljob = startProgram(gl, GF_VS, pc(LOOK_COMP_FS));
    this.vao = gl.createVertexArray()!;
  }

  /** K1456: one frame's poll of the two composite programs. */
  poll(): void {
    if (this.err) return;
    const gl = this.gl;
    if (this.khr === null) this.khr = !!gl.getExtension("KHR_parallel_shader_compile");
    const step = (job: ProgJob | null, take: (p: WebGLProgram) => void): ProgJob | null => {
      if (!job) return null;
      if (this.khr && !gl.getProgramParameter(job.prog, COMPLETION_STATUS_KHR)) return job;
      try {
        take(finishProgram(gl, job));
      } catch (e) {
        this.err = e instanceof Error ? e.message : String(e);
      }
      return null;
    };
    this.job = step(this.job, (p) => {
      this.prog = p;
      this.uC = gl.getUniformLocation(p, "uC");
      this.uFill = gl.getUniformLocation(p, "uFill");
      this.uInk = gl.getUniformLocation(p, "uInk");
      this.uFlip = gl.getUniformLocation(p, "uFlip");
    });
    if (!this.err) this.ljob = step(this.ljob, (p) => { this.lprog = p; });
  }

  /** K1456: the plain composite can draw / the look composite can draw / a compile failed. */
  get ready(): boolean { return !!this.prog; }
  get lookReady(): boolean { return !!this.lprog; }
  compileError(): string | null { return this.err; }
  /** Into the currently bound framebuffer (the canvas, or with `dest` the ripple filter's texture: its viewport, Y flipped), viewport w x h.
   *  K1456: false while the needed composite program still compiles (the caller keeps today's frame). */
  draw(src: GfTarget, fill: [number, number, number], ink: [number, number, number], look?: GfLookComp | null, dest?: { flip: boolean; w: number; h: number } | null): boolean {
    this.poll();
    if (look ? !this.lprog : !this.prog) return false;
    const gl = this.gl;
    gl.viewport(0, 0, dest ? dest.w : src.w, dest ? dest.h : src.h);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    // K1454: on the canvas the destination alpha is the backdrop's (kept); in the ripple filter's
    // texture it starts at 0 and the filter reads it, so there the composite must write its own.
    if (dest?.flip) gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    else gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
    if (look) {
      if (!this.lu.size) for (const n of ["uC", "uCo", "uHi", "uLook", "uBd", "uFill", "uRvFx", "uFlip"]) this.lu.set(n, gl.getUniformLocation(this.lprog!, n));
      const u = (n: string): WebGLUniformLocation | null => this.lu.get(n) ?? null;
      gl.useProgram(this.lprog);
      // K1389 s2: the pass's second attachment holds the colours; K1425: the third holds the border indication
      // (K1468: a packed target holds all three in its one texture)
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.packed ? null : src.tex[1]);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.packed ? null : src.tex[2] ?? src.tex[0]);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src.tex[0]);
      gl.uniform1i(u("uC"), 0);
      gl.uniform1i(u("uCo"), 1);
      gl.uniform1i(u("uHi"), 2);
      gl.uniform1i(u("uLook"), look.mode);
      gl.uniform4f(u("uBd"), look.bd[0], look.bd[1], look.bd[2], look.bd[3]);
      gl.uniform3f(u("uFill"), fill[0], fill[1], fill[2]);
      gl.uniform1f(u("uRvFx"), look.fx ? 1 : 0);
      gl.uniform1f(u("uFlip"), dest?.flip ? 1 : 0);
      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      return true;
    }
    gl.useProgram(this.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex[0]);
    gl.uniform1i(this.uC, 0);
    gl.uniform3f(this.uFill, fill[0], fill[1], fill[2]);
    gl.uniform3f(this.uInk, ink[0], ink[1], ink[2]);
    gl.uniform1f(this.uFlip, dest?.flip ? 1 : 0);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    return true;
  }
  dispose(): void {
    const gl = this.gl;
    for (const job of [this.job, this.ljob]) if (job) { gl.deleteProgram(job.prog); gl.deleteShader(job.vs); gl.deleteShader(job.fs); }
    if (this.prog) gl.deleteProgram(this.prog);
    if (this.lprog) gl.deleteProgram(this.lprog);
    gl.deleteVertexArray(this.vao);
  }
}
