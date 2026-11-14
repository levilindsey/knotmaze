// K1362 s6 (from s5, s4): stage 5's tile route is gone (gf_tiles.ts deleted). A tier "<p><k>[r][h][s][u]" adds s (the
// register form: arrays as scalars behind selects) and u (constant trip counts); fullS / fullU are the full program in
// those forms. Each record gains upload: pass.upload's main-thread ms over 5 uploads (packing, texture, key tables).
// From s4: the routed pass (gf_pass.ts GF_TIERS) against stage 3's program, timed WITHOUT a timer query so the same
// bundle runs on the desktop and the Pixel (k1362s3_entry.ts's method: sync4 = 4 targets rotated, a 1-px readPixels
// sync; frame1 = one pass per rAF; the "empty" variant is subtracted by the summary). Per scene (a K868 scene JSON):
//   pass     each variant is a GfPass (its own programs and texture), named:
//              s3      stage 3's shipped program (k1362s13_gf_glsl_s3.ts), drawn alone
//              full    today's full program alone (probe-only state removed)
//              empty   a trivial fragment over the same rect
//              t<tiers> the tiers, then the full program, through the stencil route; each tier is "<p><k>[r][h]"
//                      (r: carries ramps, h: mediump), joined by "_": t43 = {p4 k3 no ramps}, t22_43h, t43_43r
//   cover    per tiered variant, the share of the rect each prefix of its tiers draws (the rest goes to full)
//   cmp      every variant read back in RGBA32F against cfg.ref: ink (r) and coverage (g) differences
// K1362 s12: a tier letter j (after e, before c<n>) is kz: j route, jf frame, jc the corner program alone, jx free alone (gf_glsl.ts cornerRoute).
// K1362 s12: a tier letter p (after e, before j) is fj, the one-pass face loop (ps: fj "s", v a scalar per face) (gf_glsl.ts faceJoin).
// K1362 s13: a tier letter L (after j, before c<n>) is lz, the face loop in sorted order up to the first opaque place (gf_glsl.ts lazyFaces);
// a tier letter F (after L) is fs, the exact face skip (gf_glsl.ts faceSkip).
// Each (variant, mode) records its phone-side Date.now() window, so k1362s13_gpuclk.mjs puts the clock beside it.
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";
import { GfPass, GfTarget, type GfMap } from "../../../src/render/gpu_field/gf_pass";
import { gfFs, type GfTier } from "../../../src/render/gpu_field/gf_glsl";
import { GfEval } from "../../../src/render/gpu_field/eval";
import { buildKeys } from "../../../src/render/gpu_field/gf_keys";
import type { FieldScene } from "../../../src/render/field/scene";

type Rect = [number, number, number, number];
export interface BenchCfg {
  scenes: string[]; base: string; w: number; h: number; fit: number;
  nPass: number; warmMs: number; settleFrames: number; variants: string[]; modes: string[];
  cover?: boolean; ref?: string; cmp?: boolean;
  /** K1362 s8: crop rects (fractions of the grid rect) timed at sync4 after the whole rect. */
  crops?: number[][];
  /** K1362 s8: per-pixel loop-trip counts of the tier program (and per-tile maxima, a SIMD model). */
  count?: boolean;
  countTier?: string;
}

// K1362 s8: the probe program of a tier (or the full program) with loop-trip counters, outputs
//   o0 = (ink, cov, nL burial-loop trips, nPd pieceD segment trips), o1 = (chunks visited, chunks past the box test,
//   key trips (binary search + member arms), segments tested), o2 = (corners visited, pieces, layerings, 1)
function countFs(tier: GfTier | null): string {
  let s = gfFs(true, true, tier ?? undefined);
  const rep = (a: string, b: string, all = false): void => {
    if (!s.includes(a)) throw new Error("countFs: missing " + a.slice(0, 50));
    s = all ? s.split(a).join(b) : s.replace(a, b);
  };
  rep("int labC;", "int nCk = 0; int nCp = 0; int nB = 0; int nL = 0; int nPd = 0; int nCf = 0;\nint labC;");
  rep("int ch = int(L4(uOChL, q));", "nCk++; int ch = int(L4(uOChL, q));");
  rep("if (bx * bx + by * by >= rc2) continue;", "if (bx * bx + by * by >= rc2) continue; nCp++;");
  rep("while (hi - lo > 1) {", "while (hi - lo > 1) { nB++;");
  rep("for (int i = a0; i < a0 + an; i++) {", "for (int i = a0; i < a0 + an; i++) { nB++;", true);
  rep("for (int q = plo[j]; q <= phi[j]; q++) {", "for (int q = plo[j]; q <= phi[j]; q++) { nPd++;");
  rep("layers(p);", "nCf++; layers(p);");
  rep("for (int m = 0; m < np && bur < 1.0; m++) {", "for (int m = 0; m < np && bur < 1.0; m++) { nL++;", true);
  rep("o0 = vec4(oInk, oCov, float(oCh), oS);", "o0 = vec4(oInk, oCov, float(nL), float(nPd));");
  rep("o1 = vec4(float(oWk), float(oWa), float(oWb), float(nSeg));", "o1 = vec4(float(nCk), float(nCp), float(nB), float(nSeg));");
  rep("o2 = vec4(float(nK), float(np), float(ns), 0.0);", "o2 = vec4(float(nK), float(np), float(nCf), " + (tier ? "1.0" : "2.0") + ");");
  return s;
}
function readAtt(gl: WebGL2RenderingContext, tg: GfTarget, r: Rect, i: number): Float32Array {
  const out = new Float32Array((r[2] - r[0]) * (r[3] - r[1]) * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fbo);
  gl.readBuffer(gl.COLOR_ATTACHMENT0 + i);
  gl.readPixels(r[0], r[1], r[2] - r[0], r[3] - r[1], gl.RGBA, gl.FLOAT, out);
  gl.readBuffer(gl.COLOR_ATTACHMENT0);
  return out;
}
// per counter: the mean per px, then for each tile size the mean over tiles of the tile's max (a SIMD group runs
// a loop as long as its longest lane), as per-px work; plus the share of px and of tiles with any piece
const TILES: [number, number][] = [[1, 1], [2, 2], [4, 4], [8, 4], [8, 8], [16, 16], [32, 32]];
function countStats(A: Float32Array[], W: number, H: number): Record<string, unknown> {
  const names = ["nL", "nPd", "nCk", "nCp", "nB", "nSeg", "nK", "np", "nCf"];
  const get = (k: number, i: number): number => (k < 2 ? A[0][i * 4 + 2 + k] : k < 6 ? A[1][i * 4 + k - 2] : A[2][i * 4 + k - 6]);
  const out: Record<string, unknown> = { W, H, tiles: TILES.map((t) => t.join("x")) };
  let drawn = 0; for (let i = 0; i < W * H; i++) if (A[2][i * 4 + 3] > 0) drawn++;
  out.drawn = +(drawn / (W * H)).toFixed(4);
  for (let k = 0; k < names.length; k++) {
    const row: number[] = [];
    for (const [tw, th] of TILES) {
      let sum = 0; let nt = 0;
      for (let y0 = 0; y0 < H; y0 += th) for (let x0 = 0; x0 < W; x0 += tw) {
        let mx = 0; let n = 0;
        for (let y = y0; y < Math.min(H, y0 + th); y++) for (let x = x0; x < Math.min(W, x0 + tw); x++) { const v = get(k, y * W + x); if (v > mx) mx = v; n++; }
        sum += mx * n; nt += n;
      }
      row.push(+(sum / nt).toFixed(3));
    }
    out[names[k]] = row;
  }
  // share of tiles holding any piece (np > 0) against the share of px
  out.anyPiece = TILES.map(([tw, th]) => { let a = 0; let n = 0; for (let y0 = 0; y0 < H; y0 += th) for (let x0 = 0; x0 < W; x0 += tw) { let any = false; let m = 0; for (let y = y0; y < Math.min(H, y0 + th); y++) for (let x = x0; x < Math.min(W, x0 + tw); x++) { if (get(7, y * W + x) > 0) any = true; m++; } if (any) a += m; n += m; } return +(a / n).toFixed(4); });
  return out;
}

const sortN = (a: number[]): number[] => a.slice().sort((x, y) => x - y);
const q = (a: number[], p: number): number => { const s = sortN(a); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const st = (a: number[]): { n: number; p50: number; p90: number; min: number; max: number } =>
  ({ n: a.length, p50: +q(a, 0.5).toFixed(3), p90: +q(a, 0.9).toFixed(3), min: +q(a, 0).toFixed(3), max: +q(a, 1).toFixed(3) });
const raf = (): Promise<number> => new Promise((r) => requestAnimationFrame((t) => r(t)));

const EMPTY = `#version 300 es
precision highp float;
out vec4 o0;
void main() { o0 = vec4(gl_FragCoord.xy * 1e-4, 0.0, 1.0); }`;
const DISCARD = `#version 300 es
precision highp float;
out vec4 o0;
void main() { discard; }`;

function parseTiers(name: string): GfTier[] {
  return name.slice(1).split("_").map((t) => {
    const m = /^(\d)(\d)(r?)(h?)(s?)(u?)(k[fi]?|)(o?)(1?)(b?)(f?)(l?)(g?)(q?)(y?)(z?)(x?)(w?)([nm]?)(v?)(a?)(d?)(e?)(ps?|)(j[fcx]?|)(L?)(F?)(?:c(\d))?$/.exec(t);
    if (!m) throw new Error("bad tier " + t);
    const pack = m[7] === "k" ? true : m[7] === "kf" ? "f" : m[7] === "ki" ? "i" : false; // K1362 s6: k, kf, ki
    return { p: +m[1], k: +m[2], ramps: m[3] === "r", half: m[4] === "h", reg: m[5] === "s", unroll: m[6] === "u", pack, oldKeys: m[8] === "o", one: m[9] === "1", bx: m[10] === "b", fast: m[11] === "f", lab: m[12] === "l", grp: m[13] === "g", kq: m[14] === "q", ks: m[15] === "y", lh: m[16] === "z", so: m[17] === "x", cs: m[18] === "w", kl: m[19] === "n", kr: m[19] === "m", vs: m[20] === "v", ga: m[21] === "a", sc: m[22] === "d", kc: m[23] === "e", fj: m[24] === "ps" ? "s" : m[24] === "p", kz: m[25] === "j" ? "route" : m[25] === "jf" ? "frame" : m[25] === "jc" ? "corner" : m[25] === "jx" ? "free" : undefined, lz: m[26] === "L", fs: m[27] === "F", s: m[28] ? +m[28] : undefined } as GfTier & { oldKeys?: boolean };
  });
}
// K1362 s8 attribution (NOT exact, timing only): the t32r tier program with one part cut, a<part>[+<part>...]
const ATT: Record<string, [string, string][]> = {
  nobur: [["float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, q)));", "float wb2 = 0.0;"], ["float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, T)));", "float wb2 = 0.0;"]],
  noloop: [["for (int m = 0; m < np && bur < 1.0; m++) {", "for (int m = 0; m < 0; m++) {"]],
  once: [["for (int cfg = 0; cfg <= nr; cfg++) {", "for (int cfg = 0; cfg <= 0; cfg++) {"]],
  nolay: [["layers(p);", "labC = -1;"]], // s11: sv may be gone (vs)
  oncer: [["for (int cfg = 0; cfg <= nr; cfg++) {", "for (int cfg = 0; cfg <= min(nr, int(uAA)); cfg++) {"]],
  // K1362 s9: which part of the layering's code sets the cost (each cut lets the compiler drop that part's code)
  notan: [["#define TANGENT 1", ""]],
  nokf: [["float val = (1.0 - bur) * band2(Dk);", "float val = 0.0;"]],
  nopb: [["float val = (1.0 - bur) * band2(h - X);", "float val = band2(h - X);"]],
  nogap: [["if (!(gap < zt)) continue;", "continue;"]],
  // s10: PC(j) reads pc[j]; the grp / ks keys loop takes ps[j] as sj (the source holds both #if branches)
  nokey: [["float pz = depth(PC(j), ps[j], KB);", "float pz = 0.0;"], ["float pz = depth(PC(j), sj, KB);", "float pz = 0.0;"]],
  // s11 (inexact, timing only): the layering without its sa array (D folded into sv) or its sv array (v folded into sa)
  nosa: [["#define SAW(e, x) sa[e] = x;", "#define SAW(e, x) sv[e] = max(sv[e], x);"], ["#define SAR(e) sa[e]", "#define SAR(e) sv[e]"]],
  nosv: [["#define SVW(e, x) sv[e] = x;", "#define SVW(e, x) float vv_ = x;"], ["#define SAW(e, x) sa[e] = x;", "#define SAW(e, x) sa[e] = max(x, vv_);"], ["#define SVR(e) sv[e]", "#define SVR(e) sa[e]"]],
  // s11 (inexact, timing only): no face loop (each surface gets fixed v and a), no foot arrays (q = p), no corner keys
  noface: [["for (int e = 0; e < ns; e++) {", "for (int e = 0; e < ns; e++) { SVW(e, 0.5) SAW(e, 0.5) } for (int e = 0; e < 0; e++) {"]],
  nofoot: [["vec2 f = vec2(pfx[j], pfy[j]);", "vec2 f = p;"]],
  nocorn: [["kSec[nk] = sec; kk[nk] = k; krho[nk] = rho; kIn[nk] = !inR ? 0 : rho > K0.z - aa ? 2 : 1; nk++;", ""], ["kk[nk] = k; KR(krho[nk] = KSV(rho, sec);) nk++;", ""]],
  // no corner burial of a piece's face (the ring, sector and arm tests per piece), and the arm test alone
  nokb: [["for (int i = 0; i < nk && bur < 1.0; i++) {", "for (int i = 0; i < 0; i++) {"]],
  noarm: [["inSector(k, q) && outsideArms(k, PC(j), q)", "inSector(k, q)"]],
  // the scan keeps its corners (and overflows on them), but layers() sees none; and layers() without the corner keys
  nolk: [["  ns = 0;\n#ifdef SCAP\n  sOvf = false;", "  ns = 0; nk = 0;\n#ifdef SCAP\n  sOvf = false;"]],
  nokey: [["  for (int i = 0; i < nk; i++) {\n#ifdef KLEAN\n    int k = kk[i]; float krI;", "  for (int i = 0; i < 0; i++) {\n#ifdef KLEAN\n    int k = kk[i]; float krI;"]],
  // the brief's probe 1: every 2x2 block evaluates one world point (no divergence inside a quad, the fetches shared)
  quad: [["vec2 p = vec2(uMap.x * gl_FragCoord.x + uMap.y, uMap.z * gl_FragCoord.y + uMap.w);", "vec2 fc2 = floor(gl_FragCoord.xy * 0.5) * 2.0 + 0.5; vec2 p = vec2(uMap.x * fc2.x + uMap.y, uMap.z * fc2.y + uMap.w);"]],
  // s11 (EXACT, a candidate): the scan's tj[8] array as two scalars; a third passing thru corner overflows to full
  tj: [["int nTj = 0; int tj[8];", "int nTj = 0; int tj0 = 0; int tj1 = 0;"],
    ["if (nTj < 8) tj[nTj++] = int(K1.w); }", "if (nTj == 0) tj0 = int(K1.w); else if (nTj == 1) tj1 = int(K1.w); else ovf = true; nTj++; }"],
    ["bool same = false; for (int i = 0; i < nTj; i++) if (tj[i] == int(K1.w)) same = true;", "bool same = (nTj > 0 && tj0 == int(K1.w)) || (nTj > 1 && tj1 == int(K1.w));"]],
  // s11 (EXACT, a candidate): one scalar; a passing thru corner of a second chain overflows to full
  tjo: [["int nTj = 0; int tj[8];", "int nTj = 0; int tj0 = 0;"],
    ["if (nTj < 8) tj[nTj++] = int(K1.w); }", "if (nTj == 0) tj0 = int(K1.w); else if (tj0 != int(K1.w)) ovf = true; nTj++; }"],
    ["bool same = false; for (int i = 0; i < nTj; i++) if (tj[i] == int(K1.w)) same = true;", "bool same = tj0 == int(K1.w);"]],
  // K1362 s13 (inexact, timing only; on an lz tier): what a cell-order form could at best save. The faces stream in
  // sorted order into the composite (no sv / sa, no tie mix, stop once opaque): the sort stays.
  strm: [["int labC; float labS;", "float sTt; float sInk; int labC; float labS;"],
    ["  bool lzX = false;", "  bool lzX = false; sTt = 1.0; sInk = 0.0;"],
    ["    SVW(e, v) SAW(e, ss(-aa, aa, D))", "    { float c_ = sTt * v; if (c_ > 0.0) sInk += c_; sTt *= 1.0 - ss(-aa, aa, D); }"],
    ["    if (D > 2.0 * aa) { if (!(lzI + 1 < ns) || skey[SORD(lzI)] - skey[SORD(lzI + 1)] >= 2.0 * uZt) break; lzX = true; }", "    if (!(sTt > 0.0)) break;"],
    ["  float r = comp(-1);", "  cCov = 1.0 - max(sTt, 0.0); float r = min(1.0, sInk);"],
    ["if (!(gap < zt)) continue;", "continue;"]],
  // the identity (the same program under a second name): a bench lists a variant once, so this is a true repeat
  id: [["vec2 q = f + (h * (p - f)) / X;", "vec2 q = f + (h * (p - f)) / X;"]],
};
function attFs(t: GfTier, parts: string[]): string {
  let s = gfFs(false, true, t);
  for (const pt of parts) for (const [a, b] of ATT[pt]) { if (!s.includes(a)) throw new Error("attFs: missing " + a.slice(0, 40)); s = s.split(a).join(b); }
  return s;
}
function makePass(gl: WebGL2RenderingContext, name: string, fullFs?: string): GfPass {
  { const m = /^a([a-z+]+)(?:@(t\w+))?$/.exec(name); if (m) { const [t] = parseTiers(m[2] ?? "t32r"); const parts = m[1].split("+"); return new GfPass(gl, false, [t], (tt) => (tt ? attFs(tt, parts) : gfFs(false, true))); } }
  // K1362 s12 attribution (timing only; the last program discards): z<t|f|c>@<tier> draws one program alone, the plain tier (t), its free program (f) or its corner program (c)
  { const m = /^z([tfc])@(t\w+)$/.exec(name); if (m) { const [t] = parseTiers(m[2]); const tt: GfTier = { ...t, kz: m[1] === "t" ? undefined : m[1] === "f" ? "free" : "corner" }; return new GfPass(gl, false, [tt], (x) => (x ? gfFs(false, true, x) : DISCARD)); } }
  if (name === "empty") return new GfPass(gl, false, [], () => EMPTY);
  // K1362 s8, the per-pass cost: emptyS = the route alone (depth-stencil clear, stencil test, two discarding draws);
  // tE = the tier, then a discarding last program in place of full (inexact: what full's draw adds)
  if (name === "emptyS") { const [t] = parseTiers("t32r"); return new GfPass(gl, false, [t], () => EMPTY); }
  if (name === "tE") { const [t] = parseTiers("t32r"); return new GfPass(gl, false, [t], (tt) => (tt ? gfFs(false, true, tt) : EMPTY)); }
  if (name === "full") return new GfPass(gl, false, []);
  if (name === "fullS") return new GfPass(gl, false, [], () => gfFs(false, true, undefined, { reg: true })); // K1362 s6: the full program, register form
  if (name === "fullU") return new GfPass(gl, false, [], () => gfFs(false, true, undefined, { unroll: true })); // K1362 s6: constant trip counts
  if (name === "fullK") return new GfPass(gl, false, [], () => gfFs(false, true, undefined, { pack: true })); // K1362 s6: packed state
  if (name === "fullO") return new GfPass(gl, false, [], () => gfFs(false, true, undefined, { oldKeys: true })); // K1362 s6: the keys before gf_keys.ts
  if (name === "fullp") return new GfPass(gl, true, []);
  // K1362 s7: x<tier>[e][1] = that one tier as the two-pass split (gf_split.ts), then the full program; e: empties skip pass 2 (depth); 1: pass 1 alone (pass 2 and full discard)
  { const m = /^x(\d\d[a-z]*?)(k?)(e?)(1?)$/.exec(name); if (m) { const keys = m[2] === "k"; const skip = m[3] === "e"; const only1 = m[4] === "1"; const [t] = parseTiers("t" + m[1]); return new GfPass(gl, false, [t], (tt, s) => (only1 && s !== 1 ? DISCARD : tt ? gfFs(false, true, tt, { reg: tt.reg, unroll: tt.unroll, pack: tt.pack, split: s, splitSkip: skip, splitKeys: keys }) : fullFs ?? gfFs(false, true)), { skip, keys }); } }
  // t<tiers>[_...]: each tier "<p><k>[r][h][s]" (s = register form, gf_reg.ts), then the full program
  const tiers = parseTiers(name);
  const ok = tiers.some((t) => (t as { oldKeys?: boolean }).oldKeys); // o: every program of the variant on the old keys
  return new GfPass(gl, false, tiers, (t) => (t ? gfFs(false, true, t, { reg: t.reg, unroll: t.unroll, pack: t.pack, oldKeys: ok }) : fullFs ?? gfFs(false, true, undefined, { oldKeys: ok })));
}

function info(gl: WebGL2RenderingContext): Record<string, unknown> {
  const d = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    timerQuery: !!gl.getExtension("EXT_disjoint_timer_query_webgl2"),
    floatRT: !!gl.getExtension("EXT_color_buffer_float"),
    maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS), maxColorAttachments: gl.getParameter(gl.MAX_COLOR_ATTACHMENTS),
    ua: navigator.userAgent, dpr: devicePixelRatio,
  };
}

function readRect(gl: WebGL2RenderingContext, tg: GfTarget, r: Rect): Float32Array {
  const out = new Float32Array((r[2] - r[0]) * (r[3] - r[1]) * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fbo);
  gl.readBuffer(gl.COLOR_ATTACHMENT0);
  gl.readPixels(r[0], r[1], r[2] - r[0], r[3] - r[1], gl.RGBA, gl.FLOAT, out);
  return out;
}

// The dpr 1 picture for Levi: one scene's field (fill under ink, GfComposite's formula, over a dark backdrop) at
// the phone's full resolution (cfg.w x cfg.h) beside the same frame drawn at dpr 1 (cfg.w1 x cfg.h1, aa one dpr-1 px)
// and upscaled to the screen bilinearly as the browser shows a low-resolution canvas; then the two crops with the
// most partly inked px, both versions, at x4 (nearest). Returns a PNG data URL.
async function pic(cfg: BenchCfg & { w1: number; h1: number; crop: number }): Promise<Record<string, unknown>> {
  const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
  const gl = canvas.getContext("webgl2", { antialias: false })!;
  const scene = (await (await fetch(`${cfg.base}/${cfg.scenes[0]}.json`)).json()) as FieldScene;
  (scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  const FILL = [0.96, 0.93, 0.86]; const INK = [0.12, 0.11, 0.09]; const BG = [0.16, 0.17, 0.21];
  const render = (w: number, h: number): { img: ImageData; ink: Float32Array } => {
    let T: GfTables = buildTables(scene, { aa: 0.01 }); let s = 1; let cx = 0; let cy = 0;
    for (let k = 0; k < 2; k++) {
      const bw = T.gW * T.G; const bh = T.gH * T.G;
      s = cfg.fit * Math.min(cfg.w / bw, cfg.h / bh) * (w / cfg.w);
      cx = T.gx0 + bw / 2; cy = T.gy0 + bh / 2;
      T = buildTables(scene, { aa: 0.5 / s });
    }
    const e = w / 2 - s * cx; const f = h / 2 - s * cy;
    const map: GfMap = [1 / s, -e / s, -1 / s, (h - f) / s];
    const pass = new GfPass(gl, false); pass.upload(T);
    const tg = new GfTarget(gl, 1, true); tg.resize(w, h);
    pass.draw(tg, map, pass.gridRect(map, w, h), false);
    const raw = readRect(gl, tg, [0, 0, w, h]);
    const img = new ImageData(w, h); const ink = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = ((h - 1 - y) * w + x) * 4; const o = (y * w + x) * 4; // readPixels is bottom-up
      const a = Math.min(1, Math.max(0, raw[i])); const c = Math.min(1, Math.max(0, raw[i + 1]));
      ink[y * w + x] = a;
      for (let ch = 0; ch < 3; ch++) {
        const pre = INK[ch] * a + FILL[ch] * c * (1 - a); const al = a + (1 - a) * c;
        img.data[o + ch] = Math.round(255 * (pre + BG[ch] * (1 - al))); // sRGB values, blended as the app's premultiplied composite
      }
      img.data[o + 3] = 255;
    }
    return { img, ink };
  };
  const W = cfg.w; const H = cfg.h;
  const A = render(W, H); const B = render(cfg.w1, cfg.h1);
  const cv = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")!]; };
  const [ca, xa] = cv(W, H); xa.putImageData(A.img, 0, 0);
  const [cb0, xb0] = cv(cfg.w1, cfg.h1); xb0.putImageData(B.img, 0, 0);
  const [cb, xb] = cv(W, H); xb.imageSmoothingEnabled = true; xb.imageSmoothingQuality = "low"; xb.drawImage(cb0, 0, 0, W, H);
  const C = cfg.crop; const cand: [number, number, number][] = [];
  for (let y = 0; y + C <= H; y += C / 4) for (let x = 0; x + C <= W; x += C / 4) {
    let n = 0; for (let yy = y; yy < y + C; yy += 2) for (let xx = x; xx < x + C; xx += 2) { const v = A.ink[yy * W + xx]; if (v > 0.05 && v < 0.95) n++; }
    cand.push([n, x, y]);
  }
  cand.sort((p, q) => q[0] - p[0]);
  const crops = [cand[0]]; for (const c of cand) if (Math.hypot(c[1] - crops[0][1], c[2] - crops[0][2]) > 3 * C) { crops.push(c); break; }
  const half = Math.round(W / 2); const hh = Math.round(H / 2); const g = 16; const z = 4 * C;
  const outW = Math.max(2 * half + g, 2 * z + g); const outH = 28 + hh + g + crops.length * (z + g + 22);
  const [co, xo] = cv(outW, outH); xo.fillStyle = "#fff"; xo.fillRect(0, 0, outW, outH); xo.fillStyle = "#000"; xo.font = "18px sans-serif";
  xo.fillText(`${cfg.scenes[0]}: left full resolution ${W}x${H}, right dpr 1 (${cfg.w1}x${cfg.h1}) shown upscaled`, 4, 20);
  xo.imageSmoothingEnabled = true; xo.drawImage(ca, 0, 28, half, hh); xo.drawImage(cb, half + g, 28, half, hh);
  xo.strokeStyle = "#e33"; xo.lineWidth = 2;
  let y0 = 28 + hh + g;
  crops.forEach((c, k) => {
    for (const dx of [0, half + g]) xo.strokeRect(dx + c[1] / 2, 28 + c[2] / 2, C / 2, C / 2);
    xo.fillText(`crop ${k + 1} at x4: full resolution | dpr 1`, 4, y0 + 16); y0 += 22;
    xo.imageSmoothingEnabled = false;
    xo.drawImage(ca, c[1], c[2], C, C, 0, y0, z, z); xo.drawImage(cb, c[1], c[2], C, C, z + g, y0, z, z);
    y0 += z + g;
  });
  return { png: co.toDataURL("image/png"), crops };
}

export async function bench(cfg: BenchCfg): Promise<Record<string, unknown>> {
  if ((cfg as { pic?: boolean }).pic) return pic(cfg as BenchCfg & { w1: number; h1: number; crop: number });
  const canvas = document.createElement("canvas");
  canvas.width = 64; canvas.height = 64;
  document.body.appendChild(canvas);
  const gl0 = canvas.getContext("webgl2", { antialias: false, alpha: true, preserveDrawingBuffer: false, powerPreference: "high-performance" })!;
  if (!gl0) throw new Error("no WebGL2");
  // cfg.glTrace: a Proxy checks getError after every call and records the first few calls that raised one (timings void)
  const glErrs: string[] = []; let nProg = 0;
  const gl: WebGL2RenderingContext = (cfg as { glTrace?: boolean }).glTrace
    ? new Proxy(gl0, {
        get(t, k) {
          const v = Reflect.get(t, k, t);
          if (typeof v !== "function" || k === "getError") return typeof v === "function" ? v.bind(t) : v;
          return (...a: unknown[]) => {
            const r = (v as (...x: unknown[]) => unknown).apply(t, a);
            const e = t.getError();
            if (k === "useProgram") nProg++;
            if (e && glErrs.length < 8) glErrs.push(`${String(k)} -> ${e} (after useProgram #${nProg}, fbo ${t.getParameter(t.FRAMEBUFFER_BINDING) === null ? "default" : "bound"}, drawBuffers ${t.getParameter(t.DRAW_BUFFER0)}/${t.getParameter(t.DRAW_BUFFER1)})`);
            return r;
          };
        },
      })
    : gl0;
  const out: Record<string, unknown> = { info: info(gl), cfg, scenes: {} as Record<string, unknown>, glErrs };
  const px = new Uint8Array(4);
  if ((cfg as { dbg?: boolean }).dbg) {
    // each variant compiled and drawn alone on a small rect: its GL error, context loss and time
    const log: string[] = [];
    const sc = (await (await fetch(`${cfg.base}/${cfg.scenes[0]}.json`)).json()) as FieldScene;
    (sc.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
    const T0 = buildTables(sc, { aa: 0.01 });
    for (const tr of [{ p: 4, k: 3, ramps: false }, { p: 4, k: 3, ramps: true }, { p: 8, k: 6, ramps: false }] as GfTier[]) {
      const sh = gl.createShader(gl.FRAGMENT_SHADER)!; gl.shaderSource(sh, gfFs(false, true, tr)); gl.compileShader(sh);
      const lg = gl.getShaderInfoLog(sh) ?? "";
      log.push(`${JSON.stringify(tr)} ok ${gl.getShaderParameter(sh, gl.COMPILE_STATUS)} log ${lg.length}: ${lg.replace(/\s+/g, " ").slice(0, 300)}`);
    }
    const alive = async (lbl: string): Promise<void> => {
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); await raf(); await raf();
      const sh = gl.createShader(gl.FRAGMENT_SHADER)!; gl.shaderSource(sh, EMPTY); gl.compileShader(sh);
      log.push(`${lbl}: err ${gl.getError()} compile ${gl.getShaderParameter(sh, gl.COMPILE_STATUS)} lost ${gl.isContextLost()}`); gl.deleteShader(sh);
    };
    if ((cfg as { steps?: boolean }).steps) {
      await alive("start");
      const tg = new GfTarget(gl, 1, false); tg.resize(64, 64); gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fbo);
      tg.ensureStencil(); await alive("ensureStencil");
      gl.clearBufferfi(gl.DEPTH_STENCIL, 0, 1, 0); await alive("clearBufferfi");
      gl.clearBufferiv(gl.STENCIL, 0, [0]); await alive("clearBufferiv");
      const ps = makePass(gl, "empty"); ps.upload(T0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fbo); gl.enable(gl.STENCIL_TEST); gl.stencilFunc(gl.EQUAL, 0, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      ps.draw(tg, [1, 0, -1, 64], [0, 0, 64, 64], false); await alive("emptyDraw");
      gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fbo); gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.DEPTH_STENCIL_ATTACHMENT]); await alive("invalidate");
      tg.dispose(); await alive("dispose");
      const p2 = makePass(gl, "t43"); p2.upload(T0); const t2 = new GfTarget(gl, 1, false); t2.resize(64, 64);
      p2.draw(t2, [1, 0, -1, 64], [0, 0, 64, 64], false); await alive("t43draw");
      p2.draw(t2, [1, 0, -1, 64], [0, 0, 64, 64], false); await alive("t43draw2");
      out.dbg = log; canvas.remove(); return out;
    }
    for (const vn of cfg.variants) {
      const a = performance.now(); gl.getError();
      let ps: GfPass; try { ps = makePass(gl, vn); } catch (e) { log.push(`${vn} make ${String(e).slice(0, 80)} lost ${gl.isContextLost()}`); break; } ps.upload(T0);
      const tg = new GfTarget(gl, 1, false); tg.resize(64, 64);
      try { ps.draw(tg, [1, 0, -1, 64], [0, 0, 64, 64], false); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } catch (e) { log.push(vn + " threw " + String(e).slice(0, 100)); }
      log.push(`${vn} err ${gl.getError()} lost ${gl.isContextLost()} ${(performance.now() - a).toFixed(0)} ms`);
      if (gl.isContextLost()) break;
      ps.dispose(); tg.dispose();
    }
    out.dbg = log; canvas.remove(); return out;
  }
  for (const name of cfg.scenes) {
    const rec: Record<string, unknown> = {};
    (out.scenes as Record<string, unknown>)[name] = rec;
    const scene = (await (await fetch(`${cfg.base}/${name}.json`)).json()) as FieldScene;
    (scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
    let T: GfTables = buildTables(scene, { aa: 0.01 });
    let s = 1; let cx = 0; let cy = 0;
    for (let k = 0; k < 2; k++) {
      const bw = T.gW * T.G; const bh = T.gH * T.G;
      s = cfg.fit * Math.min(cfg.w / bw, cfg.h / bh);
      cx = T.gx0 + bw / 2; cy = T.gy0 + bh / 2;
      T = buildTables(scene, { aa: 0.5 / s });
    }
    const e = cfg.w / 2 - s * cx; const f = cfg.h / 2 - s * cy;
    const map: GfMap = [1 / s, -e / s, -1 / s, (cfg.h - f) / s];
    rec.scale = s;
    rec.grid = { nK: T.nK, nV: T.nV, nA: T.nA, nCh: T.nCh, halfOk: Math.max(T.nV, T.nK, T.nA, T.nCh) < 32000 };
    const targets = [0, 1, 2, 3].map(() => { const tg = new GfTarget(gl, 1, false); tg.resize(cfg.w, cfg.h); return tg; });
    const sync = (r: Rect): void => { gl.readPixels(r[0], r[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
    const res: Record<string, Record<string, unknown>> = {};
    let rect: Rect = [0, 0, 0, 0];
    for (const vn of cfg.variants) {
      const tc = performance.now();
      const pass = makePass(gl, vn);
      pass.upload(T);
      rect = pass.gridRect(map, cfg.w, cfg.h);
      const draw = (j = 0): void => pass.draw(targets[j & 3], map, rect, false);
      draw(); sync(rect);
      const r: Record<string, unknown> = { firstMs: +(performance.now() - tc).toFixed(1) };
      { const um: number[] = []; for (let i = 0; i < 5; i++) { const t0 = performance.now(); pass.upload(T); um.push(performance.now() - t0); } r.upload = st(um); const km: number[] = []; let nKA = 0; let nB = 0; for (let i = 0; i < 5; i++) { const t0 = performance.now(); const K = buildKeys(T); km.push(performance.now() - t0); nKA = K.nKA; nB = K.nB; } r.keys = { ms: st(km), nB, nKA, nA: T.nA }; } // K1362 s6: pack + texture upload (+ any key table) on main
      for (const mode of cfg.modes) {
        const ms: number[] = [];
        const t0 = Date.now();
        if (mode === "sync4") {
          const tw = performance.now();
          while (performance.now() - tw < cfg.warmMs) { for (let j = 0; j < 4; j++) draw(j); sync(rect); }
          for (let i = 0; i < cfg.nPass; i++) {
            const a = performance.now();
            for (let j = 0; j < 4; j++) draw(j);
            sync(rect);
            ms.push((performance.now() - a) / 4);
          }
        } else if (mode === "frame1") {
          const iv: number[] = []; let tl = await raf();
          for (let i = 0; i < cfg.settleFrames + cfg.nPass; i++) {
            const tf = await raf(); iv.push(tf - tl); tl = tf;
            const a = performance.now(); draw(); sync(rect); const dt = performance.now() - a;
            if (i >= cfg.settleFrames) ms.push(dt);
          }
          r.frame1_rafMs = st(iv.slice(cfg.settleFrames));
        }
        r[mode] = st(ms);
        r[mode + "_t"] = [t0, Date.now()];
        await raf();
      }
      // K1362 s8: crops of the rect at this density (fractions [fx0, fy0, fx1, fy1] of the rect), sync4 each
      if (cfg.crops) {
        const cr: Rect[] = []; const cms: unknown[] = [];
        for (const c of cfg.crops) {
          const W0 = rect[2] - rect[0]; const H0 = rect[3] - rect[1];
          const R: Rect = [rect[0] + Math.round(c[0] * W0), rect[1] + Math.round(c[1] * H0), rect[0] + Math.round(c[2] * W0), rect[1] + Math.round(c[3] * H0)];
          cr.push(R);
          const dr = (j: number): void => pass.draw(targets[j & 3], map, R, false);
          const ms: number[] = []; const t0 = Date.now(); const tw = performance.now();
          while (performance.now() - tw < cfg.warmMs) { for (let j = 0; j < 4; j++) dr(j); sync(R); }
          for (let i = 0; i < cfg.nPass; i++) { const a = performance.now(); for (let j = 0; j < 4; j++) dr(j); sync(R); ms.push((performance.now() - a) / 4); }
          cms.push({ ...st(ms), t: [t0, Date.now()] });
          await raf();
        }
        r.crops = cr; r.cropMs = cms;
      }
      r.glError = gl.getError();
      res[vn] = r;
      pass.dispose();
    }
    rec.pass = res;
    rec.rect = rect; rec.px = (rect[2] - rect[0]) * (rect[3] - rect[1]);
    for (const tg of targets) tg.dispose();

    // --- K1362 s8 count: per-pixel loop trips of the tier program (t32r unless cfg.countTier), full program where it overflows ---
    if (cfg.count) {
      const [tier] = parseTiers(cfg.countTier ?? "t32r");
      const cp = new GfPass(gl, true, [tier], (t) => countFs(t)); cp.upload(T);
      if (rect[2] <= rect[0]) rect = cp.gridRect(map, cfg.w, cfg.h);
      const ct = new GfTarget(gl, 3, true); ct.resize(cfg.w, cfg.h);
      cp.draw(ct, map, rect, false);
      const W = rect[2] - rect[0]; const H = rect[3] - rect[1];
      const A = [0, 1, 2].map((i) => readAtt(gl, ct, rect, i));
      const cs = countStats(A, W, H);
      let full = 0; for (let i = 0; i < W * H; i++) if (A[2][i * 4 + 3] > 1.5) full++;
      cs.fullShare = +(full / (W * H)).toFixed(4);
      cs.glError = gl.getError();
      rec.count = cs; rec.rect = rect; rec.px = W * H;
      ct.dispose(); cp.dispose();
    }

    // --- cover: the share of the rect each prefix of a variant's tiers draws ---
    const ft = new GfTarget(gl, 1, true); ft.resize(cfg.w, cfg.h);
    if (cfg.cover) {
      const cov: Record<string, number[]> = {};
      for (const vn of cfg.variants.filter((v) => /^t\d/.test(v) || /^a[a-z+]+@t\d/.test(v))) {
        const at = vn.indexOf("@"); const parts = at > 0 ? vn.slice(1, at).split("+") : [];
        const tiers = parseTiers(at > 0 ? vn.slice(at + 1) : vn);
        cov[vn] = [];
        for (let i = 1; i <= tiers.length; i++) {
          const pp = new GfPass(gl, false, tiers.slice(0, i), (t) => (t ? (parts.length ? attFs(t, parts) : gfFs(false, true, t)) : DISCARD));
          pp.upload(T); pp.draw(ft, map, rect, false);
          const a = readRect(gl, ft, rect);
          let n = 0; for (let k = 3; k < a.length; k += 4) if (a[k] > 0) n++;
          cov[vn].push(+(n / (a.length / 4)).toFixed(4));
          pp.dispose();
        }
      }
      rec.cover = cov;
    }
    // --- cmp: each variant's read-back against cfg.ref (RGBA32F) ---
    if (cfg.cmp && cfg.ref) {
      const grab = (vn: string): Float32Array => { const pp = makePass(gl, vn); pp.upload(T); pp.draw(ft, map, rect, false); const a = readRect(gl, ft, rect); pp.dispose(); return a; };
      const R = grab(cfg.ref);
      // the CPU mirror at a stride of pixels: how far the reference and each variant sit from it
      const E = new GfEval(T); const W0 = rect[2] - rect[0]; const npx = R.length / 4; const stride = Math.max(1, Math.floor(npx / 3000));
      const mirr: number[] = []; for (let i = 0; i < npx; i += stride) { const px0 = rect[0] + (i % W0) + 0.5; const py0 = rect[1] + Math.floor(i / W0) + 0.5; mirr.push(E.eval(map[0] * px0 + map[1], map[2] * py0 + map[3]).ink); }
      const vsM = (X: Float32Array): number[] => { let a = 0; let b = 0; let mx = 0; let j = 0; for (let i = 0; i < npx; i += stride, j++) { const d = Math.abs(X[i * 4] - mirr[j]); if (d > 1e-2) a++; if (d > 1e-1) b++; if (d > mx) mx = d; } return [j, a, b, +mx.toExponential(2)]; };
      rec.mirror = { [cfg.ref]: vsM(R) } as Record<string, number[]>;
      const cmp: Record<string, unknown> = {};
      for (const vn of cfg.variants.filter((v) => v !== cfg.ref && v !== "empty")) {
        const A = grab(vn); (rec.mirror as Record<string, number[]>)[vn] = vsM(A);
        let onlyA = 0; let onlyR = 0; let sumA = 0; let sumR = 0; for (let k = 0; k < A.length; k += 4) { if (A[k] > 0 && !(R[k] > 0)) onlyA++; if (R[k] > 0 && !(A[k] > 0)) onlyR++; sumA += A[k]; sumR += R[k]; }
        let nd = 0; let n3 = 0; let n2 = 0; let n1 = 0; let mx = 0; let mc = 0; let un = 0; let worst = -1;
        for (let k = 0; k < A.length; k += 4) {
          if ((A[k + 3] > 0) !== (R[k + 3] > 0)) un++;
          const d = Math.abs(A[k] - R[k]); const dc = Math.abs(A[k + 1] - R[k + 1]);
          if (d > 0 || dc > 0) nd++;
          if (d > 1e-3) n3++; if (d > 1e-2) n2++; if (d > 1e-1) n1++;
          if (d > mx) { mx = d; worst = k / 4; }
          if (dc > mc) mc = dc;
        }
        const W = rect[2] - rect[0];
        cmp[vn] = { diffPx: nd, over1e3: n3, over1e2: n2, over1e1: n1, maxInk: +mx.toExponential(2), maxCov: +mc.toExponential(2), unwritten: un,
          onlyA, onlyR, sumA: +sumA.toFixed(0), sumR: +sumR.toFixed(0), worstVals: worst >= 0 ? [A[worst * 4], R[worst * 4], A[worst * 4 + 1], R[worst * 4 + 1]] : null, worstAt: worst >= 0 ? [rect[0] + (worst % W), rect[1] + Math.floor(worst / W)] : null };
      }
      rec.cmp = cmp;
    }
    ft.dispose();
    rec.glError = gl.getError();
  }
  canvas.remove();
  return out;
}
