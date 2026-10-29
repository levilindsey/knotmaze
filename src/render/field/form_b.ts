// K1040 S1: form B, the junction look's definition (F2 of
// docs/design/K1040_junction_field.md), evaluated in float64 on the CPU.
//
// The reference every GPU stage of the redesign is checked against. A pure
// function of the frame (a FieldScene): no state between frames, no march,
// no walk with a step. Nothing in the app imports it.
//
// Per frame (the constructor): chains with END arms extended to c′, the
// pinned-hat depth per sample (depth.ts), groups (junction clusters joined
// by a run with no crossing), each arm's span [root, cap] with its cap as a
// min over a fixed candidate set, and one corner per cyclically adjacent
// arm pair (V, θ, r0, fit, r_max by bisection, q by Newton from V, the
// tracked feet t_a, t_b, the overlap gate ω).
//
// Per pixel (evalPoint): the pieces (local minima of |p − c_i(s)|, one per
// chain within σ), their surfaces, the top surface, and the ink as the max
// over the exposed-outline terms (side feet with burial, the corners'
// endpoints, the fillet arcs), each weighted by its exposure.
//
// Calls settled while building it (brief K1040_s1_reference.md, Findings):
// - Q1, a surface's z at a pixel: the CONE KEY. Every covering piece keys
//   z − d/K (K = h/zt by default); a surface's key is the max over its
//   covering pieces and fills, the top surface is the max key, and the
//   label is the max-key piece (among equal z: the nearest). That is one
//   depth test over pieces, it is continuous, and it breaks the equal-z
//   ties of one chain's segments by distance instead of draw order (K1033).
//   `coneK: Infinity` gives the max form (z alone, ties by distance).
// - Q2, the cap at both ends of a burial pair: B buries A's foot with
//   weight ramp_B · ramp_A (`capBoth`, default on), so a foot that leaves
//   its group at its own cap is already exposed when it leaves.
// - D1, the fold: one chain's minima within σ merge (the nearer is kept).
//   Of two kept minima of one chain within 2σ, the farther one's own terms
//   and its burial of others are weighted ss(σ, 2σ, Δs), so a minimum
//   enters at weight 0 where the merge lets it go.
// - The band: a side foot's and an arc's term use the two-sided band
//   band(D) · ss(−aa, aa, D) (the strip's reach: W + aa inside, aa
//   outside); an endpoint's term (D ≥ 0) counts only inside its surface.
// - A fill covers at weight ω: a pixel covered by its surface only through
//   fills mixes that surface's ink over what lies below by the fill's ω.

import type { FieldScene } from "./scene";
import { candidates, closestOnSeg, dS, footInWindow, makePoly, normS, pointAt, segB, segOfS, SegGrid, zAt } from "./geom";
import type { Cand, Foot, Poly } from "./geom";
import { diagramDepth } from "./depth";
import type { DepthChain } from "./depth";

export function ss(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export interface FormBParams {
  /** Device px per CSS px (default: the scene camera's dpr). */
  dpr?: number;
  /** Half the AA ramp, world units (default half a device px). */
  aa?: number;
  /** D1: σ (default π h). */
  sigma?: number;
  /** D2: the cap ramp λ (default h). */
  capw?: number;
  /** D4: ε_z (default 0.1 amp). */
  zt?: number;
  /** Q1: key = z − d/K (default h/zt); Infinity is the max form. */
  coneK?: number;
  /** D6: the overlap gate's width (default 0.05 h). */
  ovw?: number;
  /** Corner radius share, cr in r0 = (cr/3)·min(2h, 1.5h·tan(θ/2)) (default look.cuspRadius, else 3). */
  cr?: number;
  /** Q2: fade a burial by both pieces' cap ramps (default true). */
  capBoth?: boolean;
  /** D1: the fold fade (default true). */
  fold?: boolean;
  /** Depth window, arc length (default look.depthWindow · (look.ctrlArc ?? 1)). */
  depthWindow?: number;
  /**
   * Probes and pins only (S1b): hold a fade at one value wherever it applies,
   * to sweep it across 0..1 on a fixed frame. fold: every fold pair's far
   * piece weight; omega: every corner's ω; cap: the cap ramp inside its ramp;
   * tie: the tie mix's t wherever it mixes.
   */
  force?: { fold?: number; omega?: number; cap?: number; tie?: number };
  /** Probes only (S1b): the fill's key from the nearer tangent point's z (default), or always A's or B's. */
  fillKey?: "nearer" | "a" | "b";
}

export const T_NONE = 0;
export const T_FOOT = 1;
export const T_TA = 2;
export const T_TB = 3;
export const T_V = 4;
export const T_ARC = 5;
export const TERM_NAMES = ["none", "foot", "tA", "tB", "V", "arc"];

/** Fade bits: which of F3's fades was active (strictly inside its width) at the pixel. */
export const F_FOLD = 1;
export const F_CAP = 2;
export const F_TIE = 4;
export const F_OMEGA = 8;

export interface Arm {
  j: number;
  g: number;
  pi: number;
  /** Root: the junction's s on the chain (through) or the chain's end at c′ (END). */
  sR: number;
  dir: number;
  kind: "through" | "end";
  /** Span length from the root (min over the fixed candidate set, ≥ 0). */
  L: number;
  /** The crossing-cut candidates' min (Infinity if none on the run): the cap ramp's end. */
  Lcut: number;
  /** Outward unit direction (root to 2h along the arm) and its angle. */
  ux: number;
  uy: number;
  ang: number;
  /** Index in the export's arms[]. */
  ei: number;
}

export interface Corner {
  j: number;
  g: number;
  a: number;
  b: number;
  ok: boolean;
  style: number;
  theta: number;
  r0: number;
  r1: number;
  r: number;
  room: number;
  Vx: number;
  Vy: number;
  qx: number;
  qy: number;
  tax: number;
  tay: number;
  tbx: number;
  tby: number;
  /** V's feet and the ball's feet, as distance from each arm's root. */
  dVa: number;
  dVb: number;
  dA: number;
  dB: number;
  /** The ball's feet's chain s and segment. */
  sA: number;
  sB: number;
  kA: number;
  kB: number;
  zA: number;
  zB: number;
  omega: number;
  ov: number;
  /** |V − q|. */
  rV: number;
}

export interface Piece {
  idx: number;
  chain: number;
  s: number;
  d: number;
  fx: number;
  fy: number;
  /** Nearest segment, and the vertex index when the minimum sits on a vertex (−1 inside a segment). */
  k: number;
  vtx: number;
  z: number;
  key: number;
  g: number;
  surf: number;
  ramp: number;
  /** D1: this piece's own weight and its burial weight (the farther of a fold pair). */
  selfW: number;
}

export interface Term {
  kind: number;
  surf: number;
  chain: number;
  s: number;
  k: number;
  vtx: number;
  corner: number;
  D: number;
  w: number;
  v: number;
}

export interface PixelEval {
  ink: number;
  /** Top surface: a group index, OWN + piece index for a piece that is its own surface, −1 for paper. */
  top: number;
  chain: number;
  s: number;
  z: number;
  key: number;
  /** The winning term (null when no term inks). */
  term: Term | null;
  fade: number;
  /** Covering surfaces, and |Δz|, |Δkey| between the top two (Infinity with one). */
  nSurf: number;
  dz: number;
  dkey: number;
  /** Distance to the top surface's exposed outline: min D over its terms of weight ≥ 1/2. */
  Dexp: number;
}

export const OWN = 1 << 20;

interface SurfEntry {
  id: number;
  key: number;
  z: number;
  chain: number;
  s: number;
  pieceCover: boolean;
  fillW: number;
}

const EMPTY: Cand[] = [];

export class FormB {
  readonly scene: FieldScene;
  readonly h: number;
  readonly W: number;
  readonly aa: number;
  readonly ppuDev: number;
  readonly sigma: number;
  readonly lambda: number;
  readonly zt: number;
  readonly K: number;
  readonly ovw: number;
  readonly cr: number;
  readonly capBoth: boolean;
  readonly fold: boolean;
  readonly force: NonNullable<FormBParams["force"]>;
  readonly fillKey: "nearer" | "a" | "b";
  readonly polys: Poly[];
  readonly idxOf = new Map<number, number>();
  readonly grid: SegGrid;
  readonly depthChains: DepthChain[];
  readonly depthWin: number;
  readonly arms: Arm[] = [];
  readonly armsOf: number[][];
  /** Junction index → group (cluster) index. */
  readonly groupOf: number[];
  readonly nGroups: number;
  readonly corners: Corner[] = [];
  readonly diagnostics: string[] = [];
  /** Per chain: crossing passes (s, θ_c) on it. */
  readonly passes: { s: number; theta: number }[][];
  private cgrid = new Map<number, number[]>();
  private readonly cell: number;
  private cbuf: Cand[] = [];

  constructor(scene: FieldScene, params: FormBParams = {}) {
    this.scene = scene;
    const look = scene.look;
    const h = look.halfWidth;
    this.h = h;
    this.W = look.band;
    const dpr = params.dpr ?? scene.camera.dpr;
    this.ppuDev = scene.camera.pxPerUnit * dpr;
    this.aa = params.aa ?? 0.5 / this.ppuDev;
    this.sigma = params.sigma ?? Math.PI * h;
    this.lambda = params.capw ?? h;
    this.zt = params.zt ?? 0.1 * look.depthAmp;
    this.K = params.coneK ?? h / this.zt;
    this.ovw = params.ovw ?? 0.05 * h;
    this.cr = params.cr ?? look.cuspRadius ?? 3;
    this.capBoth = params.capBoth ?? true;
    this.fold = params.fold ?? true;
    this.force = params.force ?? {};
    this.fillKey = params.fillKey ?? "nearer";

    // 1. Chains; END arms extended to c′ (the nearest point of a through's centreline).
    scene.chains.forEach((c, i) => this.idxOf.set(c.id, i));
    const raw = scene.chains.map((c, i) => makePoly(i, c.pts, null, c.closed));
    const ext: { start?: [number, number]; end?: [number, number] }[] = raw.map(() => ({}));
    for (const j of scene.junctions) {
      for (const arm of j.arms) {
        if (arm.kind !== "end") continue;
        const pi = this.idxOf.get(arm.chain);
        if (pi === undefined) continue;
        const p = raw[pi];
        const term = pointAt(p, arm.s);
        let cp: [number, number] = [j.c[0], j.c[1]];
        let best = Infinity;
        for (const t of j.arms) {
          if (t.kind !== "through") continue;
          const ti = this.idxOf.get(t.chain);
          if (ti === undefined) continue;
          const f = footInWindow(raw[ti], term.x, term.y, t.s - 4 * h, t.s + 4 * h);
          if (f.d < best) {
            best = f.d;
            cp = [f.x, f.y];
          }
        }
        if (Math.abs(arm.s - p.s0) < Math.abs(arm.s - (p.s0 + p.len))) ext[pi].start = cp;
        else ext[pi].end = cp;
      }
    }
    this.polys = scene.chains.map((c, i) => {
      const e = ext[i];
      if (!e.start && !e.end) return raw[i];
      const pts = Array.from(c.pts);
      let s0 = 0;
      if (e.start) {
        const d = Math.hypot(pts[0] - e.start[0], pts[1] - e.start[1]);
        if (d > 1e-9) {
          pts.unshift(e.start[0], e.start[1]);
          s0 = -d;
        }
      }
      if (e.end) {
        const m = pts.length;
        const d = Math.hypot(pts[m - 2] - e.end[0], pts[m - 1] - e.end[1]);
        if (d > 1e-9) pts.push(e.end[0], e.end[1]);
      }
      return makePoly(i, pts, null, c.closed, s0);
    });

    // 2. Depth: §3.3's pinned hats per sample (depth.ts), interpolated along segments.
    const amp = look.depthAmp;
    this.depthWin = params.depthWindow ?? look.depthWindow * (look.ctrlArc ?? 1);
    this.depthChains = this.polys.map((p) => ({ closed: p.closed, s0: p.s0, len: p.len, pins: [] }));
    this.passes = this.polys.map(() => []);
    for (const x of scene.crossings) {
      const ia = this.idxOf.get(x.a.chain);
      const ib = this.idxOf.get(x.b.chain);
      if (ia === undefined || ib === undefined) continue;
      const sa = normS(this.polys[ia], x.a.s);
      const sb = normS(this.polys[ib], x.b.s);
      const ta = pointAt(this.polys[ia], sa);
      const tb = pointAt(this.polys[ib], sb);
      const theta = Math.acos(Math.min(1, Math.abs(ta.tx * tb.tx + ta.ty * tb.ty)));
      this.passes[ia].push({ s: sa, theta });
      this.passes[ib].push({ s: sb, theta });
      this.depthChains[ia].pins.push({ s: sa, z: x.over === "a" ? amp : -amp });
      this.depthChains[ib].pins.push({ s: sb, z: x.over === "b" ? amp : -amp });
    }
    for (const d of this.depthChains) d.pins.sort((u, v) => u.s - v.s);
    this.polys.forEach((p, i) => {
      for (let k = 0; k < p.n; k++) p.z[k] = diagramDepth(this.depthChains[i], this.depthWin, p.s[k]);
    });
    this.grid = new SegGrid(this.polys, Math.max(2 * h, 0.25), 4 * h);

    // 3. Groups: junctions joined by a run with no crossing between their roots.
    const nj = scene.junctions.length;
    const parent = Array.from({ length: nj }, (_, i) => i);
    const find = (i: number): number => {
      while (parent[i] !== i) i = parent[i] = parent[parent[i]];
      return i;
    };
    const roots: { s: number; j: number }[][] = this.polys.map(() => []);
    const armRoot = (pi: number, s: number, kind: string): { sR: number; dir: number } | null => {
      const p = this.polys[pi];
      if (kind === "end") {
        const atStart = Math.abs(s - 0) < Math.abs(s - (p.s0 + p.len)) || Math.abs(s - p.s0) < 1e-9;
        return atStart ? { sR: p.s0, dir: 1 } : { sR: p.s0 + p.len, dir: -1 };
      }
      return { sR: normS(p, s), dir: 0 };
    };
    scene.junctions.forEach((j, ji) => {
      for (const arm of j.arms) {
        const pi = this.idxOf.get(arm.chain);
        if (pi === undefined) continue;
        const r = armRoot(pi, arm.s, arm.kind);
        if (!r) continue;
        if (!roots[pi].some((q) => q.j === ji && Math.abs(q.s - r.sR) < 1e-9)) roots[pi].push({ s: r.sR, j: ji });
      }
    });
    const between = (pi: number, a: number, b: number): boolean => {
      // Is there a crossing pass strictly inside the run from a forward to b?
      const p = this.polys[pi];
      const len = b - a;
      for (const x of this.passes[pi]) {
        let u = x.s - a;
        if (p.closed) u = ((u % p.len) + p.len) % p.len;
        if (u > 1e-9 && u < len - 1e-9) return true;
      }
      return false;
    };
    this.polys.forEach((p, pi) => {
      const r = roots[pi].sort((u, v) => u.s - v.s);
      for (let i = 0; i + 1 < r.length; i++) if (!between(pi, r[i].s, r[i + 1].s)) parent[find(r[i].j)] = find(r[i + 1].j);
      if (p.closed && r.length > 1) {
        const a = r[r.length - 1];
        const b = r[0];
        if (!between(pi, a.s, b.s + p.len)) parent[find(a.j)] = find(b.j);
      }
    });
    const gid = new Map<number, number>();
    this.groupOf = scene.junctions.map((_, ji) => {
      const r = find(ji);
      if (!gid.has(r)) gid.set(r, gid.size);
      return gid.get(r)!;
    });
    this.nGroups = gid.size;

    // Arms and their spans: L = min(chain end, next root, each crossing cut d_c − h·cot(θ_c/2) − h).
    this.armsOf = this.polys.map(() => []);
    scene.junctions.forEach((j, ji) => {
      j.arms.forEach((arm, ei) => {
        const pi = this.idxOf.get(arm.chain);
        if (pi === undefined) return;
        const p = this.polys[pi];
        const r = armRoot(pi, arm.s, arm.kind)!;
        const dir = arm.kind === "end" ? r.dir : arm.dir;
        const sR = r.sR;
        const delta = (s: number): number => {
          let d = (s - sR) * dir;
          if (p.closed) d = ((d % p.len) + p.len) % p.len;
          return d;
        };
        let L = p.closed ? p.len : dir > 0 ? p.s0 + p.len - sR : sR - p.s0;
        for (const q of roots[pi]) {
          const d = delta(q.s);
          if (d > 1e-9 && d < L) L = d;
        }
        let Lcut = Infinity;
        for (const x of this.passes[pi]) {
          const d = delta(x.s);
          if (d < -1e-12 || d > L) continue;
          const t = Math.tan(x.theta / 2);
          const c = t > 1e-12 ? d - h / t - h : -Infinity;
          if (c < Lcut) Lcut = c;
        }
        L = Math.max(0, Math.min(L, Lcut));
        const a0 = pointAt(p, sR);
        const a1 = pointAt(p, sR + dir * Math.min(2 * h, Math.max(L, 1e-6)));
        let ux = a1.x - a0.x;
        let uy = a1.y - a0.y;
        const ul = Math.hypot(ux, uy) || 1;
        ux /= ul;
        uy /= ul;
        this.armsOf[pi].push(this.arms.length);
        this.arms.push({ j: ji, g: this.groupOf[ji], pi, sR, dir, kind: arm.kind, L, Lcut, ux, uy, ang: Math.atan2(uy, ux), ei });
      });
    });

    // 4. Corners: one per cyclically adjacent arm pair.
    this.cell = Math.max(2 * h, 0.25);
    scene.junctions.forEach((j, ji) => {
      const ais = this.arms.map((_, i) => i).filter((i) => this.arms[i].j === ji);
      const n = ais.length;
      if (n < 2) return;
      ais.sort((u, v) => this.arms[u].ang - this.arms[v].ang);
      const styles = j.corners ?? [];
      for (let i = 0; i < n; i++) {
        const a = ais[i];
        const b = ais[(i + 1) % n];
        let th = this.arms[b].ang - this.arms[a].ang;
        th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (th <= 1e-6 || th >= Math.PI - 1e-6) continue;
        const ea = this.arms[a].ei;
        const eb = this.arms[b].ei;
        const ne = j.arms.length;
        let st = styles[ea]?.style;
        if ((ea + 1) % ne !== eb && (eb + 1) % ne === ea) st = styles[eb]?.style;
        const style = st === "sharp" ? 0 : 1;
        const c = this.solveCorner(ji, a, b, th, style);
        if (c) this.addCorner(c);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Arms.

  armWindow(ai: number, d0 = 0, d1 = Infinity): [number, number] {
    const a = this.arms[ai];
    const lo = Math.max(0, d0);
    const hi = Math.min(a.L, d1);
    return a.dir > 0 ? [a.sR + lo, a.sR + hi] : [a.sR - hi, a.sR - lo];
  }

  armDist(ai: number, s: number): number {
    const a = this.arms[ai];
    const p = this.polys[a.pi];
    let d = (s - a.sR) * a.dir;
    if (p.closed) d = ((d % p.len) + p.len) % p.len;
    return d;
  }

  footArm(ai: number, x: number, y: number, d0 = 0, d1 = Infinity): Foot {
    const [lo, hi] = this.armWindow(ai, d0, d1);
    return footInWindow(this.polys[this.arms[ai].pi], x, y, lo, hi);
  }

  /** Points at distance rho from both arms (2D Newton from x0, y0). */
  private solveEq(a: number, b: number, rho: number, x0: number, y0: number, wa: [number, number], wb: [number, number]) {
    let x = x0;
    let y = y0;
    const h = this.h;
    for (let it = 0; it < 60; it++) {
      const fa = this.footArm(a, x, y, wa[0], wa[1]);
      const fb = this.footArm(b, x, y, wb[0], wb[1]);
      const Fa = fa.d - rho;
      const Fb = fb.d - rho;
      if (Math.abs(Fa) < 1e-13 * Math.max(1, rho) && Math.abs(Fb) < 1e-13 * Math.max(1, rho)) return { x, y, fa, fb, ok: true };
      if (!(fa.d > 1e-12 && fb.d > 1e-12)) return { x, y, fa, fb, ok: false };
      const gax = (x - fa.x) / fa.d;
      const gay = (y - fa.y) / fa.d;
      const gbx = (x - fb.x) / fb.d;
      const gby = (y - fb.y) / fb.d;
      const det = gax * gby - gay * gbx;
      if (Math.abs(det) < 1e-12) return { x, y, fa, fb, ok: false };
      let dx = (-Fa * gby + Fb * gay) / det;
      let dy = (-Fb * gax + Fa * gbx) / det;
      const dl = Math.hypot(dx, dy);
      if (dl > h) {
        dx *= h / dl;
        dy *= h / dl;
      }
      x += dx;
      y += dy;
      if (it === 59) {
        const ga = this.footArm(a, x, y, wa[0], wa[1]);
        const gb = this.footArm(b, x, y, wb[0], wb[1]);
        const ok = Math.abs(ga.d - rho) < 1e-9 * Math.max(h, rho) && Math.abs(gb.d - rho) < 1e-9 * Math.max(h, rho);
        return { x, y, fa: ga, fb: gb, ok };
      }
    }
    return { x, y, fa: this.footArm(a, x, y), fb: this.footArm(b, x, y), ok: false };
  }

  private solveCorner(ji: number, a: number, b: number, th0: number, style: number): Corner | null {
    const h = this.h;
    const A = this.arms[a];
    const B = this.arms[b];
    if (!(A.L > 1e-9 && B.L > 1e-9)) return null;
    const j = this.scene.junctions[ji];
    // Straight-arm start (proto.js): V = c + bis · h / sin(θ/2).
    let bx = A.ux + B.ux;
    let by = A.uy + B.uy;
    const bl = Math.hypot(bx, by) || 1;
    bx /= bl;
    by /= bl;
    const sn = Math.sin(th0 / 2);
    const full: [number, number] = [0, Infinity];
    const V = this.solveEq(a, b, h, j.c[0] + (bx * h) / sn, j.c[1] + (by * h) / sn, full, full);
    if (!V.ok) {
      this.diagnostics.push(`corner j${j.id} arms ${A.ei},${B.ei}: no V`);
      return null;
    }
    const dVa = this.armDist(a, V.fa.s);
    const dVb = this.armDist(b, V.fb.s);
    const tol = 1e-9 * h;
    if (!(dVa > tol && dVa < A.L - tol && dVb > tol && dVb < B.L - tol)) return null;
    // V must lie in the wedge between the arms (the facing sides).
    const crossA = A.ux * (V.y - j.c[1]) - A.uy * (V.x - j.c[0]);
    const crossB = B.ux * (V.y - j.c[1]) - B.uy * (V.x - j.c[0]);
    const sgn = Math.sign(A.ux * B.uy - A.uy * B.ux);
    if (!(crossA * sgn > 0 && crossB * sgn < 0)) return null;
    const pa = this.polys[A.pi];
    const pb = this.polys[B.pi];
    const ta = pointAt(pa, V.fa.s);
    const tb = pointAt(pb, V.fb.s);
    const theta = Math.acos(Math.max(-1, Math.min(1, A.dir * B.dir * (ta.tx * tb.tx + ta.ty * tb.ty))));
    const t2 = Math.tan(theta / 2);
    const r0 = style * (this.cr / 3) * Math.min(2 * h, 1.5 * h * t2);
    const room = Math.max(0, Math.min(A.L - this.W - dVa, B.L - this.W - dVb));
    const r1 = Math.min(r0, room * t2);
    // Tracked windows: the feet move away from V's feet as r grows.
    const wa: [number, number] = [dVa - h, dVa + 4 * h];
    const wb: [number, number] = [dVb - h, dVb + 4 * h];
    // Direction along which both distances grow at unit rate, from V.
    const gax = (V.x - V.fa.x) / V.fa.d;
    const gay = (V.y - V.fa.y) / V.fa.d;
    const gbx = (V.x - V.fb.x) / V.fb.d;
    const gby = (V.y - V.fb.y) / V.fb.d;
    const det = gax * gby - gay * gbx;
    const ex = Math.abs(det) > 1e-12 ? (gby - gay) / det : bx;
    const ey = Math.abs(det) > 1e-12 ? (gax - gbx) / det : by;
    const solveQ = (r: number) => {
      const q = this.solveEq(a, b, h + r, V.x + ex * r, V.y + ey * r, wa, wb);
      const da = this.armDist(a, q.fa.s);
      const db = this.armDist(b, q.fb.s);
      const lo = tol;
      const feasible = q.ok && da > lo && da < A.L - lo && db > lo && db < B.L - lo && da > wa[0] + lo && da < wa[1] - lo && db > wb[0] + lo && db < wb[1] - lo;
      return { q, da, db, feasible };
    };
    let r = r1;
    let sol = solveQ(r);
    if (r > 0 && !sol.feasible) {
      let lo = 0;
      let hi = r1;
      const eps = 1 / (64 * this.ppuDev);
      while (hi - lo > eps) {
        const m = 0.5 * (lo + hi);
        if (solveQ(m).feasible) lo = m;
        else hi = m;
      }
      r = lo;
      sol = solveQ(r);
      if (!sol.feasible) {
        r = 0;
        sol = solveQ(0);
      }
    }
    const q = sol.q;
    const fa = q.fa;
    const fb = q.fb;
    const tax = fa.x + (h * (q.x - fa.x)) / fa.d;
    const tay = fa.y + (h * (q.y - fa.y)) / fa.d;
    const tbx = fb.x + (h * (q.x - fb.x)) / fb.d;
    const tby = fb.y + (h * (q.y - fb.y)) / fb.d;
    // The overlap gate: how much nearer another part of either arm comes to q than its foot.
    let ov = 0;
    const R = h + r;
    for (const [ai, f] of [
      [a, fa],
      [b, fb],
    ] as const) {
      const arm = this.arms[ai];
      const p = this.polys[arm.pi];
      const out: Cand[] = [];
      candidates(this.grid, q.x, q.y, R, out, arm.pi);
      for (const c of out) {
        const dd = this.armDist(ai, c.s);
        if (dd < 0 || dd > arm.L) continue;
        if (Math.abs(dS(p, c.s, f.s)) < 0.5 * h) continue;
        ov = Math.max(ov, R - c.d);
      }
    }
    const omega = this.force.omega ?? ss(0, 1, 1 - ov / this.ovw);
    return {
      j: ji,
      g: this.groupOf[ji],
      a,
      b,
      ok: true,
      style,
      theta,
      r0,
      r1,
      r,
      room,
      Vx: V.x,
      Vy: V.y,
      qx: q.x,
      qy: q.y,
      tax,
      tay,
      tbx,
      tby,
      dVa,
      dVb,
      dA: sol.da,
      dB: sol.db,
      sA: fa.s,
      sB: fb.s,
      kA: fa.k,
      kB: fb.k,
      zA: zAt(pa, fa.s),
      zB: zAt(pb, fb.s),
      omega,
      ov,
      rV: Math.hypot(V.x - q.x, V.y - q.y),
    };
  }

  private addCorner(c: Corner): void {
    const ci = this.corners.length;
    this.corners.push(c);
    const R = Math.max(c.rV, c.r + this.W) + 2 * this.W + 4 * this.aa;
    const cs = this.cell;
    const x0 = Math.floor((c.qx - R) / cs);
    const x1 = Math.floor((c.qx + R) / cs);
    const y0 = Math.floor((c.qy - R) / cs);
    const y1 = Math.floor((c.qy + R) / cs);
    for (let i = x0; i <= x1; i++)
      for (let k = y0; k <= y1; k++) {
        const key = this.ckey(i, k);
        let l = this.cgrid.get(key);
        if (!l) this.cgrid.set(key, (l = []));
        l.push(ci);
      }
  }

  private ckey(i: number, k: number): number {
    return (i + 32768) * 65536 + (k + 32768);
  }

  cornersNear(x: number, y: number): number[] {
    return this.cgrid.get(this.ckey(Math.floor(x / this.cell), Math.floor(y / this.cell))) ?? [];
  }

  // -------------------------------------------------------------------------
  // Corner geometry per pixel.

  inWedge(c: Corner, x: number, y: number): boolean {
    const rax = c.tax - c.qx;
    const ray = c.tay - c.qy;
    const rbx = c.tbx - c.qx;
    const rby = c.tby - c.qy;
    const wx = x - c.qx;
    const wy = y - c.qy;
    const s = rax * rby - ray * rbx;
    if (Math.abs(s) < 1e-300) return false;
    return (rax * wy - ray * wx) * s >= 0 && (wx * rby - wy * rbx) * s >= 0;
  }

  /**
   * The fill: the curvilinear triangle V, t_a, t_b outside the ball. Its sides
   * reach 2aa into the arms' tubes, where their burial ramps (winW) reach 1,
   * so a fill and a tube that abut at V bury without a dip (S1b F5). With
   * `own`, the piece whose outline point (x, y) is, the side test against
   * own's arm is skipped: the point lies on that side by construction, and
   * the test read polyline rounding (S1b F4).
   */
  inFill(c: Corner, x: number, y: number, own?: Piece): boolean {
    if (!(c.r > 0 && c.omega > 0)) return false;
    const dq = Math.hypot(x - c.qx, y - c.qy);
    // Past V to V', where the two sides' 2aa overlaps meet.
    if (!(dq > c.r) || dq > c.rV + (2 * this.aa) / Math.max(0.1, Math.sin(c.theta / 2)) + 1e-12) return false;
    if (!this.inWedge(c, x, y)) return false;
    const h = this.h;
    const lim = h - 2 * this.aa;
    if (!(own && this.onArm(c.a, own))) {
      const fa = this.footArm(c.a, x, y, 0, Math.max(c.dVa, c.dA) + 2 * h);
      if (fa.d < lim) return false;
    }
    if (own && this.onArm(c.b, own)) return true;
    const fb = this.footArm(c.b, x, y, 0, Math.max(c.dVb, c.dB) + 2 * h);
    return fb.d >= lim;
  }

  /** Is piece A on arm ai (its chain, inside the arm's span)? */
  onArm(ai: number, A: Piece): boolean {
    const a = this.arms[ai];
    if (a.pi !== A.chain) return false;
    const d = this.armDist(ai, A.s);
    return d >= -1e-12 && d <= a.L + 1e-12;
  }

  // -------------------------------------------------------------------------
  // Per pixel.

  /** The group a piece at (chain, s) belongs to, and its cap ramp. */
  member(pi: number, s: number): { g: number; ramp: number } {
    let g = -1;
    let ramp = 0;
    for (const ai of this.armsOf[pi]) {
      const a = this.arms[ai];
      const d = this.armDist(ai, s);
      if (d < -1e-12 || d > a.L + 1e-12) continue;
      const fc = this.force.cap;
      const rp = a.Lcut === Infinity ? 1 : fc !== undefined && d > a.Lcut - this.lambda && d < a.Lcut ? fc : ss(a.Lcut, a.Lcut - this.lambda, d);
      if (g < 0 || rp > ramp) {
        g = a.g;
        ramp = rp;
      }
    }
    return { g, ramp: g < 0 ? 1 : ramp };
  }

  pieces(x: number, y: number, out: Piece[]): number {
    const h = this.h;
    out.length = 0;
    candidates(this.grid, x, y, h + this.W + 2 * this.aa, this.cbuf);
    const cs = this.cbuf.length ? this.cbuf.slice().sort((u, v) => u.d - v.d) : EMPTY;
    let fade = 0;
    const kept: Cand[] = [];
    for (const c of cs) {
      const p = this.polys[c.chain];
      let merged = false;
      for (const q of kept)
        if (q.chain === c.chain && Math.abs(dS(p, q.s, c.s)) <= this.sigma) {
          merged = true;
          break;
        }
      // A merge is no fade (S1b F2): the dropped minimum would enter at weight 0.
      if (merged) continue;
      kept.push(c);
    }
    for (const c of kept) {
      const p = this.polys[c.chain];
      const sg = segOfS(p, c.s);
      let vtx = -1;
      if (sg.t < 1e-9) vtx = sg.k;
      else if (sg.t > 1 - 1e-9) vtx = segB(p, sg.k);
      const m = this.member(c.chain, c.s);
      const z = zAt(p, c.s);
      out.push({
        idx: out.length,
        chain: c.chain,
        s: c.s,
        d: c.d,
        fx: c.fx,
        fy: c.fy,
        k: sg.k,
        vtx,
        z,
        key: this.K === Infinity ? z : z - c.d / this.K,
        g: m.g,
        surf: m.g >= 0 ? m.g : OWN + out.length,
        ramp: m.ramp,
        selfW: 1,
      });
    }
    if (this.fold)
      for (let i = 0; i < out.length; i++)
        for (let k = i + 1; k < out.length; k++) {
          const A = out[i];
          const B = out[k];
          if (A.chain !== B.chain) continue;
          const ds = Math.abs(dS(this.polys[A.chain], A.s, B.s));
          if (ds >= 2 * this.sigma) continue;
          fade |= F_FOLD;
          const far = A.d >= B.d ? A : B;
          far.selfW = Math.min(far.selfW, this.force.fold ?? ss(this.sigma, 2 * this.sigma, ds));
        }
    return fade;
  }

  /** Is (x, y) within h of B's chain, read from ±3 segments around B's nearest segment? */
  insideWin(B: Piece, x: number, y: number): boolean {
    const p = this.polys[B.chain];
    const h2 = this.h * this.h;
    for (let o = -3; o <= 3; o++) {
      let k = B.k + o;
      if (p.closed) k = ((k % p.nseg) + p.nseg) % p.nseg;
      else if (k < 0 || k >= p.nseg) continue;
      const b = segB(p, k);
      if (closestOnSeg(x, y, p.x[k], p.y[k], p.x[b], p.y[b]).d2 < h2) return true;
    }
    return false;
  }

  /**
   * How deep (x, y) lies in B's tube, read from the same window as
   * insideWin: 0 on B's outline, rising to 1 at 2aa inside it. A burial is a
   * ramp, not a cut. It lies inside the tube, so an outline that only touches
   * B (a dead end's cap on a through's far side) stays whole, and the fill
   * overlaps it (inFill), so the two bury without a dip (S1b F5).
   */
  winW(B: Piece, x: number, y: number): number {
    const p = this.polys[B.chain];
    let d2 = Infinity;
    for (let o = -3; o <= 3; o++) {
      let k = B.k + o;
      if (p.closed) k = ((k % p.nseg) + p.nseg) % p.nseg;
      else if (k < 0 || k >= p.nseg) continue;
      const b = segB(p, k);
      d2 = Math.min(d2, closestOnSeg(x, y, p.x[k], p.y[k], p.x[b], p.y[b]).d2);
    }
    return 1 - ss(this.h - 2 * this.aa, this.h, Math.sqrt(d2));
  }

  band(D: number): number {
    return 1 - ss(this.W - this.aa, this.W + this.aa, D);
  }

  band2(D: number): number {
    return this.band(D) * ss(-this.aa, this.aa, D);
  }

  /**
   * S's coverage at (x, y): its pieces' outline AA at their fold weight (a
   * folding far piece fades out whole, ink and cover, finding F3), and its
   * fills at weight ω. fade: F_OMEGA when a partial fill sets it.
   */
  alphaOf(S: number, x: number, y: number, P: Piece[]): { a: number; fade: number } {
    let aP = 0;
    for (const A of P) if (A.surf === S) aP = Math.max(aP, A.selfW * ss(-this.aa, this.aa, this.h - A.d));
    let aF = 0;
    let om = 1;
    if (S < OWN && aP < 1)
      for (const ci of this.cornersNear(x, y)) {
        const c = this.corners[ci];
        if (c.g !== S || !(c.r > 0 && c.omega > 0)) continue;
        const dq = Math.hypot(x - c.qx, y - c.qy);
        if (dq > c.rV * (1 + 1e-9) + 1e-12 || !this.inWedge(c, x, y)) continue;
        const f = c.omega * ss(-this.aa, this.aa, dq - c.r);
        if (f > aF) {
          aF = f;
          om = c.omega;
        }
      }
    return { a: Math.max(aP, aF), fade: aF > aP && om < 1 ? F_OMEGA : 0 };
  }

  /**
   * The ink of surface S at (x, y) as if S were on top, premultiplied by S's
   * coverage a: max over its exposed-outline terms of weight · band. The
   * endpoint discs (t_a, t_b, V) are clipped by a, so no term reaches past S's
   * own outline AA (finding F4).
   */
  inkOf(S: number, x: number, y: number, P: Piece[]): { v: number; term: Term | null; fade: number; Dexp: number; a: number; afade: number } {
    const h = this.h;
    const W = this.W;
    const aa = this.aa;
    let v = 0;
    let term: Term | null = null;
    let fade = 0;
    let Dexp = Infinity;
    const near = S < OWN ? this.cornersNear(x, y) : [];
    const al = this.alphaOf(S, x, y, P);
    const aS = al.a;
    const take = (val: number, t: Term) => {
      if (val > v) {
        v = val;
        term = t;
      }
    };
    for (const A of P) {
      if (A.surf !== S) continue;
      if (!(A.d < h + aa && A.d > h - W - aa && A.d > 1e-12)) continue;
      const fx = A.fx + (h * (x - A.fx)) / A.d;
      const fy = A.fy + (h * (y - A.fy)) / A.d;
      let bur = 0;
      let burBit = 0;
      for (const B of P) {
        if (B === A || B.surf !== S) continue;
        const w = B.ramp * B.selfW * (this.capBoth ? A.ramp : 1);
        if (w <= bur) continue;
        const wb = w * this.winW(B, fx, fy);
        if (wb > bur) {
          bur = wb;
          burBit = w < 1 ? (B.selfW < 1 ? F_FOLD : F_CAP) : 0;
        }
      }
      // A partial fill hands the buried weight to its arc (S1b F6): the
      // term is (1 − ω)·A's band + ω·the arc's band, the two outlines' blend,
      // so the cut at t_a's normal, where the two bands meet, is continuous.
      let arc = 0;
      for (const ci of near) {
        const c = this.corners[ci];
        if (c.g !== S || !(c.omega > bur)) continue;
        if (this.inFill(c, fx, fy, A)) {
          bur = c.omega;
          burBit = F_OMEGA;
          arc = c.omega < 1 ? c.omega * this.band2(Math.hypot(x - c.qx, y - c.qy) - c.r) : 0;
        }
      }
      const w = (1 - bur) * A.selfW;
      const D = h - A.d;
      const b2 = this.band2(D);
      if (b2 > 0) {
        if (bur > 0 && bur < 1) fade |= burBit;
        if (A.selfW < 1) fade |= F_FOLD;
      }
      if (w >= 0.5) Dexp = Math.min(Dexp, D);
      take(w * b2 + arc, { kind: T_FOOT, surf: S, chain: A.chain, s: A.s, k: A.k, vtx: A.vtx, corner: -1, D, w, v: w * b2 + arc });
    }
    for (const ci of near) {
      const c = this.corners[ci];
      if (c.g !== S) continue;
      const om = c.omega;
      const omBit = om > 0 && om < 1 ? F_OMEGA : 0;
      if (aS > 0) {
        if (om > 0) {
          const DA = Math.hypot(x - c.tax, y - c.tay);
          const DB = Math.hypot(x - c.tbx, y - c.tby);
          const bA = aS * this.band(DA);
          const bB = aS * this.band(DB);
          if (bA > 0 || bB > 0) fade |= omBit;
          if (om >= 0.5 && aS >= 0.5) Dexp = Math.min(Dexp, DA, DB);
          take(om * bA, { kind: T_TA, surf: S, chain: this.arms[c.a].pi, s: c.sA, k: c.kA, vtx: -1, corner: ci, D: DA, w: om, v: om * bA });
          take(om * bB, { kind: T_TB, surf: S, chain: this.arms[c.b].pi, s: c.sB, k: c.kB, vtx: -1, corner: ci, D: DB, w: om, v: om * bB });
        }
        if (om < 1) {
          const DV = Math.hypot(x - c.Vx, y - c.Vy);
          const bV = aS * this.band(DV);
          if (bV > 0) fade |= omBit;
          if (1 - om >= 0.5 && aS >= 0.5) Dexp = Math.min(Dexp, DV);
          take((1 - om) * bV, { kind: T_V, surf: S, chain: -1, s: 0, k: -1, vtx: -1, corner: ci, D: DV, w: 1 - om, v: (1 - om) * bV });
        }
      }
      if (c.r > 0 && om > 0 && this.inWedge(c, x, y)) {
        const D = Math.hypot(x - c.qx, y - c.qy) - c.r;
        const b2 = this.band2(D);
        if (b2 > 0) fade |= omBit;
        if (om >= 0.5) Dexp = Math.min(Dexp, Math.max(D, 0));
        take(om * b2, { kind: T_ARC, surf: S, chain: -1, s: 0, k: -1, vtx: -1, corner: ci, D, w: om, v: om * b2 });
      }
    }
    return { v, term, fade, Dexp, a: aS, afade: al.fade };
  }

  private pbuf: Piece[] = [];

  evalPoint(x: number, y: number): PixelEval {
    const h = this.h;
    const aa = this.aa;
    const P = this.pbuf;
    let fade = this.pieces(x, y, P);
    // Every surface whose coverage reaches the pixel, keyed by Q1's cone key
    // (max over its pieces and fills). Covering: a piece within h, or a fill.
    const surf: SurfEntry[] = [];
    const entry = (id: number): SurfEntry => {
      let e = surf.find((u) => u.id === id);
      if (!e) {
        e = { id, key: -Infinity, z: 0, chain: -1, s: 0, pieceCover: false, fillW: 0 };
        surf.push(e);
      }
      return e;
    };
    for (const A of P) {
      if (!(A.d < h + aa)) continue;
      const e = entry(A.surf);
      if (A.d < h && A.selfW >= 0.5) e.pieceCover = true;
      if (A.key > e.key) {
        e.key = A.key;
        e.z = A.z;
        e.chain = A.chain;
        e.s = A.s;
      }
    }
    for (const ci of this.cornersNear(x, y)) {
      const c = this.corners[ci];
      if (!(c.r > 0 && c.omega > 0)) continue;
      const dq = Math.hypot(x - c.qx, y - c.qy);
      if (!(dq > c.r - aa) || dq > c.rV * (1 + 1e-9) + 1e-12 || !this.inWedge(c, x, y)) continue;
      const nearerA = this.fillKey === "nearer" ? Math.hypot(x - c.tax, y - c.tay) <= Math.hypot(x - c.tbx, y - c.tby) : this.fillKey === "a";
      const z = nearerA ? c.zA : c.zB;
      const key = this.K === Infinity ? z : z - h / this.K;
      const e = entry(c.g);
      if (this.inFill(c, x, y)) e.fillW = Math.max(e.fillW, c.omega);
      if (key > e.key) {
        e.key = key;
        e.z = z;
        e.chain = this.arms[nearerA ? c.a : c.b].pi;
        e.s = nearerA ? c.sA : c.sB;
      }
    }
    surf.sort((u, v) => v.key - u.key);
    const outs = surf.map((e) => this.inkOf(e.id, x, y, P));
    const covers = (e: SurfEntry) => e.pieceCover || e.fillW > 0;
    const res: PixelEval = { ink: 0, top: -1, chain: -1, s: 0, z: 0, key: -Infinity, term: null, fade: 0, nSurf: surf.filter(covers).length, dz: Infinity, dkey: Infinity, Dexp: Infinity };
    const i1 = surf.findIndex(covers);
    if (i1 >= 0) {
      const S1 = surf[i1];
      res.top = S1.id;
      res.chain = S1.chain;
      res.s = S1.s;
      res.z = S1.z;
      res.key = S1.key;
      res.Dexp = outs[i1].Dexp;
      const i2 = surf.findIndex((e, i) => i > i1 && covers(e));
      if (i2 >= 0) {
        res.dz = Math.abs(S1.z - surf[i2].z);
        res.dkey = S1.key - surf[i2].key;
      }
    }
    // Premultiplied "over" in key order (F4): each surface's ink through the
    // coverage of every surface above it. A fill covers at ω, so what lies
    // below shows through it at 1 − ω (F_OMEGA when that is visible).
    const comp = (ord: number[]) => {
      let T = 1;
      let ink = 0;
      let best = 0;
      let term: Term | null = null;
      let fd = 0;
      let pend = 0;
      for (const i of ord) {
        const o = outs[i];
        const c = T * o.v;
        if (c > 0) {
          ink += c;
          fd |= o.fade | pend;
          if (c > best) {
            best = c;
            term = o.term;
          }
        }
        pend |= o.afade;
        T *= 1 - o.a;
        if (!(T > 0)) break;
      }
      return { ink: Math.min(1, ink), term, fd };
    };
    const order = surf.map((_, i) => i);
    let r = comp(order);
    // The tie mix (Q1): the first adjacent pair within zt whose order matters
    // blends its two orders by t = ss(−zt, zt, Δkey).
    for (let i = 0; i + 1 < order.length; i++) {
      const gap = surf[i].key - surf[i + 1].key;
      if (!(gap < this.zt)) continue;
      const sw = order.slice();
      sw[i] = i + 1;
      sw[i + 1] = i;
      const r2 = comp(sw);
      if (r2.ink === r.ink) continue;
      const t = this.force.tie ?? ss(-this.zt, this.zt, gap);
      const ink = t * r.ink + (1 - t) * r2.ink;
      fade |= F_TIE;
      r = (1 - t) * r2.ink > t * r.ink ? { ink, term: r2.term, fd: r.fd | r2.fd } : { ink, term: r.term, fd: r.fd | r2.fd };
      break;
    }
    res.ink = r.ink;
    res.term = r.term;
    res.fade = fade | r.fd;
    return res;
  }

  // -------------------------------------------------------------------------
  // The max decomposition (F7's band pass): one strip per tube edge (a
  // segment's side), fillet arc and dead end's cap, reaching W + aa inside
  // its piece and aa outside. A term is evaluated by the strips it belongs
  // to; stripCheck says whether the pixel lies in one of them.

  /** tan(φ/2) of the chain's turn φ at vertex v (0 at an open end), at most tan 80°. */
  turnTan(pi: number, v: number): number {
    const p = this.polys[pi];
    if (!p.closed && (v <= 0 || v >= p.n - 1)) return 0;
    const k1 = v;
    const k0 = p.closed ? (v - 1 + p.nseg) % p.nseg : v - 1;
    const b0 = segB(p, k0);
    const b1 = segB(p, k1);
    const ax = p.x[b0] - p.x[k0];
    const ay = p.y[b0] - p.y[k0];
    const bx = p.x[b1] - p.x[k1];
    const by = p.y[b1] - p.y[k1];
    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    if (!(la > 0 && lb > 0)) return 0;
    const phi = Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb))));
    return Math.min(Math.tan(phi / 2), Math.tan((80 * Math.PI) / 180));
  }

  /**
   * Segment k's edge strip: a quad along the segment, mitred at each end by
   * (h + aa)·tan(φ/2) for the turn φ there, from (h − W − aa)·cos(φ/2) to
   * h + aa off the centreline. The mitre covers the convex side of a vertex,
   * whose band points have the vertex as their nearest point (finding F8).
   */
  inEdgeStrip(pi: number, k: number, x: number, y: number): boolean {
    const p = this.polys[pi];
    if (k < 0 || k >= p.nseg) return false;
    const b = segB(p, k);
    const ex = p.x[b] - p.x[k];
    const ey = p.y[b] - p.y[k];
    const l2 = ex * ex + ey * ey;
    if (!(l2 > 0)) return false;
    const len = Math.sqrt(l2);
    const tan0 = this.turnTan(pi, k);
    const tan1 = this.turnTan(pi, b);
    const out = this.h + this.aa;
    const t = ((x - p.x[k]) * ex + (y - p.y[k]) * ey) / l2;
    if (t < -(out * tan0) / len - 1e-12 || t > 1 + (out * tan1) / len + 1e-12) return false;
    const d = Math.abs((x - p.x[k]) * ey - (y - p.y[k]) * ex) / len;
    const cosHalf = 1 / Math.sqrt(1 + Math.max(tan0, tan1) ** 2);
    return d >= (this.h - this.W - this.aa) * cosHalf - 1e-12 && d <= out + 1e-12;
  }

  inArcStrip(c: Corner, x: number, y: number): boolean {
    if (!(c.r > 0) || !this.inWedge(c, x, y)) return false;
    const dq = Math.hypot(x - c.qx, y - c.qy);
    return dq >= c.r - this.aa - 1e-12 && dq <= c.r + this.W + this.aa + 1e-12;
  }

  inCapStrip(pi: number, atEnd: boolean, x: number, y: number): boolean {
    const p = this.polys[pi];
    if (p.closed) return false;
    const k = atEnd ? p.nseg - 1 : 0;
    const vi = atEnd ? p.n - 1 : 0;
    const ex = p.x[atEnd ? p.n - 1 : 1] - p.x[atEnd ? p.n - 2 : 0];
    const ey = p.y[atEnd ? p.n - 1 : 1] - p.y[atEnd ? p.n - 2 : 0];
    const along = (x - p.x[vi]) * ex + (y - p.y[vi]) * ey;
    if (atEnd ? along < -1e-12 : along > 1e-12) return false;
    void k;
    const d = Math.hypot(x - p.x[vi], y - p.y[vi]);
    return d >= this.h - this.W - this.aa - 1e-12 && d <= this.h + this.aa + 1e-12;
  }

  /** ok: the winning term's pixel lies in a strip that evaluates it; cls names the case. */
  stripCheck(t: Term, x: number, y: number): { ok: boolean; cls: string } {
    if (t.kind === T_FOOT) {
      const p = this.polys[t.chain];
      if (t.vtx < 0) return { ok: this.inEdgeStrip(t.chain, t.k, x, y), cls: "edge" };
      if (!p.closed && (t.vtx === 0 || t.vtx === p.n - 1)) return { ok: this.inCapStrip(t.chain, t.vtx !== 0, x, y), cls: "cap" };
      const kPrev = p.closed ? (t.vtx - 1 + p.nseg) % p.nseg : t.vtx - 1;
      const ok = this.inEdgeStrip(t.chain, kPrev, x, y) || this.inEdgeStrip(t.chain, t.vtx, x, y);
      return { ok, cls: "join" };
    }
    const c = this.corners[t.corner];
    if (t.kind === T_ARC) return { ok: this.inArcStrip(c, x, y), cls: "arc" };
    const pa = this.arms[c.a].pi;
    const pb = this.arms[c.b].pi;
    if (t.kind === T_TA) return { ok: this.inArcStrip(c, x, y) || this.nearStrips(pa, c.kA, x, y), cls: "endpoint" };
    if (t.kind === T_TB) return { ok: this.inArcStrip(c, x, y) || this.nearStrips(pb, c.kB, x, y), cls: "endpoint" };
    const fa = this.footArm(c.a, c.Vx, c.Vy);
    const fb = this.footArm(c.b, c.Vx, c.Vy);
    return { ok: this.nearStrips(pa, fa.k, x, y) || this.nearStrips(pb, fb.k, x, y), cls: "V" };
  }

  /** Is (x, y) in the edge strip of a segment within W + 2aa of arc length from segment k0 (an endpoint disc's reach)? */
  nearStrips(pi: number, k0: number, x: number, y: number): boolean {
    const p = this.polys[pi];
    if (this.inEdgeStrip(pi, k0, x, y)) return true;
    const R = this.W + 2 * this.aa;
    for (const dir of [-1, 1]) {
      let acc = 0;
      let k = k0;
      for (let i = 0; i < p.nseg; i++) {
        k += dir;
        if (p.closed) k = ((k % p.nseg) + p.nseg) % p.nseg;
        else if (k < 0 || k >= p.nseg) break;
        if (acc > R) break;
        if (this.inEdgeStrip(pi, k, x, y)) return true;
        acc += p.segLen[k];
      }
    }
    return false;
  }
}
