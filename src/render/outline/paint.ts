// Ported from .claude/probes/K1240/proto/paint.ts by k1240s4_port.mjs (K1240 S4): the prototype's default path only.
// K1278: the section colours the redesign's fill paints, per pixel.
//
// The app's contract (src/core/section_colors.ts, THE BLENDING CONTRACT):
// each run (a stretch of chain between junctions, or to a dead end) wears
// its own colour, every junction gets ONE converged colour (the RGB mean of
// its arms' run colours), and each run ramps from its own colour to the
// junction's near that end (evalRunSection's ramp, eased by junctionBlend).
// The scenes carry no walk graph, so the runs are rebuilt here from the
// junction arms: a chain is cut at every arm's s. Which run an arm, a
// strip or a cap reads is decided once (structure); a run's span follows
// the frame (its ends are the arms' s on this frame).
//
// Modes (the seam test paints all three):
// - app:  the app's defaults (segments scheme, junctionBlend 0.88): base
//         ramp min(1 ctrl, 0.18 span) plus 0.88 lattice, eased 0.88.
//         Approximations: 1 ctrl = look.ctrlArc (0.47) world, 1 lattice
//         unit = 1 world; swatches from the prototype's pastel arc.
// - step: no ramps: a through chain's colour steps at the junction's s,
//         so the junction's arm weights alone carry the hand-off.
// - kink: short LINEAR ramps (2.5 h, no ease): a slope kink at each ramp end.
//
// `runColour` is the CPU twin of draw.ts's fragment shader `runCol`.
import type { SceneIn } from "./outline";

export type RGB = [number, number, number];
export type PaintMode = "app" | "step" | "kink";

export interface PRun {
  pi: number;
  /** Span on the chain (unwrapped: a closed chain's wrap run has sB > len). */
  sA: number; sB: number;
  /** Ramp length at each end (0 = none: a dead end, or step mode). */
  rA: number; rB: number;
  ease: number;
  /** The chain's length when closed (s unwraps about the run), else 0. */
  len: number;
  colA: RGB; colMid: RGB; colB: RGB;
  /** Junction at each end (-1: chain end / dead end). */
  jA: number; jB: number;
}

export interface SectionPaint {
  mode: PaintMode;
  runs: PRun[];
  /** The run an arm reads, by scene arm "ji:ei". */
  armRun: Map<string, number>;
  /** Per chain index, its runs in s order. */
  runsOf: number[][];
  conv: RGB[];
}

function hsl(hDeg: number, s: number, l: number): RGB {
  const h = ((((hDeg % 360) + 360) % 360) / 360);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q;
  const f = (t: number): number => { let u = t; if (u < 0) u += 1; if (u > 1) u -= 1; if (u < 1 / 6) return p + (q - p) * 6 * u; if (u < 1 / 2) return q; if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6; return p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

function chainLen(pts: number[], closed: boolean): number {
  let L = 0; const n = pts.length >> 1;
  for (let i = 1; i < n; i++) L += Math.hypot(pts[2 * i] - pts[2 * i - 2], pts[2 * i + 1] - pts[2 * i - 1]);
  if (closed && n > 1) L += Math.hypot(pts[0] - pts[2 * n - 2], pts[1] - pts[2 * n - 1]);
  return L;
}

/** The section runs of one frame. Run order and colours depend only on the
 *  diagram (arm order along each chain), so every frame of one diagram
 *  builds the same runs with spans that follow the arms. */
export function sectionPaint(scene: SceneIn, mode: PaintMode = "app", baseHue = 0): SectionPaint {
  const idxOf = new Map<number, number>(); scene.chains.forEach((c, i) => idxOf.set(c.id, i));
  const h = scene.look.halfWidth;
  const ctrlArc = (scene.look as { ctrlArc?: number }).ctrlArc ?? 0.47;
  const cuts: { s: number; arms: { ji: number; ei: number; dir: number }[] }[][] = scene.chains.map(() => []);
  scene.junctions.forEach((J, ji) => J.arms.forEach((a, ei) => {
    const pi = idxOf.get(a.chain); if (pi === undefined) return;
    const L = cuts[pi]; const c = L.find((u) => Math.abs(u.s - a.s) < 1e-6);
    if (c) c.arms.push({ ji, ei, dir: a.dir }); else L.push({ s: a.s, arms: [{ ji, ei, dir: a.dir }] });
  }));
  const runs: PRun[] = []; const runsOf: number[][] = []; const armRun = new Map<string, number>();
  const jOf = (c: { arms: { ji: number }[] } | undefined): number => (c ? c.arms[0].ji : -1);
  scene.chains.forEach((ch, pi) => {
    const len = chainLen(ch.pts, ch.closed);
    const L = cuts[pi].sort((a, b) => a.s - b.s);
    const mine: number[] = []; runsOf.push(mine);
    const add = (sA: number, sB: number, cA: typeof L[number] | undefined, cB: typeof L[number] | undefined): number => {
      const k = runs.length;
      runs.push({ pi, sA, sB, rA: 0, rB: 0, ease: 0, len: ch.closed ? len : 0, colA: [0, 0, 0], colMid: [0, 0, 0], colB: [0, 0, 0], jA: jOf(cA), jB: jOf(cB) });
      mine.push(k);
      for (const a of cA?.arms ?? []) if (a.dir > 0) armRun.set(`${a.ji}:${a.ei}`, k);
      for (const a of cB?.arms ?? []) if (a.dir < 0) armRun.set(`${a.ji}:${a.ei}`, k);
      return k;
    };
    if (ch.closed) {
      if (L.length === 0) { add(0, len, undefined, undefined); return; }
      for (let i = 0; i + 1 < L.length; i++) add(L[i].s, L[i + 1].s, L[i], L[i + 1]);
      add(L[L.length - 1].s, L[0].s + len, L[L.length - 1], L[0]);
      return;
    }
    // Open: boundaries 0 .. len; a cut at an end is that end's junction.
    const eps = 1e-6;
    const first = L.length && L[0].s <= eps ? L[0] : undefined;
    const last = L.length && L[L.length - 1].s >= len - eps ? L[L.length - 1] : undefined;
    const inner = L.filter((c) => c !== first && c !== last);
    const bounds: { s: number; c: typeof L[number] | undefined }[] = [{ s: 0, c: first }, ...inner.map((c) => ({ s: c.s, c })), { s: len, c: last }];
    for (let i = 0; i + 1 < bounds.length; i++) add(bounds[i].s, bounds[i + 1].s, bounds[i].c, bounds[i + 1].c);
  });
  // Colours: 12 swatches spread by a stride; runs sharing a junction never
  // share a swatch (the app's collision walk), deterministic in run order.
  const K = 12; const STRIDE = 5;
  const pick = new Array<number>(runs.length).fill(-1);
  const byJ = new Map<number, number[]>();
  runs.forEach((r, k) => { for (const j of [r.jA, r.jB]) if (j >= 0) { const l = byJ.get(j) ?? []; l.push(k); byJ.set(j, l); } });
  runs.forEach((r, k) => {
    const taken = new Set<number>();
    for (const j of [r.jA, r.jB]) if (j >= 0) for (const o of byJ.get(j)!) if (pick[o] >= 0) taken.add(pick[o]);
    let j = (k * 7 + r.pi * 3) % K;
    for (let t = 0; t < K && taken.has(j); t++) j = (j + 1) % K;
    pick[k] = j;
    r.colMid = hsl(baseHue + (((j * STRIDE) % K) / (K - 1)) * 280, 0.45, 0.64);
  });
  // Each junction's converged colour: the mean of its arms' run colours.
  const conv: RGB[] = scene.junctions.map((J, ji) => {
    const c: RGB = [0, 0, 0]; let n = 0;
    J.arms.forEach((_, ei) => { const k = armRun.get(`${ji}:${ei}`); if (k === undefined) return; for (let q = 0; q < 3; q++) c[q] += runs[k].colMid[q]; n++; });
    return n ? (c.map((v) => v / n) as RGB) : [0.5, 0.5, 0.5];
  });
  for (const r of runs) {
    const sp = r.sB - r.sA;
    let ramp = 0; let ease = 0;
    if (mode === "app") { ramp = Math.min(sp / 2, Math.min(ctrlArc, 0.18 * sp) + 0.88); ease = 0.88; }
    else if (mode === "kink") { ramp = Math.min(sp / 2, 2.5 * h); ease = 0; }
    r.ease = ease;
    r.colA = r.jA >= 0 ? conv[r.jA] : r.colMid; r.rA = r.jA >= 0 ? ramp : 0;
    r.colB = r.jB >= 0 ? conv[r.jB] : r.colMid; r.rB = r.jB >= 0 ? ramp : 0;
  }
  return { mode, runs, armRun, runsOf, conv };
}

/** The run of chain `pi` holding s (structure-time lookups only). */
export function runAt(sp: SectionPaint, pi: number, s: number): number {
  const L = sp.runsOf[pi]; if (!L || L.length === 0) return -1;
  for (const k of L) { const r = sp.runs[k]; const cu = unwrap(r, s); if (cu >= r.sA - 1e-9 && cu <= r.sB + 1e-9) return k; }
  // Nearest run end.
  let best = L[0]; let bd = Infinity;
  for (const k of L) { const r = sp.runs[k]; const cu = unwrap(r, s); const d = Math.min(Math.abs(cu - r.sA), Math.abs(cu - r.sB)); if (d < bd) { bd = d; best = k; } }
  return best;
}

/** s on a closed chain, taken to the copy nearest the run's middle. */
export function unwrap(r: PRun, s: number): number {
  if (!(r.len > 0)) return s;
  const mid = (r.sA + r.sB) / 2;
  return s + r.len * Math.round((mid - s) / r.len);
}

/** A run's section colour at s (evalRunSection's ramp, RGB space). */
export function runColour(r: PRun, s: number, out: RGB = [0, 0, 0]): RGB {
  const cu = unwrap(r, s);
  const da = cu - r.sA; const db = r.sB - cu;
  const ez = (u: number): number => u + (u * u * (3 - 2 * u) - u) * r.ease;
  let a = r.colMid; let b = r.colMid; let w = 0;
  if (r.rA > 0 && da < r.rA) { a = r.colA; w = ez(Math.max(0, Math.min(1, da / r.rA))); }
  else if (r.rB > 0 && db < r.rB) { a = r.colB; w = ez(Math.max(0, Math.min(1, db / r.rB))); }
  else { w = 1; }
  out[0] = a[0] + (b[0] - a[0]) * w; out[1] = a[1] + (b[1] - a[1]) * w; out[2] = a[2] + (b[2] - a[2]) * w;
  return out;
}

/** A pixel's paint from its four interpolated slots (run, weight, s): the
 *  weighted mean of the slots' run colours (fill_tri.ts's paint fields;
 *  draw.ts's fragment shader is its twin). */
const tmp: RGB = [0, 0, 0];
export function paintAt(sp: SectionPaint, run: ArrayLike<number>, w: ArrayLike<number>, s: ArrayLike<number>, out: RGB = [0, 0, 0]): RGB {
  let W = 0; out[0] = out[1] = out[2] = 0;
  for (let k = 0; k < 4; k++) {
    const r = run[k]; const wk = w[k];
    if (r < 0 || !(wk > 0)) continue;
    runColour(sp.runs[r], s[k], tmp);
    out[0] += wk * tmp[0]; out[1] += wk * tmp[1]; out[2] += wk * tmp[2]; W += wk;
  }
  if (W > 0) { out[0] /= W; out[1] /= W; out[2] /= W; }
  return out;
}

/** The run table as an RGBA32F texture, 4 texels per run (draw.ts):
 *  (sA, sB, rA, rB), (colA, ease), (colMid, len), (colB, 0). */
export function runTexture(sp: SectionPaint): Float32Array {
  const t = new Float32Array(16 * Math.max(1, sp.runs.length));
  sp.runs.forEach((r, k) => {
    t.set([r.sA, r.sB, r.rA, r.rB, ...r.colA, r.ease, ...r.colMid, r.len, ...r.colB, 0], 16 * k);
  });
  return t;
}

// K1291: THE APP'S PALETTE AND OVERLAYS. The app (outline_app.ts) paints a
// fill pixel from the app's own paint data (paint_model.ts textures through
// paint_glsl.ts, as arm_strip.ts's chainMaterial does), not from the run
// table above: each slot's run names its chain, and the slot's s (arc
// along the scene's kept polyline) maps to the renderer's arc on that
// chain. The census tools and the port's pins never call these.

/** scene_export.ts's tuck (strip_pass.ts): trim = min(0.75 h, total / 4). */
const TUCK_SHARE = 0.75;
const TUCK_MAX_FRAC = 0.25;

/** Where a scene chain's s sits on the renderer's arc: arc = arcLo + s *
 *  scale. The scene's polyline starts at the tuck point (renderer arc
 *  trim) on a tucked start and ends at total - trim on a tucked end
 *  (scene_export.ts sampleArc); a ring runs 0 .. total over its closed
 *  polyline. Linear between: the samples are evenly spaced in arc, so
 *  the chord sum differs from the arc only by the samples' sag. */
export function chainArcMap(
  ch: { closed: boolean; totalLength: number; tucked: readonly [boolean, boolean] | readonly boolean[] },
  pts: ArrayLike<number>,
  h: number
): { arcLo: number; scale: number } {
  const T = ch.totalLength;
  const trim = Math.min(h * TUCK_SHARE, T * TUCK_MAX_FRAC);
  const lo = !ch.closed && ch.tucked[0] ? trim : 0;
  const hi = !ch.closed && ch.tucked[1] ? T - trim : T;
  const L = chainLen(Array.from(pts), ch.closed);
  return { arcLo: lo, scale: L > 0 ? (hi - lo) / L : 0 };
}

/** Texels per row of the app's run map. */
export const RUN_MAP_W = 1024;

/** The app's run map: one RGBA32F texel per run, (chain, arcLo, scale,
 *  scene chain) of the run's chain, RUN_MAP_W texels wide. `runChain` holds
 *  each run's scene chain index, `maps` each scene chain's app chain and
 *  arc map. A run whose chain has no map gets chain -1 (the shader skips
 *  the slot). Called with runChain = 0..n-1 it is the per-scene-chain map
 *  (the band's reveal mask reads it so). */
export function appRunMap(
  runChain: ArrayLike<number>,
  maps: readonly ({ chain: number; arcLo: number; scale: number } | undefined)[]
): { tex: Float32Array; w: number; h: number } {
  const n = Math.max(1, runChain.length);
  const h = Math.ceil(n / RUN_MAP_W);
  const tex = new Float32Array(4 * RUN_MAP_W * h);
  for (let r = 0; r < runChain.length; r++) {
    const m = maps[runChain[r]];
    if (!m) { tex[4 * r] = -1; continue; }
    tex[4 * r] = m.chain; tex[4 * r + 1] = m.arcLo; tex[4 * r + 2] = m.scale; tex[4 * r + 3] = runChain[r];
  }
  return { tex, w: RUN_MAP_W, h };
}

// ---- K1291 s2: the appearance reveal's width masks on the GPU ----
// Today's ribbon draws each chain at its reveal width multiplier
// (reveal_fx.ts widthMulFor -> revealMask[c], per renderer sample, null =
// fully revealed), linear between samples. The outline reads the same
// numbers: one R32F texture, RV_W texels a row; app chain c's header at
// texels 4c..4c+3 = (offset, count, total arc, flag), flag -1 = fully
// revealed (no samples stored), 0 open, 1 ring; its samples from offset.
// Sample k sits at arc k / count * total on a ring, k / (count - 1) *
// total open (paint_math kSampleArc).

/** Texels per row of the reveal mask texture. */
export const RV_W = 1024;

/** One app chain's reveal state: its mask (null = fully revealed) and its samples' layout. */
export interface RevealChain {
  mask: ArrayLike<number> | null;
  count: number;
  total: number;
  closed: boolean;
}

/** Pack the reveal masks (see above); `on` is false when no chain has one
 *  (the shaders then skip the reveal entirely). */
export function revealMaskTex(chains: readonly (RevealChain | null | undefined)[]): { tex: Float32Array; w: number; h: number; on: boolean } {
  let n = 4 * chains.length;
  let on = false;
  for (const c of chains) if (c && c.mask && c.count >= 2) { n += c.count; on = true; }
  const h = Math.max(1, Math.ceil(n / RV_W));
  const tex = new Float32Array(RV_W * h);
  let o = 4 * chains.length;
  chains.forEach((c, i) => {
    if (!c || !c.mask || c.count < 2) { tex[4 * i + 3] = -1; return; }
    tex[4 * i] = o; tex[4 * i + 1] = c.count; tex[4 * i + 2] = c.total; tex[4 * i + 3] = c.closed ? 1 : 0;
    for (let k = 0; k < c.count; k++) tex[o + k] = c.mask[k];
    o += c.count;
  });
  return { tex, w: RV_W, h, on };
}

/** The CPU twin of the shaders' rvMask: chain c's reveal width at arc a
 *  (linear between samples; a ring wraps, an open chain clamps). */
export function revealMaskAt(t: { tex: Float32Array }, c: number, a: number): number {
  const T = t.tex;
  if (T[4 * c + 3] < -0.5) return 1;
  const off = T[4 * c]; const n = T[4 * c + 1]; const total = T[4 * c + 2];
  if (!(total > 0)) return T[off];
  if (T[4 * c + 3] > 0.5) {
    let u = (a / total) * n;
    u -= n * Math.floor(u / n);
    const k0 = Math.min(n - 1, Math.floor(u)); const k1 = k0 + 1 === n ? 0 : k0 + 1;
    return T[off + k0] + (T[off + k1] - T[off + k0]) * (u - k0);
  }
  const u = Math.min(1, Math.max(0, a / total)) * (n - 1);
  const k0 = Math.min(n - 2, Math.floor(u));
  return T[off + k0] + (T[off + k0 + 1] - T[off + k0]) * (u - k0);
}

// ---- K1291 s3: the rainbow's swell ----
// Today's ribbon swells to h w behind the rainbow front (reveal_fx.ts
// widthMulFor: w = mask x kSwell, up to 2), but the outline's fill is the
// worker's, at width 1. The app draws the swell itself: a strip along each
// scene chain's band samples (band_gpu chainTex: x, y, s, z) over every
// segment whose ends swell past 1, at the fill's key (z - d zt / h, lifted
// zt / 50 over the chain's own fill), its outer W inked as the border (the
// band steps aside wherever the swell passes 1) and the rainbow's side
// across the swelled width. Vertices, SWELL_STRIDE floats each:
// x, y, key, 1, ink, side, 0, s - the fill's aPos, aKey, aW and aS.

/** Floats per swell vertex. */
export const SWELL_STRIDE = 8;

/** The swell's vertices (TRIANGLES) and, per scene chain drawn, its range. */
export interface SwellStrip {
  data: Float32Array;
  chains: { scene: number; first: number; count: number }[];
}

/** Build the swell strip. `sw` is revealMaskTex over the chains' width
 *  multipliers (null = no swell), `z` the band's chain samples, `maps` each
 *  scene chain's app chain and arc map. */
export function swellStrip(
  sw: { tex: Float32Array },
  z: { chainTex: ArrayLike<number>; chainInfo: ArrayLike<number> },
  maps: readonly ({ chain: number; arcLo: number; scale: number } | undefined)[],
  h: number,
  W: number,
  zt: number
): SwellStrip {
  const out: number[] = [];
  const chains: SwellStrip["chains"] = [];
  const nC = Math.min(maps.length, Math.floor(z.chainInfo.length / 4));
  for (let i = 0; i < nC; i++) {
    const m = maps[i];
    if (!m || m.chain < 0 || 4 * m.chain + 3 >= sw.tex.length || sw.tex[4 * m.chain + 3] < -0.5) continue;
    const base = z.chainInfo[4 * i]; const n = z.chainInfo[4 * i + 1]; const ring = z.chainInfo[4 * i + 2] > 0;
    const segs = ring ? n : n - 1;
    if (segs < 1) continue;
    const T = (k: number, q: number): number => z.chainTex[4 * (base + k) + q];
    const w = new Float64Array(n);
    for (let k = 0; k < n; k++) w[k] = revealMaskAt(sw, m.chain, m.arcLo + T(k, 2) * m.scale);
    const first = out.length / SWELL_STRIDE;
    // A sample's frame: its normal (left of travel) from its neighbours.
    const frame = (k: number): number[] => {
      const a = ring ? (k + n - 1) % n : Math.max(0, k - 1);
      const b = ring ? (k + 1) % n : Math.min(n - 1, k + 1);
      let tx = T(b, 0) - T(a, 0); let ty = T(b, 1) - T(a, 1);
      const l = Math.sqrt(tx * tx + ty * ty);
      if (l > 0) { tx /= l; ty /= l; } else { tx = 1; ty = 0; }
      const hw = h * w[k];
      const ib = Math.max(hw - W, 0);
      return [T(k, 0), T(k, 1), -ty, tx, hw, ib, T(k, 3), T(k, 2)];
    };
    const vert = (f: number[], o: number, ink: number): void => {
      const side = f[4] > 0 ? 0.5 + (0.5 * o) / f[4] : 0.5;
      out.push(f[0] + f[2] * o, f[1] + f[3] * o, f[6] - (Math.abs(o) * zt) / h + zt / 50, 1, ink, side, 0, f[7]);
    };
    for (let j = 0; j < segs; j++) {
      const k1 = j + 1 === n ? 0 : j + 1;
      if (!(Math.max(w[j], w[k1]) > 1 + 1e-4)) continue;
      const A = frame(j); const B = frame(k1);
      // Across: [hw, ib] ink, [ib, 0] and [0, -ib] fill, [-ib, -hw] ink.
      const off = (f: number[]): number[] => [f[4], f[5], 0, -f[5], -f[4]];
      const oa = off(A); const ob = off(B);
      for (let q = 0; q < 4; q++) {
        const ink = q === 0 || q === 3 ? 1 : 0;
        vert(A, oa[q], ink); vert(B, ob[q], ink); vert(B, ob[q + 1], ink);
        vert(A, oa[q], ink); vert(B, ob[q + 1], ink); vert(A, oa[q + 1], ink);
      }
    }
    const count = out.length / SWELL_STRIDE - first;
    if (count > 0) chains.push({ scene: i, first, count });
  }
  return { data: new Float32Array(out), chains };
}