// K1240 S1: both looks from the one outline table, drawn by WebGL2.
// Border look: the outline stroked as a band of width W measured inward
// (toward the centreline foot each outline point carries), K868's goals
// G1-G6 (two edge strokes, over-owned gaps come from the cuts, junction
// corners from the table's arcs). Filled look: the table's faces filled,
// one flat colour per chain in the section-colours scheme (the gamut arc
// at pastel saturation/lightness, one hue step per chain). Both looks
// read the same OutlineTable; nothing here recomputes geometry.
import type { OutlineTable, SceneIn } from "./outline";

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
export function chainColor(chain: number, nChains: number, baseHue: number): [number, number, number] {
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

export interface FillFaceDraw { fanOff: number; fanCnt: number; quadOff: number }
export interface DrawData {
  fillFanPos: Float32Array; // fan triangles per face (stencil pass)
  fillFanCol: Float32Array;
  fillQuadPos: Float32Array; // one bbox quad per face (colour pass)
  fillQuadCol: Float32Array;
  fillFaces: FillFaceDraw[];
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

interface ZChain { closed: boolean; len: number; xs: Float64Array; ys: Float64Array; s: Float64Array; z: Float64Array; n: number }
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
    const c = zc[i]; const d = dSC(c, a, b);
    return roots[i].some((r) => { const e = dSC(c, a, r); return d >= 0 ? e > 0 && e <= d : e < 0 && e >= d; });
  };
  /** Walk chain ia from sa in direction dir while chain ib (tracked from sb) stays within 2.2h. */
  const walk = (ia: number, sa: number, ib: number, sb: number, dir: number): { u: number; root: boolean } => {
    const C = zc[ia]; const O = zc[ib]; const step = h / 4;
    let u = 0; let so = sb; let sPrev = sa;
    while (u < 64 * h) {
      const un = u + step; const s = sa + dir * un;
      if (!C.closed && (s < 0 || s > C.len)) break;
      const [x, y] = posAt(C, s);
      const f = footNear(O, x, y, so, 2 * h, s, ib === ia ? 3 * h : 0);
      if (!(f.d < 2.2 * h)) break;
      if (rootBetween(ia, sPrev, s) || rootBetween(ib, so, f.s)) return { u: un, root: true };
      u = un; so = f.s; sPrev = s;
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
  zc.forEach((c, i) => { pins[i].sort((u, v) => u.s - v.s); for (let k = 0; k < c.n; k++) c.z[k] = depthAt(pins[i], c.closed, c.len, win, c.s[k]); });
  return { zc, passes, idx };
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

export function buildDrawData(table: OutlineTable, scene: SceneIn): DrawData {
  const baseHue = baseHueFor(scene.name);
  const nCh = scene.chains.length;
  // Fill is drawn with the stencil: a fan from each face's first vertex
  // toggles the stencil, then the face's bbox quad paints where set.
  // That fills any simple loop exactly, with no CPU triangulation.
  const fanPos: number[] = [];
  const fanCol: number[] = [];
  const quadPos: number[] = [];
  const quadCol: number[] = [];
  const fillFaces: FillFaceDraw[] = [];
  for (const f of table.faces) {
    if (f.hole || f.ownerChain < 0) continue;
    const col = chainColor(f.ownerChain, nCh, baseHue);
    const n = f.pts.length / 2;
    if (n < 3) continue;
    const fanOff = fanPos.length / 2;
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (let i = 0; i < n; i++) {
      x0 = Math.min(x0, f.pts[2 * i]); x1 = Math.max(x1, f.pts[2 * i]);
      y0 = Math.min(y0, f.pts[2 * i + 1]); y1 = Math.max(y1, f.pts[2 * i + 1]);
    }
    for (let i = 1; i + 1 < n; i++) {
      fanPos.push(f.pts[0], f.pts[1], f.pts[2 * i], f.pts[2 * i + 1], f.pts[2 * i + 2], f.pts[2 * i + 3]);
      for (let k = 0; k < 3; k++) fanCol.push(col[0], col[1], col[2]);
    }
    const quadOff = quadPos.length / 2;
    quadPos.push(x0, y0, x1, y0, x1, y1, x0, y0, x1, y1, x0, y1);
    for (let k = 0; k < 6; k++) quadCol.push(col[0], col[1], col[2]);
    fillFaces.push({ fanOff, fanCnt: (n - 2) * 3, quadOff });
  }
  const ink = parseColor(scene.look.ink);
  const bandPos: number[] = [];
  const bandCol: number[] = [];
  const bandAlpha: number[] = [];
  const W = table.W;
  const h = table.h;
  const zt = 0.1 * scene.look.depthAmp;
  const { zc, passes } = zChains(scene);
  const seen: { o: number; s: number }[] = [];
  /** The tie alpha of a band vertex of chain c at (x, y), own foot s, own distance dC. */
  const alphaAt = (c: number, x: number, y: number, s: number, dC: number): number => {
    let a = 1; seen.length = 0;
    const C = zc[c];
    const keyC = zAtC(C, s) - (dC * zt) / h;
    for (const P of passes[c]) {
      const ds = dSC(C, P.s, s); if (ds < -P.lo || ds > P.hi) continue;
      const O = zc[P.o];
      const f = footNear(O, x, y, P.so, P.rO, s, P.o === c ? 3 * h : 0);
      if (!(f.d < h)) continue;
      if (seen.some((q) => q.o === P.o && Math.abs(dSC(O, q.s, f.s)) < h)) continue;
      seen.push({ o: P.o, s: f.s });
      const g = Math.min(1, Math.max(0, (h - f.d) / W));
      const keyO = zAtC(O, f.s) - (f.d * zt) / h;
      a *= 1 - g * sstep(-zt, zt, keyO - keyC);
    }
    return a;
  };
  const SUB = h / 8;
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
        const k = near(sa) || near(sb) ? Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / SUB)) : 1;
        const tiedSeg = k > 1 || near(sa) || near(sb);
        let pO: [number, number, number] | null = null; let pI: [number, number, number] | null = null;
        for (let q = 0; q <= k; q++) {
          const t = q / k;
          const ox = ax + (bx - ax) * t; const oy = ay + (by - ay) * t;
          const ix = ia[0] + (ib[0] - ia[0]) * t; const iy = ia[1] + (ib[1] - ia[1]) * t;
          const s = sa + (sb - sa) * t;
          const aO = tiedSeg ? alphaAt(p.chain, ox, oy, s, h) : 1;
          const aI = tiedSeg ? alphaAt(p.chain, ix, iy, s, h - W) : 1;
          const cO: [number, number, number] = [ox, oy, aO]; const cI: [number, number, number] = [ix, iy, aI];
          if (pO && pI) {
            bandPos.push(pO[0], pO[1], cO[0], cO[1], pI[0], pI[1], cO[0], cO[1], cI[0], cI[1], pI[0], pI[1]);
            bandAlpha.push(pO[2], cO[2], pI[2], cO[2], cI[2], pI[2]);
            for (let m = 0; m < 6; m++) bandCol.push(ink[0], ink[1], ink[2]);
          }
          pO = cO; pI = cI;
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
      for (let k = 0; k < 6; k++) { bandCol.push(ink[0], ink[1], ink[2]); bandAlpha.push(1); }
    }
  }
  return {
    fillFanPos: Float32Array.from(fanPos), fillFanCol: Float32Array.from(fanCol),
    fillQuadPos: Float32Array.from(quadPos), fillQuadCol: Float32Array.from(quadCol),
    fillFaces,
    bandPos: Float32Array.from(bandPos), bandCol: Float32Array.from(bandCol), bandAlpha: Float32Array.from(bandAlpha),
    bandCount: bandPos.length / 2,
  };
}

export class OutlineRenderer {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private vaoFill: WebGLVertexArrayObject;
  private vaoQuad: WebGLVertexArrayObject;
  private vaoBand: WebGLVertexArrayObject;
  private uMat: WebGLUniformLocation | null;
  private data: DrawData;
  constructor(canvas: HTMLCanvasElement, data: DrawData) {
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true, stencil: true });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    this.data = data;
    const vs = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec4 aCol;
uniform mat3 uMat;
out vec4 vCol;
void main() {
  vec3 p = uMat * vec3(aPos, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
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
    this.vaoFill = mkVao(data.fillFanPos, data.fillFanCol);
    this.vaoQuad = mkVao(data.fillQuadPos, data.fillQuadCol);
    // K1279: bands carry their tie alpha (RGBA) and blend over the fills.
    const nb = data.bandCol.length / 3; const rgba = new Float32Array(4 * nb);
    for (let i = 0; i < nb; i++) { rgba[4 * i] = data.bandCol[3 * i]; rgba[4 * i + 1] = data.bandCol[3 * i + 1]; rgba[4 * i + 2] = data.bandCol[3 * i + 2]; rgba[4 * i + 3] = data.bandAlpha[i] ?? 1; }
    this.vaoBand = mkVao(data.bandPos, rgba, 4);
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
      // Stencil fill per face: fan toggles, bbox quad paints where set.
      gl.enable(gl.STENCIL_TEST);
      for (const f of this.data.fillFaces) {
        gl.clear(gl.STENCIL_BUFFER_BIT);
        gl.colorMask(false, false, false, false);
        gl.stencilFunc(gl.ALWAYS, 0, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
        gl.bindVertexArray(this.vaoFill);
        gl.drawArrays(gl.TRIANGLES, f.fanOff, f.fanCnt);
        gl.colorMask(true, true, true, true);
        gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        gl.bindVertexArray(this.vaoQuad);
        gl.drawArrays(gl.TRIANGLES, f.quadOff, 6);
      }
      gl.disable(gl.STENCIL_TEST);
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
