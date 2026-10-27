// K868 S1b: the CPU oracle (docs/design/K868_field_border.md §3, §5).
// Reads only a FieldScene; shares no code with the app's renderer.
//
// Per point p: candidates (local minima of |p − c_i(s)| within reach) join
// into groups by union-find (same chain within σ; arms of one junction
// cluster inside its spans); the top group containing p (depth = z of its
// nearest member, ties to the higher chain id) owns p; ink iff the exact
// distance from p to that group's EXPOSED outline is ≤ W.
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

    // 2. Corners (§3.7).
    let rMax = 0;
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
        this.corners.push(c);
        rMax = Math.max(rMax, c.r);
      }
    });
    this.reach = 2 * h + this.W + 2 * rMax;

    // 3. Spans and clusters (§3.4).
    const armExt = new Map<string, number>();
    const key = (ji: number, arm: SceneArm) => `${ji}:${arm.chain}:${arm.s}:${arm.dir}`;
    for (const c of this.corners) {
      const pa = this.polys[c.a];
      const pb = this.polys[c.b];
      const fa = c.r > 0 ? c.sTA : c.sVA;
      const fb = c.r > 0 ? c.sTB : c.sVB;
      const ea = Math.abs(dS(pa, c.armA.s, fa));
      const eb = Math.abs(dS(pb, c.armB.s, fb));
      const ka = key(c.junction, c.armA);
      const kb = key(c.junction, c.armB);
      armExt.set(ka, Math.max(armExt.get(ka) ?? 0, ea));
      armExt.set(kb, Math.max(armExt.get(kb) ?? 0, eb));
    }
    const jSpans: [number, number, number][][] = scene.junctions.map(() => []); // [poly, lo, hi]
    scene.junctions.forEach((j, ji) => {
      for (const arm of j.arms) {
        const pi = this.idxOf.get(arm.chain);
        if (pi === undefined) continue;
        const p = this.polys[pi];
        const e = (armExt.get(key(ji, arm)) ?? h) + this.W + this.margin;
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
        jSpans[ji].push([pi, lo, hi]);
      }
    });
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
    const winA: [number, number] = [A.s - Lw, A.s + Lw];
    const winB: [number, number] = [B.s - Lw, B.s + Lw];
    const ua = this.armDir(pa, A, this.params.openingChord ?? 2 * h);
    const root = pointAt(pa, A.s);
    const ca = Math.cos(half);
    const sa = Math.sin(half);
    const bis: [number, number] = [ua[0] * ca - ua[1] * sa, ua[0] * sa + ua[1] * ca];
    const solve = (delta: number): { x: number; y: number; res: number; fa: number; fb: number; sA: number; sB: number; ok: boolean } => {
      let x = root.x + bis[0] * (delta / Math.max(sa, 1e-3));
      let y = root.y + bis[1] * (delta / Math.max(sa, 1e-3));
      let ok = false;
      let fA = footInWindow(pa, x, y, winA[0], winA[1]);
      let fB = footInWindow(pb, x, y, winB[0], winB[1]);
      for (let it = 0; it < 80; it++) {
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
    };
    if (!v.ok) this.diagnostics.push(`corner j${ji}/${index}: V solve residual ${v.res.toExponential(2)}`);
    if (r > 0) {
      const qq = solve(h + r);
      c.ok = c.ok && qq.ok;
      c.resQ = qq.res;
      if (!qq.ok) this.diagnostics.push(`corner j${ji}/${index}: q solve residual ${qq.res.toExponential(2)}`);
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

  /** Is (x, y) inside corner c's fill: the curvilinear triangle V, t_A, t_B? */
  inFill(ci: number, x: number, y: number): boolean {
    const c = this.corners[ci];
    if (c.r <= 0 || !c.ok) return false;
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
      const z = zAt(this.polys[c.chain], c.s);
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
