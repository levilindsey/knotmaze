// Ported from .claude/probes/K1240/proto/draw.ts by k1240s4_port.mjs (K1240 S4): the prototype's default path only.
// K1240 S1: both looks from the one outline table, drawn by WebGL2.
// Border look: the outline stroked as a band of width W measured inward
// (toward the centreline foot each outline point carries), K868's goals
// G1-G6 (two edge strokes, over-owned gaps come from the cuts, junction
// corners from the table's arcs). Filled look: the table's faces filled,
// one flat colour per chain in the section-colours scheme (the gamut arc
// at pastel saturation/lightness, one hue step per chain). Both looks
// read the same OutlineTable; nothing here recomputes geometry.
// K1277: the fill is plain triangles (fill_tri.ts) whose topology comes
// from the diagram once; a depth test on form B's key picks the top
// surface. No stencil.
// K1278: the fill paints the section colours per PIXEL (paint.ts): each
// vertex carries four slots (run, weight, s; fill_tri.ts's paint fields),
// the fragment shader evaluates every slot's run colour at its
// interpolated s from a run table texture (runCol, the twin of paint.ts's
// runColour) and blends by the interpolated weights. A slot's run is flat
// per triangle: WebGL2 takes it from the triangle's LAST vertex, so where
// that vertex's runs differ from the CPU rule (vertexPaint: the first
// vertex with a run), the triangle gets its own copy of the vertex
// (PaintData.src maps copies to fill vertices). `?paint=flat` keeps the
// K1277 flat chain colours.
import type { DiagramStructure, OutlineTable, SceneIn } from "./outline";
import { structure } from "./outline";
import { fillFrame, fillResolution, fillRuns, fillStructure, keyScale, SLOTS, type FillFrame, type FillStructure } from "./fill_tri";
import { runTexture, sectionPaint, type PaintMode, type SectionPaint } from "./paint";

export function parseColor(s: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(s.trim());
  if (m) {
    const v = parseInt(m[1], 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }
  const m2 = /^#([0-9a-f]{3})$/i.exec(s.trim());
  if (m2) return [...m2[1]].map((c) => parseInt(c + c, 16) / 255) as [number, number, number];
  return [0, 0, 0];
}

function hslToRgb(hDeg: number, s: number, l: number): [number, number, number] {
  const h = ((hDeg % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number): number => {
    let u = t;
    if (u < 0) u += 1;
    if (u > 1) u -= 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

/** The section-colours scheme: a 280-degree gamut arc from a base hue. */
export function chainColor(chain: number, _nChains: number, baseHue: number): [number, number, number] {
  const GOLDEN = 137.508;
  const hue = baseHue + ((chain * GOLDEN) % 280);
  return hslToRgb(hue, 0.45, 0.64);
}

export function baseHueFor(name: string): number {
  let hsh = 2166136261;
  for (let i = 0; i < name.length; i++) { hsh ^= name.charCodeAt(i); hsh = Math.imul(hsh, 16777619); }
  return ((hsh >>> 0) / 4294967295) * 360;
}

/** Simple ear clipping for one face loop (flat points, no holes). */
export function earClip(pts: number[]): number[] {
  const n = pts.length / 2;
  if (n < 3) return [];
  const idx: number[] = [];
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[2 * i] * pts[2 * j + 1] - pts[2 * j] * pts[2 * i + 1];
  }
  const order = Array.from({ length: n }, (_, i) => i);
  if (area < 0) order.reverse();
  const X = (i: number): number => pts[2 * i];
  const Y = (i: number): number => pts[2 * i + 1];
  const cross = (a: number, b: number, c: number): number => (X(b) - X(a)) * (Y(c) - Y(a)) - (Y(b) - Y(a)) * (X(c) - X(a));
  const inTri = (px: number, py: number, a: number, b: number, c: number): boolean => {
    const d1 = (px - X(b)) * (Y(a) - Y(b)) - (X(a) - X(b)) * (py - Y(b));
    const d2 = (px - X(c)) * (Y(b) - Y(c)) - (X(b) - X(c)) * (py - Y(c));
    const d3 = (px - X(a)) * (Y(c) - Y(a)) - (X(c) - X(a)) * (py - Y(a));
    const neg = (d1 < -1e-15 && d2 < -1e-15 && d3 < -1e-15);
    const pos = (d1 > 1e-15 && d2 > 1e-15 && d3 > 1e-15);
    return neg || pos;
  };
  const work = order.slice();
  let guard = 0;
  while (work.length > 3 && guard++ < n * n + 16) {
    let clipped = false;
    for (let i = 0; i < work.length; i++) {
      const a = work[(i + work.length - 1) % work.length];
      const b = work[i];
      const c = work[(i + 1) % work.length];
      if (cross(a, b, c) <= 1e-15) continue;
      let empty = true;
      for (const w of work) {
        if (w === a || w === b || w === c) continue;
        if (inTri(X(w), Y(w), a, b, c)) { empty = false; break; }
      }
      if (!empty) continue;
      idx.push(a, b, c);
      work.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break; // degenerate remainder: fan it
  }
  for (let i = 1; i + 1 < work.length; i++) idx.push(work[0], work[i], work[i + 1]);
  return idx;
}

export interface DrawData {
  /** K1277: the fill's vertices (x, y), colours (rgb), depth keys and
   *  chain s, and its index buffer, whose topology is fixed at structure. */
  fillPos: Float32Array;
  fillCol: Float32Array;
  fillKey: Float32Array;
  fillS: Float32Array;
  fillIdx: Uint32Array;
  /** Every key lies in [-fillKS, fillKS] (the depth mapping). */
  fillKS: number;
  fill: FillStructure;
  /** K1278: the per-pixel section paint (null: flat chain colours). */
  paint: PaintData | null;
  bandPos: Float32Array;
  bandCol: Float32Array;
  /** K1279: one alpha per band vertex (form B's tie alpha; 1 outside every partner tube). */
  bandAlpha: Float32Array;
  bandCount: number;
}

// ---------------------------------------------------------------------------
// K1279: form B's crossing look for the bands. form B sorts the surfaces at a
// pixel by key = z - d zt / h (z the chain's diagram depth, d the distance to
// its centreline, zt = 0.1 depthAmp) and, where the top two keys are within
// zt, mixes the swapped order in at 1 - ss(-zt, zt, gap). So a band vertex of
// chain c inside a partner pass o's tube is drawn at
//   alpha = 1 - g(d_o) ss(-zt, zt, key_o - key_c),
// g(d_o) = clamp((h - d_o) / W): 0 at o's border (d_o = h), 1 past o's own
// band (d_o <= h - W), where o's band ink covers the ramp. That one formula is
// the under pass's burial (0 deep under the over, fading in where the keys
// tie at shallow crossings), the over pass's fade in a tie (eyes), and 1
// everywhere else. Which passes are partners comes from the crossing table
// (structure); alpha and where it fades follow positions continuously.
// A pass's span on its own chain is [s - lo, s + hi]: at least the straight
// reach 2h / sin + h, and as far as the two threads stay within 2.2h of each
// other (walked in h/4 steps; a shallow crossing's tubes can overlap far past
// the straight reach, cut 273). A walk that meets a junction root on either
// chain keeps the straight reach: past it the threads are one junction group
// in form B, which never tie-mixes a group with itself. The walk ends where
// the partner is beyond 2.2h, so g is 0 there and the span's end shows no step.

interface ZChain { closed: boolean; len: number; xs: Float64Array; ys: Float64Array; s: Float64Array; z: Float64Array; n: number; pins?: { s: number; z: number }[]; win?: number }
interface Pass { s: number; o: number; so: number; lo: number; hi: number; rO: number }

export function sstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** form B's diagramDepth (src/render/field/depth.ts), mirrored. */
function depthAt(pins: { s: number; z: number }[], closed: boolean, len: number, win: number, s: number): number {
  const n = pins.length;
  if (n === 0) return 0;
  const hat = (z: number, d: number, w: number): number => (w <= 1e-12 ? (d <= 0 ? z : 0) : d >= w ? 0 : z * (1 - d / w));
  let u = s;
  if (closed && len > 0) { u = s % len; if (u < 0) u += len; }
  let lo = -1; let hi = n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pins[m].s <= u) lo = m; else hi = m; }
  if (closed) {
    const iL = lo < 0 ? n - 1 : lo;
    const sL = lo < 0 ? pins[iL].s - len : pins[iL].s;
    const iR = lo + 1 >= n ? 0 : lo + 1;
    const sR = lo + 1 >= n ? pins[iR].s + len : pins[iR].s;
    const w = Math.min(win, sR - sL);
    return hat(pins[iL].z, u - sL, w) + hat(pins[iR].z, sR - u, w);
  }
  if (lo < 0) return hat(pins[0].z, pins[0].s - u, win);
  if (lo + 1 >= n) return hat(pins[n - 1].z, u - pins[n - 1].s, win);
  const w = Math.min(win, pins[lo + 1].s - pins[lo].s);
  return hat(pins[lo].z, u - pins[lo].s, w) + hat(pins[lo + 1].z, pins[lo + 1].s - u, w);
}

export function zChains(scene: SceneIn): { zc: ZChain[]; passes: Pass[][]; idx: Map<number, number> } {
  const amp = scene.look.depthAmp;
  const win = scene.look.depthWindow * (scene.look.ctrlArc ?? 1);
  const h = scene.look.halfWidth;
  const idx = new Map<number, number>(); scene.chains.forEach((c, i) => idx.set(c.id, i));
  const zc: ZChain[] = scene.chains.map((c) => {
    const n = c.pts.length >> 1; const xs = new Float64Array(n); const ys = new Float64Array(n); const s = new Float64Array(n);
    for (let i = 0; i < n; i++) { xs[i] = c.pts[2 * i]; ys[i] = c.pts[2 * i + 1]; if (i > 0) s[i] = s[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]); }
    const len = c.closed && n > 1 ? s[n - 1] + Math.hypot(xs[0] - xs[n - 1], ys[0] - ys[n - 1]) : n > 0 ? s[n - 1] : 0;
    return { closed: c.closed, len, xs, ys, s, z: new Float64Array(n), n };
  });
  const pins: { s: number; z: number }[][] = scene.chains.map(() => []);
  const passes: Pass[][] = scene.chains.map(() => []);
  const norm = (c: ZChain, s: number): number => (c.closed && c.len > 0 ? ((s % c.len) + c.len) % c.len : s);
  const tan = (c: ZChain, s: number): [number, number] => {
    const u = norm(c, s); let k = 0; while (k + 2 < c.n && c.s[k + 1] <= u) k++;
    const j = c.closed ? (k + 1) % c.n : Math.min(k + 1, c.n - 1);
    const dx = c.xs[j] - c.xs[k]; const dy = c.ys[j] - c.ys[k]; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l];
  };
  const posAt = (c: ZChain, s: number): [number, number] => {
    const m = c.n - 1;
    const u = c.closed && c.len > 0 ? norm(c, s) : Math.min(Math.max(s, 0), c.s[m]);
    if (u >= c.s[m]) {
      if (!c.closed) return [c.xs[m], c.ys[m]];
      const l = c.len - c.s[m]; const t = l > 0 ? (u - c.s[m]) / l : 0;
      return [c.xs[m] + (c.xs[0] - c.xs[m]) * t, c.ys[m] + (c.ys[0] - c.ys[m]) * t];
    }
    let lo = 0; let hi = m;
    while (hi - lo > 1) { const k = (lo + hi) >> 1; if (c.s[k] <= u) lo = k; else hi = k; }
    const l = c.s[lo + 1] - c.s[lo]; const t = l > 0 ? (u - c.s[lo]) / l : 0;
    return [c.xs[lo] + (c.xs[lo + 1] - c.xs[lo]) * t, c.ys[lo] + (c.ys[lo + 1] - c.ys[lo]) * t];
  };
  // Junction roots per chain: a through arm's s, an end arm's chain end.
  const roots: number[][] = scene.chains.map(() => []);
  for (const j of scene.junctions) for (const arm of j.arms) {
    const i = idx.get(arm.chain); if (i === undefined) continue;
    const c = zc[i];
    roots[i].push(arm.kind === "end" ? (Math.abs(arm.s) <= Math.abs(arm.s - c.len) ? 0 : c.len) : norm(c, arm.s));
  }
  const rootBetween = (i: number, a: number, b: number): boolean => {
    const c = zc[i]; const d = dSC(c, a, b); const R = roots[i];
    for (let q = 0; q < R.length; q++) { const e = dSC(c, a, R[q]); if (d >= 0 ? e > 0 && e <= d : e < 0 && e >= d) return true; }
    return false;
  };
  /** Walk chain ia from sa in direction dir while chain ib (tracked from sb) stays within 2.2h. */
  const walk = (ia: number, sa: number, ib: number, sb: number, dir: number): { u: number; root: boolean } => {
    const C = zc[ia]; const O = zc[ib]; const step = h / 4;
    let u = 0; let so = sb; let sPrev = sa;
    while (u < 64 * h) {
      const un = u + step; const s = sa + dir * un;
      if (!C.closed && (s < 0 || s > C.len)) break;
      const [x, y] = posAt(C, s);
      // K1283 s10 (perf): footNear's foot, allocation-free (zChains ran 11 ms a frame on def).
      nearW(O, x, y, so, 2 * h, s, ib === ia ? 3 * h : 0);
      if (!(nwBest < 2.2 * h)) break;
      if (rootBetween(ia, sPrev, s) || rootBetween(ib, so, nwBs)) return { u: un, root: true };
      u = un; so = nwBs; sPrev = s;
    }
    return { u, root: false };
  };
  const span = (ia: number, sa: number, ib: number, sb: number, base: number): [number, number] => {
    const f = walk(ia, sa, ib, sb, 1); const b = walk(ia, sa, ib, sb, -1);
    return [b.root ? base : Math.max(base, b.u + h), f.root ? base : Math.max(base, f.u + h)];
  };
  for (const x of scene.crossings) {
    const ia = idx.get(x.a.chain); const ib = idx.get(x.b.chain);
    if (ia === undefined || ib === undefined) continue;
    const sa = norm(zc[ia], x.a.s); const sb = norm(zc[ib], x.b.s);
    pins[ia].push({ s: sa, z: x.over === "a" ? amp : -amp });
    pins[ib].push({ s: sb, z: x.over === "b" ? amp : -amp });
    const ta = tan(zc[ia], sa); const tb = tan(zc[ib], sb);
    const sin = Math.abs(ta[0] * tb[1] - ta[1] * tb[0]);
    // How far along each pass the other's tube can reach on straight threads: 2h / sin, plus h.
    const base = Math.min(2 * h / Math.max(sin, 0.05) + h, 48 * h);
    const [loA, hiA] = span(ia, sa, ib, sb, base);
    const [loB, hiB] = span(ib, sb, ia, sa, base);
    passes[ia].push({ s: sa, o: ib, so: sb, lo: loA, hi: hiA, rO: Math.max(loB, hiB) });
    passes[ib].push({ s: sb, o: ia, so: sa, lo: loB, hi: hiB, rO: Math.max(loA, hiA) });
  }
  if (CONTACT_PASSES) {
    // The contacts are structure: found on a diagram's first frame, then reused (a stale one ties
    // nothing - tieAlpha needs the partner's foot within h).
    let key = `${scene.name}|${scene.crossings.length}|${scene.junctions.length}`;
    for (const [id, i] of idx) key += `|${id}:${zc[i].n}`;
    let cp = CONTACT_CACHE.get(key);
    if (!cp) {
      const jr: { i: number; s: number }[][] = scene.junctions.map((j) => j.arms.flatMap((arm) => {
        const i = idx.get(arm.chain); if (i === undefined) return [];
        const c = zc[i];
        return [{ i, s: arm.kind === "end" ? (Math.abs(arm.s) <= Math.abs(arm.s - c.len) ? 0 : c.len) : norm(c, arm.s) }];
      }));
      const n0 = passes.map((P) => P.length);
      contactPasses(zc, passes, jr, h);
      cp = passes.map((P, i) => P.slice(n0[i]));
      if (CONTACT_CACHE.size >= 8) CONTACT_CACHE.delete(CONTACT_CACHE.keys().next().value as string);
      CONTACT_CACHE.set(key, cp);
      contactStats.built++;
    } else {
      for (let i = 0; i < cp.length; i++) for (const P of cp[i]) passes[i].push(P);
      contactStats.hits++;
    }
  }
  zc.forEach((c, i) => { pins[i].sort((u, v) => u.s - v.s); for (let k = 0; k < c.n; k++) c.z[k] = depthAt(pins[i], c.closed, c.len, win, c.s[k]); c.pins = pins[i]; c.win = win; });
  return { zc, passes, idx };
}

/** K1283 s11: contact passes. Form B's tie mix blends ANY two surfaces whose
 *  cone keys are within zt, not only a crossing's pair: near a crossing a
 *  third thread (or the same one, far along it) can lie inside a tube
 *  without crossing it (muse_hash x77: chain 50's end arm inside chain 11's
 *  tube at 11's s 6.6, 4.7 from their junction), and its border there ties
 *  (form B's ink 0.34 = 1 - sstep of the key gap) where the outline inked 1.
 *  Each stretch of chain i whose vertices lie within 2.25h of chain j's
 *  and that goes inside j's tube (nearest under 1.6h; threads merely side
 *  by side at 2h tie nowhere in form B either), not already a crossing
 *  pass's pair there and not both within 6h of a junction they share
 *  (runEndFade's), becomes a pass of i against j, so
 *  tieAlpha and band_gpu.ts tie it as a crossing's. The tie is continuous:
 *  a pass appears before any band point is within h of the partner. */
const CONTACT_PASSES = true;
const CONTACT_CACHE = new Map<string, Pass[][]>();
/** Probe counters: contact sets built and reused. */
export const contactStats = { built: 0, hits: 0 };
function contactPasses(zc: ZChain[], passes: Pass[][], jr: { i: number; s: number }[][], h: number): void {
  const R = 2.25 * h; const R2 = R * R; const LJ = 6 * h; const SELF = 6 * h; const STEP = 0.5 * h; const DEEP2 = 1.6 * h * 1.6 * h;
  // Samples every STEP of arc (the chains' vertices are ~h/6 apart), in a counting-sort grid of R cells.
  let N = 0;
  for (const c of zc) N += Math.ceil(c.len / STEP) + 2;
  const sx = new Float64Array(N); const sy = new Float64Array(N); const ss = new Float64Array(N); const sc = new Int32Array(N);
  const first = new Int32Array(zc.length + 1);
  let n = 0; let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (let i = 0; i < zc.length; i++) {
    const c = zc[i]; first[i] = n; let last = -Infinity;
    for (let k = 0; k < c.n && n < N; k++) {
      if (c.s[k] - last < STEP && k !== c.n - 1) continue;
      last = c.s[k]; const x = c.xs[k]; const y = c.ys[k];
      sx[n] = x; sy[n] = y; ss[n] = c.s[k]; sc[n] = i; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  first[zc.length] = n;
  if (n === 0) return;
  const gw = Math.floor((x1 - x0) / R) + 1; const gh = Math.floor((y1 - y0) / R) + 1;
  const start = new Int32Array(gw * gh + 1); const cell = new Int32Array(n); const items = new Int32Array(n);
  for (let q = 0; q < n; q++) { const g = Math.floor((sy[q] - y0) / R) * gw + Math.floor((sx[q] - x0) / R); cell[q] = g; start[g + 1]++; }
  for (let g = 0; g < gw * gh; g++) start[g + 1] += start[g];
  const fillAt = start.slice(0, gw * gh);
  for (let q = 0; q < n; q++) items[fillAt[cell[q]]++] = q;
  // Junction roots by chain: [junction, s] pairs.
  const roots: number[][] = zc.map(() => []);
  jr.forEach((J, ji) => { for (const r of J) roots[r.i].push(ji, r.s); });
  const bestD = new Float64Array(zc.length).fill(Infinity); const bestS = new Float64Array(zc.length); const touched: number[] = [];
  for (let i = 0; i < zc.length; i++) {
    const C = zc[i]; const half = C.len / 2;
    const byO = new Map<number, Pass[]>();
    for (const P of passes[i]) { let L = byO.get(P.o); if (!L) { L = []; byO.set(P.o, L); } L.push(P); }
    let hits: Map<number, number[]> | null = null;
    for (let q = first[i]; q < first[i + 1]; q++) {
      const x = sx[q]; const y = sy[q]; const sk = ss[q];
      const gx = Math.floor((x - x0) / R); const gy = Math.floor((y - y0) / R);
      touched.length = 0;
      for (let yy = Math.max(0, gy - 1); yy <= Math.min(gh - 1, gy + 1); yy++) {
        for (let xx = Math.max(0, gx - 1); xx <= Math.min(gw - 1, gx + 1); xx++) {
          const g = yy * gw + xx;
          for (let t = start[g]; t < start[g + 1]; t++) {
            const it = items[t]; const j = sc[it];
            const ex = sx[it] - x; const ey = sy[it] - y; const d2 = ex * ex + ey * ey;
            if (!(d2 < R2)) continue;
            if (j === i) { let d = Math.abs(ss[it] - sk); if (C.closed && d > half) d = C.len - d; if (d < SELF) continue; }
            if (bestD[j] === Infinity) touched.push(j);
            if (d2 < bestD[j]) { bestD[j] = d2; bestS[j] = ss[it]; }
          }
        }
      }
      for (const j of touched) {
        const O = zc[j]; const sm = bestS[j]; const d2 = bestD[j]; bestD[j] = Infinity;
        let covered = false;
        const L = byO.get(j);
        if (L) for (const P of L) {
          const ds = dSC(C, P.s, sk);
          if (ds >= -P.lo - h && ds <= P.hi + h && Math.abs(dSC(O, P.so, sm)) <= P.rO + h) { covered = true; break; }
        }
        if (covered) continue;
        const ra = roots[i]; const rb = roots[j];
        for (let u = 0; u < ra.length && !covered; u += 2) {
          if (Math.abs(dSC(C, ra[u + 1], sk)) >= LJ) continue;
          for (let v = 0; v < rb.length; v += 2) if (rb[v] === ra[u] && Math.abs(dSC(O, rb[v + 1], sm)) < LJ) { covered = true; break; }
        }
        if (covered) continue;
        if (!hits) hits = new Map();
        let H = hits.get(j); if (!H) { H = []; hits.set(j, H); }
        H.push(sk, sm, d2);
      }
    }
    if (!hits) continue;
    for (const [j, H] of hits) {
      const O = zc[j];
      let a = 0;
      const flush = (b: number): void => {
        // Stretch H[a..b) (triples: own s, partner s, d²): own span by summed steps, partner span
        // about its first s. Only a stretch that goes INSIDE the partner's tube (nearest sample
        // under DEEP; x77's is 0.9h) ties: two threads side by side (j59's ch7/ch23, 1.98h) touch
        // without overlapping, and a tie there faded the border form B keeps.
        let span = 0; let mLo = 0; let mHi = 0; let dm2 = Infinity;
        for (let u = a; u < b; u += 3) if (H[u + 2] < dm2) dm2 = H[u + 2];
        if (!(dm2 < DEEP2)) return;
        for (let u = a + 3; u < b; u += 3) span += dSC(C, H[u - 3], H[u]);
        for (let u = a; u < b; u += 3) { const dm = dSC(O, H[a + 1], H[u + 1]); if (dm < mLo) mLo = dm; if (dm > mHi) mHi = dm; }
        let s = H[a] + span / 2; if (C.closed && C.len > 0) s = ((s % C.len) + C.len) % C.len;
        let so = H[a + 1] + (mLo + mHi) / 2; if (O.closed && O.len > 0) so = ((so % O.len) + O.len) % O.len;
        const hs = Math.abs(span) / 2;
        passes[i].push({ s, o: j, so, lo: hs + h, hi: hs + h, rO: (mHi - mLo) / 2 + 2 * h });
      };
      for (let u = 3; u < H.length; u += 3) {
        if (Math.abs(dSC(C, H[u - 3], H[u])) > 2 * h || Math.abs(dSC(O, H[u - 2], H[u + 1])) > 4 * h) { flush(u); a = u; }
      }
      flush(H.length);
    }
  }
}

/** K1283 s7: form B's depth at any s of chain c, past an open chain's ends
 *  too (form B's end arm extension to c' takes its depth there). */
export function zPastC(c: ZChain, s: number): number {
  return c.pins ? depthAt(c.pins, c.closed, c.len, c.win ?? 0, s) : zAtC(c, s);
}

/** Signed arc distance b - a on a chain (wrapped into (-len/2, len/2] when closed). */
export function dSC(c: ZChain, a: number, b: number): number {
  let d = b - a;
  if (c.closed && c.len > 0) { d = ((d % c.len) + c.len) % c.len; if (d > c.len / 2) d -= c.len; }
  return d;
}

export function zAtC(c: ZChain, s: number): number {
  if (c.n === 0) return 0;
  const u = c.closed && c.len > 0 ? ((s % c.len) + c.len) % c.len : Math.min(Math.max(s, 0), c.s[c.n - 1]);
  let lo = 0; let hi = c.n - 1;
  if (u >= c.s[c.n - 1]) {
    if (!c.closed) return c.z[c.n - 1];
    const l = c.len - c.s[c.n - 1]; const t = l > 0 ? (u - c.s[c.n - 1]) / l : 0; return c.z[c.n - 1] + (c.z[0] - c.z[c.n - 1]) * t;
  }
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c.s[m] <= u) lo = m; else hi = m; }
  const l = c.s[lo + 1] - c.s[lo]; const t = l > 0 ? (u - c.s[lo]) / l : 0;
  return c.z[lo] + (c.z[lo + 1] - c.z[lo]) * t;
}

/** K1283 s10 (perf): footNear(c, x, y, sC, r, sSkip, skipR) into nwBest (d)
 *  and nwBs (s), allocation-free, the same foot bit for bit: a segment whose
 *  squared distance is past the best's square (with a 1e-12 margin over
 *  hypot's rounding) cannot win footNear's hypot comparison, so only the
 *  rest pay for Math.hypot. zChains' pass walks call it about 100k times a
 *  frame on def. */
let nwBest = Infinity; let nwBest2 = Infinity; let nwBs = 0;
function nearVisit(c: ZChain, x: number, y: number, sC: number, r: number, sSkip: number, skipR: number, k: number): void {
  const j = (k + 1) % c.n; const sk = c.s[k]; const lk = j === 0 ? c.len - sk : c.s[j] - sk;
  const mid = sk + lk / 2;
  const cl = c.closed && c.len > 0;
  let dA = mid - sC;
  if (cl) { dA = ((dA % c.len) + c.len) % c.len; if (dA > c.len / 2) dA -= c.len; }
  if (Math.abs(dA) > r + lk / 2) return;
  if (skipR > 0) {
    let dB = mid - sSkip;
    if (cl) { dB = ((dB % c.len) + c.len) % c.len; if (dB > c.len / 2) dB -= c.len; }
    if (Math.abs(dB) < skipR) return;
  }
  const ax = c.xs[k]; const ay = c.ys[k]; const ex = c.xs[j] - ax; const ey = c.ys[j] - ay;
  const l2 = ex * ex + ey * ey;
  const t = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * ex + (y - ay) * ey) / l2)) : 0;
  const px = x - ax - t * ex; const py = y - ay - t * ey;
  if (px * px + py * py > nwBest2 * (1 + 1e-12)) return;
  const d = Math.hypot(px, py);
  if (d < nwBest) { nwBest = d; nwBest2 = d * d; nwBs = sk + t * lk; }
}
// An upper bound on the foot's distance (a segment footNear accepts): segments
// whose every point is farther, by the distance's 1-Lipschitz bound in arc
// length from a vertex, are skipped. They cannot be the first minimum
// footNear's index-order scan keeps, so the scan of the rest keeps it.
let nwBound = Infinity;
function nearRange(c: ZChain, x: number, y: number, sC: number, r: number, sSkip: number, skipR: number, a: number, b: number): void {
  const segs = c.closed ? c.n : c.n - 1; const ss = c.s; const xs = c.xs; const ys = c.ys;
  let k = 0;
  if (ss[0] <= a) { let lo = 0; let hi = segs - 1; while (hi > lo) { const m = (lo + hi + 1) >> 1; if (ss[m] <= a) lo = m; else hi = m - 1; } k = lo; }
  while (k < segs && ss[k] <= b) {
    const bd = nwBest < nwBound ? nwBest : nwBound;
    if (bd < Infinity) {
      const dx = x - xs[k]; const dy = y - ys[k];
      const reach = Math.sqrt(dx * dx + dy * dy) - bd * (1 + 1e-9) - 1e-12;
      if (reach > 0) {
        const sv = ss[k]; let kk = k;
        while (kk < segs && ss[kk] <= b && (kk + 1 < c.n ? ss[kk + 1] : c.len) - sv <= reach) kk++;
        if (kk > k) { k = kk; continue; }
      }
    }
    nearVisit(c, x, y, sC, r, sSkip, skipR, k);
    k++;
  }
}
function nearW(c: ZChain, x: number, y: number, sC: number, r: number, sSkip: number, skipR: number): void {
  nwBest = Infinity; nwBest2 = Infinity; nwBs = 0; nwBound = Infinity;
  const segs = c.closed ? c.n : c.n - 1;
  if (segs <= 0) return;
  // The bound: footNear's own test of the segment at sC (it accepts it unless a self pass skips it).
  {
    const u = c.closed && c.len > 0 ? (((sC % c.len) + c.len) % c.len) : sC; const ss = c.s;
    let k0 = 0;
    if (ss[0] <= u) { let lo = 0; let hi = segs - 1; while (hi > lo) { const m = (lo + hi + 1) >> 1; if (ss[m] <= u) lo = m; else hi = m - 1; } k0 = lo; }
    nearVisit(c, x, y, sC, r, sSkip, skipR, k0);
    nwBound = nwBest; nwBest = Infinity; nwBest2 = Infinity; nwBs = 0;
  }
  if (c.closed && c.len > 0) {
    if (2 * r >= c.len) { for (let k = 0; k < segs; k++) nearVisit(c, x, y, sC, r, sSkip, skipR, k); }
    else { const a = (((sC - r) % c.len) + c.len) % c.len; const b = a + 2 * r; if (b <= c.len) nearRange(c, x, y, sC, r, sSkip, skipR, a, b); else { nearRange(c, x, y, sC, r, sSkip, skipR, a, c.len); nearRange(c, x, y, sC, r, sSkip, skipR, 0, b - c.len); } }
  } else nearRange(c, x, y, sC, r, sSkip, skipR, sC - r, sC + r);
}

/** Nearest point on chain c to (x, y) among segments whose arc span meets
 *  [sC - r, sC + r], skipping those within `skipR` of sSkip (a self pass). */
export function footNear(c: ZChain, x: number, y: number, sC: number, r: number, sSkip: number, skipR: number): { d: number; s: number } {
  let best = Infinity; let bs = 0;
  const segs = c.closed ? c.n : c.n - 1;
  if (segs <= 0) return { d: best, s: bs };
  const visit = (k: number): void => {
    const j = (k + 1) % c.n; const sk = c.s[k]; const lk = j === 0 ? c.len - sk : c.s[j] - sk;
    const mid = sk + lk / 2;
    if (Math.abs(dSC(c, sC, mid)) > r + lk / 2) return;
    if (skipR > 0 && Math.abs(dSC(c, sSkip, mid)) < skipR) return;
    const ax = c.xs[k]; const ay = c.ys[k]; const ex = c.xs[j] - ax; const ey = c.ys[j] - ay;
    const l2 = ex * ex + ey * ey;
    const t = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * ex + (y - ay) * ey) / l2)) : 0;
    const d = Math.hypot(x - ax - t * ex, y - ay - t * ey);
    if (d < best) { best = d; bs = sk + t * lk; }
  };
  // Only the segments whose arc span meets [sC - r, sC + r] (binary search).
  const first = (u: number): number => { let lo = 0; let hi = segs - 1; if (c.s[0] > u) return 0; while (hi > lo) { const m = (lo + hi + 1) >> 1; if (c.s[m] <= u) lo = m; else hi = m - 1; } return lo; };
  const range = (a: number, b: number): void => { for (let k = first(a); k < segs && c.s[k] <= b; k++) visit(k); };
  if (c.closed && c.len > 0) {
    if (2 * r >= c.len) { for (let k = 0; k < segs; k++) visit(k); }
    else { const a = (((sC - r) % c.len) + c.len) % c.len; const b = a + 2 * r; if (b <= c.len) range(a, b); else { range(a, c.len); range(0, b - c.len); } }
  } else range(sC - r, sC + r);
  return { d: best, s: bs };
}

/** `fill` carries the structure the table was framed from and, for motion,
 *  the fill topology decided once on frame 0 (omit both for a still). */
/** K1278: the GPU's paint buffers. GPU vertex g draws fill vertex src[g]
 *  (the first nV are the fill's own; the rest are provoking-vertex copies
 *  carrying a triangle's runs). run is structural; pos, key, w and s are
 *  refreshed per frame (paintFrame), the run table (tex) too, since a
 *  run's span follows the arms. */
export interface PaintData {
  mode: PaintMode;
  sp: SectionPaint;
  /** Fill-vertex runs (fill_tri.fillRuns), kept for the CPU twin. */
  runs: Int32Array;
  fr: FillFrame;
  src: Uint32Array;
  idx: Uint32Array;
  run: Int32Array;
  pos: Float32Array;
  key: Float32Array;
  w: Float32Array;
  s: Float32Array;
  tex: Float32Array;
  texW: number;
  texH: number;
  copies: number;
}

/** Texels per row of the run table (4 texels per run). */
const RUN_TEX_W = 1024;

/** The run table laid out RUN_TEX_W texels wide (texel 4r+i of run r). */
function runTable(sp: SectionPaint): { tex: Float32Array; texW: number; texH: number } {
  const t = runTexture(sp);
  const texH = Math.max(1, Math.ceil(t.length / 4 / RUN_TEX_W));
  const tex = new Float32Array(4 * RUN_TEX_W * texH); tex.set(t);
  return { tex, texW: RUN_TEX_W, texH };
}

export function paintData(fs: FillStructure, st: DiagramStructure, fr: FillFrame, scene: SceneIn, mode: PaintMode, baseHue: number): PaintData {
  const sp = sectionPaint(scene, mode, baseHue);
  const runs = fillRuns(fs, st, fr, sp);
  const nV = fs.nV;
  const idx = Uint32Array.from(fs.idx);
  const src: number[] = []; for (let v = 0; v < nV; v++) src.push(v);
  const run: number[] = Array.from(runs);
  const claimed = new Uint8Array(nV);
  const copyOf = new Map<string, number>();
  const want = new Int32Array(SLOTS);
  for (let t = 0; t < idx.length; t += 3) {
    for (let k = 0; k < SLOTS; k++) {
      want[k] = -1;
      for (let q = 0; q < 3; q++) { const r = runs[SLOTS * fs.idx[t + q] + k]; if (r >= 0) { want[k] = r; break; } }
    }
    const v = idx[t + 2];
    let same = true; for (let k = 0; k < SLOTS; k++) if (run[SLOTS * v + k] !== want[k]) same = false;
    if (same) { claimed[v] = 1; continue; }
    if (!claimed[v]) { claimed[v] = 1; for (let k = 0; k < SLOTS; k++) run[SLOTS * v + k] = want[k]; continue; }
    const key = `${v}:${want.join(",")}`;
    let g = copyOf.get(key);
    if (g === undefined) { g = src.length; src.push(v); for (let k = 0; k < SLOTS; k++) run.push(want[k]); copyOf.set(key, g); }
    idx[t + 2] = g;
  }
  const nG = src.length;
  const pd: PaintData = {
    mode, sp, runs, fr, src: Uint32Array.from(src), idx, run: Int32Array.from(run),
    pos: new Float32Array(2 * nG), key: new Float32Array(nG), w: new Float32Array(SLOTS * nG), s: new Float32Array(SLOTS * nG),
    tex: new Float32Array(0), texW: RUN_TEX_W, texH: 1, copies: nG - nV,
  };
  paintFrame(pd, fr, sp);
  return pd;
}

/** A frame's paint: positions, keys, slot weights and s through src, and
 *  the run table (the runs' spans on this frame; same runs, same order). */
export function paintFrame(pd: PaintData, fr: FillFrame, sp?: SectionPaint): void {
  const S = pd.src;
  for (let g = 0; g < S.length; g++) {
    const v = S[g];
    pd.pos[2 * g] = fr.pos[2 * v]; pd.pos[2 * g + 1] = fr.pos[2 * v + 1];
    pd.key[g] = fr.key[v];
    for (let k = 0; k < SLOTS; k++) { pd.w[SLOTS * g + k] = fr.w4[SLOTS * v + k]; pd.s[SLOTS * g + k] = fr.s4[SLOTS * v + k]; }
  }
  pd.fr = fr;
  if (sp) { if (sp.runs.length !== pd.sp.runs.length) throw new Error("paintFrame: run count changed"); pd.sp = sp; }
  const t = runTable(pd.sp); pd.tex = t.tex; pd.texW = t.texW; pd.texH = t.texH;
}

/** The border ink's band of one frame (form B's tie alpha per vertex). The
 *  app rebuilds it every frame: its vertex count follows the pieces. */
export interface BandData { bandPos: Float32Array; bandCol: Float32Array; bandAlpha: Float32Array; bandCount: number }
/** The tie alpha of a band point of chain c at (x, y), own foot s, own
 *  distance dC (bandData's, taken out of it as is for band_gpu's twin test). */
export function tieAlpha(zz: ReturnType<typeof zChains>, h: number, W: number, zt: number): (c: number, x: number, y: number, s: number, dC: number) => number {
  const { zc, passes } = zz;
  const seen: { o: number; s: number; d: number; f: number }[] = [];
  return (c: number, x: number, y: number, s: number, dC: number): number => {
    seen.length = 0;
    const C = zc[c];
    const keyC = zAtC(C, s) - (dC * zt) / h;
    for (const P of passes[c]) {
      const ds = dSC(C, P.s, s); if (ds < -P.lo || ds > P.hi) continue;
      const O = zc[P.o];
      const f = footNear(O, x, y, P.so, P.rO, s, P.o === c ? 3 * h : 0);
      if (!(f.d < h)) continue;
      const g = Math.min(1, Math.max(0, (h - f.d) / W));
      const keyO = zAtC(O, f.s) - (f.d * zt) / h;
      const e = { o: P.o, s: f.s, d: f.d, f: 1 - g * sstep(-zt, zt, keyO - keyC) };
      // Two passes can reach the same stretch of the partner (neighbouring
      // crossings of one pair): it counts once, by its strongest fade (a pass
      // whose window stops short of the true foot finds a farther, weaker
      // one). A minimum of continuous fades stays continuous as feet move.
      const q = seen.findIndex((u) => u.o === P.o && Math.abs(dSC(O, u.s, f.s)) < h);
      if (q < 0) seen.push(e); else if (e.f < seen[q].f) seen[q] = e;
    }
    let a = 1; for (const u of seen) a *= u.f;
    return a;
  };
}
export function bandData(table: OutlineTable, scene: SceneIn, zz: ReturnType<typeof zChains>): BandData {
  const ink = parseColor(scene.look.ink);
  const bandPos: number[] = [];
  const bandCol: number[] = [];
  const bandAlpha: number[] = [];
  const W = table.W;
  const h = table.h;
  const zt = 0.1 * scene.look.depthAmp;
  const { zc, passes } = zz;
  const alphaAt = tieAlpha(zz, h, W, zt);
  const SUB = h / 8; const ROWS = 8;
  for (const p of table.pieces) {
    const np = p.pts.length / 2;
    if (np < 2) continue;
    const tied = (p.kind === "run" || p.kind === "ghost") && p.chain >= 0 && p.chain < zc.length && passes[p.chain].length > 0;
    if (tied) {
      // Per-vertex own s: the piece's [s0, s1] by border length, refined to
      // the nearest centreline point within 2h of it.
      const C = zc[p.chain];
      const cum: number[] = [0];
      for (let i = 1; i < np; i++) cum.push(cum[i - 1] + Math.hypot(p.pts[2 * i] - p.pts[2 * i - 2], p.pts[2 * i + 1] - p.pts[2 * i - 1]));
      const L = cum[np - 1] || 1;
      const span = p.s1 - p.s0;
      const sv: number[] = [];
      for (let i = 0; i < np; i++) {
        const sI = p.s0 + (span * cum[i]) / L;
        sv.push(footNear(C, p.cpts[2 * i], p.cpts[2 * i + 1], sI, 2 * h, 0, 0).s);
      }
      const near = (s: number): boolean => passes[p.chain].some((P) => { const ds = dSC(C, P.s, s); return ds >= -P.lo - h && ds <= P.hi + h; });
      const inn = (i: number): [number, number] => {
        const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
        let dx = p.cpts[2 * i] - x; let dy = p.cpts[2 * i + 1] - y;
        const l = Math.hypot(dx, dy);
        if (l < 1e-12) { const j = Math.min(i + 1, np - 1); const ex = p.pts[2 * j] - x; const ey = p.pts[2 * j + 1] - y; const el = Math.hypot(ex, ey) || 1; dx = -ey / el; dy = ex / el; } else { dx /= l; dy /= l; }
        return [x + dx * W, y + dy * W];
      };
      let prevI = inn(0);
      for (let i = 0; i + 1 < np; i++) {
        const ax = p.pts[2 * i]; const ay = p.pts[2 * i + 1]; const bx = p.pts[2 * i + 2]; const by = p.pts[2 * i + 3];
        const ia = prevI; const ib = inn(i + 1); prevI = ib;
        const sa = sv[i]; const sb = sa + dSC(C, sa, sv[i + 1]);
        const tiedSeg = near(sa) || near(sb);
        // Near a pass the segment is split where it crosses the lines
        // s = m SUB of its own chain (not into equal parts: a count that
        // follows the length would move every sample when it steps, while a
        // grid line enters a segment at one of its ends, on a vertex that is
        // already there, so the interpolated fade moves continuously).
        const ts: number[] = [0];
        if (tiedSeg && Math.abs(sb - sa) > 1e-9) {
          const lo = Math.min(sa, sb); const hi = Math.max(sa, sb);
          const m0 = Math.floor(lo / SUB) + 1; const m1 = Math.min(Math.ceil(hi / SUB) - 1, m0 + 63);
          for (let m = m0; m <= m1; m++) ts.push((m * SUB - sa) / (sb - sa));
          if (sb < sa) ts.splice(1, ts.length - 1, ...ts.slice(1).reverse());
        }
        ts.push(1);
        // Near a pass the band is also split across its width (ROWS rows): the
        // alpha falls across the partner's border, which can cut the band at
        // any angle, and one outer/inner pair would interpolate the fade
        // into pixels the partner does not cover.
        const R = tiedSeg ? ROWS : 1;
        let prev: [number, number, number][] | null = null;
        for (const t of ts) {
          const ox = ax + (bx - ax) * t; const oy = ay + (by - ay) * t;
          const ix = ia[0] + (ib[0] - ia[0]) * t; const iy = ia[1] + (ib[1] - ia[1]) * t;
          const s = sa + (sb - sa) * t;
          const cur: [number, number, number][] = [];
          for (let r = 0; r <= R; r++) {
            const u = r / R; const x = ox + (ix - ox) * u; const y = oy + (iy - oy) * u;
            cur.push([x, y, tiedSeg ? alphaAt(p.chain, x, y, s, h - W * u) : 1]);
          }
          if (prev) {
            for (let r = 0; r < R; r++) {
              const pO = prev[r]; const cO = cur[r]; const pI = prev[r + 1]; const cI = cur[r + 1];
              bandPos.push(pO[0], pO[1], cO[0], cO[1], pI[0], pI[1], cO[0], cO[1], cI[0], cI[1], pI[0], pI[1]);
              bandAlpha.push(pO[2], cO[2], pI[2], cO[2], cI[2], pI[2]);
              for (let m = 0; m < 6; m++) bandCol.push(ink[0], ink[1], ink[2]);
            }
          }
          prev = cur;
        }
      }
      continue;
    }
    const inner: [number, number][] = [];
    for (let i = 0; i < np; i++) {
      const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
      const cx = p.cpts[2 * i]; const cy = p.cpts[2 * i + 1];
      let dx = cx - x; let dy = cy - y;
      const l = Math.hypot(dx, dy);
      if (l < 1e-12) {
        // Fall back to the segment normal.
        const j = Math.min(i + 1, np - 1);
        const ex = p.pts[2 * j] - x; const ey = p.pts[2 * j + 1] - y;
        const el = Math.hypot(ex, ey) || 1;
        dx = -ey / el; dy = ex / el;
      } else { dx /= l; dy /= l; }
      inner.push([x + dx * W, y + dy * W]);
    }
    for (let i = 0; i + 1 < np; i++) {
      const [ax, ay] = [p.pts[2 * i], p.pts[2 * i + 1]];
      const [bx, by] = [p.pts[2 * i + 2], p.pts[2 * i + 3]];
      const [iax, iay] = inner[i];
      const [ibx, iby] = inner[i + 1];
      bandPos.push(ax, ay, bx, by, iax, iay, bx, by, ibx, iby, iax, iay);
      for (let k = 0; k < 6; k++) bandCol.push(ink[0], ink[1], ink[2]);
      // K1283 s3: a tail's own alpha per point (outer, inner), else 1.
      const pa = p.alpha && p.alpha.length === 2 * np ? p.alpha : null;
      if (pa) bandAlpha.push(pa[2 * i], pa[2 * i + 2], pa[2 * i + 1], pa[2 * i + 2], pa[2 * i + 3], pa[2 * i + 1]);
      else for (let k = 0; k < 6; k++) bandAlpha.push(1);
    }
  }
  return { bandPos: Float32Array.from(bandPos), bandCol: Float32Array.from(bandCol), bandAlpha: Float32Array.from(bandAlpha), bandCount: bandPos.length / 2 };
}

export function buildDrawData(table: OutlineTable, scene: SceneIn, fill?: { st: DiagramStructure; fs?: FillStructure }, paint: PaintMode | "flat" = "app"): DrawData {
  const baseHue = baseHueFor(scene.name);
  const nCh = scene.chains.length;
  // K1277: the fill as triangles fixed at structure; per frame, positions,
  // keys and s only. Colour is one flat colour per owner chain.
  const st = fill?.st ?? structure(scene);
  const fs = fill?.fs ?? fillStructure(st, fillResolution(st, table));
  const zz = zChains(scene);
  const fr = fillFrame(fs, st, table, scene, zz);
  const chainCols = Array.from({ length: nCh }, (_, c) => chainColor(c, nCh, baseHue));
  const fillCol = new Float32Array(3 * fs.nV);
  for (let v = 0; v < fs.nV; v++) { const c = chainCols[fs.vChain[v]] ?? [0, 0, 0]; fillCol[3 * v] = c[0]; fillCol[3 * v + 1] = c[1]; fillCol[3 * v + 2] = c[2]; }
  const band = bandData(table, scene, zz);
  return {
    fillPos: Float32Array.from(fr.pos), fillCol, fillKey: fr.key, fillS: fr.s, fillIdx: fs.idx, fillKS: keyScale(scene), fill: fs,
    paint: paint === "flat" ? null : paintData(fs, st, fr, scene, paint, baseHue),
    ...band,
  };
}

export class OutlineRenderer {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private vaoFill: WebGLVertexArrayObject;
  private fillPosBuf: WebGLBuffer;
  private fillKeyBuf: WebGLBuffer;
  private vaoBand: WebGLVertexArrayObject;
  private uMat: WebGLUniformLocation | null;
  private uKS: WebGLUniformLocation | null;
  private data: DrawData;
  /** K1278: the paint fill (program, VAO, per-frame buffers, run table). */
  private pProg: WebGLProgram | null = null;
  private pVao: WebGLVertexArrayObject | null = null;
  private pBufs: { pos: WebGLBuffer; key: WebGLBuffer; w: WebGLBuffer; s: WebGLBuffer } | null = null;
  private pTex: WebGLTexture | null = null;
  private pU: { mat: WebGLUniformLocation | null; ks: WebGLUniformLocation | null; runs: WebGLUniformLocation | null } | null = null;
  /** Draw the fill with the per-pixel paint (when the data has one). */
  usePaint = true;
  constructor(canvas: HTMLCanvasElement, data: DrawData) {
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true, depth: true, stencil: false });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    this.data = data;
    // K1277: aKey is form B's surface key; the depth test keeps the highest
    // (the top surface). Bands leave aKey at its default (0) with the test off.
    const vs = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec4 aCol;
layout(location=2) in float aKey;
uniform mat3 uMat;
uniform float uKS;
out vec4 vCol;
void main() {
  vec3 p = uMat * vec3(aPos, 1.0);
  gl_Position = vec4(p.xy, clamp(-aKey / uKS, -1.0, 1.0), 1.0);
  vCol = aCol;
}`;
    const fs = `#version 300 es
precision highp float;
in vec4 vCol;
out vec4 o;
void main() { o = vCol; }`;
    const mk = (type: number, src: string): WebGLShader => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link failed");
    this.prog = prog;
    this.uMat = gl.getUniformLocation(prog, "uMat");
    this.uKS = gl.getUniformLocation(prog, "uKS");
    const mkVao = (pos: Float32Array, col: Float32Array, nc = 3): WebGLVertexArrayObject => {
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      const pb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, pb);
      gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const cb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, cb);
      gl.bufferData(gl.ARRAY_BUFFER, col, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, nc, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      return vao;
    };
    // K1277: the fill VAO: positions and keys change per frame (DYNAMIC),
    // colours and the index buffer never do.
    this.vaoFill = gl.createVertexArray()!;
    gl.bindVertexArray(this.vaoFill);
    this.fillPosBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data.fillPos, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const fcb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fcb);
    gl.bufferData(gl.ARRAY_BUFFER, data.fillCol, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    this.fillKeyBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillKeyBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data.fillKey, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.fillIdx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    // K1279: bands carry their tie alpha (RGBA) and blend over the fills.
    const nb = data.bandCol.length / 3; const rgba = new Float32Array(4 * nb);
    for (let i = 0; i < nb; i++) { rgba[4 * i] = data.bandCol[3 * i]; rgba[4 * i + 1] = data.bandCol[3 * i + 1]; rgba[4 * i + 2] = data.bandCol[3 * i + 2]; rgba[4 * i + 3] = data.bandAlpha[i] ?? 1; }
    this.vaoBand = mkVao(data.bandPos, rgba, 4);
    if (data.paint) this.initPaint(data.paint, mk);
  }

  /** K1278: the paint fill program. runCol is paint.ts's runColour. */
  private initPaint(pd: PaintData, mk: (type: number, src: string) => WebGLShader): void {
    const gl = this.gl;
    const vs = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=2) in float aKey;
layout(location=3) in ivec4 aRun;
layout(location=4) in vec4 aW;
layout(location=5) in vec4 aS;
uniform mat3 uMat;
uniform float uKS;
flat out ivec4 vRun;
out vec4 vW;
out vec4 vS;
void main() {
  vec3 p = uMat * vec3(aPos, 1.0);
  gl_Position = vec4(p.xy, clamp(-aKey / uKS, -1.0, 1.0), 1.0);
  vRun = aRun; vW = aW; vS = aS;
}`;
    const fsrc = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D uRuns;
flat in ivec4 vRun;
in vec4 vW;
in vec4 vS;
out vec4 o;
vec4 tx(int q) { return texelFetch(uRuns, ivec2(q % ${RUN_TEX_W}, q / ${RUN_TEX_W}), 0); }
float ez(float u, float e) { return u + (u * u * (3.0 - 2.0 * u) - u) * e; }
vec3 runCol(int r, float s) {
  vec4 t0 = tx(4 * r); vec4 t1 = tx(4 * r + 1); vec4 t2 = tx(4 * r + 2); vec4 t3 = tx(4 * r + 3);
  float cu = s;
  if (t2.w > 0.0) cu = s + t2.w * floor((0.5 * (t0.x + t0.y) - s) / t2.w + 0.5);
  float da = cu - t0.x; float db = t0.y - cu;
  if (t0.z > 0.0 && da < t0.z) return mix(t1.rgb, t2.rgb, ez(clamp(da / t0.z, 0.0, 1.0), t1.w));
  if (t0.w > 0.0 && db < t0.w) return mix(t3.rgb, t2.rgb, ez(clamp(db / t0.w, 0.0, 1.0), t1.w));
  return t2.rgb;
}
void main() {
  vec3 c = vec3(0.0); float W = 0.0;
  for (int k = 0; k < 4; k++) {
    int r = vRun[k]; float w = vW[k];
    if (r < 0 || !(w > 0.0)) continue;
    c += w * runCol(r, vS[k]); W += w;
  }
  o = vec4(W > 0.0 ? c / W : vec3(0.0), 1.0);
}`;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, fsrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("paint link failed: " + gl.getProgramInfoLog(prog));
    this.pProg = prog;
    this.pU = { mat: gl.getUniformLocation(prog, "uMat"), ks: gl.getUniformLocation(prog, "uKS"), runs: gl.getUniformLocation(prog, "uRuns") };
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buf = (data: ArrayBufferView, loc: number, n: number, usage: number, int = false): WebGLBuffer => {
      const b = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      gl.enableVertexAttribArray(loc);
      if (int) gl.vertexAttribIPointer(loc, n, gl.INT, 0, 0);
      else gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
      return b;
    };
    this.pBufs = {
      pos: buf(pd.pos, 0, 2, gl.DYNAMIC_DRAW),
      key: buf(pd.key, 2, 1, gl.DYNAMIC_DRAW),
      w: buf(pd.w, 4, 4, gl.DYNAMIC_DRAW),
      s: buf(pd.s, 5, 4, gl.DYNAMIC_DRAW),
    };
    buf(pd.run, 3, 4, gl.STATIC_DRAW, true);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, pd.idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.pVao = vao;
    this.pTex = gl.createTexture();
    this.uploadRuns(pd);
  }

  private uploadRuns(pd: PaintData): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.pTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, pd.texW, pd.texH, 0, gl.RGBA, gl.FLOAT, pd.tex);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /**
   * World->clip matrix from the scene camera. CSS = (a x + c y + e,
   * b x + d y + f); clip = (2 cssX / vpW - 1, 1 - 2 cssY / vpH). A crop
   * re-centres on a world point and zooms about the canvas centre (CSS
   * space, so 1 CSS px = 2 device px at the page's dpr 2).
   * GLSL mat3 is column-major: columns are (m00, m10, 0), (m01, m11, 0),
   * (m02, m12, 1).
   */
  matrix(scene: SceneIn, crop?: { cx: number; cy: number; zoom: number }): Float32Array {
    const m = scene.camera.worldToCss;
    const vp = scene.camera.viewport;
    let a = m[0]; let b = m[1]; let c = m[2]; let d = m[3]; let e = m[4]; let f = m[5];
    if (crop) {
      const ccx = a * crop.cx + c * crop.cy + e;
      const ccy = b * crop.cx + d * crop.cy + f;
      const z = crop.zoom;
      e = (e - ccx) * z + vp[0] / 2;
      f = (f - ccy) * z + vp[1] / 2;
      a *= z; b *= z; c *= z; d *= z;
    }
    return new Float32Array([
      (2 * a) / vp[0], (-2 * b) / vp[1], 0,
      (2 * c) / vp[0], (-2 * d) / vp[1], 0,
      (2 * e) / vp[0] - 1, 1 - (2 * f) / vp[1], 1,
    ]);
  }

  /** K1277: a new frame's fill positions and keys (same topology). */
  updateFill(pos: Float32Array, key: Float32Array): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillPosBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillKeyBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, key);
    this.data = { ...this.data, fillPos: pos, fillKey: key };
  }

  /** K1278: a new frame's paint (same topology): positions, keys, slot
   *  weights and s, and the run table (spans follow the arms). */
  updatePaint(fr: FillFrame, sp?: SectionPaint): void {
    const pd = this.data.paint; if (!pd || !this.pBufs) return;
    paintFrame(pd, fr, sp);
    const gl = this.gl;
    const put = (b: WebGLBuffer, d: Float32Array): void => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferSubData(gl.ARRAY_BUFFER, 0, d); };
    put(this.pBufs.pos, pd.pos); put(this.pBufs.key, pd.key); put(this.pBufs.w, pd.w); put(this.pBufs.s, pd.s);
    this.uploadRuns(pd);
  }

  draw(scene: SceneIn, mode: "border" | "fill" | "both", crop?: { cx: number; cy: number; zoom: number }): void {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    gl.viewport(0, 0, canvas.width, canvas.height);
    const paper = parseColor(scene.look.paper);
    gl.clearColor(paper[0], paper[1], paper[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    const mat = this.matrix(scene, crop);
    // Column-major mat3 for GLSL: our Float32Array is built row-pairs as
    // (a, b, 0, c', d', 0, tx, ty, 1) matching GLSL mat3 columns below.
    gl.uniformMatrix3fv(this.uMat, false, mat);
    if (mode === "fill" || mode === "both") {
      // K1277: one indexed draw; the depth test keeps the highest key
      // (LEQUAL: an exact tie goes to the later triangle, as fill_tri's
      // CPU raster does).
      gl.uniform1f(this.uKS, this.data.fillKS);
      gl.clearDepth(1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      if (this.usePaint && this.data.paint && this.pProg && this.pU) {
        // K1278: the per-pixel paint, same raster and depth rule.
        gl.useProgram(this.pProg);
        gl.uniformMatrix3fv(this.pU.mat, false, mat);
        gl.uniform1f(this.pU.ks, this.data.fillKS);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.pTex);
        gl.uniform1i(this.pU.runs, 0);
        gl.bindVertexArray(this.pVao);
        gl.drawElements(gl.TRIANGLES, this.data.paint.idx.length, gl.UNSIGNED_INT, 0);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.useProgram(this.prog);
      } else {
        gl.bindVertexArray(this.vaoFill);
        gl.drawElements(gl.TRIANGLES, this.data.fillIdx.length, gl.UNSIGNED_INT, 0);
      }
      gl.disable(gl.DEPTH_TEST);
    }
    if (mode === "border" || mode === "both") {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(this.vaoBand);
      gl.drawArrays(gl.TRIANGLES, 0, this.data.bandCount);
      gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
  }

  /** Wall time of one draw: 10 draws back to back, synced with finish(). */
  timeDraw(scene: SceneIn, mode: "border" | "fill" | "both"): number {
    const gl = this.gl;
    this.draw(scene, mode);
    gl.finish();
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) this.draw(scene, mode);
    gl.finish();
    return (performance.now() - t0) / 10;
  }
}

/** World -> device px on the page's canvas (full view, dpr 2). */
export function worldToDevice(scene: SceneIn, x: number, y: number): [number, number] {
  const m = scene.camera.worldToCss;
  return [(m[0] * x + m[2] * y + m[4]) * 2, (m[1] * x + m[3] * y + m[5]) * 2];
}

/** A point on a scene chain at arc length s (raw export points). */
export function scenePointAt(scene: SceneIn, chain: number, s: number): [number, number] {
  const c = scene.chains[chain];
  const pts = c.pts;
  let acc = 0;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const l = Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]);
    if (acc + l >= s || i + 5 >= pts.length) {
      const t = l > 0 ? Math.min(1, Math.max(0, (s - acc) / l)) : 0;
      return [pts[i] + (pts[i + 2] - pts[i]) * t, pts[i + 1] + (pts[i + 3] - pts[i + 1]) * t];
    }
    acc += l;
  }
  return [pts[pts.length - 2], pts[pts.length - 1]];
}
