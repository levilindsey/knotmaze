// Ported from .claude/probes/K1240/proto/fill_tri.ts by k1240s4_port.mjs (K1240 S4): the prototype's default path only.
// K1277: the fill as plain triangles whose topology is decided once, from
// the diagram. Per frame only vertex positions (and the depth key, a
// function of chain and s) change; the index buffer, every face's vertex
// count and the draw order are fixed by `fillStructure`.
//
// The pieces (all from `DiagramStructure`, never from positions):
// - STRIP: one per interval that has border pieces (a kept run, or a
//   crossing's discarded under pass, which has ghost pieces). Three rows of
//   N + 1 vertices: the side +1 border, the centre, the side -1 border.
//   Rows are resampled at equal fractions of the borders' centreline-foot
//   length, so row i sits at the same s on both borders. The centre row is
//   the midpoint of the two border vertices, so a strip's end row lies on
//   the straight edge between its two end points (watertight with the
//   junction fan and the cap fan that share that edge). 4 N triangles.
//   A side the frame leaves empty (its border consumed next to a junction
//   or a crossing) is the other side mirrored across that side's
//   centreline feet, so the strip keeps the tube's width; copying the
//   other side made it zero-width and left paper in the tube under the
//   junction (muse_hash iv 477, K1279 x73 / x47, g41_user_tw64 x14).
// - CAP: a fan from the midpoint of the cap's two ends over the cap rim,
//   resampled to M points.
// - JUNCTION: a fan from the junction centre over the junction region's
//   ring, built as the region is (outline.ts regionsPhaseC): per arm in
//   `armsOfJ` order, P (side -dir end of the arm's interval), M (the
//   midpoint of P and N: the strip's centre vertex, so the fan and the
//   strip share every vertex of that edge, K1278), N (side +dir),
//   then K interior points of the corner whose aArm is that arm (its arc
//   about Q, or a straight line to the next arm's P). A fan covers its
//   ring's nonzero-winding area, so a fold overdraws instead of cracking.
//
// - TAIL: one per tail piece (a junction corner with an end arm, outline.ts
//   endTailPts): two rows of TAIL_M + 1 vertices, the tail's border points
//   and their centreline feet, resampled together. It fills the strip of
//   the end chain the tail walks along, between its border and its
//   centreline, which no strip or cap covers (the end arm's interval ends
//   at the junction). An empty tail (the margin never opens) is
//   degenerate: every vertex at one point.
//
// Draw order: ghost strips, run strips, caps, tails, junctions, fixed by index.
// Over before under is decided per pixel by a depth key (form B's own key,
// z - d zt / h: z the chain's crossing-diagram depth at s, d the distance
// to the centreline, zt = 0.1 depthAmp), linear across each triangle:
// centre rows carry z(s), border rows z(s) - zt. The depth test keeps the
// highest key, which is form B's top surface; no stencil.
//
// The only frame-0 measurement is each strip's resolution N
// (`fillResolution`, from frame 0's piece lengths), taken once.
//
// THE PAINT FIELDS (K1278). Every vertex carries four paint slots, each a
// section run (paint.ts) and a weight (`vW`, structure) and an s along
// that run's chain (`FillFrame.s4`, per frame), plus `across` (0 on the
// centreline, 1 on the border). A pixel's colour is the weighted mean of
// its slots' run colours at their interpolated s (paint.ts paintAt, the
// shader's twin); every field is linear in a triangle and equal at every
// vertex two faces share, so the paint is continuous across every
// triangle, face and junction edge. Never a colour per face or triangle.
// - Strip, cap and tail vertices use slot 0 only: their run, weight 1. A
//   strip's border rows take s from their own piece's feet (s0 -> s1), the
//   centre row their mean; a cap's s is its chain end's; a tail's runs
//   from its piece's s0 to s1.
// - A junction's slot k is its arm k (armsOfJ order, at most 4). Arm k's
//   P, M, N take the strip end row's s (bit-equal values on the shared
//   edge) with weight one-hot on k; a corner's points ease the weight from
//   arm k to arm k + 1 (smoothstep along the arc); the hub weighs every
//   arm 1 / n at the junction's own s, where every run of the app's
//   contract shows the junction's converged colour. So a junction hands
//   off from one arm's run to the next across its corners, and to the
//   converged colour at its centre, with no step on any edge.
// Which run a slot reads is decided once (`fillRuns`, from frame 0); the
// run's span follows the frame.
import type { DiagramStructure, OutlineTable, SceneIn } from "./outline";
import { zChains, zAtC, footNear } from "./draw";
import { paintAt, runAt, type SectionPaint } from "./paint";

export const CAP_M = 17;
export const ARC_K = 16;
/** Tail resolution: above outline.ts's TAIL_N + 2 points, so a tail is never dense. */
export const TAIL_M = 24;

export interface StripItem { kind: "strip"; iv: number; pi: number; ghost: boolean; N: number; base: number; pL: number; pR: number }
export interface CapItem { kind: "cap"; pi: number; piece: number; atEnd: boolean; base: number }
/** jItem / arm: the junction item and its arm index (its end arm) whose fan the tail lies over; -1 if none. */
export interface TailItem { kind: "tail"; pi: number; piece: number; base: number; jItem: number; arm: number }
/** `strip`: the item index of the arm's strip (-1: none), whose end row at
 *  `atStart` is the arm's P, M, N. */
export interface JArm { ai: number; pi: number; ei: number; pN: number; pP: number; atStart: boolean; corner: number; strip: number }
export interface JuncItem { kind: "junc"; ji: number; owner: number; arms: JArm[]; base: number; R: number }
export type FillItem = StripItem | CapItem | TailItem | JuncItem;

/** Vertices an item owns, from `base`. */
export function itemVerts(it: FillItem): number {
  return it.kind === "strip" ? 3 * (it.N + 1) : it.kind === "cap" ? CAP_M + 1 : it.kind === "tail" ? 2 * (TAIL_M + 1) : 1 + it.R;
}

export interface FillStructure {
  nV: number;
  idx: Uint32Array;
  /** Owner chain (index) of each vertex: the colour for this stage. */
  vChain: Int32Array;
  items: FillItem[];
  /** Junction arms whose P or N has no interval piece (structure-level count). */
  missingArmEnds: number;
  /** K1278: per vertex, the four paint slots' weights (see the header). */
  vW: Float32Array;
}

/** Paint slots per vertex. */
export const SLOTS = 4;

export interface FillFrame {
  /** Positions in float64, as the outline table holds them (the census
   *  rasters these, as it rasters master's faces); draw.ts uploads float32. */
  pos: Float64Array;
  key: Float32Array;
  /** Chain arc length per vertex (slot 0's s). */
  s: Float32Array;
  /** K1278: per vertex, the four paint slots' s (float64: a long closed
   *  chain's s must not lose the paint's precision). */
  s4: Float64Array;
  /** K1278: per vertex, the four slots' weights on this frame: the structure's (vW), with each junction corner's hand-off placed by the corner's shape (see the header). */
  w4: Float32Array;
  /** K1278: 0 on the centreline, 1 on the border. */
  across: Float32Array;
  fallbacks: number;
  /** Border pieces with more points than their strip has samples (equal-fraction samples instead). */
  dense: number;
}

/** Each interval's strip resolution, measured once on frame 0's table. */
export function fillResolution(st: DiagramStructure, table0: OutlineTable): Int32Array {
  const N = new Int32Array(st.intervalsD.length);
  const sub = table0.h / 8;
  st.piecesD.forEach((d, k) => {
    if (d.kind !== "run" && d.kind !== "ghost") return;
    const p = table0.pieces[k];
    let len = polyLen(p.cpts);
    if (!(len > 1e-9)) len = polyLen(p.pts);
    const n = Math.min(4096, Math.max(d.kind === "ghost" ? 24 : 4, Math.ceil((1.5 * len) / sub) + 2));
    N[d.interval] = Math.max(N[d.interval], n);
  });
  return N;
}

function polyLen(a: number[]): number {
  let l = 0;
  for (let i = 2; i + 1 < a.length; i += 2) l += Math.hypot(a[i] - a[i - 2], a[i + 1] - a[i - 1]);
  return l;
}

/** The fill's topology from the diagram (plus the once-measured resolution). */
export function fillStructure(st: DiagramStructure, res: Int32Array): FillStructure {
  const items: FillItem[] = [];
  const idx: number[] = [];
  const vChain: number[] = [];
  const vW: number[] = [];
  let nV = 0;
  const stripOfIv = new Map<number, number>();
  // Border pieces per interval and side.
  const ivPieces = new Map<number, { L: number; R: number; ghost: boolean }>();
  st.piecesD.forEach((d, k) => {
    if (d.kind !== "run" && d.kind !== "ghost") return;
    const e = ivPieces.get(d.interval) ?? { L: -1, R: -1, ghost: d.kind === "ghost" };
    if (d.side > 0) e.L = k; else e.R = k;
    ivPieces.set(d.interval, e);
  });
  const strip = (iv: number, e: { L: number; R: number; ghost: boolean }): void => {
    const pi = st.intervalsD[iv].pi;
    const N = Math.max(1, res[iv] || 8);
    const base = nV; const W = N + 1;
    for (let r = 0; r < 3; r++) for (let i = 0; i <= N; i++) { vChain.push(pi); vW.push(1, 0, 0, 0); }
    nV += 3 * W;
    stripOfIv.set(iv, items.length);
    const V = (r: number, i: number): number => base + r * W + i;
    for (let i = 0; i < N; i++) {
      idx.push(V(0, i), V(0, i + 1), V(1, i));
      idx.push(V(1, i), V(0, i + 1), V(1, i + 1));
      idx.push(V(1, i), V(1, i + 1), V(2, i));
      idx.push(V(2, i), V(1, i + 1), V(2, i + 1));
    }
    items.push({ kind: "strip", iv, pi, ghost: e.ghost, N, base, pL: e.L, pR: e.R });
  };
  // 1. ghost strips (under passes), 2. run strips: interval order.
  for (const ghost of [true, false]) for (const [iv, e] of [...ivPieces.entries()].sort((a, b) => a[0] - b[0])) if (e.ghost === ghost) strip(iv, e);
  // 3. caps.
  let capK = 0;
  st.piecesD.forEach((d, k) => {
    if (d.kind !== "cap") return;
    const cp = st.caps[capK++];
    const base = nV;
    for (let i = 0; i <= CAP_M; i++) { vChain.push(d.chain); vW.push(1, 0, 0, 0); } // hub + M rim
    nV += CAP_M + 1;
    for (let i = 0; i + 1 < CAP_M; i++) idx.push(base, base + 1 + i, base + 2 + i);
    items.push({ kind: "cap", pi: d.chain, piece: k, atEnd: cp ? cp.atEnd : false, base });
  });
  // 4. tails: row 0 the tail's border points, row 1 their centreline feet.
  st.piecesD.forEach((d, k) => {
    if (d.kind !== "tail") return;
    const base = nV; const W = TAIL_M + 1;
    for (let i = 0; i < 2 * W; i++) { vChain.push(d.chain); vW.push(1, 0, 0, 0); }
    nV += 2 * W;
    for (let i = 0; i < TAIL_M; i++) {
      idx.push(base + i, base + i + 1, base + W + i);
      idx.push(base + W + i, base + i + 1, base + W + i + 1);
    }
    items.push({ kind: "tail", pi: d.chain, piece: k, base, jItem: -1, arm: -1 });
  });
  // 5. junctions.
  const stOfArm = new Map<number, number>();
  st.stationsD.forEach((q, i) => { if (q.kind === "junction" && q.arm >= 0) stOfArm.set(q.arm, i); });
  const cornerByAArm = new Map<number, number>();
  st.corners.forEach((c, ci) => { if (!cornerByAArm.has(c.aArm)) cornerByAArm.set(c.aArm, ci); });
  let missing = 0;
  st.armsOfJ.forEach((L, ji) => {
    if (!L || L.length === 0) return;
    const arms: JArm[] = [];
    for (const ai of L) {
      const a = st.arms[ai];
      const sti = stOfArm.get(ai);
      let pN = -1; let pP = -1; let atStart = true; let strip = -1;
      if (sti !== undefined) {
        for (const [iv, e] of ivPieces) {
          const I = st.intervalsD[iv];
          if (I.aSt !== sti && I.bSt !== sti) continue;
          atStart = I.aSt === sti;
          pN = a.dir > 0 ? e.L : e.R;
          pP = a.dir > 0 ? e.R : e.L;
          strip = stripOfIv.get(iv) ?? -1;
          break;
        }
      }
      if (pN < 0 || pP < 0) missing++;
      arms.push({ ai, pi: a.pi, ei: a.ei, pN, pP, atStart, corner: cornerByAArm.get(ai) ?? -1, strip });
    }
    const n = arms.length;
    const R = n * (3 + ARC_K);
    const base = nV;
    const owner = st.arms[L[0]].pi;
    // Weights: hub 1 / n per arm; P, M, N one-hot; a corner eases arm k -> k + 1.
    const wv = (k: number, u: number): number[] => {
      const w = [0, 0, 0, 0];
      const k1 = (k + 1) % n;
      if (k < SLOTS) w[k] += 1 - u;
      if (k1 < SLOTS) w[k1] += u;
      return w;
    };
    vChain.push(owner); vW.push(...[0, 1, 2, 3].map((k) => (k < n ? 1 / Math.min(n, SLOTS) : 0)));
    for (let k = 0; k < n; k++) {
      for (let q = 0; q < 3; q++) { vChain.push(owner); vW.push(...wv(k, 0)); }
      for (let q = 1; q <= ARC_K; q++) { const t = q / (ARC_K + 1); vChain.push(owner); vW.push(...wv(k, t * t * (3 - 2 * t))); }
    }
    nV += R + 1;
    for (let i = 0; i < R; i++) idx.push(base, base + 1 + i, base + 1 + ((i + 1) % R));
    items.push({ kind: "junc", ji, owner, arms, base, R });
  });
  // K1278 s2: a tail's junction and arm. The tail is its corner's end-arm
  // margin; fillRuns and fillFrame give it the fan's paint where it lies
  // over the fan, so the tail's edge carries no step.
  const jOfArm = new Map<number, [number, number]>();
  items.forEach((it, q) => { if (it.kind === "junc") it.arms.forEach((a, k) => jOfArm.set(a.ai, [q, k])); });
  for (const it of items) {
    if (it.kind !== "tail") continue;
    const d = st.piecesD[it.piece]; const c = d && d.corner >= 0 ? st.corners[d.corner] : undefined;
    const L = c ? jOfArm.get(d.interval ? c.bArm : c.aArm) : undefined;
    if (L && L[1] < SLOTS) { it.jItem = L[0]; it.arm = L[1]; }
  }
  return { nV, idx: Uint32Array.from(idx), vChain: Int32Array.from(vChain), items, missingArmEnds: missing, vW: Float32Array.from(vW) };
}

/** K1278: the run each vertex's slots read (-1: none), decided once from
 *  frame 0 (`fr0`) and the section paint's runs (paint.ts). A strip reads
 *  the run holding its middle; a cap its chain end's; a tail its start's;
 *  a junction's slot k the run arm k leaves along. */
/** Arm k's strip as the junction sees it: the end column (`col`, the
 *  mouth row), the column before it, and which strip slot holds the N-side
 *  (next arm) and the P-side (previous arm) neighbour. Null without a strip. */
export function stripNb(fs: FillStructure, st: DiagramStructure, it: JuncItem, k: number): { S: StripItem; col: number; cols: number[]; rowN: number; slotN: number; slotP: number } | null {
  const a = it.arms[k]; if (a.strip < 0) return null;
  const S = fs.items[a.strip]; if (!S || S.kind !== "strip") return null;
  const col = a.atStart ? 0 : S.N; const rowN = st.arms[a.ai].dir > 0 ? 0 : 2;
  return { S, col, cols: [col, a.atStart ? 1 : S.N - 1], rowN, slotN: rowN === 0 ? 1 : 2, slotP: rowN === 0 ? 2 : 1 };
}

export function fillRuns(fs: FillStructure, st: DiagramStructure, fr0: FillFrame, sp: SectionPaint): Int32Array {
  const run = new Int32Array(SLOTS * fs.nV).fill(-1);
  for (const it of fs.items) {
    if (it.kind === "junc") {
      const k0 = it.arms.map((a) => { const A = st.arms[a.ai]; return sp.armRun.get(`${A.ji}:${A.ei}`) ?? runAt(sp, a.pi, A.s); });
      for (let v = it.base; v <= it.base + it.R; v++) for (let k = 0; k < Math.min(SLOTS, k0.length); k++) run[SLOTS * v + k] = k0[k];
      // The arm's strip: its end column and the one before carry the
      // neighbour arms' runs (P side: the previous arm, N side: the next),
      // the mouth's half of the corner hand-off (stripNb).
      const n = it.arms.length;
      it.arms.forEach((_a, k) => {
        const nb = stripNb(fs, st, it, k); if (!nb) return;
        for (const col of nb.cols) for (let r = 0; r < 3; r++) {
          const v = nb.S.base + r * (nb.S.N + 1) + col;
          run[SLOTS * v + nb.slotN] = k0[(k + 1) % n]; run[SLOTS * v + nb.slotP] = k0[(k + n - 1) % n];
        }
      });
      continue;
    }
    const n = itemVerts(it);
    const sMid = it.kind === "strip" ? fr0.s[it.base + (it.N + 1) + (it.N >> 1)] : fr0.s[it.base];
    const r = runAt(sp, it.pi, sMid);
    for (let v = it.base; v < it.base + n; v++) run[SLOTS * v] = r;
  }
  // K1278 s2: a tail at a junction carries the fan's runs, slot for slot.
  for (const it of fs.items) {
    if (it.kind !== "tail" || it.jItem < 0) continue;
    const hb = (fs.items[it.jItem] as JuncItem).base;
    for (let v = it.base; v < it.base + itemVerts(it); v++) for (let k = 0; k < SLOTS; k++) run[SLOTS * v + k] = run[SLOTS * hb + k];
  }
  return run;
}

/** A topology signature: vertex count, index buffer and owner chains, hashed. */
export function fillSig(fs: FillStructure): string {
  let h = 2166136261 >>> 0;
  const mix = (v: number): void => { h ^= v & 0xffff; h = Math.imul(h, 16777619) >>> 0; h ^= v >>> 16; h = Math.imul(h, 16777619) >>> 0; };
  mix(fs.nV); mix(fs.idx.length);
  for (let i = 0; i < fs.idx.length; i++) mix(fs.idx[i]);
  for (let i = 0; i < fs.vChain.length; i++) mix(fs.vChain[i] + 1);
  return `${fs.nV}/${fs.idx.length / 3}/${h.toString(16)}`;
}

/** Resample a polyline to `n + 1` points that keep every one of its own
 *  points (the border is the outline's polyline exactly: chords between
 *  resamples straddling a convex corner, or the arc a convex corner sweeps
 *  about one centreline foot, would cut paper into it). Each own point j
 *  takes the sample index nearest its share of the parameter polyline's
 *  length (the centreline feet), kept increasing; the samples between two
 *  kept points are spread evenly along the straight segment joining them.
 *  The triangles never change: only where the samples sit along the
 *  border. With more own points than samples (an interval stretched far
 *  past its frame-0 length), samples fall at equal fractions instead
 *  (`dense`, counted). */
let denseCount = 0;
function resample(pts: number[], par: number[] | null, n: number, out: Float64Array, two?: number[], out2?: Float64Array): boolean {
  const m = pts.length >> 1;
  if (m === 0) return false;
  // `two` (same length as pts) is sampled at the same (segment, t) as pts, into out2.
  const lerp = (i: number, k: number, t: number): void => {
    out[2 * i] = pts[2 * k] + (pts[2 * k + 2] - pts[2 * k]) * t; out[2 * i + 1] = pts[2 * k + 1] + (pts[2 * k + 3] - pts[2 * k + 1]) * t;
    if (two && out2) { out2[2 * i] = two[2 * k] + (two[2 * k + 2] - two[2 * k]) * t; out2[2 * i + 1] = two[2 * k + 1] + (two[2 * k + 3] - two[2 * k + 1]) * t; }
  };
  const at = (i: number, j: number): void => {
    out[2 * i] = pts[2 * j]; out[2 * i + 1] = pts[2 * j + 1];
    if (two && out2) { out2[2 * i] = two[2 * j]; out2[2 * i + 1] = two[2 * j + 1]; }
  };
  if (m === 1) { for (let i = 0; i <= n; i++) at(i, 0); return true; }
  const P = par && par.length === pts.length && polyLen(par) > 1e-9 ? par : pts;
  const cum = new Float64Array(m);
  for (let i = 1; i < m; i++) cum[i] = cum[i - 1] + Math.hypot(P[2 * i] - P[2 * i - 2], P[2 * i + 1] - P[2 * i - 1]);
  const tot = cum[m - 1];
  if (m <= n + 1) {
    let prev = 0;
    at(0, 0);
    for (let j = 1; j < m; j++) {
      const ideal = j === m - 1 ? n : Math.round(tot > 0 ? (cum[j] / tot) * n : (j * n) / (m - 1));
      const idx = Math.min(n - (m - 1 - j), Math.max(prev + 1, ideal));
      // samples prev+1 .. idx-1 on the segment (j-1, j), then idx = point j
      const span = idx - prev;
      for (let i = prev + 1; i < idx; i++) lerp(i, j - 1, (i - prev) / span);
      at(idx, j);
      prev = idx;
    }
    return true;
  }
  denseCount++;
  let k = 0;
  for (let i = 0; i <= n; i++) {
    if (i === 0) { at(0, 0); continue; }
    if (i === n) { at(n, m - 1); continue; }
    const u = (tot * i) / n;
    while (k + 2 < m && cum[k + 1] < u) k++;
    const l = cum[k + 1] - cum[k];
    lerp(i, k, l > 0 ? Math.min(1, Math.max(0, (u - cum[k]) / l)) : 0);
  }
  return true;
}

/** Vertex positions, depth keys and s for one frame. Topology untouched.
 *  A border piece with no points this frame (two junctions' corners met
 *  over a short run) becomes the straight line between the junction ring
 *  points at its two ends, the same points the junction fans use, so the
 *  strip still closes the gap between the two fans. */
export function fillFrame(fs: FillStructure, st: DiagramStructure, table: OutlineTable, scene: SceneIn, zcIn?: ReturnType<typeof zChains>): FillFrame {
  const zz = zcIn ?? zChains(scene);
  const zc = zz.zc;
  const zt = 0.1 * scene.look.depthAmp;
  const pos = new Float64Array(2 * fs.nV);
  const key = new Float32Array(fs.nV);
  const sv = new Float32Array(fs.nV);
  const s4 = new Float64Array(SLOTS * fs.nV);
  const across = new Float32Array(fs.nV);
  const w4 = Float32Array.from(fs.vW); const hW = scene.look.halfWidth;
  let fallbacks = 0;
  denseCount = 0;
  const zAt = (pi: number, s: number): number => (zc[pi] ? zAtC(zc[pi], s) : 0);
  const set = (v: number, x: number, y: number, k: number, s: number): void => { pos[2 * v] = x; pos[2 * v + 1] = y; key[v] = k; sv[v] = s; };
  const armSOf = (ai: number): number => { const a = st.arms[ai]; const J = scene.junctions[a.ji]; return J && J.arms[a.ei] ? J.arms[a.ei].s : 0; };
  // 1. Junction ring end points per arm: P (side -dir), N (side +dir).
  const endPt = (pk: number, atStart: boolean): [number, number] | null => {
    if (pk < 0) return null; const p = table.pieces[pk]; if (!p || p.pts.length < 2) return null;
    return atStart ? [p.pts[0], p.pts[1]] : [p.pts[p.pts.length - 2], p.pts[p.pts.length - 1]];
  };
  const armEnd = new Map<number, { P: [number, number]; N: [number, number] }>();
  for (const it of fs.items) {
    if (it.kind !== "junc") continue;
    const J = scene.junctions[it.ji];
    const hub: [number, number] = J ? [J.c[0], J.c[1]] : [0, 0];
    for (const a of it.arms) {
      let P = endPt(a.pP, a.atStart); let Nn = endPt(a.pN, a.atStart);
      if (!Nn) { const cA = a.corner >= 0 ? table.corners[a.corner] : null; if (cA) { Nn = [cA.tax, cA.tay]; fallbacks++; } }
      if (!P) {
        const cb = st.corners.findIndex((c) => c.bArm === a.ai); const cB = cb >= 0 ? table.corners[cb] : null;
        if (cB) { P = [cB.tbx, cB.tby]; fallbacks++; }
      }
      if (!P) { P = Nn ?? hub; fallbacks++; }
      if (!Nn) { Nn = P; fallbacks++; }
      armEnd.set(a.ai, { P, N: Nn });
    }
  }
  /** A strip side's end point at a station, from the junction ring. */
  const stationEnd = (sti: number, side: number): [number, number] | null => {
    const q = st.stationsD[sti];
    if (!q || q.kind !== "junction" || q.arm < 0) return null;
    const e = armEnd.get(q.arm); if (!e) return null;
    return side === st.arms[q.arm].dir ? e.N : e.P;
  };
  const stationS = (sti: number): number | null => { const q = st.stationsD[sti]; return q && q.kind === "junction" && q.arm >= 0 ? armSOf(q.arm) : null; };
  let bufL = new Float64Array(0); let bufR = new Float64Array(0);
  let bufCL = new Float64Array(0); let bufCR = new Float64Array(0);
  const line = (a: [number, number], b: [number, number], N: number, out: Float64Array): void => {
    for (let i = 0; i <= N; i++) { const t = i / N; out[2 * i] = a[0] + (b[0] - a[0]) * t; out[2 * i + 1] = a[1] + (b[1] - a[1]) * t; }
  };
  for (const it of fs.items) {
    if (it.kind === "strip") {
      const N = it.N; const W = N + 1;
      if (bufL.length < 2 * W) { bufL = new Float64Array(2 * W); bufR = new Float64Array(2 * W); }
      const I = st.intervalsD[it.iv];
      const pl = it.pL >= 0 ? table.pieces[it.pL] : null; const pr = it.pR >= 0 ? table.pieces[it.pR] : null;
      if (bufCL.length < 2 * W) { bufCL = new Float64Array(2 * W); bufCR = new Float64Array(2 * W); }
      // A side's border, and (cOk) its centreline feet resampled alongside.
      let cOkL = false; let cOkR = false;
      const side = (p: typeof pl, sg: number, buf: Float64Array, cbuf: Float64Array): boolean => {
        if (p && p.pts.length >= 4) {
          const two = p.cpts.length === p.pts.length;
          const ok = two ? resample(p.pts, p.cpts, N, buf, p.cpts, cbuf) : resample(p.pts, p.cpts, N, buf);
          if (ok && two) { if (sg > 0) cOkL = true; else cOkR = true; }
          return ok;
        }
        const a = stationEnd(I.aSt, sg); const b = stationEnd(I.bSt, sg);
        if (a && b) { line(a, b, N, buf); fallbacks++; return true; }
        if (p && p.pts.length === 2) return resample(p.pts, null, N, buf);
        return false;
      };
      let okL = side(pl, 1, bufL, bufCL);
      let okR = side(pr, -1, bufR, bufCR);
      // A side the frame leaves empty (its border consumed by a junction's
      // corner or a crossing next to it) is the other side mirrored across
      // the centreline: the strip keeps the tube's full width, so the tube
      // under the junction is never paper. Same vertices, positions only.
      const mirror = (src: Float64Array, c: Float64Array, dst: Float64Array): void => {
        for (let i = 0; i < 2 * W; i++) dst[i] = 2 * c[i] - src[i];
      };
      if (!okL && okR) { if (cOkR) mirror(bufR, bufCR, bufL); else bufL.set(bufR.subarray(0, 2 * W)); okL = true; fallbacks++; }
      if (!okR && okL) { if (cOkL) mirror(bufL, bufCL, bufR); else bufR.set(bufL.subarray(0, 2 * W)); okR = true; fallbacks++; }
      const P = pl && pl.pts.length >= 4 ? pl : pr && pr.pts.length >= 4 ? pr : null;
      let s0 = P ? P.s0 : (pl ?? pr)?.s0 ?? 0; let ds = P ? P.s1 - P.s0 : 0;
      const c = zc[it.pi];
      if (!P) { const sa = stationS(I.aSt); const sb = stationS(I.bSt); if (sa !== null && sb !== null) { s0 = sa; ds = sb - sa; } }
      if (c && c.closed && c.len > 0) {
        ds = ((ds % c.len) + c.len) % c.len;
        if (I.aSt === I.bSt && ds < 1e-9) ds = c.len; // a loop's one run, seam to seam
      }
      if (!okL) { fallbacks++; for (let r = 0; r < 3; r++) for (let i = 0; i <= N; i++) { set(it.base + r * W + i, 0, 0, -1e3, s0); s4[SLOTS * (it.base + r * W + i)] = s0; } continue; }
      // K1278: the paint's s, per border row from its own piece's feet (a
      // mirrored or missing side takes the other's), the centre row their
      // mean; on a closed chain the R row unwraps to the L row's copy.
      const wrap = (d: number): number => (c && c.closed && c.len > 0 ? ((d % c.len) + c.len) % c.len : d);
      const range = (p: typeof pl): [number, number] | null => (p && p.pts.length >= 4 ? [p.s0, wrap(p.s1 - p.s0)] : null);
      const rL = range(pl) ?? range(pr) ?? [s0, ds]; const rR = range(pr) ?? rL;
      if (c && c.closed && c.len > 0) rR[0] += c.len * Math.round((rL[0] - rR[0]) / c.len);
      for (let i = 0; i <= N; i++) {
        const s = s0 + (ds * i) / N; const z = zAt(it.pi, s);
        const lx = bufL[2 * i]; const ly = bufL[2 * i + 1]; const rx = bufR[2 * i]; const ry = bufR[2 * i + 1];
        const sL = rL[0] + (rL[1] * i) / N; const sR = rR[0] + (rR[1] * i) / N;
        set(it.base + i, lx, ly, z - zt, s);
        set(it.base + W + i, (lx + rx) / 2, (ly + ry) / 2, z, s);
        set(it.base + 2 * W + i, rx, ry, z - zt, s);
        s4[SLOTS * (it.base + i)] = sL; s4[SLOTS * (it.base + W + i)] = (sL + sR) / 2; s4[SLOTS * (it.base + 2 * W + i)] = sR;
        across[it.base + i] = 1; across[it.base + 2 * W + i] = 1;
      }
      // K1278 s2: the paint's s where the frame's own s is not where the
      // vertex is. A row with no border piece (consumed by a junction's
      // corner) is a line between the two rings, often INVERTED (each mouth
      // past the other's) and drawn over both fans, and its s, spread
      // between the junction s values, ran against its positions. A mouth
      // (the end column at a junction, the fan's P, M, N) took its piece's
      // end s, which is the junction's own s where the border runs into a
      // sharp corner, however far along the thread the mouth sits. Both
      // pinned the run at the junction's colour up to the mouth, then the
      // strip jumped: hard steps at the mouth lines (def j16, j156, j74;
      // muse_default_tw j150). These vertices take their foot on the chain
      // instead (near their old s), so strips and fans carry the s of where
      // they are; the fans read it from the end columns.
      if (c && c.n > 1) {
        const fbL = !(pl && pl.pts.length >= 4); const fbR = !(pr && pr.pts.length >= 4);
        const atA = stationS(I.aSt) !== null; const atB = stationS(I.bSt) !== null;
        const rF = 4 * hW;
        const foot = (v: number): void => {
          const s = s4[SLOTS * v]; const f = footNear(c, pos[2 * v], pos[2 * v + 1], s, rF, 0, 0);
          if (Number.isFinite(f.d)) s4[SLOTS * v] = c.closed && c.len > 0 ? f.s + c.len * Math.round((s - f.s) / c.len) : f.s;
        };
        if (fbL || fbR || atA || atB) {
          for (let i = 0; i <= N; i++) {
            const end = (i === 0 && atA) || (i === N && atB);
            if (!end && !fbL && !fbR) continue;
            const vL = it.base + i; const vC = vL + W; const vR = vC + W;
            if (end || fbL) foot(vL);
            if (end || fbR) foot(vR);
            if (end || (fbL && fbR)) foot(vC); else s4[SLOTS * vC] = (s4[SLOTS * vL] + s4[SLOTS * vR]) / 2;
          }
        }
      }
    } else if (it.kind === "tail") {
      const p = table.pieces[it.piece]; const W = TAIL_M + 1;
      const s = p ? p.s0 : 0; const z = zAt(it.pi, s);
      if (bufL.length < 2 * W) { bufL = new Float64Array(2 * W); bufR = new Float64Array(2 * W); }
      // An empty tail (the margin never opens this frame) is degenerate, not a fallback.
      if (!p || !resample(p.pts, null, TAIL_M, bufL, p.cpts.length === p.pts.length ? p.cpts : p.pts, bufR)) {
        for (let i = 0; i < 2 * W; i++) set(it.base + i, 0, 0, -1e3, s);
        continue;
      }
      const c = zc[it.pi];
      const dsT = c && c.closed && c.len > 0 ? (((p.s1 - p.s0) % c.len) + 1.5 * c.len) % c.len - 0.5 * c.len : p.s1 - p.s0;
      for (let i = 0; i <= TAIL_M; i++) {
        set(it.base + i, bufL[2 * i], bufL[2 * i + 1], z - zt, s);
        set(it.base + W + i, bufR[2 * i], bufR[2 * i + 1], z, s);
        s4[SLOTS * (it.base + i)] = s4[SLOTS * (it.base + W + i)] = p.s0 + (dsT * i) / TAIL_M;
        across[it.base + i] = 1;
      }
    } else if (it.kind === "cap") {
      const p = table.pieces[it.piece];
      const rim = new Float64Array(2 * CAP_M);
      const c = zc[it.pi]; const sEnd = it.atEnd && c ? c.len : 0; const z = zAt(it.pi, sEnd);
      if (!p || !resample(p.pts, null, CAP_M - 1, rim)) {
        fallbacks++;
        for (let i = 0; i <= CAP_M; i++) set(it.base + i, 0, 0, -1e3, sEnd);
        continue;
      }
      set(it.base, (rim[0] + rim[2 * CAP_M - 2]) / 2, (rim[1] + rim[2 * CAP_M - 1]) / 2, z, sEnd);
      for (let i = 0; i < CAP_M; i++) set(it.base + 1 + i, rim[2 * i], rim[2 * i + 1], z - zt, sEnd);
      for (let i = 0; i <= CAP_M; i++) { s4[SLOTS * (it.base + i)] = sEnd; across[it.base + i] = i === 0 ? 0 : 1; }
    } else {
      const J = scene.junctions[it.ji];
      const n = it.arms.length;
      const Ps: [number, number][] = []; const Ns: [number, number][] = []; const Zs: number[] = [];
      for (const a of it.arms) { const e = armEnd.get(a.ai)!; Ps.push(e.P); Ns.push(e.N); Zs.push(zAt(a.pi, armSOf(a.ai))); }
      const hx = J ? J.c[0] : 0; const hy = J ? J.c[1] : 0;
      const s0 = armSOf(it.arms[0].ai);
      // K1278: each arm's s at the hub (the junction's s), and at P, M, N
      // (its strip's end row, unwrapped to the junction's copy).
      const sJ: number[] = []; const sP: number[] = []; const sM: number[] = []; const sN: number[] = [];
      for (const a of it.arms) {
        const sa = armSOf(a.ai); sJ.push(sa);
        const c = zc[a.pi]; const Lc = c && c.closed && c.len > 0 ? c.len : 0;
        const un = (s: number): number => (Lc ? s + Lc * Math.round((sa - s) / Lc) : s);
        const S = a.strip >= 0 ? (fs.items[a.strip] as StripItem) : null;
        if (S && S.kind === "strip") {
          const W = S.N + 1; const i = a.atStart ? 0 : S.N; const rowN = st.arms[a.ai].dir > 0 ? 0 : 2;
          sN.push(un(s4[SLOTS * (S.base + rowN * W + i)])); sM.push(un(s4[SLOTS * (S.base + W + i)])); sP.push(un(s4[SLOTS * (S.base + (2 - rowN) * W + i)]));
        } else { sP.push(sa); sM.push(sa); sN.push(sa); }
      }
      const nS = Math.min(n, SLOTS);
      // A ring vertex of arm k's mouth or corner k: slot k its own s; the
      // next arm its P (the corner's far side), the previous arm its N
      // (where the strips' neighbour slots read them); others their M.
      const slots = (vv: number, own: number, sOwn: number): void => {
        const nx = (own + 1) % n; const pv = (own + n - 1) % n;
        for (let j = 0; j < nS; j++) s4[SLOTS * vv + j] = j === own ? sOwn : j === nx ? sP[nx] : j === pv ? sN[pv] : sM[j];
      };
      set(it.base, hx, hy, zAt(it.owner, s0), s0);
      for (let j = 0; j < nS; j++) s4[SLOTS * it.base + j] = sJ[j];
      let v = it.base + 1;
      for (let k = 0; k < n; k++) {
        const a = it.arms[k]; const sA = armSOf(a.ai);
        const nx = (k + 1) % n;
        slots(v, k, sP[k]); across[v] = 1;
        set(v++, Ps[k][0], Ps[k][1], Zs[k] - zt, sA);
        slots(v, k, sM[k]);
        set(v++, (Ps[k][0] + Ns[k][0]) / 2, (Ps[k][1] + Ns[k][1]) / 2, Zs[k] - zt, sA);
        slots(v, k, sN[k]); across[v] = 1;
        set(v++, Ns[k][0], Ns[k][1], Zs[k] - zt, sA);
        for (let q = 0; q < ARC_K; q++) { slots(v + q, k, sN[k]); across[v + q] = 1; }
        const T = Ps[nx]; const zA = Zs[k] - zt; const zB = Zs[nx] - zt;
        const cr = a.corner >= 0 ? table.corners[a.corner] : null;
        const arc = !!cr && cr.ok && cr.r > 1e-9;
        let a0 = 0; let da = 0; let r0 = 0; let r1 = 0;
        if (arc && cr) {
          a0 = Math.atan2(cr.tay - cr.qy, cr.tax - cr.qx);
          const a1 = Math.atan2(cr.tby - cr.qy, cr.tbx - cr.qx);
          da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
          r0 = Math.hypot(cr.tax - cr.qx, cr.tay - cr.qy); r1 = Math.hypot(cr.tbx - cr.qx, cr.tby - cr.qy);
        }
        for (let q = 1; q <= ARC_K; q++) {
          const t = q / (ARC_K + 1);
          if (arc && cr) {
            const an = a0 + da * t; const rr = r0 + (r1 - r0) * t;
            set(v++, cr.qx + rr * Math.cos(an), cr.qy + rr * Math.sin(an), zA + (zB - zA) * t, sA);
          } else {
            set(v++, Ns[k][0] + (T[0] - Ns[k][0]) * t, Ns[k][1] + (T[1] - Ns[k][1]) * t, zA + (zB - zA) * t, sA);
          }
        }
      }
      // K1278: the corner hand-off. Corner k runs N_k, its ARC_K points,
      // P_(k+1); a parameter u along its polyline (by length, so points
      // that coincide share one weight) eases arm k to arm k+1 (smoothstep).
      // A corner shorter than h has too little area to hold it: a share
      // a = 1 - Lc/h of the hand-off moves into the two mouths (u starts at
      // a/2, ends at 1 - a/2), and the strips' end columns carry it (their
      // neighbour slots), so a sharp corner (Lc = 0) meets at V half and half.
      if (nS === n) {
        const ring = (k: number, q: number): number => it.base + 1 + k * (3 + ARC_K) + q;
        const ss = (u: number): number => u * u * (3 - 2 * u);
        const u0 = new Float64Array(n);
        const put = (vv: number, k: number, wk: number, j: number, wj: number): void => { for (let q = 0; q < SLOTS; q++) w4[SLOTS * vv + q] = 0; w4[SLOTS * vv + k] = wk; w4[SLOTS * vv + j] += wj; };
        for (let k = 0; k < n; k++) {
          const nx = (k + 1) % n;
          const pts = [ring(k, 2)]; for (let q = 0; q < ARC_K; q++) pts.push(ring(k, 3 + q)); pts.push(ring(nx, 0));
          const cum = [0]; for (let m = 1; m < pts.length; m++) cum.push(cum[m - 1] + Math.hypot(pos[2 * pts[m]] - pos[2 * pts[m - 1]], pos[2 * pts[m] + 1] - pos[2 * pts[m - 1] + 1]));
          const Lc = cum[cum.length - 1];
          const aSh = Math.min(1, Math.max(0, 1 - Lc / hW)); const ua = 0.5 * aSh; const ub = 1 - 0.5 * aSh; u0[k] = ua;
          for (let m = 1; m <= ARC_K; m++) { const u = Lc > 1e-12 ? ua + ((ub - ua) * cum[m]) / Lc : 0.5; const w = ss(u); put(pts[m], k, 1 - w, nx, w); }
        }
        for (let k = 0; k < n; k++) {
          const nx = (k + 1) % n; const pv = (k + n - 1) % n;
          const wN = ss(u0[k]); const wP = ss(u0[pv]);
          put(ring(k, 0), k, 1 - wP, pv, wP); put(ring(k, 1), k, 1, nx, 0); put(ring(k, 2), k, 1 - wN, nx, wN);
          const nb = stripNb(fs, st, it, k); if (!nb) continue;
          const W = nb.S.N + 1;
          for (const col of nb.cols) for (let r = 0; r < 3; r++) { const vv = nb.S.base + r * W + col; s4[SLOTS * vv + nb.slotN] = sP[nx]; s4[SLOTS * vv + nb.slotP] = sN[pv]; }
          const vN = nb.S.base + nb.rowN * W + nb.col; const vP = nb.S.base + (2 - nb.rowN) * W + nb.col;
          w4[SLOTS * vN] = 1 - wN; w4[SLOTS * vN + nb.slotN] = wN;
          w4[SLOTS * vP] = 1 - wP; w4[SLOTS * vP + nb.slotP] = wP;
        }
      }
    }
  }
  // K1278 s2: tails at junctions (runs: fillRuns). A tail vertex over its
  // fan takes the fan's weights and s there (barycentric over the fan
  // triangle under it); one off the fan keeps its own s, on its arm's slot.
  for (const it of fs.items) {
    if (it.kind !== "tail" || it.jItem < 0) continue;
    const J = fs.items[it.jItem] as JuncItem; const h = J.base; const R = J.R;
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (let v = h; v <= h + R; v++) { x0 = Math.min(x0, pos[2 * v]); x1 = Math.max(x1, pos[2 * v]); y0 = Math.min(y0, pos[2 * v + 1]); y1 = Math.max(y1, pos[2 * v + 1]); }
    for (let v = it.base; v < it.base + itemVerts(it); v++) {
      const o = SLOTS * v; const sOwn = s4[o];
      for (let k = 0; k < SLOTS; k++) { w4[o + k] = 0; s4[o + k] = s4[SLOTS * h + k]; }
      w4[o + it.arm] = 1; s4[o + it.arm] = sOwn;
      const px = pos[2 * v]; const py = pos[2 * v + 1];
      if (key[v] < -999 || px < x0 || px > x1 || py < y0 || py > y1) continue;
      for (let i = 0; i < R; i++) {
        const b = h + 1 + i; const c = h + 1 + ((i + 1) % R);
        const ax = pos[2 * h]; const ay = pos[2 * h + 1]; const bx = pos[2 * b]; const by = pos[2 * b + 1]; const cx = pos[2 * c]; const cy = pos[2 * c + 1];
        const A = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); if (Math.abs(A) < 1e-12) continue;
        const la = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / A;
        const lb = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / A;
        const lc = 1 - la - lb;
        if (la < -1e-9 || lb < -1e-9 || lc < -1e-9) continue;
        for (let k = 0; k < SLOTS; k++) {
          w4[o + k] = la * w4[SLOTS * h + k] + lb * w4[SLOTS * b + k] + lc * w4[SLOTS * c + k];
          s4[o + k] = la * s4[SLOTS * h + k] + lb * s4[SLOTS * b + k] + lc * s4[SLOTS * c + k];
        }
        break;
      }
    }
  }
  return { pos, key, s: sv, s4, w4, across, fallbacks, dense: denseCount };
}

/** Key range for the depth mapping: every key lies in [-KS, KS]. */
export function keyScale(scene: SceneIn): number { return 4 * Math.abs(scene.look.depthAmp) + 1; }

/** Edge function of the edge u -> v at p, computed in one canonical order
 *  (the lexicographically smaller end first) and negated for the other
 *  direction: two triangles sharing an edge (same vertices, or bit-equal
 *  positions) get exactly opposite values, so no pixel centre falls
 *  between them (the GPU's raster is watertight the same way). */
function edgeFn(ux: number, uy: number, vx: number, vy: number, px: number, py: number): number {
  if (ux < vx || (ux === vx && uy <= vy)) return (vx - ux) * (py - uy) - (vy - uy) * (px - ux);
  return -((ux - vx) * (py - vy) - (uy - vy) * (px - vx));
}

/** CPU raster of the fill at pixel centres (x0 + (i + .5) / ppu): own = top
 *  chain + 1 (0 = paper), the highest key winning, ties to the later
 *  triangle (the GPU's LEQUAL). A centre exactly on an edge counts as
 *  inside (closed triangles, as the census paints master's faces). */
export function rasterFill(fs: FillStructure, fr: FillFrame, x0: number, y0: number, Wd: number, Hd: number, ppu: number, win?: { tri: Int32Array; bary: Float32Array }): Int32Array {
  const own = new Int32Array(Wd * Hd);
  const zb = new Float32Array(Wd * Hd).fill(-Infinity);
  const P = fr.pos; const K = fr.key; const I = fs.idx;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t]; const b = I[t + 1]; const c = I[t + 2];
    const ax = (P[2 * a] - x0) * ppu; const ay = (P[2 * a + 1] - y0) * ppu;
    const bx = (P[2 * b] - x0) * ppu; const by = (P[2 * b + 1] - y0) * ppu;
    const cx = (P[2 * c] - x0) * ppu; const cy = (P[2 * c + 1] - y0) * ppu;
    const area = edgeFn(ax, ay, bx, by, cx, cy);
    if (!(Math.abs(area) > 1e-12)) continue;
    const i0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx) - 0.5)); const i1 = Math.min(Wd - 1, Math.floor(Math.max(ax, bx, cx) - 0.5));
    const j0 = Math.max(0, Math.ceil(Math.min(ay, by, cy) - 0.5)); const j1 = Math.min(Hd - 1, Math.floor(Math.max(ay, by, cy) - 0.5));
    if (i0 > i1 || j0 > j1) continue;
    const ch = fs.vChain[a] + 1;
    const sg = area > 0 ? 1 : -1;
    for (let j = j0; j <= j1; j++) {
      const py = j + 0.5;
      for (let i = i0; i <= i1; i++) {
        const px = i + 0.5;
        const e0 = sg * edgeFn(bx, by, cx, cy, px, py); if (e0 < 0) continue;
        const e1 = sg * edgeFn(cx, cy, ax, ay, px, py); if (e1 < 0) continue;
        const e2 = sg * edgeFn(ax, ay, bx, by, px, py); if (e2 < 0) continue;
        const sum = e0 + e1 + e2;
        const w0 = e0 / sum; const w1 = e1 / sum; const w2 = e2 / sum;
        const k = w0 * K[a] + w1 * K[b] + w2 * K[c];
        const o = j * Wd + i;
        if (k >= zb[o]) {
          zb[o] = k; own[o] = ch;
          if (win) { win.tri[o] = t; win.bary[3 * o] = w0; win.bary[3 * o + 1] = w1; win.bary[3 * o + 2] = w2; }
        }
      }
    }
  }
  return own;
}

/** K1278: the CPU twin of draw.ts's fill shader: per pixel, the top
 *  triangle's slots interpolated and painted (paint.ts paintAt). rgb in
 *  0..1, paper (own 0) left at -1. */
export function rasterPaint(fs: FillStructure, fr: FillFrame, runs: Int32Array, sp: SectionPaint, x0: number, y0: number, Wd: number, Hd: number, ppu: number): { own: Int32Array; rgb: Float32Array } {
  const win = { tri: new Int32Array(Wd * Hd).fill(-1), bary: new Float32Array(3 * Wd * Hd) };
  const own = rasterFill(fs, fr, x0, y0, Wd, Hd, ppu, win);
  const rgb = new Float32Array(3 * Wd * Hd).fill(-1);
  const r4 = new Int32Array(SLOTS); const w4 = new Float64Array(SLOTS); const s4 = new Float64Array(SLOTS);
  const out: [number, number, number] = [0, 0, 0];
  for (let o = 0; o < Wd * Hd; o++) {
    const t = win.tri[o]; if (t < 0 || own[o] === 0) continue;
    vertexPaint(fs, fr, runs, [fs.idx[t], fs.idx[t + 1], fs.idx[t + 2]], [win.bary[3 * o], win.bary[3 * o + 1], win.bary[3 * o + 2]], r4, w4, s4);
    paintAt(sp, r4, w4, s4, out);
    rgb[3 * o] = out[0]; rgb[3 * o + 1] = out[1]; rgb[3 * o + 2] = out[2];
  }
  return { own, rgb };
}

/** The slots at barycentric `b` of vertices `v` (a triangle, or an edge
 *  with one weight 0). Runs are per triangle-constant only where the
 *  vertices agree; a slot's run is taken from the first vertex with
 *  weight in it (the structure gives every vertex of an item the same
 *  runs, so they always agree). */
export function vertexPaint(_fs: FillStructure, fr: FillFrame, runs: Int32Array, v: number[], b: number[], r4: Int32Array, w4: Float64Array, s4: Float64Array): void {
  for (let k = 0; k < SLOTS; k++) {
    r4[k] = -1; w4[k] = 0; s4[k] = 0;
    for (let q = 0; q < v.length; q++) {
      const vi = v[q];
      if (r4[k] < 0 && runs[SLOTS * vi + k] >= 0) r4[k] = runs[SLOTS * vi + k];
      w4[k] += b[q] * fr.w4[SLOTS * vi + k];
      s4[k] += b[q] * fr.s4[SLOTS * vi + k];
    }
  }
}
