// K868 S1b: the CPU oracle (docs/design/K868_field_border.md §3, §5).
// Reads only a FieldScene; shares no code with the app's renderer.
//
// Per point p: candidates (local minima of |p − c_i(s)| within reach) join
// into groups by union-find (same chain within σ; arms of one junction
// cluster inside its spans); the top group containing p (depth = z of its
// nearest member, ties to the higher chain id) owns p; ink iff the exact
// distance from p to that group's EXPOSED outline is ≤ W. Depth comes from
// the crossing table (S2, depth.ts; its plateau form "overlap" by default
// since K934) unless `depth: "scene"` asks for the scene's z samples
// (physics zPos, S1b's rule).
//
// The exposed outline is assembled from primitives (offset segments, join
// and cap arcs, corner arcs), each with the parameter intervals on which a
// point ε outward lies outside the rest of its surface, found by dense
// sampling plus bisection. A primitive's exposure is canonical: a primitive
// inside a junction cluster's span is tested against the cluster's region
// (its arms' tubes over their spans plus the corner fills); any other is
// tested against its own chain within σ of it (self-burial: swallowtails,
// hairpins). Distances to exposed intervals are exact (point to segment,
// point to arc).

import { GeoGroups, geoCaps } from "./geo_group";
import type { FieldScene, SceneArm } from "./scene";
import {
  type Cand,
  type Poly,
  SegGrid,
  candidates,
  closestOnSeg,
  dS,
  footInWindow,
  makePoly,
  normS,
  pointAt,
  segB,
  zAt,
} from "./geom";
import { type DepthChain, type DepthPin, diagramDepth, plateauDepth } from "./depth";
import { type CornerEnd, type CurveSamples, type G2Kind, buildG2, humpFall, rayHit } from "./g2";

/** S2 (§3.7): the corner curve between the tangent points. "g1": the
 * rolling-ball arc; the others are G2 candidates (g2.ts). */
export type CornerCurveKind = "g1" | "clothoid" | "bezier5" | "arcs3";

/** S2 (§3.7): a corner's G2 curve and its measures (lengths in world units,
 * curvatures signed in the travel orientation: in along A, out along B). */
export interface G2Corner {
  kind: G2Kind;
  size: "inset" | "tangent";
  /** False when the candidate could not be built; the corner keeps its arc. */
  ok: boolean;
  curve: CurveSamples;
  /** Centreline arc length of the curve's feet on arms A and B. */
  sA: number;
  sB: number;
  /** The outward shift of both feet from G1's (inset sizing), arc length. */
  sigma: number;
  /** The joins: the side outlines' curvature there (3-point fit on the
   * centreline over ±kWin, offset by h). */
  endA: CornerEnd;
  endB: CornerEnd;
  kWin: number;
  /** |Δκ| at the joins: the curve's, and G1's arc against its own joins. */
  jumpA: number;
  jumpB: number;
  jumpG1A: number;
  jumpG1B: number;
  /** Peak |κ| on the curve; G1's is 1/r. */
  peak: number;
  /** Apex inset from V along V→q: the curve's and the G1 arc's. */
  inset: number;
  insetG1: number;
  /** Web length |V − p| to each end (G1's is r·cot(θ/2) on straight arms). */
  webA: number;
  webB: number;
  /** Least (distance to each centreline − h) over the curve: < 0 crosses. */
  clearA: number;
  clearB: number;
  /** Worst fall of |κ| on the way from a join to the peak (0: one hump). */
  humpFall: number;
  /** Fill polygon: V, A's outline, the curve, B's outline (x, y pairs). */
  poly: number[];
  box: [number, number, number, number];
  note: string;
}

export interface OracleParams {
  /** Rolling-ball radius of round corners, world units (sharp corners: 0). */
  rRound: number;
  /** Web-length cap ℓ_max (§3.7): r ≤ ℓ_max·tan(θ/2). 0 or undefined: none. */
  webCap?: number;
  /** Same-chain merge distance σ in arc length. Default π·h. */
  sigma?: number;
  /** Span margin beyond the tangent points + W. Default h. */
  margin?: number;
  /** Exposure probe distance ε. Default 1e-3·h. */
  eps?: number;
  /** Arc length along each arm at which its chord fixes the opening θ. Default 2h. */
  openingChord?: number;
  /** Override per corner: (junctionIndex, cornerIndex, theta, style) → r. */
  rOf?: (j: number, i: number, theta: number, style: "round" | "sharp") => number;
  /** S2 (§3.3): "overlap" (default since K934; K922) is "diagram" with each
   * pin's value held over its pass's overlap reach (depth.ts plateauDepth),
   * so a crossing's over pass lies above its under pass over the whole
   * overlap. "diagram" pins ±depthAmp at each crossing's passes and blends
   * between them (depth.ts), the default before K934; "scene" uses the
   * scene's z samples (physics zPos), S1b's rule. Both kept for comparison. */
  depth?: "diagram" | "scene" | "overlap";
  /** The diagram depth's tent window in arc length. Default
   * look.depthWindow × (look.ctrlArc ?? 1). */
  depthWindow?: number;
  /** S2: how far behind the root an arm's foot window reaches (default h/4). */
  cornerBack?: number;
  /** S2: S1b's two-sided foot windows and single Newton start, for comparison. */
  cornerTwoSided?: boolean;
  /** S2 (§3.7): the corner curve. "g1" (default): the rolling-ball arc. The
   * G2 candidates replace it with an exact curve, sampled densely (g2.ts). */
  cornerCurve?: CornerCurveKind;
  /** S2: how a G2 candidate is sized against the G1 arc of the same r:
   * "inset" (default), the same distance from V along the bisector; or
   * "tangent", the same tangent points t_A and t_B. */
  cornerSize?: "inset" | "tangent";
  /** K883 (§3.4): "k883" (default) caps each arm's span at its chain's end,
   * the next junction and short of the first crossing pass that would put
   * both passes in one group, and fits the round inside the capped spans;
   * "s2" is S2's spans (corner extent + W + margin, uncapped), for the
   * before renders. */
  spans?: "k883" | "s2";
  /** K883 (§3.8): the slider's top setting. When set, the reach bound uses
   * the mapping's r_max = (2/3)·crMax·h instead of this scene's largest
   * radius, so the timing bound does not depend on the corners solved. */
  crMax?: number;
  /** K900 (§3.4): "k900" (default with the k883 spans) refuses a same-chain
   * join that would put both passes of a crossing in one group; "k883" is
   * plain union-find, for the before renders. */
  passJoins?: "k900" | "k883" | "point";
  /** K900 (§3.4): the crossing cut's margin past the overlap, in h (1). An
   * under piece cut at D = h·cot(θ/2) + m·h from the crossing ends in a
   * round cap of radius h, which clears the over pass's border iff
   * D·sinθ >= 2h, i.e. cosθ + m·sinθ >= 1: m = 1/2 (K883) fails past
   * θ = 53.1°, m = 1 holds at every θ <= 90°, and L + h is check 15's
   * window, so the check certifies the cut the oracle makes. */
  passMargin?: number;
  /** K909 (§3.4): "geo" makes each arm's span how far its sides stay
   * inside the junction's geometric group (geo_group.ts: the overlap of
   * the arm tubes that holds the node, cut at the caps) + W + margin;
   * "k883" (default) is the corner extent + W + margin. Both keep the
   * caps, the crossing cut and the same-chain refusal. */
  groups?: "geo" | "k883";
  /** K909: under groups "geo", floor each arm's extent at its corners'
   * extents (default true; false: the walk alone, the first K909 run). */
  geoFloor?: boolean;
  /** K909: under groups "geo", cut each junction's arms at its own
   * crossings first (geoCaps's cut; default false: the spans'
   * cluster-wide cut alone; true: the second K909 run). */
  geoCut?: boolean;
  /** K909 step 4 (sheet G, the hook's look; no default change): where a
   * crossing-cut arm's side lies inside the crossing's other pass at the
   * cut (`hooks`), "carry" draws that side's border from the junction to
   * the cut over the group's body, and "cap" hides it while it lies inside
   * the other pass's tube, so it starts on that pass's border. Default
   * "now": the free cap at the cut. K915 adds "seam": a line W wide across
   * the arm at the cut, where the arm lies over the other pass. */
  hookLook?: "now" | "carry" | "cap" | "seam";
  /** K915 (draft §3.2, form A; no default change): "group" (default) inks
   * within W of the top group's exposed outline. "surface" inks from the
   * visible surface: the covering member of greatest z (a z-buffer), within
   * W of the exposed outline of the members similar to it (one cluster, or
   * one chain within σ; never chained), plus a centred line W wide along
   * each depth switch, where another covering member rises above it.
   * "label" is the same rule in image space, with no outline primitives:
   * the visible member on a W/4 grid, and ink on the front side of every
   * change of visible surface within W (a centred line at a switch).
   * A corner fill under "label" (K940's yield order, the only form since
   * K934) yields to another surface's tube unless the crossing table puts
   * one of the fill's cluster's chains over the tube's chain there: the
   * nearest such crossing within σ along the tube decides (fillOrder);
   * with none, the fill yields. */
  ink?: "group" | "surface" | "label";
  /** K915 ink "label": bisect to the exact change near the band's edge
   * (default true); false keeps the grid's distance, within g/2 = W/8. */
  labExact?: boolean;
  /** K924, ink "label": how equal depths are broken. "surface" (default
   * since K934): by a key that is constant over a surface (the cluster,
   * else the chain), then s. "chain": by the chain's id, then s (the rule
   * before K934), which can flip the visible surface inside one cluster. */
  labTie?: "surface" | "chain";
  /** K868 S3a2: build only what the app's label pass reads (the spans,
   * clusters, corners, depth and crossing table), skipping the primitives,
   * their grid and the hooks. evalPoint and renderOracle need the full
   * model; the label's pieces (src/render/label/) do not. */
  labelOnly?: boolean;
}

/** K909 step 4: a crossing-cut arm whose side lies inside the crossing's
 * other pass at the cut (the hook of `j_hook_cross`, muse_hash crossing 292). */
export interface HookArm {
  junction: number;
  arm: number;
  cluster: number;
  /** Poly index and the arm's root s, direction and cut s. */
  pi: number;
  root: number;
  dir: number;
  cut: number;
  /** The crossing, its s on this chain, and the other pass (poly, s). */
  crossing: number;
  sOwn: number;
  po: number;
  sOther: number;
  /** +1: the side along (−ty, tx); −1: the other. */
  side: number;
}

/** K883 (§3.8): the corner slider's rolling-ball radius at opening θ. */
export function cornerRadius(cr: number, h: number, theta: number): number {
  return (cr / 3) * Math.min(2 * h, 1.5 * h * Math.tan(theta / 2));
}

/** K883 (§3.8): the largest radius the slider gives, for reach and timing. */
export function cornerRadiusMax(cr: number, h: number): number {
  return (2 / 3) * cr * h;
}

export interface Corner {
  junction: number;
  index: number;
  cluster: number;
  armA: SceneArm;
  armB: SceneArm;
  a: number; // poly index of arm A's chain
  b: number;
  theta: number;
  style: "round" | "sharp";
  r: number;
  ok: boolean;
  V: [number, number];
  q: [number, number];
  tA: [number, number];
  tB: [number, number];
  /** Arc length of the tangent point's (or V's) foot on each arm's chain. */
  sTA: number;
  sTB: number;
  sVA: number;
  sVB: number;
  winA: [number, number];
  winB: [number, number];
  /** Sector of the fill as seen from q, and its reach. */
  uA: [number, number];
  uB: [number, number];
  vq: number;
  /** Solver residuals |d − δ| at V and q. */
  resV: number;
  resQ: number;
  /** S2: the G2 curve that replaces the arc (params.cornerCurve). */
  g2?: G2Corner;
  /** K883: the corner's arms as indexes into its junction's arms. */
  armIdxA?: number;
  armIdxB?: number;
  /** K883: the radius the rule asked for, before the arm-span fit. */
  rRule?: number;
  /** K992: the δ at which the ball's branch folded (r stopped there). */
  fold?: number;
  /** K992 s2: the farthest arc length from the root each tangent foot
   * reached on the march (the cap gate reads it). */
  footMaxA?: number;
  footMaxB?: number;
  /** K883: why the fit shrank the round (absent when it did not). */
  fit?: string;
  /** K883: no V (the arms stay closer than 2h); noVA/noVB are the arc
   * lengths to which the two arms then merge. */
  noV?: boolean;
  noVA?: number;
  noVB?: number;
}

/** K883: an arm's span cap and its cause. */
export interface ArmCap {
  len: number;
  why: string;
}

export interface Cluster {
  junctions: number[];
  /** Per poly index: merged span intervals. */
  spans: Map<number, [number, number][]>;
  corners: number[];
}

export interface Prim {
  kind: 0 | 1;
  /** Poly index, or −1 for a corner arc. */
  chain: number;
  corner: number;
  sLo: number;
  sHi: number;
  cluster: number;
  role: "side" | "join" | "cap" | "corner";
  // segment
  ax: number;
  ay: number;
  bx: number;
  by: number;
  nx: number;
  ny: number;
  // arc
  cx: number;
  cy: number;
  R: number;
  a0: number;
  sweep: number;
  inward: boolean;
  /** Exposed parameter intervals, flattened [u0, u1, u0, u1, ...]. */
  exp: number[];
}

export interface PointEval {
  inside: boolean;
  ink: boolean;
  /** Signed distance to the top group's exposed outline (+ inside), clamped to ±dMax. */
  F: number;
  /** Top group key: 100000 + cluster for a junction group, else the chain's scene id; −1 outside. */
  top: number;
  /** Scene chain id of the top group's nearest member (−1 outside). */
  topChain: number;
  topS: number;
}

const TAU = Math.PI * 2;

function fmtH(x: number, h: number): string {
  return `${(x / h).toFixed(2)}h`;
}

function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

export class FieldModel {
  readonly h: number;
  readonly W: number;
  readonly sigma: number;
  readonly lambda: number;
  readonly margin: number;
  readonly eps: number;
  readonly reach: number;
  readonly dMax: number;
  readonly polys: Poly[];
  readonly idOf: number[] = [];
  readonly idxOf = new Map<number, number>();
  readonly grid: SegGrid;
  readonly corners: Corner[] = [];
  readonly clusters: Cluster[] = [];
  readonly junctionCluster: number[] = [];
  /** Per poly: [lo, hi, cluster] span intervals. */
  readonly chainSpans: [number, number, number][][];
  /** K883: per junction, its arms' final spans [poly, lo, hi, arm index]. */
  junctionSpans: [number, number, number, number][][] = [];
  /** K883: the spans the rule's corners would give with no caps: the
   * border census's notion of a junction's union. */
  naturalSpans: [number, number, number, number][][] = [];
  /** K883: per junction, per arm, its span cap (Infinity: none). */
  armCaps: ArmCap[][] = [];
  /** K909: with groups "geo", the junctions' geometric groups at the final caps (the census's truth "geo" reads it). */
  geoGroups: GeoGroups | null = null;
  /** K900 (§3.4): per poly, its crossing passes' windows (s ± pad); tag 2x
   * for crossing x's pass a, 2x + 1 for b; mate: the other pass's s on a
   * kink (one chain), else NaN. Empty when passJoins is "k883". */
  passTags: { s: number; pad: number; tag: number; mate: number }[][] = [];
  /** K900: per cluster, the passes its spans hold (tags as in passTags). */
  clusterTags: number[][] = [];
  /** K900: evalPoint joins groups by joinGroups (passJoins "k900"). */
  private refuseJoins = false;
  private pointJoins = false;
  /** K883 census: when set, evalPoint records its candidates and groups in lastEval. */
  recordGroups = false;
  /** K868 S3a3 probe hook: visibleAt weighs the fills in reverse order (it must not matter). */
  visitReverse = false;
  lastEval: {
    cands: Cand[];
    cl: number[];
    groups: number[][];
    inside: number[][];
    top: number[] | null;
    topNear: number;
  } | null = null;
  readonly prims: Prim[] = [];
  /** Per poly: cap at the start / end vertex drawn (dead end or END cap). */
  readonly capStart: boolean[];
  readonly capEnd: boolean[];
  private primGrid!: { cell: number; x0: number; y0: number; nx: number; ny: number; cells: Int32Array[] };
  private stamp!: Int32Array;
  private tick = 0;
  readonly diagnostics: string[] = [];
  readonly scene: FieldScene;
  readonly params: OracleParams;
  /** Diagram depth (§3.3): per poly, its crossing pins; the window in arc length. */
  readonly depthChains: DepthChain[];
  readonly depthWin: number;

  constructor(scene: FieldScene, params: OracleParams) {
    this.scene = scene;
    this.params = params;
    const h = scene.look.halfWidth;
    this.h = h;
    this.W = scene.look.band;
    this.sigma = params.sigma ?? Math.PI * h;
    this.lambda = this.sigma / 2;
    this.margin = params.margin ?? h;
    this.eps = params.eps ?? 1e-3 * h;
    this.dMax = 1.5 * h;

    // 1. Raw polys, then END extensions to c′ (§3.6).
    scene.chains.forEach((c, i) => {
      this.idOf[i] = c.id;
      this.idxOf.set(c.id, i);
    });
    const raw = scene.chains.map((c, i) => makePoly(i, c.pts, c.z, c.closed));
    const ext: { start?: [number, number]; end?: [number, number] }[] = raw.map(() => ({}));
    for (const j of scene.junctions) {
      const throughs = j.arms.filter((a) => a.kind === "through");
      for (const arm of j.arms) {
        if (arm.kind !== "end") continue;
        const pi = this.idxOf.get(arm.chain);
        if (pi === undefined) continue;
        const p = raw[pi];
        const term = pointAt(p, arm.s);
        let cp: [number, number] = [j.c[0], j.c[1]];
        let best = Infinity;
        for (const t of throughs) {
          const ti = this.idxOf.get(t.chain);
          if (ti === undefined) continue;
          const f = footInWindow(raw[ti], term.x, term.y, t.s - 4 * h, t.s + 4 * h);
          if (f.d < best) {
            best = f.d;
            cp = [f.x, f.y];
          }
        }
        const atStart = Math.abs(arm.s - p.s0) < Math.abs(arm.s - (p.s0 + p.len));
        if (atStart) ext[pi].start = cp;
        else ext[pi].end = cp;
      }
    }
    this.polys = scene.chains.map((c, i) => {
      const e = ext[i];
      if (!e.start && !e.end) return raw[i];
      const pts = Array.from(c.pts);
      const z = Array.from(c.z);
      let s0 = 0;
      if (e.start) {
        const d = Math.hypot(pts[0] - e.start[0], pts[1] - e.start[1]);
        if (d > 1e-9) {
          pts.unshift(e.start[0], e.start[1]);
          z.unshift(z[0]);
          s0 = -d;
        }
      }
      if (e.end) {
        const m = pts.length;
        const d = Math.hypot(pts[m - 2] - e.end[0], pts[m - 1] - e.end[1]);
        if (d > 1e-9) {
          pts.push(e.end[0], e.end[1]);
          z.push(z[z.length - 1]);
        }
      }
      return makePoly(i, pts, z, c.closed, s0);
    });

    // Caps: dead ends (not off-screen) and END terminals (extended, buried).
    this.capStart = this.polys.map(() => false);
    this.capEnd = this.polys.map(() => false);
    for (const d of scene.deadEnds) {
      const pi = this.idxOf.get(d.chain);
      if (pi === undefined || d.offscreen) continue;
      const p = this.polys[pi];
      if (Math.abs(d.s - p.s0) < Math.abs(d.s - (p.s0 + p.len))) this.capStart[pi] = true;
      else this.capEnd[pi] = true;
    }
    for (const j of scene.junctions)
      for (const arm of j.arms) {
        if (arm.kind !== "end") continue;
        const pi = this.idxOf.get(arm.chain);
        if (pi === undefined) continue;
        const p = this.polys[pi];
        if (Math.abs(arm.s - 0) < Math.abs(arm.s - (p.s0 + p.len))) this.capStart[pi] = true;
        else this.capEnd[pi] = true;
      }

    // Diagram depth (§3.3): pin ±amp at each crossing's two passes.
    const amp = scene.look.depthAmp;
    this.depthWin = params.depthWindow ?? scene.look.depthWindow * (scene.look.ctrlArc ?? 1);
    this.depthChains = this.polys.map((p) => ({ closed: p.closed, s0: p.s0, len: p.len, pins: [] }));
    const passPins: { pi: number; pin: DepthPin; oi: number; os: number }[] = [];
    for (const x of scene.crossings) {
      const ov = x.over === "a" ? x.a : x.b;
      const un = x.over === "a" ? x.b : x.a;
      for (const [ps, z, other] of [
        [ov, amp, un],
        [un, -amp, ov],
      ] as const) {
        const pi = this.idxOf.get(ps.chain);
        if (pi === undefined) continue;
        const pin: DepthPin = { s: normS(this.polys[pi], ps.s), z };
        this.depthChains[pi].pins.push(pin);
        const oi = this.idxOf.get(other.chain);
        if (oi !== undefined) passPins.push({ pi, pin, oi, os: normS(this.polys[oi], other.s) });
      }
    }
    for (const d of this.depthChains) {
      d.pins.sort((u, v) => u.s - v.s);
      for (let i = 1; i < d.pins.length; i++)
        if (d.pins[i].s - d.pins[i - 1].s < 1e-6 * h && d.pins[i].z !== d.pins[i - 1].z)
          this.diagnostics.push(`depth: chain ${this.idOf[this.depthChains.indexOf(d)]} has an over and an under pass at one s ${d.pins[i].s}`);
    }

    // 2. Corners (§3.7).
    const k883 = (params.spans ?? "k883") === "k883";
    const kind = params.cornerCurve ?? "g1";
    const g2Of = (c: Corner) => {
      if (kind === "g1" || !c.ok || !(c.r > 0)) return;
      c.g2 = this.buildCornerG2(c, kind, params.cornerSize ?? "inset");
      if (!c.g2.ok) this.diagnostics.push(`corner j${c.junction}/${c.index}: ${kind} not built (${c.g2.note}); the arc stays`);
    };
    scene.junctions.forEach((j, ji) => {
      const m = j.arms.length;
      if (m < 2) return;
      for (let i = 0; i < m; i++) {
        const A = j.arms[i];
        const B = j.arms[(i + 1) % m];
        // The two arms of one through chain (one pass) are one tube: no
        // corner. Two passes of one chain, or its two ends, do get one.
        if (A.chain === B.chain && A.kind === "through" && B.kind === "through" && Math.abs(A.s - B.s) < 1e-6)
          continue;
        const a = this.idxOf.get(A.chain);
        const b = this.idxOf.get(B.chain);
        if (a === undefined || b === undefined) continue;
        const theta = this.opening(A, a, B, b, params.openingChord ?? 2 * h);
        if (!(theta < Math.PI - 1e-6)) continue;
        const style = j.corners?.[i]?.style ?? "round";
        let r = params.rOf ? params.rOf(ji, i, theta, style) : style === "round" ? params.rRound : 0;
        if (params.webCap && params.webCap > 0) r = Math.min(r, params.webCap * Math.tan(theta / 2));
        const c = this.solveCorner(ji, i, A, a, B, b, theta, style, r);
        c.armIdxA = i;
        c.armIdxB = (i + 1) % m;
        // K883: G2 curves are built after the arm-span fit (step 3).
        if (!k883) g2Of(c);
        this.corners.push(c);
      }
    });

    // 3. Spans and clusters (§3.4). K909: the geometric group's walk reads
    // distances before the spans exist, so it gets a grid of its own; so
    // does K922's part walk (partExtents, every k883 build since K934).
    if (k883) this.grid = new SegGrid(this.polys, h, 4 * h);
    const jSpans = this.buildSpans(scene, k883, g2Of);
    let rMax = 0;
    for (const c of this.corners) {
      rMax = Math.max(rMax, c.r);
      if (c.g2?.ok) rMax = Math.max(rMax, c.g2.webA, c.g2.webB);
    }
    if (params.crMax !== undefined) rMax = Math.max(rMax, cornerRadiusMax(params.crMax, h));
    this.reach = 2 * h + this.W + 2 * rMax;
    // Union junctions whose spans overlap on a chain.
    const parent = scene.junctions.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const overl = (p: Poly, a: [number, number], b: [number, number]): boolean => {
      if (!p.closed) return a[0] <= b[1] && b[0] <= a[1];
      for (const sh of [-p.len, 0, p.len]) if (a[0] <= b[1] + sh && b[0] + sh <= a[1]) return true;
      return false;
    };
    for (let i = 0; i < jSpans.length; i++)
      for (let k = i + 1; k < jSpans.length; k++)
        for (const [pa, la, ha] of jSpans[i])
          for (const [pb, lb, hb] of jSpans[k])
            if (pa === pb && overl(this.polys[pa], [la, ha], [lb, hb])) parent[find(i)] = find(k);
    const rootToCluster = new Map<number, number>();
    scene.junctions.forEach((_, ji) => {
      const r = find(ji);
      if (!rootToCluster.has(r)) {
        rootToCluster.set(r, this.clusters.length);
        this.clusters.push({ junctions: [], spans: new Map(), corners: [] });
      }
      const ci = rootToCluster.get(r)!;
      this.junctionCluster[ji] = ci;
      const cl = this.clusters[ci];
      cl.junctions.push(ji);
      for (const [pi, lo, hi] of jSpans[ji]) {
        const l = cl.spans.get(pi) ?? [];
        l.push([lo, hi]);
        cl.spans.set(pi, l);
      }
    });
    for (const cl of this.clusters)
      for (const [pi, l] of cl.spans) {
        l.sort((u, v) => u[0] - v[0]);
        const out: [number, number][] = [];
        for (const iv of l) {
          const last = out[out.length - 1];
          if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
          else out.push([iv[0], iv[1]]);
        }
        cl.spans.set(pi, out);
      }
    this.corners.forEach((c, i) => {
      c.cluster = this.junctionCluster[c.junction];
      this.clusters[c.cluster].corners.push(i);
    });
    this.chainSpans = this.polys.map(() => []);
    this.clusters.forEach((cl, ci) => {
      for (const [pi, l] of cl.spans) for (const [lo, hi] of l) this.chainSpans[pi].push([lo, hi, ci]);
    });
    this.passTags = this.polys.map(() => []);
    this.clusterTags = this.clusters.map(() => []);
    this.pointJoins = params.passJoins === "point";
    if (k883 && (params.passJoins ?? "k900") !== "k883") this.buildPassTags(scene, jSpans);

    this.grid = new SegGrid(this.polys, Math.max(h, this.reach / 2), this.reach + 4 * h);
    if ((params.depth ?? "overlap") === "overlap")
      for (const q of passPins) {
        q.pin.rL = this.passReach(q.pi, q.pin.s, q.oi, q.os, -1);
        q.pin.rR = this.passReach(q.pi, q.pin.s, q.oi, q.os, 1);
      }

    // 4. Primitives and their exposure (§3.5).
    if (!params.labelOnly) {
      this.buildPrims();
      this.buildPrimGrid();
    }
    this.hookLook = params.hookLook ?? "now";
    this.inkMode = params.ink ?? "group";
    this.labExact = params.labExact ?? true;
    if (k883 && !params.labelOnly) this.hooks = this.findHooks(scene);
  }

  /** K915 ink "label": refine the grid's distance by bisection (OracleParams.labExact). */
  readonly labExact: boolean;

  /** K909 step 4: the hook look's switch, and the arms it applies to. */
  readonly hookLook: "now" | "carry" | "cap" | "seam";
  hooks: HookArm[] = [];
  /** K915: the ink rule (OracleParams.ink). */
  readonly inkMode: "group" | "surface" | "label";
  /** K915: the last surface evaluation saw two covering members of different
   * surfaces (a switch can ink there, away from every exposed outline). */
  lastOverlap = false;

  private findHooks(scene: FieldScene): HookArm[] {
    const h = this.h;
    const out: HookArm[] = [];
    this.armCaps.forEach((caps, ji) =>
      caps.forEach((cap, ai) => {
        const m = /^crossing (\d+)'s pass/.exec(cap.why);
        if (!m || !Number.isFinite(cap.len)) return;
        const cx = Number(m[1]);
        const X = scene.crossings[cx];
        const arm = scene.junctions[ji].arms[ai];
        const pi = this.idxOf.get(arm.chain);
        if (!X || pi === undefined) return;
        const p = this.polys[pi];
        const cut = normS(p, arm.s + arm.dir * cap.len);
        // This chain's pass is the one nearer the cut along the arm.
        const passes = [X.a, X.b].filter((q) => q.chain === arm.chain);
        if (!passes.length) return;
        const own = passes.reduce((a, q) => (Math.abs(dS(p, cut, q.s)) < Math.abs(dS(p, cut, a.s)) ? q : a));
        const other = own === X.a ? X.b : X.a;
        const po = this.idxOf.get(other.chain);
        if (po === undefined) return;
        const pp = this.polys[po];
        const win = (s: number): [number, number] =>
          pp.closed ? [s - 8 * h, s + 8 * h] : [Math.max(0, s - 8 * h), Math.min(pp.len, s + 8 * h)];
        const [lo, hi] = win(other.s);
        const at = pointAt(p, cut);
        const inside = [1, -1].filter((sd) => {
          const qx = at.x - sd * at.ty * h;
          const qy = at.y + sd * at.tx * h;
          return footInWindow(pp, qx, qy, lo, hi).d < h - 1e-6 * h;
        });
        if (inside.length !== 1) return;
        out.push({
          junction: ji,
          arm: ai,
          cluster: this.junctionCluster[ji],
          pi,
          root: arm.s,
          dir: arm.dir,
          cut,
          crossing: cx,
          sOwn: own.s,
          po,
          sOther: other.s,
          side: inside[0],
        });
      }),
    );
    return out;
  }

  /** K909 step 4: the hook look's change to one point's ink (evalPoint, top group found). */
  private hookAdjust(x: number, y: number, out: PointEval, cls: Set<number>): void {
    const h = this.h;
    const W = this.W;
    for (const H of this.hooks) {
      const p = this.polys[H.pi];
      if (this.hookLook === "carry") {
        if (!cls.has(H.cluster) || out.ink) continue;
        // The arm's centreline from the root to the cut; its inner side's border band.
        const a = H.root;
        const b = H.root + H.dir * Math.abs(dS(p, H.root, H.cut));
        const [lo, hi] = a < b ? [a, b] : [b, a];
        const f = footInWindow(p, x, y, lo, hi);
        if (!(f.d >= h - W && f.d <= h)) continue;
        if (Math.abs(dS(p, f.s, H.root)) < 1e-6 * h) continue;
        const t = pointAt(p, normS(p, f.s));
        const sd = -t.ty * (x - f.x) + t.tx * (y - f.y);
        if (Math.sign(sd) !== H.side) continue;
        out.ink = true;
        out.F = Math.min(out.F, h - f.d);
      } else if (this.hookLook === "cap") {
        if (!out.ink) continue;
        // Ink inside the crossing's other pass by more than W (within W of
        // that pass's border, only the cut's own cap, within h of the side's
        // end point there: the side's exit corner stays)...
        const pp = this.polys[H.po];
        const lo2 = pp.closed ? H.sOther - 8 * h : Math.max(0, H.sOther - 8 * h);
        const hi2 = pp.closed ? H.sOther + 8 * h : Math.min(pp.len, H.sOther + 8 * h);
        const dOther = footInWindow(pp, x, y, lo2, hi2).d;
        if (!(dOther < h)) continue;
        if (!(dOther < h - W)) {
          const at = pointAt(p, normS(p, H.cut));
          if (Math.hypot(x - (at.x - H.side * at.ty * h), y - (at.y + H.side * at.tx * h)) > h) continue;
        }
        // ...and on the hook's side of the arm's tube, from the root to the
        // crossing's far side (whichever window is on top: the cut's own cap
        // included), goes.
        const reach = Math.abs(dS(p, H.root, H.sOwn)) + 3 * h;
        const a = H.root;
        const b = H.root + H.dir * reach;
        let [lo, hi] = a < b ? [a, b] : [b, a];
        if (!p.closed) {
          lo = Math.max(0, lo);
          hi = Math.min(p.len, hi);
        }
        const f = footInWindow(p, x, y, lo, hi);
        if (!(f.d <= h + 1e-9)) continue;
        if (Math.abs(dS(p, f.s, H.root)) < 1e-6 * h) continue;
        const t = pointAt(p, normS(p, f.s));
        const sd = -t.ty * (x - f.x) + t.tx * (y - f.y);
        if (Math.sign(sd) !== H.side) continue;
        out.ink = false;
      } else if (this.hookLook === "seam") {
        if (out.ink) continue;
        // K915: a line W wide across the arm at the cut, where the arm lies
        // over the crossing's other pass: it closes the hook side's band.
        const pp = this.polys[H.po];
        const lo2 = pp.closed ? H.sOther - 8 * h : Math.max(0, H.sOther - 8 * h);
        const hi2 = pp.closed ? H.sOther + 8 * h : Math.min(pp.len, H.sOther + 8 * h);
        if (!(footInWindow(pp, x, y, lo2, hi2).d < h)) continue;
        let lo = H.cut - h;
        let hi = H.cut + h;
        if (!p.closed) {
          lo = Math.max(0, lo);
          hi = Math.min(p.len, hi);
        }
        const f = footInWindow(p, x, y, lo, hi);
        if (!(f.d < h)) continue;
        const ds = Math.abs(dS(p, f.s, H.cut));
        if (ds > W / 2) continue;
        out.ink = true;
        out.F = Math.min(out.F, W / 2 + ds);
      }
    }
  }

  /** Arm key for per-arm maps. */
  private armKey(ji: number, arm: SceneArm): string {
    return `${ji}:${arm.chain}:${arm.s}:${arm.dir}`;
  }

  /**
   * Per arm: how far its corners reach from the root (the round's tangent
   * point, a G2 curve's join, or V when sharp); h when it has no corner.
   */
  private armExtents(k883: boolean): Map<string, number> {
    const armExt = new Map<string, number>();
    for (const c of this.corners) {
      const pa = this.polys[c.a];
      const pb = this.polys[c.b];
      const g = c.g2?.ok ? c.g2 : null;
      let fa = g ? g.sA : c.r > 0 ? c.sTA : c.sVA;
      let fb = g ? g.sB : c.r > 0 ? c.sTB : c.sVB;
      // K883: a corner with no V merges its arms as far as they stay
      // within 2h of each other (the shorter arm's whole room).
      if (k883 && c.noV) {
        fa = c.noVA ?? fa;
        fb = c.noVB ?? fb;
      }
      const ea = Math.abs(dS(pa, c.armA.s, fa));
      const eb = Math.abs(dS(pb, c.armB.s, fb));
      const ka = this.armKey(c.junction, c.armA);
      const kb = this.armKey(c.junction, c.armB);
      armExt.set(ka, Math.max(armExt.get(ka) ?? 0, ea));
      armExt.set(kb, Math.max(armExt.get(kb) ?? 0, eb));
    }
    return armExt;
  }

  /** Per junction, its arms' spans [poly, lo, hi, arm index] for the given extents and caps. */
  private rawSpans(armExt: Map<string, number>, caps: number[][] | null): [number, number, number, number][][] {
    const h = this.h;
    return this.scene.junctions.map((j, ji) => {
      const out: [number, number, number, number][] = [];
      j.arms.forEach((arm, ai) => {
        const pi = this.idxOf.get(arm.chain);
        if (pi === undefined) return;
        const p = this.polys[pi];
        let e = (armExt.get(this.armKey(ji, arm)) ?? h) + this.W + this.margin;
        if (caps) e = Math.min(e, caps[ji][ai]);
        let lo: number;
        let hi: number;
        if (arm.dir > 0) {
          lo = arm.s;
          hi = arm.s + e;
        } else {
          lo = arm.s - e;
          hi = arm.s;
        }
        if (arm.kind === "end") {
          // Include the extension to c′.
          if (arm.dir > 0) lo = Math.min(lo, p.s0);
          else hi = Math.max(hi, p.s0 + p.len);
        }
        if (!p.closed) {
          lo = Math.max(lo, p.s0);
          hi = Math.min(hi, p.s0 + p.len);
        }
        out.push([pi, lo, hi, ai]);
      });
      return out;
    });
  }

  /**
   * K883 (§3.4): the junctions' spans. S2 ("s2"): each arm reaches its
   * corners' extent + W + margin. K883 (default): the same, capped at the
   * chain's end and the next junction on the chain; then, while some
   * cluster would hold both passes of a crossing, the arm whose root is
   * farther from its pass stops short of the pass (both arms on a
   * repeat); then each round corner is refit inside its arms' caps.
   */
  private buildSpans(scene: FieldScene, k883: boolean, g2Of: (c: Corner) => void): [number, number, number, number][][] {
    const h = this.h;
    const pm = this.params.passMargin ?? 1;
    const ext0 = this.armExtents(k883);
    // The census's union: the rule's corners (no V: the whole overlap), no caps.
    this.naturalSpans = this.rawSpans(this.armExtents(true), null);
    if (!k883) {
      this.junctionSpans = this.rawSpans(ext0, null);
      return this.junctionSpans;
    }
    // Caps: the chain's end (rawSpans clamps to it) and the next junction's root.
    const roots: number[][] = this.polys.map(() => []);
    scene.junctions.forEach((j) => {
      for (const arm of j.arms) {
        const pi = this.idxOf.get(arm.chain);
        if (pi !== undefined) roots[pi].push(arm.s);
      }
    });
    const caps: number[][] = scene.junctions.map((j) => j.arms.map(() => Infinity));
    this.armCaps = scene.junctions.map((j) => j.arms.map(() => ({ len: Infinity, why: "" })));
    const setCap = (ji: number, ai: number, len: number, why: string) => {
      if (len < caps[ji][ai]) {
        caps[ji][ai] = len;
        this.armCaps[ji][ai] = { len, why };
      }
    };
    scene.junctions.forEach((j, ji) => {
      j.arms.forEach((arm, ai) => {
        const pi = this.idxOf.get(arm.chain);
        if (pi === undefined) return;
        const p = this.polys[pi];
        if (!p.closed) {
          const room = arm.dir > 0 ? p.s0 + p.len - arm.s : arm.s - p.s0;
          setCap(ji, ai, Math.max(0, room), "the chain's end");
        }
        for (const s of roots[pi]) {
          const d = arm.dir * dS(p, arm.s, s);
          if (d > 1e-6 * h) setCap(ji, ai, d, "the next junction");
        }
      });
    });
    // K909: the geometric group's caps (the reach, half a loop; the
    // crossing cut is the cluster-wide one below unless geoCut), and its
    // extents for the cut below.
    const geo = this.params.groups === "geo";
    let ext = ext0;
    if (geo) {
      geoCaps(this, this.params.geoCut === true).forEach((l, ji) => l.forEach((c, ai) => setCap(ji, ai, c.len, c.why)));
      ext = this.geoExtents(new GeoGroups(this, this.armCaps), ext0);
    }
    // K1000: a pass's tangent, interpolated along its segment between the
    // vertex tangents (each the mean of its two segments' directions), so θ
    // moves continuously as a crossing slides over a vertex.
    const tanAt = (p: Poly, s: number): { tx: number; ty: number } => {
      const a = pointAt(p, s);
      const dirOf = (k: number): [number, number] => {
        const b = segB(p, k);
        const l = p.segLen[k] || 1;
        return [(p.x[b] - p.x[k]) / l, (p.y[b] - p.y[k]) / l];
      };
      const vtx = (i: number): [number, number] => {
        const kin = i > 0 ? i - 1 : p.closed ? p.nseg - 1 : -1;
        const kout = i < p.nseg ? i : p.closed ? 0 : -1;
        let x = 0;
        let y = 0;
        for (const k of [kin, kout]) {
          if (k < 0) continue;
          const [dx, dy] = dirOf(k);
          x += dx;
          y += dy;
        }
        const l = Math.sqrt(x * x + y * y);
        return l > 1e-12 ? [x / l, y / l] : dirOf(kout >= 0 ? kout : kin);
      };
      const [x0, y0] = vtx(a.k);
      const [x1, y1] = vtx(segB(p, a.k));
      const x = x0 + (x1 - x0) * a.t;
      const y = y0 + (y1 - y0) * a.t;
      const l = Math.sqrt(x * x + y * y);
      return l > 1e-12 ? { tx: x / l, ty: y / l } : { tx: a.tx, ty: a.ty };
    };
    // Crossing passes per chain, with the acute crossing angle.
    const passes = scene.crossings.map((cx) => {
      const ia = this.idxOf.get(cx.a.chain);
      const ib = this.idxOf.get(cx.b.chain);
      if (ia === undefined || ib === undefined) return null;
      const ta = tanAt(this.polys[ia], normS(this.polys[ia], cx.a.s));
      const tb = tanAt(this.polys[ib], normS(this.polys[ib], cx.b.s));
      const th = Math.asin(Math.min(1, Math.abs(cross(ta.tx, ta.ty, tb.tx, tb.ty))));
      return { ia, ib, sa: cx.a.s, sb: cx.b.s, th };
    });
    const clusterRoots = (sp: [number, number, number, number][][]): number[] => {
      const parent = sp.map((_, i) => i);
      const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
      const byPoly = new Map<number, [number, number, number][]>();
      sp.forEach((l, ji) => {
        for (const [pi, lo, hi] of l) {
          const b = byPoly.get(pi) ?? [];
          b.push([lo, hi, ji]);
          byPoly.set(pi, b);
        }
      });
      for (const [pi, l] of byPoly) {
        const p = this.polys[pi];
        for (let x = 0; x < l.length; x++)
          for (let y = x + 1; y < l.length; y++) {
            const [la, ha, ja] = l[x];
            const [lb, hb, jb] = l[y];
            let o = false;
            if (!p.closed) o = la <= hb && lb <= ha;
            else for (const sh of [-p.len, 0, p.len]) if (la <= hb + sh && lb + sh <= ha) o = true;
            if (o) parent[find(ja)] = find(jb);
          }
      }
      return sp.map((_, i) => find(i));
    };
    // K922's part walk (the only extent since K934): walk each uncapped arm
    // on from its span's end while its cross-section still overlaps another
    // member of its cluster.
    const partWalk = k883;
    if (partWalk) ext = this.partExtents(ext, caps, clusterRoots);
    // K1000: continuous caps (docs/design/K1000_continuous_caps.md). The
    // cut loop's choices are measures read at membership levels t in (0, 1]:
    // - an arm holds a pass with weight ss(m/σ), m how far inside its padded
    //   span the pass lies (both ends; the pad is the overlap reach + margin);
    // - two junctions join with weight ss(1 + ov/λ), ov the overlap of two of
    //   their spans on one chain, and a cluster's join is its widest path's
    //   weakest link (a maximum spanning forest);
    // - a pass counts up to the level q1 at which some holder on each side
    //   still joins one cluster;
    // - at each level t ≤ q1, with fa(t), fb(t) the farthest holders of weight
    //   ≥ t, side A is cut with share ss((fa − fb)/τ + 2) and side B with
    //   ss((fb − fa)/τ): A alone at a tie or farther (master's fa ≥ fb), B
    //   alone once fb − fa ≥ 2τ, both in between, so at every level one side
    //   is cut in full; an arm is cut with the measure of its side's shares;
    // - a second visit cuts both sides up to the level q2 at which the pass
    //   is still held once its own cuts are taken at their weights;
    // - a cut of weight w moves the arm's cap from its base cap to its reach
    //   R over w in [0, w0], then from R to the cut over [w0, 1];
    // - θ reads interpolated vertex tangents (tanAt), continuous in s.
    // Three rounds (a first visit, two second visits), no early exit, no
    // state between frames: the caps are a pure, continuous function of the
    // frame, and a pass sliding into an arm lowers its cap monotonically.
    const sig = h / 2;
    const tau = h / 4;
    const lam = h / 2;
    const w0 = 0.05;
    const ss = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    const NJ = scene.junctions.length;
    const base = caps.map((l) => l.slice());
    const baseWhy = this.armCaps.map((l) => l.map((c) => c.why));
    const reach = scene.junctions.map((j, ji) =>
      j.arms.map((arm, ai) => Math.min((ext.get(this.armKey(ji, arm)) ?? h) + this.W + this.margin, base[ji][ai])),
    );
    type Cut = { c: number; w: number; d: number; cx: number };
    const cuts: Map<number, Cut>[][] = scene.junctions.map((j) => j.arms.map(() => new Map<number, Cut>()));
    const applyCaps = () => {
      scene.junctions.forEach((j, ji) =>
        j.arms.forEach((_, ai) => {
          const B = base[ji][ai];
          const R = reach[ji][ai];
          let cap = B;
          let why = baseWhy[ji][ai];
          for (const k of cuts[ji][ai].values()) {
            if (!(k.w > 0)) continue;
            const Rp = Math.max(k.c, R);
            const Bp = Math.min(B, Rp + 64 * h);
            const v = k.w <= w0 ? Bp - (Bp - Rp) * (k.w / w0) : Rp - (Rp - Math.min(k.c, Rp)) * ((k.w - w0) / (1 - w0));
            if (v < cap) {
              cap = v;
              why = `crossing ${k.cx}'s pass ${(k.d / h).toFixed(2)}h out`;
            }
          }
          caps[ji][ai] = cap;
          this.armCaps[ji][ai] = { len: cap, why };
        }),
      );
    };
    // The widest-path join of two junctions, from the spans.
    const connOf = (sp: [number, number, number, number][][]): ((u: number, v: number) => number) => {
      const byPoly = new Map<number, [number, number, number][]>();
      sp.forEach((l, ji) => {
        for (const [pi, lo, hi] of l) {
          const b = byPoly.get(pi) ?? [];
          b.push([lo, hi, ji]);
          byPoly.set(pi, b);
        }
      });
      const best = new Map<number, number>();
      for (const [pi, l] of byPoly) {
        const p = this.polys[pi];
        for (let x = 0; x < l.length; x++)
          for (let y = x + 1; y < l.length; y++) {
            const [la, ha, ja] = l[x];
            const [lb, hb, jb] = l[y];
            if (ja === jb) continue;
            let ov = -Infinity;
            for (const sh of p.closed ? [-p.len, 0, p.len] : [0]) ov = Math.max(ov, Math.min(ha, hb + sh) - Math.max(la, lb + sh));
            const w = ss(1 + ov / lam);
            if (!(w > 0)) continue;
            const key = Math.min(ja, jb) * NJ + Math.max(ja, jb);
            if (w > (best.get(key) ?? 0)) best.set(key, w);
          }
      }
      const edges = [...best].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      const parent = scene.junctions.map((_, i) => i);
      const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
      const adj: [number, number][][] = scene.junctions.map(() => []);
      for (const [key, w] of edges) {
        const u = Math.floor(key / NJ);
        const v = key % NJ;
        if (find(u) === find(v)) continue;
        parent[find(u)] = find(v);
        adj[u].push([v, w]);
        adj[v].push([u, w]);
      }
      const cache = new Map<number, Float64Array>();
      return (u: number, v: number): number => {
        if (u === v) return 1;
        let a = cache.get(u);
        if (!a) {
          a = new Float64Array(NJ);
          a[u] = 1;
          const stack = [u];
          while (stack.length) {
            const x = stack.pop()!;
            for (const [y, w] of adj[x])
              if (y !== u && a[y] === 0) {
                a[y] = Math.min(a[x], w);
                stack.push(y);
              }
          }
          cache.set(u, a);
        }
        return a[v];
      };
    };
    type Held = { ji: number; ai: number; w: number; m: number; f: number };
    // The arms holding the pass at (pi, s), with their weights.
    const hold = (sp: [number, number, number, number][][], pi: number, s: number, pad: number): Held[] => {
      const out: Held[] = [];
      const p = this.polys[pi];
      sp.forEach((l, ji) => {
        for (const [q, lo, hi, ai] of l) {
          if (q !== pi) continue;
          const arm = scene.junctions[ji].arms[ai];
          const L = arm.dir < 0 ? lo - pad : lo;
          const H = arm.dir > 0 ? hi + pad : hi;
          let m = -Infinity;
          for (const sh of p.closed ? [-p.len, 0, p.len] : [0]) m = Math.max(m, Math.min(s + sh - L, H - (s + sh)));
          const w = ss(m / sig);
          if (w > 0) out.push({ ji, ai, w, m, f: Math.abs(dS(p, arm.s, s)) });
        }
      });
      return out;
    };
    // ∫ over levels t in (0, T] of one side's share, over the holders of weight ≥ t.
    const side = (ha: Held[], hb: Held[], T: number, isA: boolean): number => {
      const lv = [...new Set([...ha, ...hb].map((x) => x.w))].sort((a, b) => a - b);
      let acc = 0;
      let prev = 0;
      for (const l of lv) {
        if (prev >= T) break;
        const top = Math.min(l, T);
        if (top > prev) {
          let fa = -Infinity;
          let fb = -Infinity;
          for (const x of ha) if (x.w >= l) fa = Math.max(fa, x.f);
          for (const x of hb) if (x.w >= l) fb = Math.max(fb, x.f);
          const sA = fa === -Infinity ? 0 : fb === -Infinity ? 1 : ss((fa - fb) / tau + 2);
          const sB = fb === -Infinity ? 0 : fa === -Infinity ? 1 : ss((fb - fa) / tau);
          acc += (top - prev) * (isA ? sA : sB);
        }
        prev = l;
      }
      return acc;
    };
    // The overlap of two tubes crossing at θ reaches h·cot(θ/2) along each
    // pass; then a margin of h (K900: the round cap clears the over pass's
    // border at every θ; passMargin).
    const P = passes.map((ps) => (ps ? { ...ps, near: h / Math.tan(Math.max(ps.th, 1e-3) / 2) + pm * h } : null));
    const cutOf = (x: Held, s: number, near: number): { d: number; c: number } => {
      const arm = scene.junctions[x.ji].arms[x.ai];
      const d = arm.dir * dS(this.polys[this.idxOf.get(arm.chain)!], arm.s, s);
      return { d, c: Math.max(0, d - near) };
    };
    const add = (x: Held, key: number, cx: number, s: number, near: number, w: number) => {
      if (!(w > 0)) return;
      const { d, c } = cutOf(x, s, near);
      const old = cuts[x.ji][x.ai].get(key);
      if (!old || w > old.w) cuts[x.ji][x.ai].set(key, { c, w, d, cx });
    };
    const q1 = new Float64Array(passes.length);
    for (let it = 0; it < 3; it++) {
      const sp = this.rawSpans(ext, caps);
      const conn = connOf(sp);
      P.forEach((ps, cx) => {
        if (!ps || (it > 0 && !(q1[cx] > 0))) return;
        const pad = ps.near - 1e-6 * h;
        const ha = hold(sp, ps.ia, ps.sa, pad);
        const hb = hold(sp, ps.ib, ps.sb, pad);
        if (!ha.length || !hb.length) return;
        if (it === 0) {
          let q = 0;
          for (const a of ha) for (const b of hb) q = Math.max(q, Math.min(a.w, b.w, conn(a.ji, b.ji)));
          q1[cx] = q;
          if (!(q > 0)) return;
          for (const a of ha) add(a, 2 * cx, cx, ps.sa, ps.near, side(ha, hb, Math.min(q, a.w), true));
          for (const b of hb) add(b, 2 * cx + 1, cx, ps.sb, ps.near, side(ha, hb, Math.min(q, b.w), false));
          return;
        }
        // A second visit: the hold left once the pass's own cuts apply.
        const after = (x: Held, key: number, s: number): number => {
          const own = cuts[x.ji][x.ai].get(key)?.w ?? 0;
          const { d, c } = cutOf(x, s, ps.near);
          return (1 - own) * x.w + own * ss(Math.min(x.m, c + pad - d) / sig);
        };
        const xa = ha.map((a) => after(a, 2 * cx, ps.sa));
        const xb = hb.map((b) => after(b, 2 * cx + 1, ps.sb));
        let q = 0;
        ha.forEach((a, i) => hb.forEach((b, k) => (q = Math.max(q, Math.min(xa[i], xb[k], conn(a.ji, b.ji))))));
        if (!(q > 0)) return;
        ha.forEach((a, i) => add(a, 2 * cx, cx, ps.sa, ps.near, Math.min(q, xa[i])));
        hb.forEach((b, k) => add(b, 2 * cx + 1, cx, ps.sb, ps.near, Math.min(q, xb[k])));
      });
      applyCaps();
    }
    // Fit each round corner inside its arms' caps: the tangent point's foot
    // at most cap − W from the root, so r ≤ (cap − W − |V's foot|)·tan(θ/2).
    for (const c of this.corners) {
      const capA = caps[c.junction][c.armIdxA!];
      const capB = caps[c.junction][c.armIdxB!];
      if (!(c.r > 0) || !c.ok) continue;
      const pa = this.polys[c.a];
      const pb = this.polys[c.b];
      const room = () => {
        const vA = Math.abs(dS(pa, c.armA.s, c.sVA));
        const vB = Math.abs(dS(pb, c.armB.s, c.sVB));
        return Math.min(capA - this.W - vA, capB - this.W - vB);
      };
      const over = () =>
        Math.max(Math.abs(dS(pa, c.armA.s, c.sTA)) - (capA - this.W), Math.abs(dS(pb, c.armB.s, c.sTB)) - (capB - this.W));
      // K992 rule 2, the cap stop: a corner whose tangent feet pass cap − W
      // is grown again with its feet held to cap − W (rule 1's stop), so r is
      // the largest ball on V's branch that fits its caps; over() > 0 only
      // skips the corners that stop would not change. It replaces master's
      // over() walk (r −= over·tan(θ/2), six times), whose steps and root
      // changes popped.
      // K992 s2: the cap gate changes only a corner whose feet came within
      // 0.5h of cap − W somewhere on the first march (footMaxA/B); the
      // others keep r, which the gate would return unchanged.
      const fmA = c.footMaxA ?? Math.abs(dS(pa, c.armA.s, c.sTA));
      const fmB = c.footMaxB ?? Math.abs(dS(pb, c.armB.s, c.sTB));
      if (!(Math.max(fmA - (capA - this.W - 0.5 * h), fmB - (capB - this.W - 0.5 * h)) > 0)) continue;
      const why = capA - Math.abs(dS(pa, c.armA.s, c.sTA)) < capB - Math.abs(dS(pb, c.armB.s, c.sTB))
        ? this.armCaps[c.junction][c.armIdxA!].why
        : this.armCaps[c.junction][c.armIdxB!].why;
      const r0 = c.r;
      const fit = this.solveCorner(c.junction, c.index, c.armA, c.a, c.armB, c.b, c.theta, c.style, c.rRule!, c.rRule, capA - this.W, capB - this.W);
      Object.assign(c, { ...fit, cluster: c.cluster, armIdxA: c.armIdxA, armIdxB: c.armIdxB, rRule: c.rRule });
      c.fit = `r ${(r0 / h).toFixed(3)}h → ${(c.r / h).toFixed(3)}h: ${why}${room() <= 0 ? " (no room past V: sharp)" : ""}`;
    }
    for (const c of this.corners) g2Of(c);
    let ext1 = this.armExtents(true);
    // K934: the part walk again at the final caps and corners, so its
    // extents reach the final spans (K922's stopped at the cut loop).
    if (partWalk) ext1 = this.partExtents(ext1, caps, clusterRoots);
    // K909: the walk again at the final caps and corners (the fills it reads).
    if (geo) {
      this.geoGroups = new GeoGroups(this, this.armCaps);
      ext1 = this.geoExtents(this.geoGroups, ext1);
    }
    const out = this.rawSpans(ext1, caps);
    this.junctionSpans = out;
    return out;
  }

  /**
   * K922's part walk, the only extent since K934 (its "span", the corner
   * extent alone, and "partShort", the walk stopped short of crossing cuts,
   * were removed: K934_recount.md Results, step 3). Per arm whose span ends
   * short of its cap, walk on from the span's end in h/8 steps (up to 12h)
   * while some point of its cross-section lies inside another member of its
   * cluster: another arm's span's tube (on the walker's own chain only away
   * from the walker), or a corner fill of the cluster. The parting is then
   * bisected between the last overlapping step and the next (K992 stage 3),
   * and the extent becomes the parting's distance − margin, so the span ends
   * W past the parting; caps clamp it (rawSpans). Spans and clusters are rebuilt
   * and the walk rerun until nothing moves (4 rounds at most).
   */
  private partExtents(
    ext0: Map<string, number>,
    caps: number[][],
    roots: (sp: [number, number, number, number][][]) => number[],
  ): Map<string, number> {
    const h = this.h;
    const scene = this.scene;
    const ext = new Map(ext0);
    const step = h / 8;
    const us = [-0.999, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 0.999].map((u) => u * h);
    const PX = new Float64Array(9);
    const PY = new Float64Array(9);
    this.partMoves = [];
    for (let round = 0; round < 4; round++) {
      const sp = this.rawSpans(ext, caps);
      const rt = roots(sp);
      const wins = new Map<number, [number, number, number, number, number][]>();
      sp.forEach((l, ji) => {
        const w = wins.get(rt[ji]) ?? [];
        for (const [q, lo, hi, ai] of l) w.push([q, lo, hi, ji, ai]);
        wins.set(rt[ji], w);
      });
      const fills = new Map<number, number[]>();
      this.corners.forEach((c, k) => {
        if (!(c.r > 0) || !c.ok) return;
        const f = fills.get(rt[c.junction]) ?? [];
        f.push(k);
        fills.set(rt[c.junction], f);
      });
      // Each fill's box (fillBox), filled as the walk needs it.
      const KB = new Float64Array(4 * this.corners.length);
      const KBset = new Uint8Array(this.corners.length);
      const boxOf = (k: number): number => {
        if (!KBset[k]) {
          KBset[k] = 1;
          this.fillBox(k, KB, 4 * k);
        }
        return 4 * k;
      };
      let moved = false;
      sp.forEach((l, ji) => {
        for (const [pi, lo, hi, ai] of l) {
          const arm = scene.junctions[ji].arms[ai];
          const p = this.polys[pi];
          const key = this.armKey(ji, arm);
          const e0 = arm.dir > 0 ? hi - arm.s : arm.s - lo;
          const cap = caps[ji][ai];
          if (!(e0 < cap - 1e-6 * h)) continue;
          const room = p.closed ? Math.min(cap, p.len / 2) : Math.min(cap, arm.dir > 0 ? p.s0 + p.len - arm.s : arm.s - p.s0);
          const W = wins.get(rt[ji]) ?? [];
          const F = fills.get(rt[ji]) ?? [];
          // K868 S3a4: hits() is the OR of pure tests, so a test skipped
          // where it is known false changes nothing. The cross-section's
          // nine points are computed once (the same expressions as before).
          // A member with no window segment within 2h of a is skipped: the
          // points are within 0.999h of a, so every foot is farther than h.
          // A fill whose box misses the points' box is skipped: inFill is
          // false outside it. A NaN point skips nothing.
          const hits = (t: number): boolean => {
            const s = normS(p, arm.s + arm.dir * t);
            const a = pointAt(p, s);
            let nan = false;
            let bx0 = Infinity;
            let by0 = Infinity;
            let bx1 = -Infinity;
            let by1 = -Infinity;
            for (let i = 0; i < 9; i++) {
              const u = us[i];
              const x = a.x - a.ty * u;
              const y = a.y + a.tx * u;
              PX[i] = x;
              PY[i] = y;
              if (!(x === x && y === y)) nan = true;
              if (x < bx0) bx0 = x;
              if (x > bx1) bx1 = x;
              if (y < by0) by0 = y;
              if (y > by1) by1 = y;
            }
            if (!nan) this.grid.query(a.x, a.y, 2 * h, this.fq2);
            for (const [q, qlo, qhi, qj, qa] of W) {
              if (qj === ji && qa === ai) continue;
              if (q === pi) {
                // The walker is still inside this member's span: in J anyway.
                let inside = false;
                if (!p.closed) inside = s >= qlo && s <= qhi;
                else {
                  const L = p.len;
                  inside = (s - L >= qlo && s - L <= qhi) || (s >= qlo && s <= qhi) || (s + L >= qlo && s + L <= qhi);
                }
                if (inside) return true;
              }
              if (!nan && !this.windowNear(q, qlo, qhi, a.x, a.y, 4 * h * h, this.fq2)) continue;
              for (let i = 0; i < 9; i++) {
                const [d, fs] = this.footNear(q, qlo, qhi, PX[i], PY[i], 1.5 * h);
                if (d < h && (q !== pi || Math.abs(dS(p, fs, s)) > 2 * h)) return true;
              }
            }
            for (const k of F) {
              if (!nan) {
                const o = boxOf(k);
                if (bx1 < KB[o] || bx0 > KB[o + 2] || by1 < KB[o + 1] || by0 > KB[o + 3]) continue;
              }
              for (let i = 0; i < 9; i++) if (this.inFill(k, PX[i], PY[i])) return true;
            }
            return false;
          };
          if (!hits(e0)) continue;
          let last = e0;
          for (let t = e0 + step; t <= Math.min(room, e0 + 12 * h) && t - last < h; t += step) if (hits(t)) last = t;
          // K992 s3: the parting is solved, not stepped. The steps above find
          // the last overlapping one; the next step overlaps nothing (the walk
          // tried it), so the parting lies between them and is bisected to
          // 1e-6h: the reach moves with the geometry, not in h/8 jumps. Where
          // the next step lies past the walk's limit, the limit stands in for
          // it, and a run that overlaps there ends at the limit.
          const lim = Math.min(room, e0 + 12 * h);
          let tIn = last;
          let tOut = Math.min(last + step, lim);
          if (tOut < last + step && hits(tOut)) tIn = tOut;
          while (tOut - tIn > 1e-6 * h) {
            const mid = 0.5 * (tIn + tOut);
            if (hits(mid)) tIn = mid;
            else tOut = mid;
          }
          const part = Math.min(room, tOut);
          const want = part - this.margin;
          const cur = ext.get(key) ?? h;
          if (want > cur + 1e-6 * h) {
            ext.set(key, want);
            moved = true;
            this.partMoves.push({ junction: ji, arm: ai, from: e0, to: Math.min(cap, want + this.W + this.margin), round });
          }
        }
      });
      if (!moved) break;
    }
    return ext;
  }

  /** K922 extent "part": each arm the walk moved, its span's end before and after (arc length from the root). */
  partMoves: { junction: number; arm: number; from: number; to: number; round: number }[] = [];
  /**
   * K909: per arm, the farther of its two sides' extents in the geometric
   * group, and at least the corners' extents (`floor`, armExtents): a side
   * leaves a corner's fill at the fill's tangent point, which the walk's
   * outside point (h + 0.6W out) cannot see, since the fill's outline closes
   * on the side tangentially (it leaves the walk about sqrt(1.2·W·r) early).
   */
  private geoExtents(G: GeoGroups, floor?: Map<string, number>): Map<string, number> {
    const ext = new Map<string, number>(this.params.geoFloor === false ? [] : floor);
    this.scene.junctions.forEach((j, ji) =>
      j.arms.forEach((arm, ai) => {
        const [a, b] = G.sides[ji][ai];
        const k = this.armKey(ji, arm);
        ext.set(k, Math.max(ext.get(k) ?? 0, a, b));
      }),
    );
    return ext;
  }

  // -------------------------------------------------------------------------
  // Corners

  private armDir(p: Poly, arm: SceneArm, ell: number): [number, number] {
    const r0 = pointAt(p, arm.s);
    let s1 = arm.s + arm.dir * ell;
    if (!p.closed) s1 = Math.min(Math.max(s1, p.s0), p.s0 + p.len);
    const r1 = pointAt(p, s1);
    let dx = r1.x - r0.x;
    let dy = r1.y - r0.y;
    const l = Math.hypot(dx, dy);
    if (l < 1e-12) {
      dx = r0.tx * arm.dir;
      dy = r0.ty * arm.dir;
      return [dx, dy];
    }
    return [dx / l, dy / l];
  }

  /** Opening θ from arm A CCW (increasing atan2) to arm B, by chords at ℓ. */
  opening(A: SceneArm, a: number, B: SceneArm, b: number, ell: number): number {
    const ua = this.armDir(this.polys[a], A, ell);
    const ub = this.armDir(this.polys[b], B, ell);
    let t = Math.atan2(ub[1], ub[0]) - Math.atan2(ua[1], ua[0]);
    while (t <= 0) t += TAU;
    while (t > TAU) t -= TAU;
    return t;
  }

  private solveCorner(
    ji: number,
    index: number,
    A: SceneArm,
    a: number,
    B: SceneArm,
    b: number,
    theta: number,
    style: "round" | "sharp",
    r: number,
    /** K992: the windows' radius, the rule's r whatever r the fit or the fold take. */
    rWin = r,
    /** K992: the tangent feet's limits, arc length from the root (cap − W). */
    capLimA = Infinity,
    capLimB = Infinity,
  ): Corner {
    const h = this.h;
    const pa = this.polys[a];
    const pb = this.polys[b];
    const half = theta / 2;
    const reachQ = (h + rWin) / Math.max(Math.sin(half), 1e-3);
    const Lw = Math.min(4 * h + 2 * reachQ, 1e6);
    // S2: each window covers its own arm only, from just behind the root
    // outward. A two-sided window let the feet jump to the chain's other
    // arm, or to another pass of the chain looping back near the corner
    // (S1b's failed q solves on muse_hash).
    const back = this.params.cornerBack ?? 0.25 * h;
    const side = (arm: SceneArm): [number, number] => (arm.dir > 0 ? [arm.s - back, arm.s + Lw] : [arm.s - Lw, arm.s + back]);
    const winA: [number, number] = this.params.cornerTwoSided ? [A.s - Lw, A.s + Lw] : side(A);
    const winB: [number, number] = this.params.cornerTwoSided ? [B.s - Lw, B.s + Lw] : side(B);
    const ua = this.armDir(pa, A, this.params.openingChord ?? 2 * h);
    const root = pointAt(pa, A.s);
    const ca = Math.cos(half);
    const sa = Math.sin(half);
    const bis: [number, number] = [ua[0] * ca - ua[1] * sa, ua[0] * sa + ua[1] * ca];
    type Sol = { x: number; y: number; res: number; fa: number; fb: number; sA: number; sB: number; ok: boolean };
    // S2: Newton from the bisector guess first, then from guesses nearer and
    // farther along the bisector (a stall between two segments' feet or on
    // the medial axis does not survive a different start).
    const solve = (delta: number): Sol => {
      let best: Sol | undefined;
      const take = (s: Sol): boolean => {
        if (!best || s.res < best.res) best = s;
        return s.ok;
      };
      for (const k of this.params.cornerTwoSided ? [1] : [1, 0.7, 1.4, 0.5, 2, 0.35, 3]) {
        const d = (k * delta) / Math.max(sa, 1e-3);
        if (take(newton(delta, root.x + bis[0] * d, root.y + bis[1] * d))) return best!;
      }
      if (this.params.cornerTwoSided) return best!;
      // Last resort: march out along arm A's wedge-side offset at δ and
      // bracket a sign change of d_B − δ, then polish with Newton.
      const n = Math.ceil(Math.min(Lw, 64 * h) / (0.05 * h));
      let prev = NaN;
      let prevU = 0;
      for (let i = 0; i <= n; i++) {
        const u = (i / n) * Math.min(Lw, 64 * h);
        const at = (uu: number): [number, number, number] => {
          const pt = pointAt(pa, A.s + A.dir * uu);
          const nx = -pt.ty * A.dir;
          const ny = pt.tx * A.dir;
          const px = pt.x + nx * delta;
          const py = pt.y + ny * delta;
          return [px, py, footInWindow(pb, px, py, winB[0], winB[1]).d - delta];
        };
        const [, , g] = at(u);
        if (i > 0 && Number.isFinite(prev) && Math.sign(g) !== Math.sign(prev)) {
          let lo = prevU;
          let hi = u;
          let glo = prev;
          for (let it = 0; it < 50; it++) {
            const mid = (lo + hi) / 2;
            const gm = at(mid)[2];
            if (Math.sign(gm) === Math.sign(glo)) {
              lo = mid;
              glo = gm;
            } else hi = mid;
          }
          const [px, py] = at((lo + hi) / 2);
          if (take(newton(delta, px, py))) return best!;
        }
        prev = g;
        prevU = u;
      }
      return best!;
    };
    const newton = (delta: number, x0: number, y0: number, limit?: number, its = 200): Sol => {
      let x = x0;
      let y = y0;
      let ok = false;
      let fA = footInWindow(pa, x, y, winA[0], winA[1]);
      let fB = footInWindow(pb, x, y, winB[0], winB[1]);
      for (let it = 0; it < its; it++) {
        const ra = fA.d - delta;
        const rb = fB.d - delta;
        if (Math.abs(ra) < 1e-12 * Math.max(1, delta) && Math.abs(rb) < 1e-12 * Math.max(1, delta)) {
          ok = true;
          break;
        }
        const nax = (x - fA.x) / fA.d;
        const nay = (y - fA.y) / fA.d;
        const nbx = (x - fB.x) / fB.d;
        const nby = (y - fB.y) / fB.d;
        const det = nax * nby - nay * nbx;
        if (Math.abs(det) < 1e-12) break;
        let dx = (-ra * nby + rb * nay) / det;
        let dy = (-nax * rb + nbx * ra) / det;
        const dl = Math.hypot(dx, dy);
        const lim = limit ?? 0.5 * Math.max(delta, h);
        if (dl > lim) {
          dx *= lim / dl;
          dy *= lim / dl;
        }
        x += dx;
        y += dy;
        fA = footInWindow(pa, x, y, winA[0], winA[1]);
        fB = footInWindow(pb, x, y, winB[0], winB[1]);
      }
      const res = Math.max(Math.abs(fA.d - delta), Math.abs(fB.d - delta));
      if (res < 1e-9 * Math.max(1, delta)) ok = true;
      return { x, y, res, fa: 0, fb: 0, sA: fA.s, sB: fB.s, ok };
    };
    // K992 s3: the tangent feet are tracked, not chosen. A tracked foot is
    // the nearest point of its arm within h/32 of the last one, the window
    // re-centred while the foot sits on its edge: a descent that follows one
    // local minimum of |q − arm| and never jumps to another part of the arm
    // that comes as near (there the nearest point flips between two
    // contacts as q crosses the tie). Arc lengths stay in the window's
    // domain (unwrap), so a closed chain's seam does not move them.
    const unwrap = (p: Poly, s: number, win: [number, number]): number => {
      if (!p.closed) return s;
      let best = s;
      let bd = Infinity;
      for (let m = -2; m <= 2; m++) {
        const t = s + m * p.len;
        const e = t < win[0] ? win[0] - t : t > win[1] ? t - win[1] : 0;
        if (e < bd) {
          bd = e;
          best = t;
        }
      }
      return best;
    };
    const footLocal = (p: Poly, x: number, y: number, s0: number, win: [number, number]): ReturnType<typeof footInWindow> & { u: number } => {
      const w = h / 32;
      let s = Math.min(Math.max(s0, win[0]), win[1]);
      for (let it = 0; ; it++) {
        const lo = Math.max(win[0], s - w);
        const hi = Math.min(win[1], s + w);
        const f = footInWindow(p, x, y, lo, hi);
        const u = s + dS(p, s, f.s);
        const edge = (u <= lo + 1e-9 * h && lo > win[0]) || (u >= hi - 1e-9 * h && hi < win[1]);
        if (!edge || it >= 4096 || Math.abs(u - s) <= 1e-12 * h) return { ...f, u };
        s = u;
      }
    };
    // Newton on |q − tracked foot| = δ on both arms, each foot carried from
    // iterate to iterate.
    const newtonT = (delta: number, x0: number, y0: number, sA0: number, sB0: number, limit?: number, its = 200): Sol => {
      let x = x0;
      let y = y0;
      let ok = false;
      let fA = footLocal(pa, x, y, sA0, winA);
      let fB = footLocal(pb, x, y, sB0, winB);
      for (let it = 0; it < its; it++) {
        const ra = fA.d - delta;
        const rb = fB.d - delta;
        if (Math.abs(ra) < 1e-12 * Math.max(1, delta) && Math.abs(rb) < 1e-12 * Math.max(1, delta)) {
          ok = true;
          break;
        }
        const nax = (x - fA.x) / fA.d;
        const nay = (y - fA.y) / fA.d;
        const nbx = (x - fB.x) / fB.d;
        const nby = (y - fB.y) / fB.d;
        const det = nax * nby - nay * nbx;
        if (Math.abs(det) < 1e-12) break;
        let dx = (-ra * nby + rb * nay) / det;
        let dy = (-nax * rb + nbx * ra) / det;
        const dl = Math.hypot(dx, dy);
        const lim = limit ?? 0.5 * Math.max(delta, h);
        if (dl > lim) {
          dx *= lim / dl;
          dy *= lim / dl;
        }
        x += dx;
        y += dy;
        fA = footLocal(pa, x, y, fA.u, winA);
        fB = footLocal(pb, x, y, fB.u, winB);
      }
      const res = Math.max(Math.abs(fA.d - delta), Math.abs(fB.d - delta));
      if (res < 1e-9 * Math.max(1, delta)) ok = true;
      return { x, y, res, fa: 0, fb: 0, sA: fA.u, sB: fB.u, ok };
    };
    const v = solve(h);
    const c: Corner = {
      junction: ji,
      index,
      cluster: -1,
      armA: A,
      armB: B,
      a,
      b,
      theta,
      style,
      r,
      ok: v.ok,
      V: [v.x, v.y],
      q: [v.x, v.y],
      tA: [v.x, v.y],
      tB: [v.x, v.y],
      sTA: v.sA,
      sTB: v.sB,
      sVA: v.sA,
      sVB: v.sB,
      winA,
      winB,
      uA: [0, 0],
      uB: [0, 0],
      vq: 0,
      resV: v.res,
      resQ: 0,
      rRule: rWin,
    };
    if (!v.ok) {
      // S2: no V when the two centrelines stay closer than 2h all along
      // arm A: the tubes overlap there and the outlines never meet on the
      // wedge side (the wedge is ink; the corner draws nothing).
      const roomA = pa.closed ? Lw : Math.min(Lw, A.dir > 0 ? pa.s0 + pa.len - A.s : A.s - pa.s0);
      let maxGap = 0;
      for (let u = 0; u <= roomA; u += 0.05 * h) {
        const pt = pointAt(pa, A.s + A.dir * u);
        maxGap = Math.max(maxGap, footInWindow(pb, pt.x, pt.y, winB[0], winB[1]).d);
      }
      if (maxGap < 2 * h) {
        // K883 (§3.8): the corner with no V draws the union of its two arms
        // as far as they overlap: no fill, no round, and its arms' spans
        // reach arm A's far end and that point's foot on arm B.
        const far = pointAt(pa, A.s + A.dir * roomA);
        c.noV = true;
        c.noVA = A.s + A.dir * roomA;
        c.noVB = footInWindow(pb, far.x, far.y, winB[0], winB[1]).s;
      }
      this.diagnostics.push(
        `corner j${ji}/${index}: V solve residual ${v.res.toExponential(2)}` +
          (maxGap < 2 * h ? ` (no V: the arms stay closer than 2h along arm A's ${fmtH(roomA, h)}, max gap ${fmtH(maxGap, h)})` : ""),
      );
    }
    if (r > 0) {
      // K992 rule 1, the grown ball: q is V's root continued along the
      // medial axis as the ball grows from δ = h to h + r, and the ball stops
      // early where its branch turns steep (den = 1 + nA·nB below 0.5 of
      // its value at V) or a tangent foot passes its limit (the cap stop).
      // Each step predicts along u (nA·u = nB·u = 1, |u| = sqrt(2/den), q's
      // speed per unit of δ) and polishes with Newton held near the
      // prediction; a miss, or a step past a stop, halves the step, so each
      // stop is located to 1e-5 h. No other root is a candidate, so q cannot
      // switch branch, and q's speed at a stop is bounded (a stop at the fold
      // itself, where |u| has no bound, jumped with every step halving).
      let qq: Sol;
      if (v.ok) {
        let cur: Sol = v;
        // K992 s2, the continuous stops: the ball grows by the measure of
        // V's branch that passes both tests, read as a running minimum, so
        // r = ∫ S dδ over δ from h to h + r, S = min over [h, δ] of
        // w = ss((den/den(V) − 0.3)/0.4) · ss(slack/0.5h): the steep gate
        // (den = 1 + nA·nB; |u| = sqrt(2/den) is q's speed per unit of δ) and
        // the cap gate (slack = cap − W − |foot|, the smaller of the two
        // arms). Both tests read continuous quantities, the running minimum
        // and the integral keep r continuous and monotone in them, and no
        // first crossing is taken.
        // K992 s3: den from the tracked feet, and the overlap gate. ov is how
        // much nearer to q the nearest point of either arm's window is than
        // its tracked contact (0 until another part of the arm comes as near):
        // the ball stops over ov from 0 to 0.05h instead of a foot jumping
        // there.
        const denT = (p: Sol): number => {
          const gA = pointAt(pa, p.sA);
          const gB = pointAt(pb, p.sB);
          const ax = p.x - gA.x;
          const ay = p.y - gA.y;
          const bx = p.x - gB.x;
          const by = p.y - gB.y;
          return 1 + (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by));
        };
        const ovAt = (p: Sol): number => {
          const gA = pointAt(pa, p.sA);
          const gB = pointAt(pb, p.sB);
          const oA = Math.hypot(p.x - gA.x, p.y - gA.y) - footInWindow(pa, p.x, p.y, winA[0], winA[1]).d;
          const oB = Math.hypot(p.x - gB.x, p.y - gB.y) - footInWindow(pb, p.x, p.y, winB[0], winB[1]).d;
          return Math.max(0, oA, oB);
        };
        const vt: Sol = { ...v, sA: unwrap(pa, v.sA, winA), sB: unwrap(pb, v.sB, winB) };
        cur = vt;
        const denV = denT(vt);
        const ss = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
        const footA = (p: Sol): number => Math.abs(dS(pa, A.s, p.sA));
        const footB = (p: Sol): number => Math.abs(dS(pb, B.s, p.sB));
        const wAt = (p: Sol): number => {
          const gs = ss(1 - ovAt(p) / (0.05 * h)) * ss((denT(p) / denV - 0.3) / 0.4);
          const slack = Math.min(capLimA - footA(p), capLimB - footB(p));
          return slack === Infinity ? gs : gs * ss(slack / (0.5 * h));
        };
        // The branch from δ = d0 to dT: each step predicts along u and
        // polishes with Newton held near the prediction; a miss halves it.
        const advance = (from: Sol, d0: number, dT: number, st0: number): Sol | null => {
          let p = from;
          let dc = d0;
          let st = st0;
          while (dT - dc > 1e-12 * dT) {
            const d1 = Math.min(dT, dc + st);
            const dd = d1 - dc;
            const fA = footLocal(pa, p.x, p.y, p.sA, winA);
            const fB = footLocal(pb, p.x, p.y, p.sB, winB);
            const nax = (p.x - fA.x) / fA.d;
            const nay = (p.y - fA.y) / fA.d;
            const nbx = (p.x - fB.x) / fB.d;
            const nby = (p.y - fB.y) / fB.d;
            const den = 1 + nax * nbx + nay * nby;
            let next: Sol | null = null;
            if (den > 1e-9) {
              const ux = (nax + nbx) / den;
              const uy = (nay + nby) / den;
              const gx = p.x + ux * dd;
              const gy = p.y + uy * dd;
              const acc = Math.min(h, Math.max(0.5 * Math.hypot(ux, uy) * dd, 1e-3 * h));
              const n = newtonT(d1, gx, gy, p.sA, p.sB, acc, 60);
              if (n.ok && Math.hypot(n.x - gx, n.y - gy) <= acc) next = n;
            }
            if (next) {
              p = next;
              dc = d1;
              st = Math.min(st0, 2 * st);
            } else {
              st /= 2;
              if (st < 1e-5 * h) return null;
            }
          }
          return p;
        };
        // K992 s4: S by construction. S at the fixed node h + k·dN is the
        // minimum of w over [h, h + k·dN], certified to 0.0001: between two
        // evaluated points w has a lower bound from bounds on its inputs (den
        // moves at most 2(2 − den)/δ per unit of δ, since a vertex foot turns
        // its normal at tan(φ/2)/δ; a foot moves at most tan(φ/2) =
        // sqrt(2/den − 1); the overlap margin at most |u| + 1; an interval
        // whose ends differ by more, a foot's hop at a concave vertex, takes
        // their difference), and only an interval whose bound falls below the
        // running minimum by more than 0.0001 is halved, down to 1e-6h. Where
        // the points fall decides nothing: each node's S is the minimum to
        // within 0.0001, the trapezoid over the fixed nodes is continuous in
        // it, and a fold is located to 1e-6h. footMaxA/B are upper bounds of
        // each foot over the stretch the march covered, so the cap refit runs
        // wherever the cap gate could move r and skipping it changes nothing.
        const dN = r / 32;
        const FLOOR = 1e-6 * h;
        // The overlap margin: how much farther from q than the tracked
        // contact the nearest point of the window outside the contact's basin
        // is. The basin is the run of the arm around the contact over which
        // the distance to q rises (it ends at a vertex where the distance
        // starts to fall); ov = max(0, −margin).
        const margin = (pl: Poly, x: number, y: number, sf: number, win: [number, number], dc: number): number => {
          const f0 = pointAt(pl, sf);
          const base = sf - normS(pl, sf);
          let hi = win[1];
          let k = f0.k;
          let bk = base;
          for (let it = 0; it <= pl.nseg; it++) {
            const sv = bk + pl.s[k] + pl.segLen[k];
            if (sv >= win[1]) break;
            let k2 = k + 1;
            let b2 = bk;
            if (k2 >= pl.nseg) {
              if (!pl.closed) break;
              k2 = 0;
              b2 = bk + pl.len;
            }
            const e = segB(pl, k2);
            if ((pl.x[k2] - x) * (pl.x[e] - pl.x[k2]) + (pl.y[k2] - y) * (pl.y[e] - pl.y[k2]) < 0) {
              hi = sv;
              break;
            }
            k = k2;
            bk = b2;
          }
          let lo = win[0];
          k = f0.k;
          bk = base;
          for (let it = 0; it <= pl.nseg; it++) {
            const sv = bk + pl.s[k];
            if (sv <= win[0]) break;
            let k2 = k - 1;
            let b2 = bk;
            if (k2 < 0) {
              if (!pl.closed) break;
              k2 = pl.nseg - 1;
              b2 = bk - pl.len;
            }
            if ((pl.x[k] - x) * (pl.x[k2] - pl.x[k]) + (pl.y[k] - y) * (pl.y[k2] - pl.y[k]) < 0) {
              lo = sv;
              break;
            }
            k = k2;
            bk = b2;
          }
          let d2 = Infinity;
          if (lo > win[0]) d2 = footInWindow(pl, x, y, win[0], lo).d;
          if (hi < win[1]) d2 = Math.min(d2, footInWindow(pl, x, y, hi, win[1]).d);
          return d2 - dc;
        };
        type Pt = { p: Sol; d: number; w: number; den: number; fA: number; fB: number; mA: number; mB: number; kA: number; tA: number; kB: number; tB: number };
        const at = (p: Sol, d: number): Pt => {
          const gA = pointAt(pa, p.sA);
          const gB = pointAt(pb, p.sB);
          const ax = p.x - gA.x;
          const ay = p.y - gA.y;
          const bx = p.x - gB.x;
          const by = p.y - gB.y;
          const dA = Math.hypot(ax, ay);
          const dB = Math.hypot(bx, by);
          const den = 1 + (ax * bx + ay * by) / (dA * dB);
          const mA = margin(pa, p.x, p.y, p.sA, winA, dA);
          const mB = margin(pb, p.x, p.y, p.sB, winB, dB);
          const fA = footA(p);
          const fB = footB(p);
          const slack = Math.min(capLimA - fA, capLimB - fB);
          let w = ss(1 + Math.min(0, mA, mB) / (0.05 * h)) * ss((den / denV - 0.3) / 0.4);
          if (slack !== Infinity) w *= ss(slack / (0.5 * h));
          return { p, d, w, den, fA, fB, mA, mB, kA: gA.k, tA: gA.t, kB: gB.k, tB: gB.t };
        };
        // The lower bound over [f0's δ, f1's δ] (length D) of a function
        // that moves at most L per unit of δ, or at most as far as its ends
        // differ where they differ by more.
        const vb = (f0: number, f1: number, L: number, D: number): number =>
          f0 === Infinity || f1 === Infinity ? Math.min(f0, f1) - L * D : 0.5 * (f0 + f1) - 0.5 * Math.max(L * D, Math.abs(f1 - f0));
        // A foot on one segment's interior at both ends stays on it (it moves
        // along the arm at a constant rate there): its normal is fixed and the
        // foot linear in δ. Only a foot at a vertex turns its normal.
        const inner = (t: number): boolean => t > 1e-9 && t < 1 - 1e-9;
        const bounds = (a: Pt, b: Pt): { w: number; fA: number; fB: number } => {
          const D = b.d - a.d;
          const segA = a.kA === b.kA && inner(a.tA) && inner(b.tA) && Math.abs(b.p.sA - a.p.sA) < pa.segLen[a.kA];
          const segB_ = a.kB === b.kB && inner(a.tB) && inner(b.tB) && Math.abs(b.p.sB - a.p.sB) < pb.segLen[a.kB];
          const nRot = (segA ? 0 : 1) + (segB_ ? 0 : 1);
          const den1 = vb(a.den, b.den, (2 * nRot) / a.d, D);
          const denLo = Math.max(1e-9, vb(a.den, b.den, (nRot * (2 - Math.max(0, den1))) / a.d, D));
          const U = Math.sqrt(2 / denLo);
          const Lf = Math.sqrt(Math.max(0, 2 / denLo - 1));
          const mLo = Math.min(vb(a.mA, b.mA, U + 1, D), vb(a.mB, b.mB, U + 1, D));
          const fA = segA ? Math.max(a.fA, b.fA) : -vb(-a.fA, -b.fA, Lf, D);
          const fB = segB_ ? Math.max(a.fB, b.fB) : -vb(-a.fB, -b.fB, Lf, D);
          let w = ss(1 + Math.min(0, mLo) / (0.05 * h)) * ss((denLo / denV - 0.3) / 0.4);
          const slack = Math.min(capLimA - fA, capLimB - fB);
          if (slack !== Infinity) w *= ss(slack / (0.5 * h));
          return { w, fA, fB };
        };
        // The minimum of w over [a, b] where it is below inc, to within 0.0001.
        const minOn = (a: Pt, b: Pt, inc: number): number => {
          let m = Math.min(inc, b.w);
          const st: Pt[] = [a, b];
          while (st.length) {
            const rt = st.pop()!;
            const lf = st.pop()!;
            if (rt.d - lf.d <= FLOOR || bounds(lf, rt).w >= m - 0.0001) continue;
            const dm = 0.5 * (lf.d + rt.d);
            const pm = advance(lf.p, lf.d, dm, dm - lf.d);
            if (!pm) continue;
            const M = at(pm, dm);
            if (M.w < m) m = M.w;
            st.push(M, rt, lf, M);
          }
          return m;
        };
        let P0 = at(vt, h);
        let S = P0.w;
        let area = 0;
        const nodes: Sol[] = [vt];
        const nodeD: number[] = [h];
        let fmA = P0.fA;
        let fmB = P0.fB;
        for (let k = 1; k <= 32 && S > 0; k++) {
          const d0 = h + (k - 1) * dN;
          const d1 = h + k * dN;
          const p1 = advance(P0.p, d0, d1, dN);
          let P1: Pt;
          if (p1) P1 = at(p1, d1);
          else {
            // The branch folds: its last point, located to 1e-6h.
            P1 = P0;
            let hiD = d1;
            while (hiD - P1.d > FLOOR) {
              const dm = 0.5 * (P1.d + hiD);
              const pm = advance(P1.p, P1.d, dm, dm - P1.d);
              if (pm) P1 = at(pm, dm);
              else hiD = dm;
            }
          }
          const fb = bounds(P0, P1);
          fmA = Math.max(fmA, fb.fA);
          fmB = Math.max(fmB, fb.fB);
          const S1 = minOn(P0, P1, S);
          area += 0.5 * (S + S1) * (P1.d - d0);
          S = S1;
          if (!p1) {
            c.fold = P1.d;
            break;
          }
          nodes.push(P1.p);
          nodeD.push(d1);
          P0 = P1;
        }
        c.footMaxA = fmA;
        c.footMaxB = fmB;
        // q: the branch point at δ* = h + area, from the last node below it.
        let iq = 0;
        while (iq + 1 < nodes.length && nodeD[iq + 1] <= h + area) iq++;
        qq = advance(nodes[iq], nodeD[iq], h + area, dN) ?? nodes[iq];
        r = area;
        c.r = r;
      } else qq = solve(h + r);
      c.ok = c.ok && qq.ok;
      c.resQ = qq.res;
      if (!qq.ok) {
        // S2: name the corners that have no ball. The ball of radius r
        // touches straight arms ℓ = r·cot(θ/2) out from the root; an open
        // arm shorter than that (its chain ends first) cannot hold it.
        const room = (p: Poly, arm: SceneArm) => (p.closed ? Infinity : arm.dir > 0 ? p.s0 + p.len - arm.s : arm.s - p.s0);
        const need = r / Math.tan(half);
        const short = [room(pa, A), room(pb, B)].map((x, i) => (x < need ? `arm ${"AB"[i]} ends ${fmtH(x, h)} from the root` : ""));
        const why = short.filter(Boolean).join(", ");
        this.diagnostics.push(
          `corner j${ji}/${index}: q solve residual ${qq.res.toExponential(2)}` +
            (why ? ` (no ball: ${why}, the ball needs ${fmtH(need, h)})` : ""),
        );
      }
      c.q = [qq.x, qq.y];
      // K992 s3: the tangent feet are the contacts the branch tracked to q
      // (a local descent from q's own), not a fresh nearest point: q can sit
      // where another part of an arm is as near (F1, F2).
      const fA = footLocal(pa, qq.x, qq.y, unwrap(pa, qq.sA, winA), winA);
      const fB = footLocal(pb, qq.x, qq.y, unwrap(pb, qq.sB, winB), winB);
      c.tA = [fA.x + ((qq.x - fA.x) * h) / fA.d, fA.y + ((qq.y - fA.y) * h) / fA.d];
      c.tB = [fB.x + ((qq.x - fB.x) * h) / fB.d, fB.y + ((qq.y - fB.y) * h) / fB.d];
      c.sTA = fA.s;
      c.sTB = fB.s;
      c.uA = [c.tA[0] - qq.x, c.tA[1] - qq.y];
      c.uB = [c.tB[0] - qq.x, c.tB[1] - qq.y];
      c.vq = Math.hypot(c.V[0] - qq.x, c.V[1] - qq.y);
    }
    return c;
  }

  /**
   * S2 (§3.7): a G2 candidate for a solved round corner. The joins sit on
   * the side outlines at centreline arc lengths sA = sTA + dirA·σ and
   * sB = sTB + dirB·σ (the same σ on both arms). "tangent": σ = 0, G1's own
   * tangent points. "inset": σ by bisection so the curve crosses the ray
   * V→q at G1's apex inset vq − r. Side curvature: the circle through the
   * centreline at s − kWin, s, s + kWin (kWin = h), offset by h.
   */
  /**
   * A corner's side outline at centreline arc length s of arm A or B: the
   * point, the travel tangent (in along A, out along B, the hole on the
   * right) and the signed curvature (+ left), from the circle through the
   * centreline at s − h, s, s + h, offset by h. Sheet E's combs read it too.
   */
  outlineEnd(c: Corner, side: "A" | "B", s: number): CornerEnd {
    const h = this.h;
    const kWin = h;
    const p = side === "A" ? this.polys[c.a] : this.polys[c.b];
    const d = side === "A" ? c.armA.dir : c.armB.dir;
    const P0 = pointAt(p, normS(p, s - kWin));
    const P1 = pointAt(p, normS(p, s));
    const P2 = pointAt(p, normS(p, s + kWin));
    const ax = P1.x - P0.x;
    const ay = P1.y - P0.y;
    const bx = P2.x - P1.x;
    const by = P2.y - P1.y;
    const den = Math.hypot(ax, ay) * Math.hypot(bx, by) * Math.hypot(P2.x - P0.x, P2.y - P0.y);
    const ko = d * (den > 1e-300 ? (2 * cross(ax, ay, bx, by)) / den : 0);
    const at = P1;
    // The outline is the centreline offset h to the left of A's outgoing
    // direction (travel runs the other way), and to the right of B's.
    if (side === "A") return { p: [at.x - h * d * at.ty, at.y + h * d * at.tx], t: [-d * at.tx, -d * at.ty], k: -ko / (1 - h * ko) };
    return { p: [at.x + h * d * at.ty, at.y - h * d * at.tx], t: [d * at.tx, d * at.ty], k: ko / (1 + h * ko) };
  }

  private buildCornerG2(c: Corner, kind: G2Kind, size: "inset" | "tangent", forceSigma?: number): G2Corner {
    const h = this.h;
    const pa = this.polys[c.a];
    const pb = this.polys[c.b];
    const A = c.armA;
    const B = c.armB;
    const kWin = h;
    const endA = (s: number): CornerEnd => this.outlineEnd(c, "A", s);
    const endB = (s: number): CornerEnd => this.outlineEnd(c, "B", s);
    const ux = (c.q[0] - c.V[0]) / c.vq;
    const uy = (c.q[1] - c.V[1]) / c.vq;
    const insetG1 = c.vq - c.r;
    const make = (sig: number) => {
      const sA = c.sTA + A.dir * sig;
      const sB = c.sTB + B.dir * sig;
      const ea = endA(sA);
      const eb = endB(sB);
      return { sig, sA, sB, ea, eb, curve: buildG2(kind, ea, eb) };
    };
    const insetOf = (m: ReturnType<typeof make>) => (m.curve.x.length > 1 ? rayHit(m.curve, c.V[0], c.V[1], ux, uy) : NaN);
    let m = make(forceSigma ?? 0);
    let note = "";
    if (size === "inset" && m.curve.ok && forceSigma === undefined) {
      const room = (p: Poly, arm: SceneArm, s: number) => (p.closed ? Infinity : arm.dir > 0 ? p.s0 + p.len - s : s - p.s0);
      const web = Math.hypot(c.tA[0] - c.V[0], c.tA[1] - c.V[1]);
      const sMax = Math.min(room(pa, A, c.sTA), room(pb, B, c.sTB), 4 * web + 2 * h);
      const i0 = insetOf(m);
      if (!(i0 < insetG1)) note = `inset ${fmtH(i0, h)} ≥ G1's already at G1's tangent points`;
      else {
        // March σ out in h/8 steps to the first built curve whose inset
        // reaches G1's, then bisect that step. (A single bracket over the
        // whole arm room fails on curved arms: far out the arms turn away
        // and the curve no longer builds.)
        const step = h / 8;
        let lo = 0;
        let hi = NaN;
        for (let sg = step; sg <= sMax + 1e-12; sg += step) {
          const mm = make(sg);
          if (!mm.curve.ok) break;
          if (insetOf(mm) >= insetG1) {
            hi = sg;
            break;
          }
          lo = sg;
        }
        if (!Number.isFinite(hi)) {
          m = make(lo);
          note = `inset not reached: ${fmtH(insetOf(m), h)} < ${fmtH(insetG1, h)} at σ ${fmtH(lo, h)} (arm room ${fmtH(sMax, h)})`;
        } else {
          for (let it = 0; it < 40; it++) {
            const mid = (lo + hi) / 2;
            const mm = make(mid);
            if (mm.curve.ok && insetOf(mm) < insetG1) lo = mid;
            else hi = mid;
          }
          // On a polyline side the end tangent steps at each vertex (by
          // ds/R), so inset(σ) can jump there: take the closer bracket end.
          const mLo = make(lo);
          const mHi = make(hi);
          const eLo = mLo.curve.ok ? Math.abs(insetOf(mLo) - insetG1) : Infinity;
          const eHi = Math.abs(insetOf(mHi) - insetG1);
          m = eLo < eHi ? mLo : mHi;
          const miss = Math.min(eLo, eHi);
          if (miss > 1e-6 * h) note = `inset matched within ${fmtH(miss, h)} (the side polyline's tangent steps at a vertex)`;
        }
      }
    }
    const cv = m.curve;
    const ok = cv.ok && cv.x.length > 1;
    const n = cv.x.length;
    // Clearance against each centreline over the curve's interior.
    const ext = (w: [number, number], dir: number, sig: number): [number, number] =>
      dir > 0 ? [w[0], w[1] + sig + h] : [w[0] - sig - h, w[1]];
    const wa = ext(c.winA, A.dir, m.sig);
    const wb = ext(c.winB, B.dir, m.sig);
    let clearA = Infinity;
    let clearB = Infinity;
    for (let i = 1; i + 1 < n; i++) {
      clearA = Math.min(clearA, footInWindow(pa, cv.x[i], cv.y[i], wa[0], wa[1]).d - h);
      clearB = Math.min(clearB, footInWindow(pb, cv.x[i], cv.y[i], wb[0], wb[1]).d - h);
    }
    let peak = 0;
    for (const k of cv.k) peak = Math.max(peak, Math.abs(k));
    // G1's joins: the arc (curvature −1/r in travel) against the sides at
    // G1's own tangent points.
    const g1a = endA(c.sTA);
    const g1b = endB(c.sTB);
    // The fill polygon.
    const poly: number[] = [c.V[0], c.V[1]];
    const NS = 24;
    const dA = dS(pa, c.sVA, m.sA);
    for (let i = 1; i <= NS; i++) {
      const e = endA(c.sVA + (dA * i) / NS);
      poly.push(e.p[0], e.p[1]);
    }
    for (let i = 1; i < n; i++) poly.push(cv.x[i], cv.y[i]);
    const dB = dS(pb, m.sB, c.sVB);
    for (let i = 1; i < NS; i++) {
      const e = endB(m.sB + (dB * i) / NS);
      poly.push(e.p[0], e.p[1]);
    }
    const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i < poly.length; i += 2) {
      box[0] = Math.min(box[0], poly[i]);
      box[1] = Math.min(box[1], poly[i + 1]);
      box[2] = Math.max(box[2], poly[i]);
      box[3] = Math.max(box[3], poly[i + 1]);
    }
    return {
      kind,
      size,
      ok,
      curve: cv,
      sA: m.sA,
      sB: m.sB,
      sigma: m.sig,
      endA: m.ea,
      endB: m.eb,
      kWin,
      jumpA: ok ? Math.abs(cv.k[0] - m.ea.k) : NaN,
      jumpB: ok ? Math.abs(cv.k[n - 1] - m.eb.k) : NaN,
      jumpG1A: Math.abs(-1 / c.r - g1a.k),
      jumpG1B: Math.abs(-1 / c.r - g1b.k),
      peak,
      inset: ok ? insetOf(m) : NaN,
      insetG1,
      webA: Math.hypot(m.ea.p[0] - c.V[0], m.ea.p[1] - c.V[1]),
      webB: Math.hypot(m.eb.p[0] - c.V[0], m.eb.p[1] - c.V[1]),
      clearA,
      clearB,
      humpFall: ok ? humpFall(cv, -1) : NaN,
      poly,
      box,
      note: [note, cv.note ?? ""].filter(Boolean).join("; "),
    };
  }

  /**
   * K868 S3a4: corner ci's box [x0, y0, x1, y1] into out at o; inFill is
   * false outside it (a G2 fill's own box test; else the wedge's reach from
   * q, vq + h, padded for rounding; a corner with no fill: an empty box).
   */
  fillBox(ci: number, out: Float64Array, o: number): void {
    const c = this.corners[ci];
    if (c.r <= 0 || !c.ok) {
      out[o] = Infinity;
      out[o + 1] = Infinity;
      out[o + 2] = -Infinity;
      out[o + 3] = -Infinity;
    } else if (c.g2?.ok) {
      out[o] = c.g2.box[0];
      out[o + 1] = c.g2.box[1];
      out[o + 2] = c.g2.box[2];
      out[o + 3] = c.g2.box[3];
    } else {
      const R = (c.vq + this.h) * (1 + 1e-9) + 1e-9;
      out[o] = c.q[0] - R;
      out[o + 1] = c.q[1] - R;
      out[o + 2] = c.q[0] + R;
      out[o + 3] = c.q[1] + R;
    }
  }

  /** Is (x, y) inside corner c's fill: the curvilinear triangle V, t_A, t_B? */
  inFill(ci: number, x: number, y: number): boolean {
    const c = this.corners[ci];
    if (c.r <= 0 || !c.ok) return false;
    const g = c.g2;
    if (g?.ok) {
      // S2: the G2 fill, V to the curve between the two outlines (even-odd).
      if (x < g.box[0] || y < g.box[1] || x > g.box[2] || y > g.box[3]) return false;
      const P = g.poly;
      let inside = false;
      for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) {
        const yi = P[i + 1];
        const yj = P[j + 1];
        if (yi > y !== yj > y && x < ((P[j] - P[i]) * (y - yi)) / (yj - yi) + P[i]) inside = !inside;
      }
      return inside;
    }
    const vx = x - c.q[0];
    const vy = y - c.q[1];
    const dq = Math.hypot(vx, vy);
    if (dq < c.r || dq > c.vq + this.h) return false;
    const sg = Math.sign(cross(c.uA[0], c.uA[1], c.uB[0], c.uB[1]));
    if (cross(c.uA[0], c.uA[1], vx, vy) * sg < 0) return false;
    if (cross(vx, vy, c.uB[0], c.uB[1]) * sg < 0) return false;
    // Wedge side of each arm: left of A's outgoing direction, right of B's.
    const pa = this.polys[c.a];
    const fa = footInWindow(pa, x, y, c.winA[0], c.winA[1]);
    const ka = fa.k;
    const kab = segB(pa, ka);
    const tax = (pa.x[kab] - pa.x[ka]) * c.armA.dir;
    const tay = (pa.y[kab] - pa.y[ka]) * c.armA.dir;
    if (cross(tax, tay, x - fa.x, y - fa.y) < 0) return false;
    const pb = this.polys[c.b];
    const fb = footInWindow(pb, x, y, c.winB[0], c.winB[1]);
    const kb = fb.k;
    const kbb = segB(pb, kb);
    const tbx = (pb.x[kbb] - pb.x[kb]) * c.armB.dir;
    const tby = (pb.y[kbb] - pb.y[kb]) * c.armB.dir;
    if (cross(tbx, tby, x - fb.x, y - fb.y) > 0) return false;
    return true;
  }

  // -------------------------------------------------------------------------
  // Regions

  private qb: number[] = [];

  /** Distance from (x, y) to chain pi's centreline restricted to s ∈ [lo, hi], up to R. */
  distWindow(pi: number, lo: number, hi: number, x: number, y: number, R: number): number {
    const p = this.polys[pi];
    this.grid.query(x, y, R, this.qb);
    let best = Infinity;
    const shifts = p.closed ? [-p.len, 0, p.len] : [0];
    for (const g of this.qb) {
      if (this.grid.segChain[g] !== pi) continue;
      const k = this.grid.segK[g];
      const sa = p.s[k];
      const sb = sa + p.segLen[k];
      for (const sh of shifts) {
        const a = Math.max(lo, sa + sh);
        const b = Math.min(hi, sb + sh);
        if (b < a) continue;
        const l = p.segLen[k] || 1;
        const ta = (a - sh - sa) / l;
        const tb = (b - sh - sa) / l;
        const kb = segB(p, k);
        const ex = p.x[kb] - p.x[k];
        const ey = p.y[kb] - p.y[k];
        const c = closestOnSeg(x, y, p.x[k] + ex * ta, p.y[k] + ey * ta, p.x[k] + ex * tb, p.y[k] + ey * tb);
        if (c.d2 < best * best) best = Math.sqrt(c.d2);
      }
    }
    return best;
  }

  /** Inside cluster ci's region: its arms' tubes over their spans, or a fill. */
  inCluster(ci: number, x: number, y: number): boolean {
    const cl = this.clusters[ci];
    for (const [pi, l] of cl.spans)
      for (const [lo, hi] of l) if (this.distWindow(pi, lo, hi, x, y, this.h) < this.h) return true;
    for (const k of cl.corners) if (this.inFill(k, x, y)) return true;
    return false;
  }

  /** The burial region of a primitive (see the header). */
  private buried(pr: Prim, x: number, y: number): boolean {
    if (pr.chain >= 0) {
      const sm = (pr.sLo + pr.sHi) / 2;
      const half = (pr.sHi - pr.sLo) / 2 + this.sigma;
      if (this.distWindow(pr.chain, sm - half, sm + half, x, y, this.h) < this.h) return true;
    }
    if (pr.cluster >= 0) return this.inCluster(pr.cluster, x, y);
    return false;
  }

  // -------------------------------------------------------------------------
  // Primitives

  private spanCluster(pi: number, lo: number, hi: number): number {
    const p = this.polys[pi];
    for (const [a, b, ci] of this.chainSpans[pi]) {
      if (!p.closed) {
        if (lo <= b && a <= hi) return ci;
      } else {
        for (const sh of [-p.len, 0, p.len]) if (lo + sh <= b && a <= hi + sh) return ci;
      }
    }
    return -1;
  }

  private newPrim(o: Partial<Prim>): Prim {
    return {
      kind: 0,
      chain: -1,
      corner: -1,
      sLo: 0,
      sHi: 0,
      cluster: -1,
      role: "side",
      ax: 0,
      ay: 0,
      bx: 0,
      by: 0,
      nx: 0,
      ny: 0,
      cx: 0,
      cy: 0,
      R: 0,
      a0: 0,
      sweep: 0,
      inward: false,
      exp: [],
      ...o,
    };
  }

  private buildPrims(): void {
    const h = this.h;
    this.polys.forEach((p, pi) => {
      if (p.n < 2) return;
      const segDir = (k: number): [number, number] => {
        const b = segB(p, k);
        const l = p.segLen[k] || 1;
        return [(p.x[b] - p.x[k]) / l, (p.y[b] - p.y[k]) / l];
      };
      for (let k = 0; k < p.nseg; k++) {
        const b = segB(p, k);
        const [tx, ty] = segDir(k);
        const sLo = p.s[k];
        const sHi = sLo + p.segLen[k];
        for (const side of [1, -1]) {
          // side +1: left normal (−ty, tx).
          const nx = -ty * side;
          const ny = tx * side;
          this.prims.push(
            this.newPrim({
              kind: 0,
              chain: pi,
              sLo,
              sHi,
              role: "side",
              ax: p.x[k] + nx * h,
              ay: p.y[k] + ny * h,
              bx: p.x[b] + nx * h,
              by: p.y[b] + ny * h,
              nx,
              ny,
            }),
          );
        }
      }
      // Joins at interior vertices (all vertices on a closed chain): the arc
      // on the convex side.
      const v0 = p.closed ? 0 : 1;
      const v1 = p.closed ? p.n : p.n - 1;
      for (let v = v0; v < v1; v++) {
        const kin = v === 0 ? p.nseg - 1 : v - 1;
        const kout = v;
        const [ix, iy] = segDir(kin);
        const [ox, oy] = segDir(kout);
        const turn = cross(ix, iy, ox, oy);
        const dot = ix * ox + iy * oy;
        const ang = Math.atan2(turn, dot);
        if (Math.abs(ang) < 1e-12) continue;
        // Left turn (ang > 0): convex side is the right (normal −left).
        const side = ang > 0 ? -1 : 1;
        const a0 = Math.atan2(ix * side, -iy * side); // angle of normal side·(−iy, ix)
        this.prims.push(
          this.newPrim({
            kind: 1,
            chain: pi,
            sLo: p.s[v],
            sHi: p.s[v],
            role: "join",
            cx: p.x[v],
            cy: p.y[v],
            R: h,
            a0,
            sweep: ang,
            inward: false,
          }),
        );
      }
      // Caps.
      const cap = (v: number, ox: number, oy: number, s: number) => {
        // Semicircle from the right normal through the outward tangent to the left.
        const a0 = Math.atan2(-ox, oy); // right normal of outward direction = (oy, −ox)… see below
        this.prims.push(
          this.newPrim({
            kind: 1,
            chain: pi,
            sLo: s,
            sHi: s,
            role: "cap",
            cx: p.x[v],
            cy: p.y[v],
            R: h,
            a0,
            sweep: Math.PI,
            inward: false,
          }),
        );
      };
      if (!p.closed) {
        if (this.capStart[pi]) {
          const [tx, ty] = segDir(0);
          cap(0, -tx, -ty, p.s[0]);
        }
        if (this.capEnd[pi]) {
          const [tx, ty] = segDir(p.nseg - 1);
          cap(p.n - 1, tx, ty, p.s[p.n - 1]);
        }
      }
    });
    // Corner arcs.
    this.corners.forEach((c, ci) => {
      if (c.r <= 0 || !c.ok) return;
      const g = c.g2;
      if (g?.ok) {
        // S2: the G2 curve as a chain of segments, in travel order; each
        // normal points to the hole (right of travel).
        const cv = g.curve;
        for (let i = 0; i + 1 < cv.x.length; i++) {
          const dx = cv.x[i + 1] - cv.x[i];
          const dy = cv.y[i + 1] - cv.y[i];
          const l = Math.hypot(dx, dy);
          if (l < 1e-12) continue;
          this.prims.push(
            this.newPrim({
              kind: 0,
              chain: -1,
              corner: ci,
              cluster: c.cluster,
              role: "corner",
              ax: cv.x[i],
              ay: cv.y[i],
              bx: cv.x[i + 1],
              by: cv.y[i + 1],
              nx: dy / l,
              ny: -dx / l,
            }),
          );
        }
        return;
      }
      const a0 = Math.atan2(c.tA[1] - c.q[1], c.tA[0] - c.q[0]);
      const a1 = Math.atan2(c.tB[1] - c.q[1], c.tB[0] - c.q[0]);
      let sw = a1 - a0;
      while (sw > Math.PI) sw -= TAU;
      while (sw < -Math.PI) sw += TAU;
      this.prims.push(
        this.newPrim({
          kind: 1,
          chain: -1,
          corner: ci,
          cluster: c.cluster,
          role: "corner",
          cx: c.q[0],
          cy: c.q[1],
          R: c.r,
          a0,
          sweep: sw,
          inward: true,
        }),
      );
    });
    for (const pr of this.prims) {
      if (pr.chain >= 0) pr.cluster = this.spanCluster(pr.chain, pr.sLo, pr.sHi);
      this.expose(pr);
    }
  }

  primPoint(pr: Prim, u: number): [number, number, number, number] {
    if (pr.kind === 0) {
      return [pr.ax + (pr.bx - pr.ax) * u, pr.ay + (pr.by - pr.ay) * u, pr.nx, pr.ny];
    }
    const a = pr.a0 + pr.sweep * u;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const sgn = pr.inward ? -1 : 1;
    return [pr.cx + pr.R * ca, pr.cy + pr.R * sa, ca * sgn, sa * sgn];
  }

  primLength(pr: Prim): number {
    return pr.kind === 0 ? Math.hypot(pr.bx - pr.ax, pr.by - pr.ay) : Math.abs(pr.sweep) * pr.R;
  }

  private exposedAt(pr: Prim, u: number): boolean {
    const [x, y, nx, ny] = this.primPoint(pr, u);
    return !this.buried(pr, x + nx * this.eps, y + ny * this.eps);
  }

  private expose(pr: Prim): void {
    const L = this.primLength(pr);
    const n = Math.max(4, Math.ceil(L / (0.02 * this.h)));
    const ex: boolean[] = [];
    for (let i = 0; i <= n; i++) ex.push(this.exposedAt(pr, i / n));
    const out: number[] = [];
    let start = ex[0] ? 0 : -1;
    for (let i = 0; i < n; i++) {
      if (ex[i] === ex[i + 1]) continue;
      let lo = i / n;
      let hi = (i + 1) / n;
      for (let it = 0; it < 40; it++) {
        const mid = (lo + hi) / 2;
        if (this.exposedAt(pr, mid) === ex[i]) lo = mid;
        else hi = mid;
      }
      const u = (lo + hi) / 2;
      if (ex[i]) {
        // A zero-length interval is a single point (e.g. a sharp V, which
        // the other arm's side already carries): drop it.
        if ((u - start) * L > 1e-9) out.push(start, u);
        start = -1;
      } else start = u;
    }
    if (start >= 0 && (1 - start) * L > 1e-9) out.push(start, 1);
    pr.exp = out;
  }

  private buildPrimGrid(): void {
    const cell = Math.max(this.h, this.dMax);
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const boxes: [number, number, number, number][] = this.prims.map((pr) => {
      let b: [number, number, number, number];
      if (pr.kind === 0)
        b = [Math.min(pr.ax, pr.bx), Math.min(pr.ay, pr.by), Math.max(pr.ax, pr.bx), Math.max(pr.ay, pr.by)];
      else b = [pr.cx - pr.R, pr.cy - pr.R, pr.cx + pr.R, pr.cy + pr.R];
      x0 = Math.min(x0, b[0]);
      y0 = Math.min(y0, b[1]);
      x1 = Math.max(x1, b[2]);
      y1 = Math.max(y1, b[3]);
      return b;
    });
    if (!isFinite(x0)) {
      x0 = y0 = 0;
      x1 = y1 = 1;
    }
    const nx = Math.max(1, Math.ceil((x1 - x0) / cell) + 1);
    const ny = Math.max(1, Math.ceil((y1 - y0) / cell) + 1);
    const lists: number[][] = Array.from({ length: nx * ny }, () => []);
    this.prims.forEach((pr, i) => {
      if (pr.exp.length === 0) return;
      const b = boxes[i];
      const ix0 = Math.floor((b[0] - x0) / cell);
      const ix1 = Math.floor((b[2] - x0) / cell);
      const iy0 = Math.floor((b[1] - y0) / cell);
      const iy1 = Math.floor((b[3] - y0) / cell);
      for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) lists[iy * nx + ix].push(i);
    });
    this.primGrid = { cell, x0, y0, nx, ny, cells: lists.map((l) => Int32Array.from(l)) };
    this.stamp = new Int32Array(this.prims.length);
  }

  private pq: number[] = [];

  /** Prims whose cells meet the square of half-side R around (x, y). */
  primsNear(x: number, y: number, R: number, out: number[]): void {
    out.length = 0;
    const g = this.primGrid;
    this.tick++;
    const ix0 = Math.max(0, Math.floor((x - R - g.x0) / g.cell));
    const ix1 = Math.min(g.nx - 1, Math.floor((x + R - g.x0) / g.cell));
    const iy0 = Math.max(0, Math.floor((y - R - g.y0) / g.cell));
    const iy1 = Math.min(g.ny - 1, Math.floor((y + R - g.y0) / g.cell));
    for (let iy = iy0; iy <= iy1; iy++)
      for (let ix = ix0; ix <= ix1; ix++) {
        const c = g.cells[iy * g.nx + ix];
        for (let j = 0; j < c.length; j++) {
          const i = c[j];
          if (this.stamp[i] !== this.tick) {
            this.stamp[i] = this.tick;
            out.push(i);
          }
        }
      }
  }

  /** Distance to the nearest exposed outline of any primitive, up to R (Infinity beyond). */
  nearestExposed(x: number, y: number, R: number): number {
    this.primsNear(x, y, R, this.pq);
    let best = Infinity;
    for (const i of this.pq) {
      const d = this.primDist(this.prims[i], x, y);
      if (d < best) best = d;
    }
    return best;
  }

  /** Exact distance from (x, y) to the exposed part of a primitive. */
  primDist(pr: Prim, x: number, y: number): number {
    const e = pr.exp;
    let best = Infinity;
    if (pr.kind === 0) {
      const ex = pr.bx - pr.ax;
      const ey = pr.by - pr.ay;
      const l2 = ex * ex + ey * ey;
      const t = l2 > 0 ? ((x - pr.ax) * ex + (y - pr.ay) * ey) / l2 : 0;
      for (let i = 0; i < e.length; i += 2) {
        const tc = t < e[i] ? e[i] : t > e[i + 1] ? e[i + 1] : t;
        const dx = pr.ax + ex * tc - x;
        const dy = pr.ay + ey * tc - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < best) best = d;
      }
      return best;
    }
    const vx = x - pr.cx;
    const vy = y - pr.cy;
    const rho = Math.sqrt(vx * vx + vy * vy);
    let del = Math.atan2(vy, vx) - pr.a0;
    if (pr.sweep < 0) del = -del;
    del %= TAU;
    if (del < 0) del += TAU;
    const up = del / Math.abs(pr.sweep);
    for (let i = 0; i < e.length; i += 2) {
      if (up >= e[i] && up <= e[i + 1]) {
        const d = Math.abs(rho - pr.R);
        if (d < best) best = d;
      } else {
        for (const u of [e[i], e[i + 1]]) {
          const [px, py] = this.primPoint(pr, u);
          const d = Math.hypot(px - x, py - y);
          if (d < best) best = d;
        }
      }
    }
    return best;
  }

  // -------------------------------------------------------------------------
  // Per point

  private cands: Cand[] = [];

  /** Distance from (x, y) to the exposed outline of the group described by windows/clusters. */
  groupDist(x: number, y: number, wins: Map<number, [number, number][]>, cls: Set<number>, R: number): number {
    this.primsNear(x, y, R, this.pq);
    let best = Infinity;
    for (const i of this.pq) {
      const pr = this.prims[i];
      let member = false;
      if (pr.chain < 0) member = cls.has(pr.cluster);
      else {
        const l = wins.get(pr.chain);
        if (l) {
          const p = this.polys[pr.chain];
          for (const [lo, hi] of l) {
            if (!p.closed) {
              if (pr.sLo <= hi && lo <= pr.sHi) member = true;
            } else
              for (const sh of [-p.len, 0, p.len]) if (pr.sLo + sh <= hi && lo <= pr.sHi + sh) member = true;
            if (member) break;
          }
        }
      }
      if (!member) continue;
      const d = this.primDist(pr, x, y);
      if (d < best) best = d;
    }
    return best;
  }

  /** Depth z at arc length s on poly pi, by the selected rule (§3.3). */
  depthAt(pi: number, s: number): number {
    const rule = this.params.depth ?? "overlap";
    if (rule === "scene") return zAt(this.polys[pi], s);
    if (rule === "overlap") return plateauDepth(this.depthChains[pi], this.depthWin, s, this.depthWin);
    return diagramDepth(this.depthChains[pi], this.depthWin, s);
  }

  /**
   * K922 depth "overlap": how far along poly pa from s, in direction dir,
   * its tube still overlaps poly pb's tube near the other pass ob (a point
   * of pa's cross-section, |t| < h, lies within h of pb at a foot within
   * 10h of ob): walked in h/8 steps up to 10h, plus one step. 0 when the
   * passes do not meet (a table crossing apart in the geometry).
   */
  passReach(pa: number, s: number, pb: number, ob: number, dir: number): number {
    const h = this.h;
    const step = h / 8;
    const maxR = 10 * h;
    const P = this.polys[pa];
    const Q = this.polys[pb];
    const cs: Cand[] = [];
    let last = -1;
    for (let d = 0; d <= maxR + 1e-9; d += step) {
      const raw = s + dir * d;
      if (!P.closed && (raw < P.s0 || raw > P.s0 + P.len)) break;
      const u = normS(P, raw);
      const at = pointAt(P, u);
      let hit = false;
      for (let k = -4; k <= 4 && !hit; k++) {
        const t = (k / 4) * h * 0.999;
        candidates(this.grid, at.x - at.ty * t, at.y + at.tx * t, h, cs, pb);
        for (const c of cs) {
          if (c.chain !== pb || !(c.d < h)) continue;
          if (Math.abs(dS(Q, c.s, ob)) > maxR + 2 * h) continue;
          if (pa === pb && Math.abs(dS(P, c.s, u)) <= Math.abs(dS(P, c.s, ob))) continue;
          hit = true;
          break;
        }
      }
      if (!hit) break;
      last = d;
    }
    return last < 0 ? 0 : last + step;
  }

  /**
   * K900 (§3.4): each crossing pass's window on its chain, and the passes
   * each cluster's spans hold, both with the crossing cut's pad
   * (h·cot(θ/2) + h, the overlap's reach along a pass plus a margin; the
   * same tolerance, so an arm the cut stopped does not hold its pass). A
   * kink whose passes lie within σ of each other is one piece by the
   * same-chain rule and gets no tags.
   */
  private buildPassTags(scene: FieldScene, jSpans: [number, number, number, number][][]): void {
    const h = this.h;
    this.refuseJoins = true;
    const held = (pi: number, s: number, pad: number, tag: number) => {
      const p = this.polys[pi];
      jSpans.forEach((l, ji) => {
        for (const [q, lo, hi, ai] of l) {
          if (q !== pi) continue;
          const dir = scene.junctions[ji].arms[ai].dir;
          const a = dir < 0 ? lo - pad : lo;
          const b = dir > 0 ? hi + pad : hi;
          let inside = false;
          if (!p.closed) inside = s >= a && s <= b;
          else for (const sh of [-p.len, 0, p.len]) if (s + sh >= a && s + sh <= b) inside = true;
          const t = this.clusterTags[this.junctionCluster[ji]];
          if (inside && !t.includes(tag)) t.push(tag);
        }
      });
    };
    scene.crossings.forEach((cx, x) => {
      const ia = this.idxOf.get(cx.a.chain);
      const ib = this.idxOf.get(cx.b.chain);
      if (ia === undefined || ib === undefined) return;
      const pa = this.polys[ia];
      const pb = this.polys[ib];
      const kink = ia === ib;
      if (kink && Math.abs(dS(pa, cx.a.s, cx.b.s)) <= this.sigma) return;
      const ta = pointAt(pa, normS(pa, cx.a.s));
      const tb = pointAt(pb, normS(pb, cx.b.s));
      const th = Math.asin(Math.min(1, Math.abs(cross(ta.tx, ta.ty, tb.tx, tb.ty))));
      const pad = h / Math.tan(Math.max(th, 1e-3) / 2) + (this.params.passMargin ?? 1) * h - 1e-6 * h;
      // "point": a candidate's own pass window reaches L + h (check 15's).
      const own = this.pointJoins ? h / Math.tan(Math.max(th, 1e-3) / 2) + h : pad;
      this.passTags[ia].push({ s: cx.a.s, pad: own, tag: 2 * x, mate: kink ? cx.b.s : Number.NaN });
      this.passTags[ib].push({ s: cx.b.s, pad: own, tag: 2 * x + 1, mate: kink ? cx.a.s : Number.NaN });
      held(ia, cx.a.s, pad, 2 * x);
      held(ib, cx.b.s, pad, 2 * x + 1);
    });
  }

  /** K900: the passes a candidate holds: its cluster's, and each pass whose window holds it (on a kink, the nearer pass only). */
  private tagsOf(c: Cand, ci: number): number[] {
    const out = ci >= 0 ? this.clusterTags[ci].slice() : [];
    const p = this.polys[c.chain];
    for (const w of this.passTags[c.chain]) {
      const d = Math.abs(dS(p, c.s, w.s));
      if (d > w.pad) continue;
      if (!Number.isNaN(w.mate)) {
        const dm = Math.abs(dS(p, c.s, w.mate));
        if (w.tag & 1 ? dm <= d : dm < d) continue;
      }
      if (!out.includes(w.tag)) out.push(w.tag);
    }
    return out;
  }

  /**
   * K900 (§3.4): the groups at a point. Cluster joins first (a junction's
   * union is one sheet, and the cuts keep both passes of a crossing out of
   * every cluster), then same-chain joins nearest first (by |Δs|). A
   * same-chain join is refused when one side's group holds a pass of a
   * crossing and the other side's group its other pass: a crossing is two
   * surfaces, however the sheet between its passes is connected.
   */
  private joinGroups(cs: Cand[], cl: Int32Array, par: Int32Array, find: (i: number) => number): void {
    const n = cs.length;
    if (this.pointJoins) return this.joinGroupsPoint(cs, cl, par, find);
    for (let i = 0; i < n; i++)
      for (let k = i + 1; k < n; k++) if (cl[i] >= 0 && cl[i] === cl[k]) par[find(i)] = find(k);
    const pairs: [number, number, number][] = [];
    for (let i = 0; i < n; i++)
      for (let k = i + 1; k < n; k++) {
        if (cs[i].chain !== cs[k].chain) continue;
        const d = Math.abs(dS(this.polys[cs[i].chain], cs[i].s, cs[k].s));
        if (d <= this.sigma && find(i) !== find(k)) pairs.push([d, i, k]);
      }
    if (pairs.length === 0) return;
    pairs.sort((u, v) => u[0] - v[0] || u[1] - v[1] || u[2] - v[2]);
    const tags: number[][] = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
      const t = tags[find(i)];
      for (const g of this.tagsOf(cs[i], cl[i])) if (!t.includes(g)) t.push(g);
    }
    for (const [, i, k] of pairs) {
      const ri = find(i);
      const rk = find(k);
      if (ri === rk) continue;
      const a = tags[ri];
      const b = tags[rk];
      if (a.some((g) => b.includes(g ^ 1))) continue;
      par[ri] = rk;
      for (const g of a) if (!b.includes(g)) b.push(g);
    }
  }

  /** K900 probe ("point"): every join refusable, by the members' own pass
   * windows (L + h); cluster joins first, nearest pair first, then σ joins. */
  private joinGroupsPoint(cs: Cand[], cl: Int32Array, par: Int32Array, find: (i: number) => number): void {
    const n = cs.length;
    const pairs: [number, number, number, number][] = [];
    for (let i = 0; i < n; i++)
      for (let k = i + 1; k < n; k++) {
        if (cl[i] >= 0 && cl[i] === cl[k]) pairs.push([0, Math.max(cs[i].d, cs[k].d), i, k]);
        else if (cs[i].chain === cs[k].chain) {
          const d = Math.abs(dS(this.polys[cs[i].chain], cs[i].s, cs[k].s));
          if (d <= this.sigma) pairs.push([1, d, i, k]);
        }
      }
    if (pairs.length === 0) return;
    pairs.sort((u, v) => u[0] - v[0] || u[1] - v[1] || u[2] - v[2] || u[3] - v[3]);
    const tags: number[][] = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) tags[i] = this.tagsOf(cs[i], -1);
    for (const [, , i, k] of pairs) {
      const ri = find(i);
      const rk = find(k);
      if (ri === rk) continue;
      const a = tags[ri];
      const b = tags[rk];
      if (a.some((g) => b.includes(g ^ 1))) continue;
      par[ri] = rk;
      for (const g of a) if (!b.includes(g)) b.push(g);
    }
  }

  /** Cluster containing (chain, s) in its span, or −1. On an open chain s
   * is clamped into [s0, s0 + len] first: a foot at the chain's end can sit
   * an ulp past a span that ends there (K922's endSnap, unconditional since
   * K934). */
  clusterAt(pi: number, s: number): number {
    const p = this.polys[pi];
    if (!p.closed) s = Math.min(Math.max(s, p.s0), p.s0 + p.len);
    for (const [lo, hi, ci] of this.chainSpans[pi]) {
      if (!p.closed) {
        if (s >= lo && s <= hi) return ci;
      } else {
        // The three shifts -len, 0, +len in that order, without an array per span (S3a4).
        const sm = s + -p.len;
        if (sm >= lo && sm <= hi) return ci;
        const s0 = s + 0;
        if (s0 >= lo && s0 <= hi) return ci;
        const sp = s + p.len;
        if (sp >= lo && sp <= hi) return ci;
      }
    }
    return -1;
  }

  // -------------------------------------------------------------------------
  // K915 (form A): ink from the visible surface.

  private fq: number[] = [];
  private fq2: number[] = [];

  /**
   * K868 S3a4: may a segment of chain pi that footNear would clip to
   * [lo, hi] lie within sqrt(R2) of (x, y)? cand: a grid query around
   * (x, y) of half-side at least sqrt(R2). Measured to the whole segment,
   * so true whenever footNear's clipped piece is that near (and on NaN).
   */
  private windowNear(pi: number, lo: number, hi: number, x: number, y: number, R2: number, cand: number[]): boolean {
    const p = this.polys[pi];
    const g = this.grid;
    for (let j = 0; j < cand.length; j++) {
      const id = cand[j];
      if (g.segChain[id] !== pi) continue;
      const k = g.segK[id];
      const sa = p.s[k];
      const sb = sa + p.segLen[k];
      let win = Math.min(hi, sb) >= Math.max(lo, sa);
      if (!win && p.closed)
        win = Math.min(hi, sb - p.len) >= Math.max(lo, sa - p.len) || Math.min(hi, sb + p.len) >= Math.max(lo, sa + p.len);
      if (!win) continue;
      const kb = segB(p, k);
      const ax = p.x[k];
      const ay = p.y[k];
      const ex = p.x[kb] - ax;
      const ey = p.y[kb] - ay;
      const L2 = ex * ex + ey * ey;
      let t = L2 > 0 ? ((x - ax) * ex + (y - ay) * ey) / L2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = ax + ex * t - x;
      const dy = ay + ey * t - y;
      if (!(dx * dx + dy * dy >= R2)) return true;
    }
    return false;
  }

  /** Chain pi's foot nearest (x, y) with s ∈ [lo, hi], searched within R: [d, s] (d = Infinity: none). */
  private footNear(pi: number, lo: number, hi: number, x: number, y: number, R: number): [number, number] {
    const p = this.polys[pi];
    this.grid.query(x, y, R, this.fq);
    let best = Infinity;
    let bs = 0;
    const shifts = p.closed ? [-p.len, 0, p.len] : [0];
    for (const g of this.fq) {
      if (this.grid.segChain[g] !== pi) continue;
      const k = this.grid.segK[g];
      const sa = p.s[k];
      const sb = sa + p.segLen[k];
      for (const sh of shifts) {
        const a = Math.max(lo, sa + sh);
        const b = Math.min(hi, sb + sh);
        if (b < a) continue;
        const l = p.segLen[k] || 1;
        const ta = (a - sh - sa) / l;
        const tb = (b - sh - sa) / l;
        const kb = segB(p, k);
        const ex = p.x[kb] - p.x[k];
        const ey = p.y[kb] - p.y[k];
        const c = closestOnSeg(x, y, p.x[k] + ex * ta, p.y[k] + ey * ta, p.x[k] + ex * tb, p.y[k] + ey * tb);
        if (c.d2 < best * best) {
          best = Math.sqrt(c.d2);
          bs = sa + (ta + (tb - ta) * c.t) * (sb - sa);
        }
      }
    }
    return [best, bs];
  }

  /**
   * K915 (b): distance from (x, y), where member S (chain cS at sS) is on top
   * of member T (chain cT at sT), to the nearest point that both still cover
   * where T is on top, up to R (Infinity: none). Each member is followed
   * along its chain within λ. The search runs along the gradient of
   * g = z_T − z_S (exact where g is linear, as the diagram depth's tents
   * are between kinks), then bisects.
   */
  private switchDist(cS: number, sS: number, cT: number, sT: number, x: number, y: number, R: number): number {
    const h = this.h;
    const lam = this.lambda;
    const g = (qx: number, qy: number): number => {
      const [dS_, s1] = this.footNear(cS, sS - lam, sS + lam, qx, qy, 1.5 * h);
      if (!(dS_ < h)) return Number.NaN;
      const [dT_, s2] = this.footNear(cT, sT - lam, sT + lam, qx, qy, 1.5 * h);
      if (!(dT_ < h)) return Number.NaN;
      return this.depthAt(cT, s2) - this.depthAt(cS, s1);
    };
    const g0 = g(x, y);
    if (Number.isNaN(g0)) return Infinity;
    if (g0 > 0) return 0;
    const dl = 0.02 * h;
    const gxp = g(x + dl, y);
    const gxm = g(x - dl, y);
    const gyp = g(x, y + dl);
    const gym = g(x, y - dl);
    const gx = !Number.isNaN(gxp) && !Number.isNaN(gxm) ? (gxp - gxm) / (2 * dl) : !Number.isNaN(gxp) ? (gxp - g0) / dl : (g0 - gxm) / dl;
    const gy = !Number.isNaN(gyp) && !Number.isNaN(gym) ? (gyp - gym) / (2 * dl) : !Number.isNaN(gyp) ? (gyp - g0) / dl : (g0 - gym) / dl;
    const gn = Math.hypot(gx, gy);
    if (!(gn > 1e-12)) return Infinity;
    if (-g0 / gn > 2 * R) return Infinity;
    const ux = gx / gn;
    const uy = gy / gn;
    let r0 = 0;
    let r1 = -1;
    const steps = 6;
    for (let k = 1; k <= steps; k++) {
      const r = (k / steps) * R;
      const v = g(x + ux * r, y + uy * r);
      if (v > 0) {
        r1 = r;
        break;
      }
      if (Number.isNaN(v)) return Infinity;
      r0 = r;
    }
    if (r1 < 0) return Infinity;
    for (let it = 0; it < 14; it++) {
      const r = (r0 + r1) / 2;
      if (g(x + ux * r, y + uy * r) > 0) r1 = r;
      else r0 = r;
    }
    return r1;
  }

  /** K915 (form A): evalPoint under ink "surface" (see OracleParams.ink). */
  private evalSurface(x: number, y: number, wantField: boolean, out: PointEval): PointEval {
    const cs = this.cands;
    const n = cs.length;
    const h = this.h;
    const cl = new Int32Array(n);
    for (let i = 0; i < n; i++) cl[i] = this.clusterAt(cs[i].chain, cs[i].s);
    // The visible member: the greatest z among the covering feet and fills.
    let S = -1;
    let zS = -Infinity;
    let fillS = false;
    const better = (z: number, i: number): boolean => {
      if (S < 0 || z > zS + 1e-6) return true;
      if (Math.abs(z - zS) > 1e-6) return false;
      const a = this.idOf[cs[i].chain];
      const b = this.idOf[cs[S].chain];
      return a > b || (a === b && cs[i].s > cs[S].s);
    };
    for (let i = 0; i < n; i++) {
      if (cs[i].d >= h) continue;
      const z = this.depthAt(cs[i].chain, cs[i].s);
      if (better(z, i)) {
        S = i;
        zS = z;
        fillS = false;
      }
    }
    const seen: number[] = [];
    for (let i = 0; i < n; i++) {
      const J = cl[i];
      if (J < 0 || seen.includes(J)) continue;
      seen.push(J);
      let inFill = false;
      for (const k of this.clusters[J].corners)
        if (this.inFill(k, x, y)) {
          inFill = true;
          break;
        }
      if (!inFill) continue;
      // A fill takes the depth (and the order) of its cluster's nearest foot.
      let near = -1;
      for (let k = 0; k < n; k++) if (cl[k] === J && (near < 0 || cs[k].d < cs[near].d)) near = k;
      const z = this.depthAt(cs[near].chain, cs[near].s);
      if (near !== S && better(z, near)) {
        S = near;
        zS = z;
        fillS = cs[near].d >= h;
      }
    }
    if (S < 0) {
      if (this.recordGroups) this.lastEval = { cands: cs.map((c) => ({ ...c })), cl: Array.from(cl), groups: [], inside: [], top: null, topNear: -1 };
      if (wantField) out.F = -Math.min(this.nearestExposed(x, y, this.dMax), this.dMax);
      return out;
    }
    const JS = cl[S];
    const pS = this.polys[cs[S].chain];
    const sim = (i: number): boolean =>
      (JS >= 0 && cl[i] === JS) || (!fillS && cs[i].chain === cs[S].chain && Math.abs(dS(pS, cs[i].s, cs[S].s)) <= this.sigma);
    // (a) S's own outline: the exposed outline of the feet similar to S.
    const wins = new Map<number, [number, number][]>();
    const cls = new Set<number>();
    const members: number[] = [];
    for (let i = 0; i < n; i++) {
      if (!sim(i)) continue;
      members.push(i);
      if (cl[i] >= 0) {
        if (cls.has(cl[i])) continue;
        cls.add(cl[i]);
        for (const [pi, l] of this.clusters[cl[i]].spans) {
          const w = wins.get(pi) ?? [];
          for (const iv of l) w.push([iv[0], iv[1]]);
          wins.set(pi, w);
        }
      } else {
        const w = wins.get(cs[i].chain) ?? [];
        w.push([cs[i].s - this.lambda, cs[i].s + this.lambda]);
        wins.set(cs[i].chain, w);
      }
    }
    const d1 = this.groupDist(x, y, wins, cls, this.dMax);
    // (b) depth switches: a covering member of another surface that rises
    // above S within W/2 (a centred line, W wide).
    let d2 = Infinity;
    let overlap = false;
    for (let i = 0; i < n; i++) {
      if (cs[i].d >= h || sim(i)) continue;
      overlap = true;
      if (fillS) continue;
      const d = this.switchDist(cs[S].chain, cs[S].s, cs[i].chain, cs[i].s, x, y, this.W / 2);
      if (d < d2) d2 = d;
    }
    this.lastOverlap = overlap;
    if (this.recordGroups)
      this.lastEval = { cands: cs.map((c) => ({ ...c })), cl: Array.from(cl), groups: [members], inside: [members], top: members, topNear: S };
    const F = Math.min(d1, d2 + this.W / 2);
    out.inside = true;
    out.F = Math.min(F, this.dMax);
    out.ink = F <= this.W;
    out.topChain = this.idOf[cs[S].chain];
    out.topS = cs[S].s;
    out.top = cls.size > 0 ? 100000 + Math.min(...cls) : this.idOf[cs[S].chain];
    if (this.hookLook !== "now" && this.hooks.length) this.hookAdjust(x, y, out, cls);
    return out;
  }

  // K915 ink "label": form A in image space. The visible member (the
  // z-buffer) on a grid of pitch W/4, cached, and ink on the front side of
  // every change of visible surface within W, measured to the cell centres
  // (good to g/2). No outline primitives: a band ends only where the
  // partition's boundary does.
  private lab: LabGrid | null = null;
  private cands2: Cand[] = [];

  /** The visible member at (x, y), as the label pass draws it; null = paper.
   * Overwrites this.cands. K868 S3a3 (K964 class C): the GPU's order, so no
   * visiting order decides. The tube on top is found by depth; each fill
   * here is weighed against that tube alone (its own cluster's tube keeps
   * the point; another's yields only where the yield order puts the fill
   * over it); the fills that pass then compete by depth, as the fill
   * pass's depth test does (every fill is in front of every tube). */
  private visibleAt(x: number, y: number): Vis | null {
    candidates(this.grid, x, y, this.reach, this.cands);
    const cs = this.cands;
    const n = cs.length;
    if (n === 0) return null;
    const h = this.h;
    const cl = new Int32Array(n);
    for (let i = 0; i < n; i++) cl[i] = this.clusterAt(cs[i].chain, cs[i].s);
    let S = -1;
    let zS = -Infinity;
    let fillS = false;
    const better = (z: number, i: number): boolean => {
      if (S < 0 || z > zS + 1e-6) return true;
      if (Math.abs(z - zS) > 1e-6) return false;
      if ((this.params.labTie ?? "surface") === "surface") {
        // K924: one key per surface (the cluster, else the chain).
        const ka = cl[i] >= 0 ? 1e6 + cl[i] : this.idOf[cs[i].chain];
        const kb = cl[S] >= 0 ? 1e6 + cl[S] : this.idOf[cs[S].chain];
        if (ka !== kb) return ka > kb;
        return cs[i].s > cs[S].s;
      }
      const a = this.idOf[cs[i].chain];
      const b = this.idOf[cs[S].chain];
      return a > b || (a === b && cs[i].s > cs[S].s);
    };
    for (let i = 0; i < n; i++) {
      if (cs[i].d >= h) continue;
      const z = this.depthAt(cs[i].chain, cs[i].s);
      if (better(z, i)) {
        S = i;
        zS = z;
        fillS = false;
      }
    }
    const T = S;
    const order: number[] = [];
    for (let i = 0; i < n; i++) if (cl[i] >= 0 && !order.includes(cl[i])) order.push(cl[i]);
    if (this.visitReverse) order.reverse();
    for (const J of order) {
      if (T >= 0 && cl[T] === J) continue;
      let inF = false;
      for (const k of this.clusters[J].corners)
        if (this.inFill(k, x, y)) {
          inF = true;
          break;
        }
      if (!inF) continue;
      // K940's yield order (crossed; the only form since K934): a fill
      // yields to another surface's tube unless the table puts one of the
      // cluster's chains over the tube's chain there.
      if (T >= 0 && this.fillOrder(J, cs[T].chain, cs[T].s) !== true) continue;
      let near = -1;
      for (let k = 0; k < n; k++) if (cl[k] === J && (near < 0 || cs[k].d < cs[near].d)) near = k;
      const z = this.depthAt(cs[near].chain, cs[near].s);
      if (S === T || better(z, near)) {
        S = near;
        zS = z;
        fillS = cs[near].d >= h;
      }
    }
    if (S < 0) return null;
    return { chain: cs[S].chain, s: cs[S].s, J: cl[S], z: zS, fill: fillS };
  }

  /** The table crossings of each chain (fillOrder). */
  private xBy: { s: number; oi: number; over: boolean }[][] | null = null;

  /** Is cluster J's fill over chain pi at s? The nearest table crossing
   * within σ between pi and a chain of J decides; null = none (K924; the
   * label fill's yield order since K940, its only form since K934). */
  private fillOrder(J: number, pi: number, s: number): boolean | null {
    const xBy = this.ensureXBy();
    const spans = this.clusters[J].spans;
    let best = Infinity;
    let res: boolean | null = null;
    for (const x of xBy[pi]) {
      if (!spans.has(x.oi)) continue;
      const d = Math.abs(dS(this.polys[pi], s, x.s));
      if (d <= this.sigma && d < best) {
        best = d;
        res = !x.over;
      }
    }
    return res;
  }

  private ensureXBy(): { s: number; oi: number; over: boolean }[][] {
    if (!this.xBy) {
      const xb: { s: number; oi: number; over: boolean }[][] = this.polys.map(() => []);
      for (const x of this.scene.crossings) {
        const ia = this.idxOf.get(x.a.chain);
        const ib = this.idxOf.get(x.b.chain);
        if (ia === undefined || ib === undefined) continue;
        xb[ia].push({ s: normS(this.polys[ia], x.a.s), oi: ib, over: x.over === "a" });
        xb[ib].push({ s: normS(this.polys[ib], x.b.s), oi: ia, over: x.over === "b" });
      }
      this.xBy = xb;
    }
    return this.xBy;
  }

  /** Same surface: one cluster, or one chain within σ (a fill is its cluster alone). */
  private simLab(A: Vis, B: Vis): boolean {
    if (A.J >= 0 && A.J === B.J) return true;
    if (A.fill || B.fill) return false;
    return A.chain === B.chain && Math.abs(dS(this.polys[A.chain], A.s, B.s)) <= this.sigma;
  }

  /** Does a member of A's surface cover (x, y), visible or not? */
  private presentAt(A: Vis, x: number, y: number): boolean {
    candidates(this.grid, x, y, this.reach, this.cands2);
    for (const c of this.cands2) {
      if (c.d >= this.h) continue;
      if (A.J >= 0 && this.clusterAt(c.chain, c.s) === A.J) return true;
      if (!A.fill && c.chain === A.chain && Math.abs(dS(this.polys[A.chain], c.s, A.s)) <= this.sigma) return true;
    }
    if (A.J >= 0) for (const k of this.clusters[A.J].corners) if (this.inFill(k, x, y)) return true;
    return false;
  }

  private ensureLab(): LabGrid {
    if (this.lab) return this.lab;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const p of this.polys)
      for (let k = 0; k < p.x.length; k++) {
        x0 = Math.min(x0, p.x[k]);
        y0 = Math.min(y0, p.y[k]);
        x1 = Math.max(x1, p.x[k]);
        y1 = Math.max(y1, p.y[k]);
      }
    const pad = this.h + 2 * this.W + this.reach;
    x0 -= pad;
    y0 -= pad;
    x1 += pad;
    y1 += pad;
    const g = this.W / 4;
    const nx = Math.ceil((x1 - x0) / g) + 1;
    const ny = Math.ceil((y1 - y0) / g) + 1;
    const N = nx * ny;
    this.lab = { x0, y0, g, nx, ny, st: new Int8Array(N), ch: new Int32Array(N), J: new Int32Array(N), s: new Float32Array(N), z: new Float32Array(N) };
    return this.lab;
  }

  private labAt(ix: number, iy: number): Vis | null {
    const L = this.lab!;
    if (ix < 0 || iy < 0 || ix >= L.nx || iy >= L.ny) return null;
    const k = iy * L.nx + ix;
    const st = L.st[k];
    if (st === 1) return null;
    if (st >= 2) return { chain: L.ch[k], s: L.s[k], J: L.J[k], z: L.z[k], fill: st === 3 };
    const v = this.visibleAt(L.x0 + (ix + 0.5) * L.g, L.y0 + (iy + 0.5) * L.g);
    if (!v) {
      L.st[k] = 1;
      return null;
    }
    L.st[k] = v.fill ? 3 : 2;
    L.ch[k] = v.chain;
    L.s[k] = v.s;
    L.J[k] = v.J;
    L.z[k] = v.z;
    return v;
  }

  private evalLabel(x: number, y: number, wantField: boolean, out: PointEval): PointEval {
    const P = this.visibleAt(x, y);
    const cs = this.cands;
    if (!P) {
      if (this.recordGroups) this.lastEval = { cands: cs.map((c) => ({ ...c })), cl: cs.map((c) => this.clusterAt(c.chain, c.s)), groups: [], inside: [], top: null, topNear: -1 };
      if (wantField) out.F = -Math.min(this.nearestExposed(x, y, this.dMax), this.dMax);
      return out;
    }
    if (this.recordGroups) {
      const cl = cs.map((c) => this.clusterAt(c.chain, c.s));
      const members: number[] = [];
      let near = -1;
      cs.forEach((c, i) => {
        if (this.simLab(P, { chain: c.chain, s: c.s, J: cl[i], z: 0, fill: false })) members.push(i);
        if (c.chain === P.chain && c.s === P.s) near = i;
      });
      this.lastEval = { cands: cs.map((c) => ({ ...c })), cl, groups: [members], inside: [members], top: members, topNear: near };
    }
    const L = this.ensureLab();
    const g = L.g;
    const W = this.W;
    const R = Math.ceil(W / g) + 1;
    const cx = Math.floor((x - L.x0) / g);
    const cy = Math.floor((y - L.y0) / g);
    let best = Infinity;
    // Differing cells near the best, flat [dd, qx, qy, switch], for the
    // exact distance below.
    const near: number[] = [];
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        const ix = cx + dx;
        const iy = cy + dy;
        const qx = L.x0 + (ix + 0.5) * g;
        const qy = L.y0 + (iy + 0.5) * g;
        const dist = Math.sqrt((qx - x) * (qx - x) + (qy - y) * (qy - y));
        if (dist > W + g || dist >= best + g) continue;
        const Q = this.labAt(ix, iy);
        if (Q && this.simLab(P, Q)) continue;
        let dd = dist;
        let sw = 0;
        if (Q && this.presentAt(P, qx, qy)) {
          // P's surface runs on under Q at q: Q's silhouette (Q's side inks),
          // unless Q's surface also runs under P at p - a depth switch,
          // drawn as a centred line.
          if (!this.presentAt(Q, x, y)) continue;
          dd = 2 * dist;
          sw = 1;
        }
        if (dd < best) best = dd;
        near.push(dd, qx, qy, sw);
      }
    let F = best - g / 2;
    if (this.labExact && Math.abs(F - W) <= 1.5 * g && near.length) {
      // Exact distance near the band's edge: bisect toward the nearest few
      // differing cells. A silhouette is where P's surface stops covering
      // (its whole outline, hidden or not, as in form A's (a)); a switch is
      // where the visible member stops being similar to P.
      const order: number[] = [];
      for (let i = 0; i < near.length; i += 4) if (near[i] <= best + g) order.push(i);
      order.sort((a, b) => near[a] - near[b]);
      let fine = Infinity;
      for (const i of order.slice(0, 4)) {
        const qx = near[i + 1];
        const qy = near[i + 2];
        const sw = near[i + 3];
        let lo = 0;
        let hi = 1;
        for (let k = 0; k < 6; k++) {
          const t = (lo + hi) / 2;
          const sx = x + (qx - x) * t;
          const sy = y + (qy - y) * t;
          let same: boolean;
          if (sw) {
            const V = this.visibleAt(sx, sy);
            same = !!V && this.simLab(P, V);
          } else same = this.presentAt(P, sx, sy);
          if (same) lo = t;
          else hi = t;
        }
        const len = Math.sqrt((qx - x) * (qx - x) + (qy - y) * (qy - y));
        const dd = (sw ? 2 : 1) * len * 0.5 * (lo + hi);
        if (dd < fine) fine = dd;
      }
      F = fine;
    }
    out.inside = true;
    out.F = Math.min(F, this.dMax);
    out.ink = F <= W;
    out.topChain = this.idOf[P.chain];
    out.topS = P.s;
    out.top = P.J >= 0 ? 100000 + P.J : this.idOf[P.chain];
    return out;
  }

  evalPoint(x: number, y: number, wantField = true): PointEval {
    const out: PointEval = { inside: false, ink: false, F: -this.dMax, top: -1, topChain: -1, topS: 0 };
    if (this.recordGroups) this.lastEval = null;
    this.lastOverlap = false;
    candidates(this.grid, x, y, this.reach, this.cands);
    const cs = this.cands;
    const n = cs.length;
    if (n === 0) return out;
    if (this.inkMode === "surface") return this.evalSurface(x, y, wantField, out);
    if (this.inkMode === "label") return this.evalLabel(x, y, wantField, out);
    // Union-find.
    const par = new Int32Array(n);
    for (let i = 0; i < n; i++) par[i] = i;
    const find = (i: number): number => {
      while (par[i] !== i) i = par[i] = par[par[i]];
      return i;
    };
    const cl = new Int32Array(n);
    for (let i = 0; i < n; i++) cl[i] = this.clusterAt(cs[i].chain, cs[i].s);
    if (!this.refuseJoins)
      for (let i = 0; i < n; i++)
        for (let k = i + 1; k < n; k++) {
          let join = false;
          if (cs[i].chain === cs[k].chain && Math.abs(dS(this.polys[cs[i].chain], cs[i].s, cs[k].s)) <= this.sigma)
            join = true;
          else if (cl[i] >= 0 && cl[i] === cl[k]) join = true;
          if (join) par[find(i)] = find(k);
        }
    else this.joinGroups(cs, cl, par, find);
    // Groups.
    const groups = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const r = find(i);
      const l = groups.get(r);
      if (l) l.push(i);
      else groups.set(r, [i]);
    }
    let topZ = -Infinity;
    let topG: number[] | null = null;
    let topNear = -1;
    const insideGroups: number[][] = [];
    for (const g of groups.values()) {
      let near = g[0];
      let inside = false;
      for (const i of g) {
        if (cs[i].d < cs[near].d) near = i;
        if (cs[i].d < this.h) inside = true;
      }
      if (!inside) {
        const seen = new Set<number>();
        for (const i of g)
          if (cl[i] >= 0 && !seen.has(cl[i])) {
            seen.add(cl[i]);
            for (const k of this.clusters[cl[i]].corners)
              if (this.inFill(k, x, y)) {
                inside = true;
                break;
              }
            if (inside) break;
          }
      }
      if (!inside) continue;
      insideGroups.push(g);
      const c = cs[near];
      const z = this.depthAt(c.chain, c.s);
      let better = false;
      if (topG === null || z > topZ + 1e-6) better = true;
      else if (Math.abs(z - topZ) <= 1e-6) {
        const idN = this.idOf[c.chain];
        const idT = this.idOf[cs[topNear].chain];
        if (idN > idT || (idN === idT && c.s > cs[topNear].s)) better = true;
      }
      if (better) {
        topZ = z;
        topG = g;
        topNear = near;
      }
    }
    if (this.recordGroups)
      this.lastEval = {
        cands: cs.map((c) => ({ ...c })),
        cl: Array.from(cl),
        groups: [...groups.values()],
        inside: insideGroups,
        top: topG,
        topNear,
      };
    const describe = (g: number[]) => {
      const wins = new Map<number, [number, number][]>();
      const cls = new Set<number>();
      for (const i of g) {
        const c = cs[i];
        if (cl[i] >= 0) {
          cls.add(cl[i]);
          for (const [pi, l] of this.clusters[cl[i]].spans) {
            const w = wins.get(pi) ?? [];
            for (const iv of l) w.push([iv[0], iv[1]]);
            wins.set(pi, w);
          }
        } else {
          const w = wins.get(c.chain) ?? [];
          w.push([c.s - this.lambda, c.s + this.lambda]);
          wins.set(c.chain, w);
        }
      }
      return { wins, cls };
    };
    if (topG) {
      out.inside = true;
      const { wins, cls } = describe(topG);
      const d = this.groupDist(x, y, wins, cls, this.dMax);
      out.F = Math.min(d, this.dMax);
      out.ink = d <= this.W;
      const c = cs[topNear];
      out.topChain = this.idOf[c.chain];
      out.topS = c.s;
      out.top = cls.size > 0 ? 100000 + Math.min(...cls) : this.idOf[c.chain];
      if (this.hookLook !== "now" && this.hooks.length) this.hookAdjust(x, y, out, cls);
      return out;
    }
    if (!wantField) return out;
    let best = this.dMax;
    for (const g of groups.values()) {
      const { wins, cls } = describe(g);
      const d = this.groupDist(x, y, wins, cls, this.dMax);
      if (d < best) best = d;
    }
    out.F = -best;
    return out;
  }
}

// ---------------------------------------------------------------------------
// Rendering

export interface Camera {
  worldToCss: [number, number, number, number, number, number];
  dpr: number;
}

export interface RenderRect {
  /** Device-pixel rectangle of the output. */
  x0: number;
  y0: number;
  w: number;
  h: number;
}

export interface OracleRender {
  w: number;
  h: number;
  rgba: Uint8Array;
  /** Ink coverage per device pixel, 0..1. */
  cov: Float32Array;
  /** Signed distance at pixel centres, in CSS px (world × pxPerUnit). */
  F: Float32Array;
  top: Int32Array;
  ms: number;
}

export function invertCamera(cam: Camera): (px: number, py: number) => [number, number] {
  const [a, b, c, d, e, f] = cam.worldToCss;
  const det = a * d - b * c;
  return (cx: number, cy: number) => {
    const u = cx - e;
    const v = cy - f;
    return [(d * u - c * v) / det, (-b * u + a * v) / det];
  };
}

export function hexRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

export function renderOracle(model: FieldModel, cam: Camera, rect: RenderRect, ss: number): OracleRender {
  const t0 = Date.now();
  const inv = invertCamera(cam);
  const ppu = Math.hypot(cam.worldToCss[0], cam.worldToCss[1]);
  const paper = hexRgb(model.scene.look.paper);
  const ink = hexRgb(model.scene.look.ink);
  const N = rect.w * rect.h;
  const rgba = new Uint8Array(N * 4);
  const cov = new Float32Array(N);
  const F = new Float32Array(N);
  const top = new Int32Array(N);
  for (let j = 0; j < rect.h; j++)
    for (let i = 0; i < rect.w; i++) {
      const o = j * rect.w + i;
      const px = rect.x0 + i;
      const py = rect.y0 + j;
      const [wx, wy] = inv((px + 0.5) / cam.dpr, (py + 0.5) / cam.dpr);
      const e = model.evalPoint(wx, wy, true);
      F[o] = e.F * ppu;
      top[o] = e.top;
      let k = 0;
      // A subsample is ink only within W of some exposed outline, so a pixel
      // whose centre is farther than W + 2 device px from every exposed
      // primitive has no ink (whichever group owns each subsample).
      // (K909 hook look "carry" and K915's "seam" draw a border inside a
      // group: no gate. K915 ink "surface" draws switch lines inside
      // overlaps: no gate there.)
      if (model.inkMode !== "label" && model.hookLook !== "carry" && model.hookLook !== "seam" && !(model.inkMode === "surface" && model.lastOverlap) && model.nearestExposed(wx, wy, model.W + 2 / ppu / cam.dpr) > model.W + 2 / ppu / cam.dpr) {
        k = 0;
      } else {
        for (let sj = 0; sj < ss; sj++)
          for (let si = 0; si < ss; si++) {
            const [sx, sy] = inv((px + (si + 0.5) / ss) / cam.dpr, (py + (sj + 0.5) / ss) / cam.dpr);
            if (model.evalPoint(sx, sy, false).ink) k++;
          }
      }
      const cv = k / (ss * ss);
      cov[o] = cv;
      rgba[o * 4] = Math.round(paper[0] + (ink[0] - paper[0]) * cv);
      rgba[o * 4 + 1] = Math.round(paper[1] + (ink[1] - paper[1]) * cv);
      rgba[o * 4 + 2] = Math.round(paper[2] + (ink[2] - paper[2]) * cv);
      rgba[o * 4 + 3] = 255;
    }
  return { w: rect.w, h: rect.h, rgba, cov, F, top, ms: Date.now() - t0 };
}

export { normS };

/** K915 ink "label": a visible member (chain index, s, cluster, z; a fill is its cluster alone). */
type Vis = { chain: number; s: number; J: number; z: number; fill: boolean };
/** K915 ink "label": the visible-member cache (st: 0 unknown, 1 paper, 2 a foot, 3 a fill). */
type LabGrid = { x0: number; y0: number; g: number; nx: number; ny: number; st: Int8Array; ch: Int32Array; J: Int32Array; s: Float32Array; z: Float32Array };
