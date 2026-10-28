// K868 S1b: the CPU oracle (docs/design/K868_field_border.md §3, §5).
// Reads only a FieldScene; shares no code with the app's renderer.
//
// Per point p: candidates (local minima of |p − c_i(s)| within reach) join
// into groups by union-find (same chain within σ; arms of one junction
// cluster inside its spans); the top group containing p (depth = z of its
// nearest member, ties to the higher chain id) owns p; ink iff the exact
// distance from p to that group's EXPOSED outline is ≤ W. Depth comes from
// the crossing table (S2, depth.ts) unless `depth: "scene"` asks for the
// scene's z samples (physics zPos, S1b's rule).
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
import { type DepthChain, diagramDepth } from "./depth";
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
  /** S2 (§3.3): "diagram" (default) pins ±depthAmp at each crossing's passes
   * and blends between them (depth.ts); "scene" uses the scene's z samples
   * (physics zPos), S1b's rule, kept for comparison. */
  depth?: "diagram" | "scene";
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
  /** K883 census: when set, evalPoint records its candidates and groups in lastEval. */
  recordGroups = false;
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
    for (const x of scene.crossings) {
      const ov = x.over === "a" ? x.a : x.b;
      const un = x.over === "a" ? x.b : x.a;
      for (const [ps, z] of [
        [ov, amp],
        [un, -amp],
      ] as const) {
        const pi = this.idxOf.get(ps.chain);
        if (pi === undefined) continue;
        this.depthChains[pi].pins.push({ s: normS(this.polys[pi], ps.s), z });
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

    // 3. Spans and clusters (§3.4).
    const jSpans = this.buildSpans(scene, k883, g2Of);
    let rMax = 0;
    for (const c of this.corners) {
      rMax = Math.max(rMax, c.r);
      if (c.g2?.ok) rMax = Math.max(rMax, c.g2.webA, c.g2.webB);
    }
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

    this.grid = new SegGrid(this.polys, Math.max(h, this.reach / 2), this.reach + 4 * h);

    // 4. Primitives and their exposure (§3.5).
    this.buildPrims();
    this.buildPrimGrid();
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
    // Crossing passes per chain, with the acute crossing angle.
    const passes = scene.crossings.map((cx) => {
      const ia = this.idxOf.get(cx.a.chain);
      const ib = this.idxOf.get(cx.b.chain);
      if (ia === undefined || ib === undefined) return null;
      const ta = pointAt(this.polys[ia], normS(this.polys[ia], cx.a.s));
      const tb = pointAt(this.polys[ib], normS(this.polys[ib], cx.b.s));
      const th = Math.asin(Math.min(1, Math.abs(cross(ta.tx, ta.ty, tb.tx, tb.ty))));
      return { ia, ib, sa: cx.a.s, sb: cx.b.s, th };
    });
    // Which junction arms' spans contain (pi, s).
    const inSpan = (p: Poly, lo: number, hi: number, s: number): boolean => {
      if (!p.closed) return s >= lo && s <= hi;
      for (const sh of [-p.len, 0, p.len]) if (s + sh >= lo && s + sh <= hi) return true;
      return false;
    };
    const holders = (sp: [number, number, number, number][][], pi: number, s: number): [number, number][] => {
      const out: [number, number][] = [];
      sp.forEach((l, ji) => {
        for (const [q, lo, hi, ai] of l) if (q === pi && inSpan(this.polys[pi], lo, hi, s)) out.push([ji, ai]);
      });
      return out;
    };
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
    // Stop an arm short of a pass: the overlap of two tubes crossing at θ
    // reaches h·cot(θ/2) along each pass; then a margin of h/2.
    const cutAt = (ji: number, ai: number, s: number, th: number, cx: number) => {
      const arm = scene.junctions[ji].arms[ai];
      const p = this.polys[this.idxOf.get(arm.chain)!];
      const d = arm.dir * dS(p, arm.s, s);
      const near = h / Math.tan(Math.max(th, 1e-3) / 2) + 0.5 * h;
      setCap(ji, ai, Math.max(0, d - near), `crossing ${cx}'s pass ${(d / h).toFixed(2)}h out`);
    };
    const tries = new Map<number, number>();
    let sp = this.rawSpans(ext0, caps);
    for (let it = 0; it < 12; it++) {
      const roots2 = clusterRoots(sp);
      let changed = false;
      passes.forEach((ps, cx) => {
        if (!ps) return;
        const ha = holders(sp, ps.ia, ps.sa);
        const hb = holders(sp, ps.ib, ps.sb);
        if (!ha.length || !hb.length) return;
        const ca = new Set(ha.map(([ji]) => roots2[ji]));
        if (!hb.some(([ji]) => ca.has(roots2[ji]))) return;
        // Both passes in one cluster: stop the arm(s) farther from their root.
        const far = (hs: [number, number][], pi: number, s: number) =>
          Math.max(...hs.map(([ji, ai]) => Math.abs(dS(this.polys[pi], scene.junctions[ji].arms[ai].s, s))));
        const n = (tries.get(cx) ?? 0) + 1;
        tries.set(cx, n);
        const fa = far(ha, ps.ia, ps.sa);
        const fb = far(hb, ps.ib, ps.sb);
        if (n > 1 || fa >= fb) for (const [ji, ai] of ha) cutAt(ji, ai, ps.sa, ps.th, cx);
        if (n > 1 || fb > fa) for (const [ji, ai] of hb) cutAt(ji, ai, ps.sb, ps.th, cx);
        changed = true;
      });
      sp = this.rawSpans(ext0, caps);
      if (!changed) break;
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
      if (!(over() > 1e-9 * h)) continue;
      const why = capA - Math.abs(dS(pa, c.armA.s, c.sTA)) < capB - Math.abs(dS(pb, c.armB.s, c.sTB))
        ? this.armCaps[c.junction][c.armIdxA!].why
        : this.armCaps[c.junction][c.armIdxB!].why;
      const r0 = c.r;
      let r = Math.min(c.r, Math.max(0, room()) * Math.tan(c.theta / 2));
      let fit = this.solveCorner(c.junction, c.index, c.armA, c.a, c.armB, c.b, c.theta, c.style, r);
      for (let it = 0; it < 6 && r > 0; it++) {
        const o = Math.max(
          Math.abs(dS(pa, c.armA.s, fit.sTA)) - (capA - this.W),
          Math.abs(dS(pb, c.armB.s, fit.sTB)) - (capB - this.W),
        );
        if (!(o > 1e-6 * h) && fit.ok) break;
        r = Math.max(0, r - Math.max(o, 0.02 * h) * Math.tan(c.theta / 2));
        if (r < 1e-3 * h) r = 0;
        fit = this.solveCorner(c.junction, c.index, c.armA, c.a, c.armB, c.b, c.theta, c.style, r);
      }
      Object.assign(c, { ...fit, cluster: c.cluster, armIdxA: c.armIdxA, armIdxB: c.armIdxB, rRule: c.rRule });
      c.fit = `r ${(r0 / h).toFixed(3)}h → ${(c.r / h).toFixed(3)}h: ${why}${room() <= 0 ? " (no room past V: sharp)" : ""}`;
    }
    for (const c of this.corners) g2Of(c);
    const ext1 = this.armExtents(true);
    const out = this.rawSpans(ext1, caps);
    this.junctionSpans = out;
    return out;
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
  ): Corner {
    const h = this.h;
    const pa = this.polys[a];
    const pb = this.polys[b];
    const half = theta / 2;
    const reachQ = (h + r) / Math.max(Math.sin(half), 1e-3);
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
    const newton = (delta: number, x0: number, y0: number): Sol => {
      let x = x0;
      let y = y0;
      let ok = false;
      let fA = footInWindow(pa, x, y, winA[0], winA[1]);
      let fB = footInWindow(pb, x, y, winB[0], winB[1]);
      for (let it = 0; it < 200; it++) {
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
        const lim = 0.5 * Math.max(delta, h);
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
      rRule: r,
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
      const qq = solve(h + r);
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
      const fA = footInWindow(pa, qq.x, qq.y, winA[0], winA[1]);
      const fB = footInWindow(pb, qq.x, qq.y, winB[0], winB[1]);
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
    if (this.params.depth === "scene") return zAt(this.polys[pi], s);
    return diagramDepth(this.depthChains[pi], this.depthWin, s);
  }

  /** Cluster containing (chain, s) in its span, or −1. */
  clusterAt(pi: number, s: number): number {
    const p = this.polys[pi];
    for (const [lo, hi, ci] of this.chainSpans[pi]) {
      if (!p.closed) {
        if (s >= lo && s <= hi) return ci;
      } else for (const sh of [-p.len, 0, p.len]) if (s + sh >= lo && s + sh <= hi) return ci;
    }
    return -1;
  }

  evalPoint(x: number, y: number, wantField = true): PointEval {
    const out: PointEval = { inside: false, ink: false, F: -this.dMax, top: -1, topChain: -1, topS: 0 };
    if (this.recordGroups) this.lastEval = null;
    candidates(this.grid, x, y, this.reach, this.cands);
    const cs = this.cands;
    const n = cs.length;
    if (n === 0) return out;
    // Union-find.
    const par = new Int32Array(n);
    for (let i = 0; i < n; i++) par[i] = i;
    const find = (i: number): number => {
      while (par[i] !== i) i = par[i] = par[par[i]];
      return i;
    };
    const cl = new Int32Array(n);
    for (let i = 0; i < n; i++) cl[i] = this.clusterAt(cs[i].chain, cs[i].s);
    for (let i = 0; i < n; i++)
      for (let k = i + 1; k < n; k++) {
        let join = false;
        if (cs[i].chain === cs[k].chain && Math.abs(dS(this.polys[cs[i].chain], cs[i].s, cs[k].s)) <= this.sigma)
          join = true;
        else if (cl[i] >= 0 && cl[i] === cl[k]) join = true;
        if (join) par[find(i)] = find(k);
      }
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
      if (model.nearestExposed(wx, wy, model.W + 2 / ppu / cam.dpr) > model.W + 2 / ppu / cam.dpr) {
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
