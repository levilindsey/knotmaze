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
import { zChains, zAtC, zPastC, footNear } from "./draw";
import { chainTangents, colAt, colRow, frameAt, offsetAt, offsetRow, POLY, pointAt, recSideOk, recTables, zAt1, zRow } from "./chain_frame";
import { paintAt, runAt, type SectionPaint } from "./paint";
import { REC_KEY_FLOOR, REC_KEY_MID, REC_KEY_ROW, REC_TEXELS } from "./rec_glsl";

export const CAP_M = 17;
export const ARC_K = 16;
/** Tail resolution: above outline.ts's TAIL_N + 2 points, so a tail is never dense. */
export const TAIL_M = 24;
/** K1283 s9: a frame tail's vertices paint their foot's s (see the tail item). */
const TAIL_FOOT = true;
/** K1283 s9: every strip vertex paints its foot's s (see the strip item),
 *  taken every FOOT_STEP columns and interpolated between. */
const STRIP_FOOT = true;
/** K1314 s6: mirror a consumed border on the matched s scale (see the strip
 *  item). Everywhere, it clears g41_user_tw64 j71 but the mirrored tube then
 *  lies under the junction fill of another arm keyed above its border
 *  (muse_hash j56: c66's fill at -0.056 over c22's mirrored border at -0.093,
 *  where form B unions the group and paints c22), a colour step inside the
 *  ink: 7 hard edges on muse_hash, 1 on g41_user_tw64, 4 paper spots.
 *  K1314 s7: only at an END arm's junction end whose consumed side stops at
 *  a dropped corner's V, consumed over more than the sides overlap, and the
 *  overlap h / 4 or more (mirA, mirB in fillFrame). */
const MATCH_MIRROR = true;
/** K1314 s6: no matched s scale for a strip whose ranges part at a junction end
 *  (s7: except where that end is mirrored, mirA / mirB). */
const JEND_GATE = true;
const FOOT_STEP = 8;

type FootChain = Parameters<typeof footNear>[0];
/** The segment holding arc position u (0 <= u < len on a ring), by binary search. */
function footFirst(c: FootChain, segs: number, u: number): number {
  const ss = c.s; if (ss[0] > u) return 0;
  let lo = 0; let hi = segs - 1;
  while (hi > lo) { const m = (lo + hi + 1) >> 1; if (ss[m] <= u) lo = m; else hi = m - 1; }
  return lo;
}
/** K1283 s9: draw.footNear's foot (no skip) for the per-vertex strip and
 *  tail feet, allocation-free: the s of the nearest point on chain c to
 *  (x, y) among the segments whose arc span meets [sC - r, sC + r], unwrapped
 *  to sC's lap on a closed chain; NaN when there is no segment. Exact like
 *  footNear's scan of the window, but it walks out from the segment at sC
 *  and skips what cannot be nearer: the distance is 1-Lipschitz in arc
 *  length, so past a vertex at distance d no point within arc d - best is
 *  nearer than best. A vertex beside a hairpin can sit nearly as near to the
 *  far branch (muse_hash: 1488 strip vertices pick another branch than a
 *  descent from sC does), so a descent alone is not footNear's foot. footNear
 *  scanned 33 segments a foot on def (215k feet a frame). */
let footK = 0;
/** K1283 s10 (perf, same feet bit for bit): the arrays in locals, the projection inline, and the
 *  segment at sC walked from the last foot's (feet come in runs along a row) before footFirst's
 *  binary search; half s9's time on def. */
function footS(c: FootChain, x: number, y: number, sC: number, r: number): number {
  const n = c.n; const segs = c.closed ? n : n - 1;
  if (segs <= 0) return NaN;
  const L = c.len; const ring = c.closed && L > 0; const xs = c.xs; const ys = c.ys; const ss = c.s;
  const u = ring ? ((sC % L) + L) % L : sC;
  let k0 = footK < segs ? footK : segs - 1;
  if (ss[0] > u) k0 = 0;
  else if (ss[k0] <= u) {
    let q = 0; while (k0 + 1 < segs && ss[k0 + 1] <= u && q < 16) { k0++; q++; }
    if (k0 + 1 < segs && ss[k0 + 1] <= u) k0 = footFirst(c, segs, u);
  } else {
    let q = 0; while (ss[k0] > u && q < 16) { k0--; q++; }
    if (ss[k0] > u) k0 = footFirst(c, segs, u);
  }
  footK = k0;
  let best: number; let bs: number;
  {
    const k = k0; const j = k + 1 === n ? 0 : k + 1; const sk = ss[k]; const lk = j === 0 ? L - sk : ss[j] - sk;
    const ax = xs[k]; const ay = ys[k]; const ex = xs[j] - ax; const ey = ys[j] - ay;
    const l2 = ex * ex + ey * ey;
    let t = l2 > 0 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - ax - t * ex; const dy = y - ay - t * ey;
    best = dx * dx + dy * dy; bs = sk + t * lk;
  }
  let bd = Math.sqrt(best);
  // Forward: off = arc from u to segment k's start.
  let k = k0; let off = ss[k0] + ((k0 + 1 === n ? L : ss[k0 + 1]) - ss[k0]) - u;
  for (let m = 0; m < segs - 1; m++) {
    k = k + 1 < segs ? k + 1 : ring ? 0 : -1;
    if (k < 0 || off > r) break;
    const vx = x - xs[k]; const vy = y - ys[k]; const lim = off + Math.sqrt(vx * vx + vy * vy) - bd;
    let j = k + 1 === n ? 0 : k + 1; let sk = ss[k]; let lk = (j === 0 ? L : ss[j]) - sk;
    while (off + lk <= lim && m < segs - 1) {
      off += lk; m++; k = k + 1 < segs ? k + 1 : ring ? 0 : -1;
      if (k < 0 || off > r) break;
      j = k + 1 === n ? 0 : k + 1; sk = ss[k]; lk = (j === 0 ? L : ss[j]) - sk;
    }
    if (k < 0 || off > r) break;
    const ax = xs[k]; const ay = ys[k]; const ex = xs[j] - ax; const ey = ys[j] - ay;
    const l2 = ex * ex + ey * ey;
    let t = l2 > 0 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - ax - t * ex; const dy = y - ay - t * ey; const d2 = dx * dx + dy * dy;
    if (d2 < best) { best = d2; bs = sk + t * lk; bd = Math.sqrt(best); }
    off += lk;
  }
  // Backward: off = arc from u back to segment k's end.
  k = k0; off = u - ss[k0];
  for (let m = 0; m < segs - 1; m++) {
    const kE = k; // segment k - 1 ends at k's start vertex
    k = k > 0 ? k - 1 : ring ? segs - 1 : -1;
    if (k < 0 || off > r) break;
    const vx = x - xs[kE]; const vy = y - ys[kE]; const lim = off + Math.sqrt(vx * vx + vy * vy) - bd;
    let j = k + 1 === n ? 0 : k + 1; let sk = ss[k]; let lk = (j === 0 ? L : ss[j]) - sk;
    while (off + lk <= lim && m < segs - 1) {
      off += lk; m++; k = k > 0 ? k - 1 : ring ? segs - 1 : -1;
      if (k < 0 || off > r) break;
      j = k + 1 === n ? 0 : k + 1; sk = ss[k]; lk = (j === 0 ? L : ss[j]) - sk;
    }
    if (k < 0 || off > r) break;
    const ax = xs[k]; const ay = ys[k]; const ex = xs[j] - ax; const ey = ys[j] - ay;
    const l2 = ex * ex + ey * ey;
    let t = l2 > 0 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - ax - t * ex; const dy = y - ay - t * ey; const d2 = dx * dx + dy * dy;
    if (d2 < best) { best = d2; bs = sk + t * lk; bd = Math.sqrt(best); }
    off += lk;
  }
  return ring ? bs + L * Math.round((sC - bs) / L) : bs;
}
/** K1283 s4: rim points of an end arm's round end (DiskItem). */
export const DISK_M = 32;
/** K1283 s6: rings of a round end (radii h k / DISK_R), so over its fan the
 *  disk samples the fan's paint field as finely as the tail beside it does. */
export const DISK_R = 4;
/** K1247 s28: the rim's cos and sin of 2 pi i / DISK_M, taken once (the same calls, so the same bits). */
const DISK_COS = Float64Array.from({ length: DISK_M }, (_, i) => Math.cos((2 * Math.PI * i) / DISK_M));
const DISK_SIN = Float64Array.from({ length: DISK_M }, (_, i) => Math.sin((2 * Math.PI * i) / DISK_M));
/** K1283 s7: a round end is form B's end cap: centred at c', keyed by form
 *  B's cone about the segment term -> c', painting its own arm's slot at s_E
 *  (false: s6's disk at J.c under the fan, with the fan's paint).
 *  OFF since s7's guards (2026-11-11): with the fan's field over the fan
 *  (DISK_RAMP Infinity) the app seam over 1/255 is 6534 against s6's 5577
 *  and steppier than form B by > 1 is 624 against 459, for a round-end colour
 *  gain of 31891 -> 31763 err*v px (17 worse by > 1 px); with its own slot
 *  the colour gains 31891 -> 29713 but the seam goes to 25359 / 11227.
 *  K1283_s7.md's handoff has the numbers and what is left. */
export const DISK_OWN = false;
/** K1283 s7: where form B's through chain is on top of the round end (its
 *  margin is negative), the disk's key falls this many times faster, so the
 *  through chain's strip shows there even where its own key sags near the
 *  mouth (about 0.2 under its cone at muse_hash j29 and j133). 1, 10, 40 on
 *  muse_hash j29 / j44 / j133: +15 / +10 / +10, +7 / +7 / +5, +5 / +6 / +4 px. */
export const DISK_DROP = 40;
/** K1283 s7: over its fan, the round end's paint runs from the fan's field
 *  where its margin is 0 (its seam with the fan) to its own slot where the
 *  margin reaches DISK_RAMP zt (about DISK_RAMP h from the through chain's
 *  side). Infinity = the fan's field everywhere over the fan, own slot only
 *  off it. Measured on muse_hash (app seam edges over 1/255 / fbstep steppier
 *  by > 1; two-scene round-end colour err*v, before 12117): own slot (0)
 *  4419 / 1700, 11192; ramp 0.5 4042 / 1474, 11458; Infinity 1923 / 292,
 *  12012 (s6 1700 / 246). The own slot's colour gain needs a seam-free
 *  boundary first (form B steps far less there): left open. */
export const DISK_RAMP = Infinity;

export interface StripItem { kind: "strip"; iv: number; pi: number; ghost: boolean; N: number; base: number; pL: number; pR: number }
export interface CapItem { kind: "cap"; pi: number; piece: number; atEnd: boolean; base: number }
/** jItem / arm: the junction item and its arm index (its end arm) whose fan the tail lies over; -1 if none. */
export interface TailItem { kind: "tail"; pi: number; piece: number; base: number; jItem: number; arm: number }
/** K1283 s4: an end arm's round end, form B's disk of radius h: a hub and
 *  DISK_R rings of DISK_M points at radius h k / DISK_R (s6: the rings, so
 *  the key and paint are sampled as finely as the tail's). K1283 s7 (with
 *  DISK_OWN): it is form B's end cap. Form B extends the end chain from its
 *  term to c', the nearest point of a through chain's centreline, so the
 *  disk is centred on c', keyed by form B's cone about that segment (z runs
 *  from z_E(s_E) at the term to the chain's depth past its end at c'), and
 *  paints its own arm's slot at s_E. Its key is then shifted to meet what
 *  it lies over: the fan's key there (or, off the fan, the highest through
 *  chain's cone key) plus form B's margin, its cone key minus that through
 *  chain's, steepened DISK_DROP times where negative. So it shows where
 *  form B's end chain is on top, and its seam curves where the cone keys
 *  meet. Every end arm gets one, decided here once; a frame moves its
 *  points only. */
export interface DiskItem { kind: "disk"; pi: number; ai: number; base: number; jItem: number; arm: number }
/** `strip`: the item index of the arm's strip (-1: none), whose end row at
 *  `atStart` is the arm's P, M, N. */
export interface JArm { ai: number; pi: number; ei: number; pN: number; pP: number; atStart: boolean; corner: number; strip: number }
export interface JuncItem { kind: "junc"; ji: number; owner: number; arms: JArm[]; base: number; R: number }
export type FillItem = StripItem | CapItem | TailItem | JuncItem | DiskItem;

/** Vertices an item owns, from `base`. */
export function itemVerts(it: FillItem): number {
  return it.kind === "strip" ? 3 * (it.N + 1) : it.kind === "cap" ? CAP_M + 1 : it.kind === "tail" ? 2 * (TAIL_M + 1) : it.kind === "disk" ? 1 + DISK_R * DISK_M : 1 + it.R;
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
  /** K1247 s19 (look.fillRec 2): the record strips' table (REC_TEXELS texels of 4 floats each, in
   *  recStrips order) and the fallback rows (x, y, key, s per vertex) of those that took today's
   *  path this frame. The interior columns' entries of pos, key, s and s4 are left unset. */
  rec?: { strip: Float32Array; fb: Float32Array; nFb: number; hW: number; zt: number; pf: Float32Array | null };
}

// K1247 s19, s26: the strip table's layout and key modes live with the shader that reads them
// (rec_glsl.ts, which the main thread loads without this file).
export { REC_TEXELS, REC_KEY_MID, REC_KEY_FLOOR, REC_KEY_ROW } from "./rec_glsl";
/** K1247 s19: the strip columns 2..N-2 of a strip with both border pieces and N >= 4 are records the
 *  vertex shader places (oe=1); columns 0, 1, N-1 and N stay the CPU's (the moving ends, and the
 *  columns a junction writes paint slots into). */
export const REC_MIN_N = 4;
const REC_STRIPS = new WeakMap<FillStructure, Int32Array>();
/** The record strips' item indices, in item order (their row in the strip table). */
export function recStrips(fs: FillStructure): Int32Array {
  let r = REC_STRIPS.get(fs);
  if (!r) {
    const a: number[] = [];
    fs.items.forEach((it, i) => { if (it.kind === "strip" && it.pL >= 0 && it.pR >= 0 && it.N >= REC_MIN_N) a.push(i); });
    r = Int32Array.from(a); REC_STRIPS.set(fs, r);
  }
  return r;
}
const FAN_ORDER = new WeakMap<FillStructure, Int32Array>();
/** K1247 s28: the tail and disk items on a junction, grouped by junction (item order within one). */
function fanOrder(fs: FillStructure): Int32Array {
  let r = FAN_ORDER.get(fs);
  if (!r) {
    const a: number[] = [];
    fs.items.forEach((it, i) => { if ((it.kind === "tail" || it.kind === "disk") && it.jItem >= 0) a.push(i); });
    const jOf = (i: number): number => (fs.items[i] as { jItem: number }).jItem;
    a.sort((p, q) => jOf(p) - jOf(q) || p - q);
    r = Int32Array.from(a); FAN_ORDER.set(fs, r);
  }
  return r;
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
  // K1351 s1: a thru tail (interval >= 2) owns no fill item: its piece's fpts is always [] (the
  // walk writes pts only), so fillFrame could only ever set its 2 * (TAIL_M + 1) vertices
  // degenerate, while fillFrame's buffers and paintFrame's copy paid for them every frame
  // (def: 354 pieces, 17700 vertices). The census is unchanged (k1351s1 vs master, find for find).
  st.piecesD.forEach((d, k) => {
    if (d.kind !== "tail" || d.interval >= 2) return;
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
  // 6. K1283 s4: round ends, one per end arm, after the fans (an exact key
  // tie goes to the later triangle: the end chain's own disk).
  st.arms.forEach((a, ai) => {
    if (a.kind !== "end") return;
    const base = nV; const nD = 1 + DISK_R * DISK_M;
    for (let i = 0; i < nD; i++) { vChain.push(a.pi); vW.push(1, 0, 0, 0); }
    nV += nD;
    // K1283 s6: the hub's fan to ring 0, then a quad band per ring pair.
    const rv = (r: number, i: number): number => base + 1 + r * DISK_M + (i % DISK_M);
    for (let i = 0; i < DISK_M; i++) idx.push(base, rv(0, i), rv(0, i + 1));
    for (let r = 0; r + 1 < DISK_R; r++) for (let i = 0; i < DISK_M; i++) idx.push(rv(r, i), rv(r + 1, i), rv(r + 1, i + 1), rv(r, i), rv(r + 1, i + 1), rv(r, i + 1));
    const L = jOfArm.get(ai);
    const inJ = !!L && L[1] < SLOTS;
    items.push({ kind: "disk", pi: a.pi, ai, base, jItem: inJ && L ? L[0] : -1, arm: inJ && L ? L[1] : -1 });
  });
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
  // K1278 s2: a tail (K1283 s4: and a round end) at a junction carries the fan's runs, slot for slot.
  for (const it of fs.items) {
    if ((it.kind !== "tail" && it.kind !== "disk") || it.jItem < 0) continue;
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
/** K1283 s7: a z-chain's point at s (a closed chain wraps, an open one clamps). */
function zPointAt(c: ReturnType<typeof zChains>["zc"][number], s: number): [number, number] {
  const n = c.n;
  const u = c.closed && c.len > 0 ? ((s % c.len) + c.len) % c.len : Math.min(Math.max(s, c.s[0]), c.s[n - 1]);
  if (c.closed && u >= c.s[n - 1]) {
    const l = c.len - c.s[n - 1]; const t = l > 0 ? (u - c.s[n - 1]) / l : 0;
    return [c.xs[n - 1] + (c.xs[0] - c.xs[n - 1]) * t, c.ys[n - 1] + (c.ys[0] - c.ys[n - 1]) * t];
  }
  let lo = 0; let hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c.s[m] <= u) lo = m; else hi = m; }
  const l = c.s[hi] - c.s[lo]; const t = l > 0 ? Math.min(1, Math.max(0, (u - c.s[lo]) / l)) : 0;
  return [c.xs[lo] + (c.xs[hi] - c.xs[lo]) * t, c.ys[lo] + (c.ys[hi] - c.ys[lo]) * t];
}

/** K1247 s18: opt-in section timings of fillFrame (ms, summed over calls). */
export const FILL_PROF = { on: false, t: {} as Record<string, number> };
/** K1247 s28: the fan scan's triangle boxes (x0, x1, y0, y1 a triangle), reused across frames. */
let FAN_TB = new Float64Array(64);
/** K1247 s28: the fan scan's grid over the fan's box (CSR: cell starts, then triangle indices in
 *  ascending order per cell; FAN_GC the fill cursor), reused across frames. */
let FAN_GS = new Int32Array(64); let FAN_GC = new Int32Array(64); let FAN_GI = new Int32Array(256);

/** K1247 s28: a caller's per-vertex output arrays, reused from frame to frame (OutlineModel.update:
 *  about 20 MB a frame on def, fresh pages and GC otherwise). A frame's arrays are then valid until
 *  the next fillFrame with the same buffer; each is reset to what a fresh one holds (zeros, vW). */
export interface FillBuf { pos?: Float64Array; key?: Float32Array; sv?: Float32Array; s4?: Float64Array; across?: Float32Array; w4?: Float32Array }
function bufF64(a: Float64Array | undefined, n: number): Float64Array { return a && a.length === n ? a.fill(0) : new Float64Array(n); }
function bufF32(a: Float32Array | undefined, n: number): Float32Array { return a && a.length === n ? a.fill(0) : new Float32Array(n); }

export function fillFrame(fs: FillStructure, st: DiagramStructure, table: OutlineTable, scene: SceneIn, zcIn?: ReturnType<typeof zChains>, buf?: FillBuf): FillFrame {
  let tP = FILL_PROF.on ? performance.now() : 0;
  const zz = zcIn ?? zChains(scene);
  const zc = zz.zc;
  const zt = 0.1 * scene.look.depthAmp;
  const pos = bufF64(buf?.pos, 2 * fs.nV);
  const key = bufF32(buf?.key, fs.nV);
  const sv = bufF32(buf?.sv, fs.nV);
  const s4 = bufF64(buf?.s4, SLOTS * fs.nV);
  const across = bufF32(buf?.across, fs.nV);
  const w4 = buf?.w4 && buf.w4.length === fs.vW.length ? buf.w4 : fs.vW.slice(); const hW = scene.look.halfWidth;
  if (buf) { if (w4 === buf.w4) w4.set(fs.vW); Object.assign(buf, { pos, key, sv, s4, across, w4 }); }
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
  // K1247 s18 (oe=1, off by default): a strip with both border pieces places its interior columns as
  // records, C(s) +- h N(s) in the chain's smooth frame (chain_frame.ts), the s from its piece's
  // moving ends; only the end columns (the moving points) come from the frame's pieces. No resample,
  // no foot search: a record's foot is its own s.
  // K1247 s19 (fillRec 2, oe=1 in the app): the vertex shader places a record strip's columns
  // 2..N-2 from the strip table (rec below); the CPU places only columns 0, 1, N-1 and N.
  // K1247 s21 (fillRec 3, the structure's frame 0): fillRec 2's frame and table, plus columns 2..N-2
  // placed here as the shader places them (colRow on the table's float32 s ranges), so the paint is
  // built from one fill instead of a whole-CPU fill (fillRec 1) and then fillRec 2's.
  const full = scene.look.fillRec === 3;
  const gpu = scene.look.fillRec === 2 || full;
  const rec = scene.look.fillRec === 1 || gpu;
  // Tangents per chain, on first use (gpu mode takes its few points without them).
  const tgC: (ReturnType<typeof chainTangents> | null | undefined)[] = [];
  const tgAt = (pi: number): ReturnType<typeof chainTangents> | null => {
    let t = tgC[pi]; if (t === undefined) { const c = zc[pi]; t = c && c.n > 1 ? chainTangents(c) : null; tgC[pi] = t; } return t;
  };
  const rsI = gpu ? recStrips(fs) : null;
  const rsOrd = new Map<number, number>(); if (rsI) rsI.forEach((ii, o) => rsOrd.set(ii, o));
  const recTab = rsI ? new Float32Array(4 * REC_TEXELS * Math.max(1, rsI.length)) : null;
  const fbOrd: number[] = [];
  // K1247 s20: the chains' fan-step and fold tables (POLY.mode 4: colAt, the shader's uRecPf).
  const recT = rec && POLY.mode === 4 ? recTables(zc, hW) : null;
  const fa = new Float64Array(5);
  const recStrip = (it: Extract<FillItem, { kind: "strip" }>, aSt: number, bSt: number, pl: OutlineTable["pieces"][number], pr: OutlineTable["pieces"][number]): boolean => {
    const N = it.N; const W = N + 1; const c = zc[it.pi]; const t = tgAt(it.pi)!;
    const loop = c.closed && c.len > 0;
    // A border past an open chain's end (it wraps round the cap: muse_hash's 25 px) has no s to be a
    // record at: today's path keeps it.
    if (!loop) for (const q of [pl.s0, pl.s1, pr.s0, pr.s1]) if (q < -1e-6 || q > c.len + 1e-6) return false;
    const wrap = (d: number): number => (loop ? ((d % c.len) + c.len) % c.len : d);
    const s0 = pl.s0; let ds = wrap(pl.s1 - pl.s0);
    if (loop && aSt === bSt && ds < 1e-9) ds = c.len;
    const rL: [number, number] = [pl.s0, wrap(pl.s1 - pl.s0)]; const rR: [number, number] = [pr.s0, wrap(pr.s1 - pr.s0)];
    if (loop) rR[0] += c.len * Math.round((rL[0] - rR[0]) / c.len);
    // L's side: a guess from its middle point (whose s assumes the piece's points uniform in s, which a
    // long curved piece breaks), checked against the piece's own end points: columns 1 and N-1 of the
    // right side sit next to them, of the wrong side a strip width away (a swapped strip folds its end
    // triangles into bowties: def's 37 px crack).
    const nl = pl.pts.length >> 1; const nr = pr.pts.length >> 1; const m = nl >> 1;
    frameAt(c, t, rL[0] + (rL[1] * m) / Math.max(1, nl - 1), -1, fa);
    let sg = (pl.pts[2 * m] - fa[0]) * -fa[3] + (pl.pts[2 * m + 1] - fa[1]) * fa[2] >= 0 ? 1 : -1;
    if (rowL.length < 2 * W) { rowL = new Float64Array(2 * W); rowR = new Float64Array(2 * W); rowZ = new Float64Array(W); rowSL = new Float64Array(W); rowSR = new Float64Array(W); }
    // K1247 s20 (POLY.mode 4): each column on the border's polygon by colAt, the shader's recCol.
    const place = (): boolean => {
      if (POLY.mode === 4 && recT) {
        const o = recT.base[it.pi];
        for (let i = 1; i < N; i++) { rowSL[i] = colAt(c, recT.pf, o, rL[0], rL[1], N, sg, hW, i, rowL, 2 * i); rowSR[i] = colAt(c, recT.pf, o, rR[0], rR[1], N, -sg, hW, i, rowR, 2 * i); }
        return recSideOk(c, recT, it.pi, rL[0], rL[1], N, sg) && recSideOk(c, recT, it.pi, rR[0], rR[1], N, -sg);
      }
      return offsetRow(c, t, rL[0], rL[1], N, sg, hW, rowL, rowSL) && offsetRow(c, t, rR[0], rR[1], N, -sg, hW, rowR, rowSR);
    };
    let ok = place();
    const j = N > 1 ? 1 : 0; const k = N > 1 ? N - 1 : N;
    const d2 = (row: Float64Array, i: number, x: number, y: number): number => (row[2 * i] - x) ** 2 + (row[2 * i + 1] - y) ** 2;
    const xa = pl.pts[0]; const ya = pl.pts[1]; const xb = pl.pts[2 * nl - 2]; const yb = pl.pts[2 * nl - 1];
    if (d2(rowR, j, xa, ya) + d2(rowR, k, xb, yb) < d2(rowL, j, xa, ya) + d2(rowL, k, xb, yb)) { sg = -sg; ok = place(); }
    // K1247 s20: a side on the border's polygon that folds (two miters' trims overlap on a segment: the
    // border there is cutFolds') keeps today's path.
    if (!ok) return false;
    // The polygon's columns are uniform in its shared u, not in s: each carries its own s (POLY.mode >= 1).
    // Mode 4: a side's column carries its own s, its key the depth there (the centre's at the mean s).
    const pol = POLY.mode > 0;
    if (pol) { for (let i = 1; i < N; i++) rowZ[i] = zAt1(c, rowSL[i]); rowZ[0] = zAt1(c, s0); rowZ[N] = zAt1(c, s0 + ds); } else zRow(c, s0, ds, N, rowZ);
    rowL[0] = pl.pts[0]; rowL[1] = pl.pts[1]; rowR[0] = pr.pts[0]; rowR[1] = pr.pts[1];
    rowL[2 * N] = pl.pts[2 * nl - 2]; rowL[2 * N + 1] = pl.pts[2 * nl - 1]; rowR[2 * N] = pr.pts[2 * nr - 2]; rowR[2 * N + 1] = pr.pts[2 * nr - 1];
    const b0 = it.base; const m4 = POLY.mode === 4 && recT !== null;
    for (let i = 0; i <= N; i++) {
      const mid = pol && i > 0 && i < N;
      const sL = mid ? rowSL[i] : rL[0] + (rL[1] * i) / N; const sR = mid ? rowSR[i] : rR[0] + (rR[1] * i) / N;
      const s = m4 && mid ? (sL + sR) / 2 : mid ? rowSL[i] : s0 + (ds * i) / N; const z = m4 && mid ? zAt1(c, s) : rowZ[i];
      const zl = m4 && mid ? zAt1(c, sL) : z; const zr = m4 && mid ? zAt1(c, sR) : z;
      const lx = rowL[2 * i]; const ly = rowL[2 * i + 1]; const rx = rowR[2 * i]; const ry = rowR[2 * i + 1];
      const vL = b0 + i; const vC = vL + W; const vR = vC + W;
      pos[2 * vL] = lx; pos[2 * vL + 1] = ly; key[vL] = zl - zt; sv[vL] = s;
      pos[2 * vC] = (lx + rx) / 2; pos[2 * vC + 1] = (ly + ry) / 2; key[vC] = z; sv[vC] = s;
      pos[2 * vR] = rx; pos[2 * vR + 1] = ry; key[vR] = zr - zt; sv[vR] = s;
      s4[SLOTS * vL] = sL; s4[SLOTS * vC] = (sL + sR) / 2; s4[SLOTS * vR] = sR;
      across[vL] = 1; across[vR] = 1;
    }
    const rF = 4 * hW;
    const footEnd = (i: number): void => {
      for (let r = 0; r < 3; r++) { const v = b0 + r * W + i; const f = footS(c, pos[2 * v], pos[2 * v + 1], s4[SLOTS * v], rF); if (f === f) s4[SLOTS * v] = f; }
    };
    if (stationS(aSt) !== null) footEnd(0);
    if (stationS(bSt) !== null) footEnd(N);
    return true;
  };
  // K1247 s19: recStrip with the shader's share left out. The same s ranges and side, its columns 0, 1,
  // N-1 and N placed here (single points of offsetRow / zRow), and the strip's row of the table.
  const P4 = new Float64Array(8); const PS4 = new Float64Array(4);
  const recStrip2 = (it: Extract<FillItem, { kind: "strip" }>, ord: number, aSt: number, bSt: number, pl: OutlineTable["pieces"][number], pr: OutlineTable["pieces"][number]): boolean => {
    const N = it.N; const W = N + 1; const c = zc[it.pi];
    const loop = c.closed && c.len > 0;
    if (!loop) for (const q of [pl.s0, pl.s1, pr.s0, pr.s1]) if (q < -1e-6 || q > c.len + 1e-6) return false;
    const wrap = (d: number): number => (loop ? ((d % c.len) + c.len) % c.len : d);
    const s0 = pl.s0; let ds = wrap(pl.s1 - pl.s0);
    if (loop && aSt === bSt && ds < 1e-9) ds = c.len;
    const rL0 = pl.s0; const rL1 = wrap(pl.s1 - pl.s0); let rR0 = pr.s0; const rR1 = wrap(pr.s1 - pr.s0);
    if (loop) rR0 += c.len * Math.round((rL0 - rR0) / c.len);
    // K1247 s26 (K1322): fillFrame's strip rule (K1314 s5, s6), line for line (tie: test/render/
    // rec_tie.test.ts). Border ranges that differ (reKey) sample on one s scale, their union (matched),
    // unless they part at a junction end (JEND_GATE): side L takes columns pL0 .. pL0 + nL, R likewise,
    // and a column past its side's span holds at its piece's end. The keys are fillFrame's: border rows
    // by their own side's s on that scale, the centre by the depth at their midpoint (REC_KEY_MID);
    // ranges that differ unmatched, the same with the centre floored at the row's s (REC_KEY_FLOOR);
    // equal ranges, every row by the row's s (REC_KEY_ROW). Keyed by colAt's own s (s19 .. s25), the
    // centre sat between two sides a range offset apart and the strip parted from the census's fill
    // (g41_ring_tw64 x67, x68; muse_hash j101). K1314 s7's exception, line for line (mirA, mirB): an
    // END arm's junction end whose consumed side stops at a dropped corner's V, consumed over more than
    // the sides overlap and the overlap h / 4 or more, keeps the matched scale, and there a column past
    // one side's span but within the other's is the other side mirrored across the chain (recMir).
    const reKey = rL0 !== rR0 || rL1 !== rR1;
    const armKind = (sti: number): string | null => (stationS(sti) !== null ? st.arms[st.stationsD[sti].arm].kind : null);
    const droppedAt = (sti: number, x: number, y: number): boolean => {
      const ai = st.stationsD[sti].arm;
      for (let k = 0; k < st.corners.length; k++) {
        const cn = st.corners[k]; if (cn.aArm !== ai && cn.bArm !== ai) continue;
        const o = table.corners[k]; if (o && !o.ok && Math.abs(o.Vx - x) < 1e-4 && Math.abs(o.Vy - y) < 1e-4) return true;
      }
      return false;
    };
    const partA = rL0 !== rR0; const partB = rL0 + rL1 !== rR0 + rR1;
    const ovAB = Math.min(rL0 + rL1, rR0 + rR1) - Math.max(rL0, rR0);
    const nl0 = pl.pts.length; const nr0 = pr.pts.length;
    let mirA = partA && armKind(aSt) === "end" && ovAB < Math.abs(rL0 - rR0) &&
      (rL0 > rR0 ? droppedAt(aSt, pl.pts[0], pl.pts[1]) : droppedAt(aSt, pr.pts[0], pr.pts[1]));
    let mirB = partB && armKind(bSt) === "end" && ovAB < Math.abs(rL0 + rL1 - rR0 - rR1) &&
      (rL0 + rL1 < rR0 + rR1 ? droppedAt(bSt, pl.pts[nl0 - 2], pl.pts[nl0 - 1]) : droppedAt(bSt, pr.pts[nr0 - 2], pr.pts[nr0 - 1]));
    if (ovAB < 0.25 * table.h) { mirA = false; mirB = false; }
    const jEnd = (partA && !mirA && armKind(aSt) !== null) || (partB && !mirB && armKind(bSt) !== null);
    let pL0 = 0; let nL = N; let pR0 = 0; let nR = N; let mU0 = 0; let mUl = 0; let matched = false;
    if (reKey && !(JEND_GATE && jEnd)) {
      const u0 = Math.min(rL0, rR0); const u1 = Math.max(rL0 + rL1, rR0 + rR1);
      const ov = Math.min(rL0 + rL1, rR0 + rR1) - Math.max(rL0, rR0);
      if (u1 - u0 > 1e-9 && ov > 0) {
        const ix = (s: number): number => Math.round(((s - u0) / (u1 - u0)) * N);
        const l0 = ix(rL0); const l1 = ix(rL0 + rL1); const q0 = ix(rR0); const q1 = ix(rR0 + rR1);
        if (l1 - l0 >= 1 && q1 - q0 >= 1) { pL0 = l0; nL = l1 - l0; pR0 = q0; nR = q1 - q0; mU0 = u0; mUl = u1 - u0; matched = true; }
      }
    }
    if (W * W > 16777216) return false; // a span packs into one float32 (pL0 * W + nL)
    const nl = pl.pts.length >> 1; const nr = pr.pts.length >> 1; const m = nl >> 1;
    pointAt(c, rL0 + (rL1 * m) / Math.max(1, nl - 1), fa);
    let sg = (pl.pts[2 * m] - fa[0]) * -fa[3] + (pl.pts[2 * m + 1] - fa[1]) * fa[2] >= 0 ? 1 : -1;
    // K1247 s20 (POLY.mode 4): columns 1 and N-1 by colAt (their s into PS4: L1, LN-1, R1, RN-1).
    const o4 = recT ? recT.base[it.pi] : 0;
    const sides = (): void => {
      if (recT) {
        // The table's float32 s ranges, as the shader reads them: its columns 2 and N-2 agree with these.
        const a0 = Math.fround(rL0); const a1 = Math.fround(rL1); const b0r = Math.fround(rR0); const b1r = Math.fround(rR1);
        PS4[0] = colAt(c, recT.pf, o4, a0, a1, N, sg, hW, 1, P4, 0); PS4[1] = colAt(c, recT.pf, o4, a0, a1, N, sg, hW, N - 1, P4, 2);
        PS4[2] = colAt(c, recT.pf, o4, b0r, b1r, N, -sg, hW, 1, P4, 4); PS4[3] = colAt(c, recT.pf, o4, b0r, b1r, N, -sg, hW, N - 1, P4, 6);
        return;
      }
      offsetAt(c, rL0 + rL1 / N, sg, hW, rL1 / N, P4, 0); offsetAt(c, rL0 + (rL1 * (N - 1)) / N, sg, hW, rL1 / N, P4, 2);
      offsetAt(c, rR0 + rR1 / N, -sg, hW, rR1 / N, P4, 4); offsetAt(c, rR0 + (rR1 * (N - 1)) / N, -sg, hW, rR1 / N, P4, 6);
    };
    sides();
    const xa = pl.pts[0]; const ya = pl.pts[1]; const xb = pl.pts[2 * nl - 2]; const yb = pl.pts[2 * nl - 1];
    const d2 = (o: number, x: number, y: number): number => (P4[o] - x) ** 2 + (P4[o + 1] - y) ** 2;
    if (d2(4, xa, ya) + d2(6, xb, yb) < d2(0, xa, ya) + d2(2, xb, yb)) { sg = -sg; sides(); }
    if (recT && !(recSideOk(c, recT, it.pi, rL0, rL1, nL, sg) && recSideOk(c, recT, it.pi, rR0, rR1, nR, -sg))) return false;
    const b0 = it.base;
    const xc = pr.pts[0]; const yc = pr.pts[1]; const xd = pr.pts[2 * nr - 2]; const yd = pr.pts[2 * nr - 1];
    // Column i of side L (R: the right) into P4[oi]; returns its paint s (NaN: the key's s). k, the
    // column on the side's span: 0 and n2 its piece's ends (held there past the span), else colAt
    // over n2 columns (the shader's recSide).
    const sideAt = (i: number, R: boolean, oi: number): number => {
      const p0 = R ? pR0 : pL0; const n2 = R ? nR : nL; const k = Math.min(Math.max(i - p0, 0), n2);
      const r0 = R ? rR0 : rL0; const r1 = R ? rR1 : rL1;
      if (k === 0) { P4[oi] = R ? xc : xa; P4[oi + 1] = R ? yc : ya; return r0; }
      if (k === n2) { P4[oi] = R ? xd : xb; P4[oi + 1] = R ? yd : yb; return r0 + r1; }
      if (recT) return colAt(c, recT.pf, o4, Math.fround(r0), Math.fround(r1), n2, R ? -sg : sg, hW, k, P4, oi);
      offsetAt(c, r0 + (r1 * k) / n2, R ? -sg : sg, hW, r1 / n2, P4, oi); return NaN;
    };
    const fr01 = (i: number, p0: number, n2: number): number => Math.min(Math.max((i - p0) / n2, 0), 1);
    // K1314 s7 (MATCH_MIRROR at mirA / mirB): fillFrame's mirL / mirR. A side's piece without its own
    // centre polyline (cpts) mirrors nothing there, as fillFrame's cOkL / cOkR.
    const mirOn = MATCH_MIRROR && (mirA || mirB) && matched;
    const cOkL = pl.cpts.length === pl.pts.length; const cOkR = pr.cpts.length === pr.pts.length;
    const onChain = (i: number): boolean => { if (c.closed) return true; const s = mU0 + (mUl * i) / N; return s >= 0 && s <= c.len; };
    const mirL = (i: number): boolean => mirOn && (i < pL0 ? mirA : mirB) && cOkR && !(i >= pL0 && i <= pL0 + nL) && i >= pR0 && i <= pR0 + nR && onChain(i);
    const mirR = (i: number): boolean => mirOn && (i < pR0 ? mirA : mirB) && cOkL && !(i >= pR0 && i <= pR0 + nR) && i >= pL0 && i <= pL0 + nL && onChain(i);
    // ls, rs: the column's paint s (mode 4: colAt's; NaN: the key's); keys as fillFrame's (above). A
    // mirrored side is the other side reflected across the chain at that side's s, keyed and painted by it.
    const col = (i: number, lx: number, ly: number, rx: number, ry: number, ls = NaN, rs = NaN): void => {
      const s = matched ? mU0 + (mUl * i) / N : s0 + (ds * i) / N;
      const kL0 = matched ? rL0 + rL1 * fr01(i, pL0, nL) : rL0 + (rL1 * i) / N;
      const kR0 = matched ? rR0 + rR1 * fr01(i, pR0, nR) : rR0 + (rR1 * i) / N;
      const mL = mirL(i); const mR = mirR(i);
      if (mL) { pointAt(c, rs === rs ? rs : kR0, fa); lx = 2 * fa[0] - rx; ly = 2 * fa[1] - ry; ls = rs; }
      else if (mR) { pointAt(c, ls === ls ? ls : kL0, fa); rx = 2 * fa[0] - lx; ry = 2 * fa[1] - ly; rs = ls; }
      const kL = mL ? kR0 : kL0; const kR = mR ? kL0 : kR0;
      const zm = reKey ? zAt1(c, (kL + kR) / 2) : 0;
      const z = !reKey ? zAt1(c, s) : matched ? zm : Math.max(zAt1(c, s), zm);
      const zl = reKey ? zAt1(c, kL) : z; const zr = reKey ? zAt1(c, kR) : z;
      // K1247 s27 (K1332): fillFrame's FLOOR_EDGE, a sheared border row raised to put its edge's midpoint on the cone.
      const fl = reKey && !matched;
      const kl = fl ? Math.max(zl - zt, 2 * zAt1(c, (3 * kL + kR) / 4) - zt - z) : zl - zt;
      const kr = fl ? Math.max(zr - zt, 2 * zAt1(c, (kL + 3 * kR) / 4) - zt - z) : zr - zt;
      const sL = ls === ls ? ls : kL; const sR = rs === rs ? rs : kR;
      const vL = b0 + i; const vC = vL + W; const vR = vC + W;
      pos[2 * vL] = lx; pos[2 * vL + 1] = ly; key[vL] = kl; sv[vL] = s;
      pos[2 * vC] = (lx + rx) / 2; pos[2 * vC + 1] = (ly + ry) / 2; key[vC] = z; sv[vC] = s;
      pos[2 * vR] = rx; pos[2 * vR + 1] = ry; key[vR] = kr; sv[vR] = s;
      s4[SLOTS * vL] = sL; s4[SLOTS * vC] = (sL + sR) / 2; s4[SLOTS * vR] = sR;
      across[vL] = 1; across[vR] = 1;
    };
    // Columns 1 and N-1: sides()'s unless the spans moved them.
    if (matched) { PS4[0] = sideAt(1, false, 0); PS4[1] = sideAt(N - 1, false, 2); PS4[2] = sideAt(1, true, 4); PS4[3] = sideAt(N - 1, true, 6); }
    else if (!recT) PS4.fill(NaN);
    col(0, xa, ya, xc, yc, rL0, rR0);
    col(1, P4[0], P4[1], P4[4], P4[5], PS4[0], PS4[2]); col(N - 1, P4[2], P4[3], P4[6], P4[7], PS4[1], PS4[3]);
    col(N, xb, yb, xd, yd);
    // K1247 s21 (fillRec 3): columns 2..N-2 as the shader places them (mode 4: colAt on the float32
    // ranges, by colRow over each side's span; else the offset line uniform in s).
    if (full && N >= 4) {
      if (rowL.length < 2 * W) { rowL = new Float64Array(2 * W); rowR = new Float64Array(2 * W); rowZ = new Float64Array(W); rowSL = new Float64Array(W); rowSR = new Float64Array(W); }
      if (recT) {
        const row = (R: boolean, out: Float64Array, sOut: Float64Array): void => {
          const p0 = R ? pR0 : pL0; const n2 = R ? nR : nL; const kLo = Math.max(1, 2 - p0); const kHi = Math.min(n2 - 1, N - 2 - p0);
          if (kLo <= kHi) colRow(c, recT.pf, o4, Math.fround(R ? rR0 : rL0), Math.fround(R ? rR1 : rL1), n2, R ? -sg : sg, hW, kLo, kHi, out, sOut);
        };
        row(false, rowL, rowSL); row(true, rowR, rowSR);
        for (let i = 2; i <= N - 2; i++) {
          const kl = Math.min(Math.max(i - pL0, 0), nL); const kr = Math.min(Math.max(i - pR0, 0), nR);
          let lx: number; let ly: number; let ls: number; let rx: number; let ry: number; let rs: number;
          if (kl === 0 || kl === nL) { ls = sideAt(i, false, 0); lx = P4[0]; ly = P4[1]; } else { lx = rowL[2 * kl]; ly = rowL[2 * kl + 1]; ls = rowSL[kl]; }
          if (kr === 0 || kr === nR) { rs = sideAt(i, true, 4); rx = P4[4]; ry = P4[5]; } else { rx = rowR[2 * kr]; ry = rowR[2 * kr + 1]; rs = rowSR[kr]; }
          col(i, lx, ly, rx, ry, ls, rs);
        }
      } else {
        for (let i = 2; i <= N - 2; i++) { const ls = sideAt(i, false, 0); const rs = sideAt(i, true, 4); col(i, P4[0], P4[1], P4[4], P4[5], ls, rs); }
      }
    }
    const rF = 4 * hW;
    const footEnd = (i: number): void => {
      for (let r = 0; r < 3; r++) { const v = b0 + r * W + i; const f = footS(c, pos[2 * v], pos[2 * v + 1], s4[SLOTS * v], rF); if (f === f) s4[SLOTS * v] = f; }
    };
    if (stationS(aSt) !== null) footEnd(0);
    if (stationS(bSt) !== null) footEnd(N);
    if (ord < 0) return true;
    const T = recTab!; const o = 4 * REC_TEXELS * ord;
    T[o] = rL0; T[o + 1] = rL1; T[o + 2] = rR0; T[o + 3] = rR1;
    // The key mode, with the mirrored ends (K1314 s7) as bits 2 (mirA) and 3 (mirB), and which sides
    // have a centre polyline as bits 4 (L) and 5 (R).
    T[o + 4] = s0; T[o + 5] = ds; T[o + 6] = sg;
    T[o + 7] = (!reKey ? REC_KEY_ROW : matched ? REC_KEY_MID : REC_KEY_FLOOR) + (mirOn ? (mirA ? 4 : 0) + (mirB ? 8 : 0) + (cOkL ? 16 : 0) + (cOkR ? 32 : 0) : 0);
    T[o + 8] = it.pi; T[o + 9] = N; T[o + 10] = pL0 * W + nL; T[o + 11] = pR0 * W + nR;
    T[o + 12] = xa; T[o + 13] = ya; T[o + 14] = xb; T[o + 15] = yb;
    T[o + 16] = xc; T[o + 17] = yc; T[o + 18] = xd; T[o + 19] = yd;
    return true;
  };
  let bufM = new Float64Array(0); let bufMC = new Float64Array(0);
  let rowL = new Float64Array(0); let rowR = new Float64Array(0); let rowZ = new Float64Array(0); let rowSL = new Float64Array(0); let rowSR = new Float64Array(0);
  if (FILL_PROF.on) FILL_PROF.t.pre = (FILL_PROF.t.pre ?? 0) + performance.now() - tP;
  for (let ii = 0; ii < fs.items.length; ii++) {
    const it = fs.items[ii];
    const tI = FILL_PROF.on ? performance.now() : 0; let pk: string = it.kind;
    try {
    if (it.kind === "strip") {
      const N = it.N; const W = N + 1;
      if (bufL.length < 2 * W) { bufL = new Float64Array(2 * W); bufR = new Float64Array(2 * W); }
      const I = st.intervalsD[it.iv];
      const pl = it.pL >= 0 ? table.pieces[it.pL] : null; const pr = it.pR >= 0 ? table.pieces[it.pR] : null;
      // gpu: recStrip2 for N >= 2 (it places every column of a strip without a table row, N < 4).
      if (gpu && N >= 2) {
        const ord = rsOrd.get(ii) ?? -1;
        if (pl && pr && pl.pts.length >= 4 && pr.pts.length >= 4 && zc[it.pi] && zc[it.pi].n > 1 && recStrip2(it, ord, I.aSt, I.bSt, pl, pr)) { pk = ord >= 0 ? "strip:rec" : "strip:short"; continue; }
        if (ord >= 0) { fbOrd.push(ord); pk = "strip:fb"; }
      } else if (rec && pl && pr && pl.pts.length >= 4 && pr.pts.length >= 4 && tgAt(it.pi) && recStrip(it, I.aSt, I.bSt, pl, pr)) continue;
      if (bufCL.length < 2 * W) { bufCL = new Float64Array(2 * W); bufCR = new Float64Array(2 * W); }
      // A side's border, and (cOk) its centreline feet resampled alongside.
      let cOkL = false; let cOkR = false;
      // K1314 s6: two own border pieces over different s ranges sample on
      // one s scale (the union of the ranges): column i of each side sits at
      // the row's s where its piece runs, and at its piece's end past it, so
      // the rows cross the tube square wherever both borders run. Resampled
      // each over its own range (stage 5 and before), row i sat at sL on one
      // side and sR on the other, its centre vertex between, and no key at
      // those vertices is linear across the skewed triangles where the
      // depth falls along the thread: g41_ring_tw64 x68 (a centre keyed far
      // above its cone, c4 over c3 in a wedge), muse_hash j50 (keyed by its
      // own foot, c71 sank under c18). The strip's outline is the same two
      // borders and end columns; only where the samples sit along them.
      const cz = zc[it.pi];
      const wrapZ = (d: number): number => (cz && cz.closed && cz.len > 0 ? ((d % cz.len) + cz.len) % cz.len : d);
      let spL: [number, number] | null = null; let spR: [number, number] | null = null; let mU0 = 0; let mUl = 0; let mirA = false; let mirB = false;
      if (pl && pr && pl.pts.length >= 4 && pr.pts.length >= 4 && N >= 2) {
        const a0 = pl.s0; const a1 = wrapZ(pl.s1 - pl.s0); let b0 = pr.s0; const b1 = wrapZ(pr.s1 - pr.s0);
        if (cz && cz.closed && cz.len > 0) b0 += cz.len * Math.round((a0 - b0) / cz.len);
        // Not where the ranges part at a junction end: the side the junction's
        // corner consumed would be held at its piece's end there, a fan that
        // leaves the tube's ink unbordered (muse_hash j77, j20, j154: 3
        // broken_ink), and mirrored it rose over the junction's fill (j56);
        // such a strip keeps stage 5's rows. K1314 s7, the one exception
        // (mirA, mirB): an END arm whose consumed side stops at a DROPPED
        // corner's V (no round corner, so no fan paints that stretch), consumed
        // over more than the sides overlap: there stage 5's rows skew into a
        // hard wedge (g41_user_tw64 j71's c32: consumed 0.69, overlap 0.25), so
        // the matched scale holds and that end's columns are mirrored. Where a
        // round corner consumed the side (muse_hash j43, j0, j127; g41 j49) the
        // mirrored tube rose over the junction's fan in a hard seam, and where
        // the sides overlap longer (muse_hash j124: 1.79) stage 5's rows hold.
        const armKind = (sti: number): string | null => (stationS(sti) !== null ? st.arms[st.stationsD[sti].arm].kind : null);
        const partA = a0 !== b0; const partB = a0 + a1 !== b0 + b1;
        const ovAB = Math.min(a0 + a1, b0 + b1) - Math.max(a0, b0);
        const droppedAt = (sti: number, x: number, y: number): boolean => {
          const ai = st.stationsD[sti].arm;
          for (let k = 0; k < st.corners.length; k++) {
            const c = st.corners[k]; if (c.aArm !== ai && c.bArm !== ai) continue;
            const o = table.corners[k]; if (o && !o.ok && Math.abs(o.Vx - x) < 1e-4 && Math.abs(o.Vy - y) < 1e-4) return true;
          }
          return false;
        };
        const nl = pl.pts.length; const nr = pr.pts.length;
        mirA = partA && armKind(I.aSt) === "end" && ovAB < Math.abs(a0 - b0) &&
          (a0 > b0 ? droppedAt(I.aSt, pl.pts[0], pl.pts[1]) : droppedAt(I.aSt, pr.pts[0], pr.pts[1]));
        mirB = partB && armKind(I.bSt) === "end" && ovAB < Math.abs(a0 + a1 - b0 - b1) &&
          (a0 + a1 < b0 + b1 ? droppedAt(I.bSt, pl.pts[nl - 2], pl.pts[nl - 1]) : droppedAt(I.bSt, pr.pts[nr - 2], pr.pts[nr - 1]));
        // Only a tube: where the sides' ranges overlap by under h / 4 the strip is two corners'
        // leftovers, and the mirror fabricates a tube over the junction's fill (muse_hash j56's
        // c22 end arm, overlap 0.004: a hard-edged patch; j71's overlaps 0.25).
        if (ovAB < 0.25 * table.h) { mirA = false; mirB = false; }
        const jEnd = (partA && !mirA && armKind(I.aSt) !== null) || (partB && !mirB && armKind(I.bSt) !== null);
        if ((a0 !== b0 || a1 !== b1) && !(JEND_GATE && jEnd)) {
          const u0 = Math.min(a0, b0); const u1 = Math.max(a0 + a1, b0 + b1);
          const ov = Math.min(a0 + a1, b0 + b1) - Math.max(a0, b0);
          if (u1 - u0 > 1e-9 && ov > 0) {
            const ix = (s: number): number => Math.round(((s - u0) / (u1 - u0)) * N);
            const L: [number, number] = [ix(a0), ix(a0 + a1)]; const R: [number, number] = [ix(b0), ix(b0 + b1)];
            if (L[1] - L[0] >= 1 && R[1] - R[0] >= 1) { spL = L; spR = R; mU0 = u0; mUl = u1 - u0; }
          }
        }
      }
      const side = (p: typeof pl, sg: number, buf: Float64Array, cbuf: Float64Array): boolean => {
        if (p && p.pts.length >= 4) {
          const two = p.cpts.length === p.pts.length;
          const sp = sg > 0 ? spL : spR;
          if (sp) {
            const n2 = sp[1] - sp[0];
            if (bufM.length < 2 * (n2 + 1)) { bufM = new Float64Array(2 * W); bufMC = new Float64Array(2 * W); }
            const ok2 = two ? resample(p.pts, p.cpts, n2, bufM, p.cpts, bufMC) : resample(p.pts, p.cpts, n2, bufM);
            if (!ok2) return false;
            for (let i = 0; i <= N; i++) {
              const k = Math.min(Math.max(i - sp[0], 0), n2);
              buf[2 * i] = bufM[2 * k]; buf[2 * i + 1] = bufM[2 * k + 1];
              if (two) { cbuf[2 * i] = bufMC[2 * k]; cbuf[2 * i + 1] = bufMC[2 * k + 1]; }
            }
            if (two) { if (sg > 0) cOkL = true; else cOkR = true; }
            return true;
          }
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
      // K1314 s6 (MATCH_MIRROR; s7: at an end arm's end only): on the matched s scale, a column past
      // one side's own piece (its border consumed by a junction corner or a
      // crossing) but within the other's is the other side mirrored across
      // the centreline, not the consumed side's end point held: held, the
      // columns fan from that one point (g41_user_tw64 j71's wedge, which the
      // mirror clears). Only where the column's s lies on the chain: past an
      // open chain's end the strip ran out over the junction's other arms
      // (muse_hash j126, c55 over c68).
      const mirOn = MATCH_MIRROR && (mirA || mirB) && spL !== null && spR !== null && okL && okR;
      const onChain = (i: number): boolean => {
        if (!cz || cz.closed) return true;
        const s = mU0 + (mUl * i) / N; return s >= 0 && s <= cz.len;
      };
      const mirL = (i: number): boolean => mirOn && (i < (spL as [number, number])[0] ? mirA : mirB) && cOkR && !(i >= (spL as [number, number])[0] && i <= (spL as [number, number])[1]) && i >= (spR as [number, number])[0] && i <= (spR as [number, number])[1] && onChain(i);
      const mirR = (i: number): boolean => mirOn && (i < (spR as [number, number])[0] ? mirA : mirB) && cOkL && !(i >= (spR as [number, number])[0] && i <= (spR as [number, number])[1]) && i >= (spL as [number, number])[0] && i <= (spL as [number, number])[1] && onChain(i);
      if (mirOn) {
        for (let i = 0; i <= N; i++) {
          if (mirL(i)) { bufL[2 * i] = 2 * bufCR[2 * i] - bufR[2 * i]; bufL[2 * i + 1] = 2 * bufCR[2 * i + 1] - bufR[2 * i + 1]; }
          if (mirR(i)) { bufR[2 * i] = 2 * bufCL[2 * i] - bufL[2 * i]; bufR[2 * i + 1] = 2 * bufCL[2 * i + 1] - bufL[2 * i + 1]; }
        }
      }
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
      // K1314 s5: with both borders their own pieces, each border row is
      // resampled over its own piece's s range, so where the two ranges
      // differ (one side's border runs on past a crossing or a junction
      // corner that consumed the other's) row i sits at sL on one side and
      // sR on the other, and the centre vertex, their midpoint, can sit far
      // from either. Keyed by the row's s (the L range), the R side's rows
      // took a depth up to the range offset away and the strip sank under
      // its neighbour in a wedge (g41_ring_tw64 x67, x68: an over pass drawn
      // under). Such a strip keys each border row by its own side's s (sL,
      // sR; a mirrored column takes the other side's), and the centre by
      // the depth at the midpoint of sL and sR. On the matched s scale (s6)
      // the rows are square, so the centre needs no floor at the row's s:
      // stage 5's max() (kept for a strip without matched spans) held x68's
      // centre above its cone, and muse_hash j50 stays clear without it.
      // Equal ranges key as before, bit for bit.
      const reKey = range(pl) !== null && range(pr) !== null && (rL[0] !== rR[0] || rL[1] !== rR[1]);
      const fr01 = (i: number, sp: [number, number]): number => Math.min(Math.max((i - sp[0]) / (sp[1] - sp[0]), 0), 1);
      for (let i = 0; i <= N; i++) {
        const s = spL ? mU0 + (mUl * i) / N : s0 + (ds * i) / N;
        const lx = bufL[2 * i]; const ly = bufL[2 * i + 1]; const rx = bufR[2 * i]; const ry = bufR[2 * i + 1];
        const sL0 = spL ? rL[0] + rL[1] * fr01(i, spL) : rL[0] + (rL[1] * i) / N;
        const sR0 = spR ? rR[0] + rR[1] * fr01(i, spR) : rR[0] + (rR[1] * i) / N;
        const sL = mirL(i) ? sR0 : sL0;
        const sR = mirR(i) ? sL0 : sR0;
        const zs = zAt(it.pi, s); const z = reKey ? (spL ? zAt(it.pi, (sL + sR) / 2) : Math.max(zs, zAt(it.pi, (sL + sR) / 2))) : zs;
        const zl = reKey ? zAt(it.pi, sL) : z; const zr = reKey ? zAt(it.pi, sR) : z;
        // K1247 s27 (K1332, FLOOR_EDGE): unmatched ranges that differ (a junction end's stage 5 rows)
        // can shear a column by most of a tube's width in s, and the depth across that span is not
        // linear: a border row in an under pass's dip, keyed by its own s, sank the whole triangle
        // below its cone and a neighbour's edge won inside it (muse_hash c8's quad: c67's strip under
        // c8's). Such a border row is raised, never lowered, to the key that puts the edge's
        // midpoint (d = h / 2, s a quarter of the way to the other side) on its cone.
        const kl = reKey && !spL ? Math.max(zl - zt, 2 * zAt(it.pi, (3 * sL + sR) / 4) - zt - z) : zl - zt;
        const kr = reKey && !spL ? Math.max(zr - zt, 2 * zAt(it.pi, (sL + 3 * sR) / 4) - zt - z) : zr - zt;
        set(it.base + i, lx, ly, kl, s);
        set(it.base + W + i, (lx + rx) / 2, (ly + ry) / 2, z, s);
        set(it.base + 2 * W + i, rx, ry, kr, s);
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
          const f = footS(c, pos[2 * v], pos[2 * v + 1], s4[SLOTS * v], rF);
          if (f === f) s4[SLOTS * v] = f;
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
        // K1283 s9: every row paints its foot's s, the strip beside an
        // interpolated chevron or a frame tail reading the s of where it is
        // (muse_hash: strip|strip 183 -> 85, strip|tail 121 -> 1). The foot
        // is taken every FOOT_STEP columns (and at both ends) and its offset
        // from the row's s interpolated between: a foot at each of def's 215k
        // strip vertices cost 80 ms a frame. Rows already on their feet
        // (a missing side's) keep them. K1283 s10 tried footing the centre
        // row only near its ends: the same seams, but the round-end colour
        // census 23339 -> 26294, so every row is footed.
        if (STRIP_FOOT) {
          const step = FOOT_STEP;
          for (let row = 0; row < 3; row++) {
            if ((row === 0 && fbL) || (row === 2 && fbR)) continue;
            const b0 = it.base + row * W;
            let iP = 0; let dP = 0;
            for (let i = 0; ; i = Math.min(i + step, N)) {
              // An end column a station's K1278 foot took keeps it.
              let d = 0;
              if (!((i === 0 && atA) || (i === N && atB))) {
                const v = b0 + i; const s = s4[SLOTS * v];
                const f = footS(c, pos[2 * v], pos[2 * v + 1], s, rF);
                d = f === f ? f - s : 0;
                s4[SLOTS * v] = s + d;
              }
              for (let k = iP + 1; k < i; k++) s4[SLOTS * (b0 + k)] += dP + ((d - dP) * (k - iP)) / (i - iP);
              iP = i; dP = d;
              if (i >= N) break;
            }
          }
        }
      }
    } else if (it.kind === "tail") {
      const p = table.pieces[it.piece]; const W = TAIL_M + 1;
      const s = p ? p.s0 : 0; const z = zAt(it.pi, s);
      if (bufL.length < 2 * W) { bufL = new Float64Array(2 * W); bufR = new Float64Array(2 * W); }
      // An empty tail (the margin never opens this frame) is degenerate, not a fallback.
      // K1283 s3: the fill covers the tail's fill stretch (fpts: stage 2's cut), not its whole band.
      const fp = p ? p.fpts ?? p.pts : []; const fc = p ? (p.fpts ? p.fcpts ?? p.fpts : p.cpts) : [];
      if (!p || !resample(fp, null, TAIL_M, bufL, fc.length === fp.length ? fc : fp, bufR)) {
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
      // K1283 s9: a frame tail (s0 = s1: the corner's s) takes, vertex by
      // vertex, its foot on the chain near that s, as a strip's end column
      // does (K1278 s2), so the tail carries the s of where it is. Flat at the
      // corner's s, its edge stepped against the strip beside it where the
      // no-meet burial moved the corner off the arm's root (muse_hash j149
      // (17, 3): 82 strip|tail seams).
      if (TAIL_FOOT && c && c.n > 1 && Math.abs(dsT) < 1e-9) {
        const rF = 4 * hW;
        for (let i = 0; i < 2 * W; i++) {
          const v = it.base + i;
          const f = footS(c, pos[2 * v], pos[2 * v + 1], s4[SLOTS * v], rF);
          if (f === f) s4[SLOTS * v] = f;
        }
      }
    } else if (it.kind === "disk") {
      const a = st.arms[it.ai]; const J = a ? scene.junctions[a.ji] : undefined;
      const sE = armSOf(it.ai); const z = zAt(it.pi, sE); const hD = table.h;
      if (!J) { for (let i = 0; i < 1 + DISK_R * DISK_M; i++) set(it.base + i, 0, 0, -1e3, sE); continue; }
      // K1283 s7: form B extends an end arm's chain from its point at s_E
      // (the term) to c', the nearest point of a through chain's centreline
      // within 4 h of that arm's s, and caps it there: the disk is centred on
      // c', keyed by its cone about the segment term -> c'.
      let cx = J.c[0]; let cy = J.c[1]; let tx = cx; let ty = cy;
      const cE = zc[it.pi];
      if (DISK_OWN && cE && cE.n > 1) {
        [tx, ty] = zPointAt(cE, sE); let best = Infinity;
        for (const t of J.arms) {
          if (t.kind !== "through") continue;
          const ti = zz.idx.get(t.chain); const ct = ti === undefined ? undefined : zc[ti]; if (!ct || ct.n < 2) continue;
          const f = footNear(ct, tx, ty, t.s, 4 * hD, 0, 0);
          if (f.d < best) { best = f.d; [cx, cy] = zPointAt(ct, f.s); }
        }
      }
      const sx = tx - cx; const sy = ty - cy; const sl2 = sx * sx + sy * sy;
      // Form B's appended vertex c' takes the chain's depth past its end
      // (s_E - |term c'| at a start, s_E + |term c'| at an end), and z runs
      // linearly along the segment: a raised end falls to c''s depth, so it
      // ties the through chain there instead of covering it.
      const atS = cE ? Math.abs(sE) <= Math.abs(sE - cE.len) : true;
      const zC = DISK_OWN && cE && sl2 > 0 ? zPastC(cE, atS ? sE - Math.sqrt(sl2) : sE + Math.sqrt(sl2)) : z;
      const coneZ = (x: number, y: number): number => {
        const u = sl2 > 0 ? Math.min(1, Math.max(0, ((x - cx) * sx + (y - cy) * sy) / sl2)) : 0;
        return zC + (z - zC) * u - (Math.hypot(x - cx - u * sx, y - cy - u * sy) * zt) / hD;
      };
      set(it.base, cx, cy, DISK_OWN ? coneZ(cx, cy) : z, sE); s4[SLOTS * it.base] = sE;
      for (let r = 0; r < DISK_R; r++) {
        const f = (r + 1) / DISK_R; const rr = hD * f;
        for (let i = 0; i < DISK_M; i++) {
          const v = it.base + 1 + r * DISK_M + i;
          const x = cx + rr * DISK_COS[i]; const y = cy + rr * DISK_SIN[i];
          set(v, x, y, DISK_OWN ? coneZ(x, y) : z - f * zt, sE);
          s4[SLOTS * v] = sE; across[v] = f;
        }
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
        set(v++, (Ps[k][0] + Ns[k][0]) / 2, (Ps[k][1] + Ns[k][1]) / 2, zAt(a.pi, sM[k]), sA);
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
    } finally { if (FILL_PROF.on) FILL_PROF.t[pk] = (FILL_PROF.t[pk] ?? 0) + performance.now() - tI; }
  }
  // K1278 s2: tails at junctions (runs: fillRuns). A tail vertex over its
  // fan takes the fan's weights and s there (barycentric over the fan
  // triangle under it); one off the fan keeps its own s, on its arm's slot.
  if (FILL_PROF.on) tP = performance.now();
  // K1247 s28 (perf): the fan scan visits only the triangles that can hold the point. Per junction
  // (built once: the fan's vertices do not change in this loop; the items go grouped by junction,
  // fanOrder, and an item writes only its own vertices and reads only its fan's, so the order
  // changes nothing) each triangle gets a box and a run of angle buckets about the fan's centre a,
  // both grown far past what the barycentric test's 1e-9 tolerance and its rounding allow; a point
  // scans its bucket's triangles in ascending order (the same first triangle) or, within RHO of a,
  // every triangle. A near-degenerate triangle (|A| < A_MIN D^2, D the fan box's side, where the
  // computed barycentrics carry rounding past the tolerance) is in every bucket with an unbounded
  // box. Angles are diamond angles (0..4, a half turn = 2, never steeper than the true angle), so a
  // true angle off its triangle's cone by under FAN_DA lies within FAN_DA of it.
  let fanJ = -1; let x0 = 0; let y0 = 0; let x1 = 0; let y1 = 0; let nB = 1; let cB = 0; let rho2 = 0;
  const FAN_DA = 1e-3; const A_MIN = 1e-5; const RHO = 1e-4;
  const dia = (x: number, y: number): number => y >= 0 ? (x >= 0 ? y / (x + y) : 1 - x / (y - x)) : (x < 0 ? 2 + y / (x + y) : 3 + x / (x - y));
  for (const ii of fanOrder(fs)) {
    const it = fs.items[ii];
    if ((it.kind !== "tail" && it.kind !== "disk") || it.jItem < 0) continue;
    const J = fs.items[it.jItem] as JuncItem; const h = J.base; const R = J.R;
    if (it.jItem !== fanJ) {
      fanJ = it.jItem;
      x0 = Infinity; y0 = Infinity; x1 = -Infinity; y1 = -Infinity;
      for (let v = h; v <= h + R; v++) { x0 = Math.min(x0, pos[2 * v]); x1 = Math.max(x1, pos[2 * v]); y0 = Math.min(y0, pos[2 * v + 1]); y1 = Math.max(y1, pos[2 * v + 1]); }
      const D = Math.max(x1 - x0, y1 - y0); const fin = Number.isFinite(D);
      // (a NaN fan vertex makes the fan's box NaN, and then no point is tested at all)
      nB = fin ? Math.max(1, Math.min(256, 2 * R)) : 1; cB = nB / 4; rho2 = fin ? RHO * D * (RHO * D) : Infinity;
      if (FAN_TB.length < 4 * R) { FAN_TB = new Float64Array(8 * R); FAN_GC = new Int32Array(4 * R); }
      if (FAN_GS.length < nB + 1) FAN_GS = new Int32Array(2 * nB + 2);
      const mg = 1e-6 * (1 + D); const TB = FAN_TB; const KS = FAN_GC; const GS = FAN_GS; GS.fill(0, 0, nB + 1);
      const ax = pos[2 * h]; const ay = pos[2 * h + 1]; const aMin = A_MIN * D * D;
      for (let i = 0; i < R; i++) {
        const b = h + 1 + i; const c = h + 1 + ((i + 1) % R); const bx = pos[2 * b]; const by = pos[2 * b + 1]; const cx = pos[2 * c]; const cy = pos[2 * c + 1];
        const A = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        let kS = 0; let kE = nB - 1;
        if (fin && Math.abs(A) >= aMin) {
          TB[4 * i] = Math.min(ax, bx, cx) - mg; TB[4 * i + 1] = Math.max(ax, bx, cx) + mg; TB[4 * i + 2] = Math.min(ay, by, cy) - mg; TB[4 * i + 3] = Math.max(ay, by, cy) + mg;
          const tb = dia(bx - ax, by - ay); const tc = dia(cx - ax, cy - ay);
          let d = tc - tb; if (d > 2) d -= 4; else if (d <= -2) d += 4;
          const s = d >= 0 ? tb : tc;
          kS = Math.floor((s - FAN_DA) * cB); kE = Math.floor((s + Math.abs(d) + FAN_DA) * cB);
          if (!(kE - kS + 1 < nB)) { kS = 0; kE = nB - 1; }
        } else if (Math.abs(A) < 1e-12) { kE = -1; } // the test computes this A the same way and always skips it: in no bucket
        if (kE >= 0 && !(Math.abs(A) >= aMin && fin)) { TB[4 * i] = -Infinity; TB[4 * i + 1] = Infinity; TB[4 * i + 2] = -Infinity; TB[4 * i + 3] = Infinity; }
        KS[2 * i] = kS; KS[2 * i + 1] = kE;
        for (let k = kS; k <= kE; k++) GS[(k < 0 ? k + nB : k >= nB ? k - nB : k) + 1]++;
      }
      for (let k = 0; k < nB; k++) GS[k + 1] += GS[k];
      if (FAN_GI.length < GS[nB] + nB) FAN_GI = new Int32Array(2 * (GS[nB] + nB));
      // The fill cursors sit past the lists (FAN_GI[GS[nB] + k]), so KS stays whole.
      const GI = FAN_GI; const cur = GS[nB]; for (let k = 0; k < nB; k++) GI[cur + k] = GS[k];
      for (let i = 0; i < R; i++) for (let k = KS[2 * i]; k <= KS[2 * i + 1]; k++) { const kk = cur + (k < 0 ? k + nB : k >= nB ? k - nB : k); GI[GI[kk]++] = i; }
    }
    const TB = FAN_TB; const GS = FAN_GS; const GI = FAN_GI;
    for (let v = it.base; v < it.base + itemVerts(it); v++) {
      const o = SLOTS * v; const sOwn = s4[o];
      for (let k = 0; k < SLOTS; k++) { w4[o + k] = 0; s4[o + k] = s4[SLOTS * h + k]; }
      w4[o + it.arm] = 1; s4[o + it.arm] = sOwn;
      const px = pos[2 * v]; const py = pos[2 * v + 1];
      if (key[v] < -999) continue;
      // K1283 s7: a round end paints its own arm's slot at s_E, as form B
      // paints the end chain's colour over its cap. It is keyed by the fan's
      // key there (off the fan, the highest through chain's cone key) plus
      // form B's margin: its cone key minus the highest through arm's, z - d
      // zt / h about that arm's centreline (any arm but its own, so a chain
      // that ends on itself counts), DISK_DROP times steeper where negative.
      // So it shows where form B's end chain is on top, and its seam curves
      // where the cone keys meet, against a strip whose key sags too.
      if (it.kind === "disk" && DISK_OWN) {
        if (!(px >= x0 && px <= x1 && py >= y0 && py <= y1)) continue;
        let kT = -Infinity;
        for (const ja of J.arms) {
          if (ja.ai === it.ai || st.arms[ja.ai]?.kind === "end") continue;
          const zj = zc[ja.pi]; if (!zj || zj.n < 2) continue;
          const f = footNear(zj, px, py, armSOf(ja.ai), 4 * table.h, 0, 0); if (!Number.isFinite(f.d)) continue;
          const kk = zAtC(zj, f.s) - (f.d * zt) / table.h; if (kk > kT) kT = kk;
        }
        if (!Number.isFinite(kT)) continue;
        const mg = key[v] - kT; const mD = mg >= 0 ? mg : DISK_DROP * mg;
        let kB = kT;
        for (let i = 0; i < R; i++) {
          const b = h + 1 + i; const c = h + 1 + ((i + 1) % R);
          const ax = pos[2 * h]; const ay = pos[2 * h + 1]; const bx = pos[2 * b]; const by = pos[2 * b + 1]; const cx = pos[2 * c]; const cy = pos[2 * c + 1];
          const A = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); if (Math.abs(A) < 1e-12) continue;
          const la = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / A;
          const lb = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / A;
          const lc = 1 - la - lb;
          if (la < -1e-9 || lb < -1e-9 || lc < -1e-9) continue;
          if (key[h] > -999 && key[b] > -999 && key[c] > -999) kB = la * key[h] + lb * key[b] + lc * key[c];
          // DISK_RAMP: from the fan's field at the seam (margin 0) to its own slot.
          const a = !(DISK_RAMP > 0) ? 1 : DISK_RAMP === Infinity ? 0 : Math.min(1, Math.max(0, mD / (DISK_RAMP * zt)));
          if (a < 1) for (let k = 0; k < SLOTS; k++) {
            const wf = la * w4[SLOTS * h + k] + lb * w4[SLOTS * b + k] + lc * w4[SLOTS * c + k];
            const sf = la * s4[SLOTS * h + k] + lb * s4[SLOTS * b + k] + lc * s4[SLOTS * c + k];
            if (k !== it.arm) { w4[o + k] = (1 - a) * wf; s4[o + k] = sf; continue; }
            const wo = a + (1 - a) * wf; w4[o + k] = wo;
            s4[o + k] = wo > 1e-9 ? (a * sOwn + (1 - a) * wf * sf) / wo : sf;
          }
          break;
        }
        key[v] = kB + mD;
        continue;
      }
      let found = false;
      let q0 = 0; let q1 = 0; let byB = false;
      if (px >= x0 && px <= x1 && py >= y0 && py <= y1) {
        const dx = px - pos[2 * h]; const dy = py - pos[2 * h + 1];
        if (dx * dx + dy * dy > rho2) { let k = Math.floor(dia(dx, dy) * cB); k = ((k % nB) + nB) % nB; q0 = GS[k]; q1 = GS[k + 1]; byB = true; } else q1 = R;
      }
      for (let q = q0; q < q1; q++) {
        const i = byB ? GI[q] : q;
        if (px < TB[4 * i] || px > TB[4 * i + 1] || py < TB[4 * i + 2] || py > TB[4 * i + 3]) continue;
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
        // K1283 s6: over its fan a round end lies just under it. The two paint
        // one field, sampled on two meshes, so where their keys crossed (a fan
        // ring near h) they striped by 2-5/255 (muse_hash j126).
        if (it.kind === "disk" && key[h] > -999 && key[b] > -999 && key[c] > -999) {
          const kf = la * key[h] + lb * key[b] + lc * key[c] - 1e-5;
          if (key[v] > kf) key[v] = kf;
        }
        found = true;
        break;
      }
      // K1283 s6: a round end's point off the fan takes the fan's field at the
      // nearest point of the fan's ring (an arm's strip end there, whose field
      // the strip continues): its own arm's slot alone stepped against a
      // through arm's strip beside it (user_tw42 j14: 15/255).
      if (found || it.kind !== "disk") continue;
      let bd = Infinity; let bi = -1; let bu = 0;
      for (let i = 0; i < R; i++) {
        const b = h + 1 + i; const c = h + 1 + ((i + 1) % R);
        const bx = pos[2 * b]; const by = pos[2 * b + 1]; const vx = pos[2 * c] - bx; const vy = pos[2 * c + 1] - by;
        const l2 = vx * vx + vy * vy; let u = l2 > 0 ? ((px - bx) * vx + (py - by) * vy) / l2 : 0; u = u < 0 ? 0 : u > 1 ? 1 : u;
        const dx = bx + vx * u - px; const dy = by + vy * u - py; const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; bi = i; bu = u; }
      }
      if (bi < 0) continue;
      const b = h + 1 + bi; const c = h + 1 + ((bi + 1) % R);
      for (let k = 0; k < SLOTS; k++) {
        w4[o + k] = (1 - bu) * w4[SLOTS * b + k] + bu * w4[SLOTS * c + k];
        s4[o + k] = (1 - bu) * s4[SLOTS * b + k] + bu * s4[SLOTS * c + k];
      }
    }
  }
  if (FILL_PROF.on) FILL_PROF.t.fans = (FILL_PROF.t.fans ?? 0) + performance.now() - tP;
  if (gpu && rsI && recTab) {
    // Record strips that took today's path this frame: their rows (every column) go as fallback rows.
    let nFb = 0; for (const ord of fbOrd) nFb += 3 * ((fs.items[rsI[ord]] as StripItem).N + 1);
    const fb = new Float32Array(4 * Math.max(1, nFb)); let q = 0;
    for (const ord of fbOrd) {
      const S = fs.items[rsI[ord]] as StripItem; const o = 4 * REC_TEXELS * ord;
      recTab[o + 7] = 0; recTab[o + 8] = S.pi; recTab[o + 9] = S.N; recTab[o + 10] = q;
      for (let v = S.base; v < S.base + 3 * (S.N + 1); v++, q++) { fb[4 * q] = pos[2 * v]; fb[4 * q + 1] = pos[2 * v + 1]; fb[4 * q + 2] = key[v]; fb[4 * q + 3] = s4[SLOTS * v]; }
    }
    return { pos, key, s: sv, s4, w4, across, fallbacks, dense: denseCount, rec: { strip: recTab, fb, nFb, hW, zt, pf: recT ? recT.pf : null } };
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
