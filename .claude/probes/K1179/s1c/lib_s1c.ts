// K1179 S1c shared helpers: the exact outline measurement (task 1) and
// the fine-panel integral used to attribute agreement outs (task 2).
// The exact outline is the boundary of the points within h of a
// centreline - each segment's two offset lines and each vertex's arc of
// radius h - unioned with the rounds' fills as form_b.ts inFill defines
// them. Its pieces are met in closed form (line/circle and circle/circle
// intersections, analytic tangents and curvatures), not sampled from
// offset polylines: a segment piece has curvature 0, a vertex arc and a
// ball arc have curvature +-1/h and +1/r, and the only turning
// concentrated at a joint is the angle between the two pieces' tangents
// there. Exposure (inside another tube, or under a fill) is decided by
// exact distance evaluations at the intersection points themselves, so
// the measurement's own error is the float64 rounding of those
// evaluations (~1e-12h) plus the stated tolerances below; there is no
// sampling step whose size could move a reading.
import { footInWindow, segB, segOfS } from "../../../../src/render/field/geom";
import { ss } from "../../../../src/render/field/form_b";
import { edgeOutlinePoints, facingSide, isBuried, rootBandEff } from "../outline";
import { fillChecker, inFillS1b, inWedgeS1b, marginsAt, otherDist } from "../s1b/lib_s1b";
import { buildWindow, marginOfWin, nearest, pairPoint } from "./closed";
import type { Pair, WinArm } from "./closed";

export const fmt = (v: number, d = 4): string => (Number.isFinite(v) ? v.toFixed(d) : String(v));
export const pctile = (xs: number[], q: number): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
export const keyOf = (c: any): string => `${c.j}|${c.a}-${c.b}`;
export const siteOf = (fb: any, sc: any, c: any): string =>
  `${sc.junctions[c.j]?.id ?? `j${c.j}`} arms ${fb.arms[c.a].ei}-${fb.arms[c.b].ei}`;

// ------------------------------------------------------------- fine integral
// The branch integral at `panels` uniform rho panels, in form B's own
// trapezoid-of-running-min form, with the branch followed pair by pair
// (the nearest pair at each panel point). At 256 panels this is the
// converged integral the closed form is checked against when it and
// master's 32-node value disagree.
const winCacheOf = (fb: any): Map<number, WinArm> => ((fb as any).__s1cWins ??= new Map());
export function winOf(fb: any, ai: number): WinArm {
  const cache = winCacheOf(fb);
  let w = cache.get(ai);
  if (!w) { w = buildWindow(fb, ai); cache.set(ai, w); }
  return w;
}

export function fineR(fb: any, rc: any, panels = 256): number {
  const h: number = fb.h;
  const wA = winOf(fb, rc.a), wB = winOf(fb, rc.b);
  const A = fb.arms[rc.a], B = fb.arms[rc.b];
  const rbEff = rootBandEff(fb, rc.theta);
  const nVa = nearest(wA, rc.Vx, rc.Vy), nVb = nearest(wB, rc.Vx, rc.Vy);
  const denV = 1 + ((rc.Vx - nVa.fx) * (rc.Vx - nVb.fx) + (rc.Vy - nVa.fy) * (rc.Vy - nVb.fy)) / (h * h);
  const wOf = (p: any, rho: number): number => {
    const slack = Math.min(A.L - fb.W - p.fdA, B.L - fb.W - p.fdB);
    const den = 1 + ((p.x - p.fxA) * (p.x - p.fxB) + (p.y - p.fyA) * (p.y - p.fyB)) / (rho * rho);
    const steep = ss(0, 1, (den / denV - 0.3) / 0.4);
    const cap = ss(0, 1, slack / (0.5 * h));
    const root = fb.rootBand > 0 ? ss(0, 1, p.fdA / rbEff) * ss(0, 1, p.fdB / rbEff) : 1;
    if (steep === 0 || cap === 0 || root === 0) return 0;
    const mA = marginOfWin(wA, p.x, p.y, p.fdA, rho);
    const mB = marginOfWin(wB, p.x, p.y, p.fdB, rho);
    return ss(0, 1, 1 + Math.min(0, mA, mB) / (0.05 * h)) * steep * cap * root;
  };
  const sign = (w: WinArm, f: any, qx: number, qy: number): number => {
    if (f.kind === "vtx") return 0;
    return (qx - w.x[f.idx]) * -w.uy[f.idx] + (qy - w.y[f.idx]) * w.ux[f.idx] >= 0 ? 1 : -1;
  };
  let pair: Pair = { fa: nVa.feat, fb: nVb.feat, sa: sign(wA, nVa.feat, rc.Vx, rc.Vy), sb: sign(wB, nVb.feat, rc.Vx, rc.Vy) };
  let q: any = { x: rc.Vx, y: rc.Vy, fxA: nVa.fx, fyA: nVa.fy, fdA: nVa.fd, fxB: nVb.fx, fyB: nVb.fy, fdB: nVb.fd };
  if (!(rc.r0 > 0)) return 0;
  let sPrev = wOf(q, h);
  let integ = 0;
  const drho = rc.r0 / panels;
  for (let k = 1; k <= panels && sPrev > 0; k++) {
    const rho = h + k * drho;
    const p = pairPoint(wA, pair, wB, rho, q.x, q.y);
    if (!p) break;
    const nA = nearest(wA, p.x, p.y), nB = nearest(wB, p.x, p.y);
    pair = { fa: nA.feat, fb: nB.feat, sa: sign(wA, nA.feat, p.x, p.y), sb: sign(wB, nB.feat, p.x, p.y) };
    const sK = Math.min(sPrev, wOf(p, rho));
    integ += 0.5 * (sPrev + sK) * drho;
    sPrev = sK;
    q = p;
  }
  return integ;
}

// ------------------------------------------------------------- exact outline
export interface Meet { x: number; y: number; jumpDeg: number; kind: string; where: string }
export interface CornerExact {
  exposed: boolean; live: boolean;
  meets: Meet[]; worstJumpDeg: number; failA: boolean;
  maxConcave2pxDeg: number; // (b): concave turning within any 2 device px (dpr 2)
  tubeConcaveDeg: number; // largest concave turning on the tube's own edge in the window (info, not gated)
  feet: { which: string; gapDev: number; jumpDeg: number; fail: boolean; buried: boolean }[];
}

const angDiffDeg = (ax: number, ay: number, bx: number, by: number): number => {
  const la = Math.hypot(ax, ay) || 1, lb = Math.hypot(bx, by) || 1;
  const dot = Math.min(1, Math.abs((ax * bx + ay * by) / (la * lb)));
  return (Math.acos(dot) * 180) / Math.PI;
};

/** Criterion 1v + exact criterion 2 for one master corner. */
export function measureExact(fb: any, c: any, buriedFn: (x: number, y: number) => boolean): CornerExact {
  const h: number = fb.h;
  const dev2 = fb.scene.camera.pxPerUnit * 2; // device px at dpr 2 per world unit
  const exposed = c.r > 1e-12 && c.omega > 0 && c.dA <= fb.arms[c.a].L + 1e-9 && c.dB <= fb.arms[c.b].L + 1e-9;
  const out: CornerExact = { exposed, live: exposed && c.r >= 0.05 * h, meets: [], worstJumpDeg: 0, failA: false, maxConcave2pxDeg: 0, tubeConcaveDeg: 0, feet: [] };
  if (!exposed) return out;
  // (b) along the ball arc: curvature +1/r in the round's own sense at
  // every point, so the concave turning inside any window is 0. The
  // window's convex turning is stated for scale in the scenes record.
  out.maxConcave2pxDeg = 0;
  // Tube's own concave turning in the foot windows (info only): at a
  // centreline vertex on the facing side, the concave offset joint turns
  // by the centreline's turn angle.
  for (const [ai, dF, tx, ty] of [[c.a, c.dA, c.tax, c.tay], [c.b, c.dB, c.tbx, c.tby]] as [number, number, number, number][]) {
    const side = facingSide(fb, ai, dF, tx, ty);
    const a = fb.arms[ai];
    const p = fb.polys[a.pi];
    for (let v = 0; v < p.n; v++) {
      const dv = fb.armDist(ai, p.s[v]);
      if (dv < dF - 0.1 * h || dv > dF + 0.1 * h) continue;
      // Segment units either side of the vertex, in arm-outward order.
      const kin = v > 0 ? v - 1 : p.closed ? p.nseg - 1 : -1;
      const kout = v < p.nseg ? v : p.closed ? 0 : -1;
      if (kin < 0 || kout < 0) continue;
      const dirOf = (k: number): [number, number] => {
        const b = segB(p, k);
        const l = p.segLen[k] || 1;
        return [(p.x[b] - p.x[k]) / l, (p.y[b] - p.y[k]) / l];
      };
      let [ux0, uy0] = dirOf(kin);
      let [ux1, uy1] = dirOf(kout);
      if (a.dir < 0) { [ux0, uy0, ux1, uy1] = [-ux1, -uy1, -ux0, -uy0]; }
      const cross = ux0 * uy1 - uy0 * ux1;
      if (cross * side <= 0) continue; // convex side: an arc, curvature +1/h, no joint
      const turn = angDiffDeg(ux0, uy0, ux1, uy1);
      if (turn > out.tubeConcaveDeg) out.tubeConcaveDeg = turn;
    }
  }
  // Feet (exact criterion 2): the tangent point is at distance h from
  // its centreline foot by construction; the tube tangent there is the
  // segment direction, or the vertex arc's tangent at a vertex foot.
  for (const which of ["A", "B"] as const) {
    const ai = which === "A" ? c.a : c.b;
    const tx = which === "A" ? c.tax : c.tbx;
    const ty = which === "A" ? c.tay : c.tby;
    const sFoot = which === "A" ? c.sA : c.sB;
    const p = fb.polys[fb.arms[ai].pi];
    const { k, t } = segOfS(p, sFoot);
    let ex: number, ey: number;
    if (t > 1e-9 && t < 1 - 1e-9) {
      const b = segB(p, k);
      const l = p.segLen[k] || 1;
      ex = (p.x[b] - p.x[k]) / l; ey = (p.y[b] - p.y[k]) / l;
    } else {
      const vi = t <= 1e-9 ? k : segB(p, k);
      ex = -(ty - p.y[vi]); ey = tx - p.x[vi]; // vertex arc tangent: perp(t - vertex)
      const l = Math.hypot(ex, ey) || 1; ex /= l; ey /= l;
    }
    // Ball tangent at the foot.
    let gx = -(ty - c.qy), gy = tx - c.qx;
    const gl = Math.hypot(gx, gy) || 1; gx /= gl; gy /= gl;
    const jump = angDiffDeg(gx, gy, ex, ey);
    const dFoot = footInWindow(p, tx, ty, p.s0, p.s0 + p.len).d;
    const gapDev = Math.abs(dFoot - h) * dev2;
    const buried = buriedFn(tx, ty);
    out.feet.push({ which, gapDev, jumpDeg: jump, fail: !buried && (gapDev > 0.05 || jump > 1), buried });
  }
  if (!out.live) return out;
  // (a) fill/tube meets: the ball circle against every tube piece whose
  // centreline segment lies within h + r of q (the grid's segment query).
  const R = h + c.r;
  const segIds: number[] = [];
  fb.grid.query(c.qx, c.qy, R, segIds);
  const seen = new Set<string>();
  const meets: Meet[] = [];
  const onFillBoundary = (x: number, y: number): boolean => {
    // Just outside the ball (inFill requires dq > r), inside the wedge,
    // with both arm distances at least h - 2aa as inFill tests.
    const dx = x - c.qx, dy = y - c.qy;
    const dl = Math.hypot(dx, dy) || 1;
    const ox = c.qx + (dx / dl) * (c.r + 1e-7 * h), oy = c.qy + (dy / dl) * (c.r + 1e-7 * h);
    return inFillS1b(fb, c, ox, oy);
  };
  const consider = (x: number, y: number, kind: string, where: string, foot: { x: number; y: number; k: number; t: number }, pOwn: any) => {
    const key = `${Math.round(x * 1e7)},${Math.round(y * 1e7)}`;
    if (seen.has(key)) return;
    // Exact exposure: at least h from every centreline and not under a
    // fill (the checker covers both; the point itself is on this fill's
    // own ball, which inFill excludes at dq == r).
    if (buriedFn(x, y)) return;
    if (!onFillBoundary(x, y)) return;
    seen.add(key);
    // The tube piece at the point is its nearest centreline feature:
    // a segment's direction, or a vertex arc's tangent.
    let tubeTx: number, tubeTy: number;
    if (foot.t > 1e-9 && foot.t < 1 - 1e-9) {
      const b = segB(pOwn, foot.k);
      const l = pOwn.segLen[foot.k] || 1;
      tubeTx = (pOwn.x[b] - pOwn.x[foot.k]) / l; tubeTy = (pOwn.y[b] - pOwn.y[foot.k]) / l;
      kind = "line";
    } else {
      tubeTx = -(y - foot.y); tubeTy = x - foot.x;
      kind = "vertex arc";
    }
    const jump = angDiffDeg(-(y - c.qy), x - c.qx, tubeTx, tubeTy);
    meets.push({ x, y, jumpDeg: jump, kind, where });
  };
  const chainsSeen = new Set<number>();
  for (const gid of segIds) {
    const chain = fb.grid.segChain[gid];
    const k = fb.grid.segK[gid];
    const p = fb.polys[chain];
    const b = segB(p, k);
    const ax = p.x[k], ay = p.y[k], bx2 = p.x[b], by2 = p.y[b];
    const exx = bx2 - ax, eyy = by2 - ay;
    const segLen = Math.hypot(exx, eyy);
    if (!(segLen > 0)) continue;
    const ux = exx / segLen, uy = eyy / segLen;
    for (const sgnSide of [1, -1]) {
      const nx = -uy * sgnSide, ny = ux * sgnSide;
      const ox = ax + nx * h, oy = ay + ny * h;
      // Line (offset segment) against the ball circle.
      const vx = ox - c.qx, vy = oy - c.qy;
      const bq = ux * vx + uy * vy;
      const cq = vx * vx + vy * vy - c.r * c.r;
      const disc = bq * bq - cq;
      if (disc < 0) continue;
      const sq = Math.sqrt(disc);
      for (const tt of [-bq + sq, -bq - sq]) {
        if (tt < -1e-9 || tt > segLen + 1e-9) continue;
        const x = ox + ux * tt, y = oy + uy * tt;
        const foot = footInWindow(p, x, y, p.s0, p.s0 + p.len);
        if (Math.abs(foot.d - h) > 1e-6 * h) continue;
        consider(x, y, "line", `chain ${chain} seg ${k}`, foot, p);
      }
    }
    // Vertex arcs at this segment's ends (once per vertex per chain).
    for (const vi of [k, b]) {
      const vkey = chain * 100000 + vi;
      if (chainsSeen.has(vkey)) continue;
      chainsSeen.add(vkey);
      const vx2 = p.x[vi], vy2 = p.y[vi];
      const dx = vx2 - c.qx, dy = vy2 - c.qy;
      const dv = Math.hypot(dx, dy);
      if (!(dv > 0) || dv > c.r + h + 1e-12 || dv < Math.abs(c.r - h) - 1e-12) continue;
      const aDist = (c.r * c.r - h * h + dv * dv) / (2 * dv);
      const h2 = c.r * c.r - aDist * aDist;
      if (h2 < 0) continue;
      const hm = Math.sqrt(Math.max(0, h2));
      const mx = c.qx + (dx / dv) * aDist, my = c.qy + (dy / dv) * aDist;
      for (const sgn2 of [1, -1]) {
        if (sgn2 < 0 && hm === 0) continue;
        const x = mx + (-dy / dv) * hm * sgn2, y = my + (dx / dv) * hm * sgn2;
        const foot = footInWindow(p, x, y, p.s0, p.s0 + p.len);
        if (Math.abs(foot.d - h) > 1e-6 * h) continue;
        if (Math.abs(foot.s - p.s[vi]) > 1e-6 && Math.abs(foot.s - (p.s[vi] + p.len)) > 1e-6 && !p.closed) {
          // The nearest point is not this vertex: not its arc.
          if (Math.hypot(foot.x - vx2, foot.y - vy2) > 1e-6 * h) continue;
        }
        consider(x, y, "vertex arc", `chain ${chain} vtx ${vi}`, foot, p);
      }
    }
  }
  out.meets = meets;
  out.worstJumpDeg = meets.reduce((m, mm) => Math.max(m, mm.jumpDeg), 0);
  out.failA = meets.some((mm) => mm.jumpDeg > 1);
  return out;
}

/** Run K's class for a corner (task 1's a-e), from its q-side facts. */
export function classifyS1c(fb: any, c: any, passesCorrected: boolean, bareK: number): { cls: string; detail: string } {
  if (passesCorrected) return { cls: "a", detail: "passes under the union burial + bare-adjusted test (Run K task 1)" };
  const mMin = marginsAt(fb, c).min / fb.h;
  if (mMin < -1e-9) return { cls: "c", detail: `margin min ${fmt(mMin, 4)}h at q (own arms)` };
  const oH = otherDist(fb, c) / fb.h;
  if (oH < 1 + c.r / fb.h - 1e-9) return { cls: "d", detail: `other centreline ${fmt(oH, 3)}h from q vs h+r ${fmt(1 + c.r / fb.h, 3)}h` };
  if (bareK < -0.01) return { cls: "b", detail: `bare edge min k*h ${fmt(bareK, 3)}` };
  return { cls: "e", detail: `margin ${fmt(mMin, 4)}h, other ${fmt(oH, 3)}h, bare ${fmt(bareK, 3)}` };
}

export { fillChecker, edgeOutlinePoints };
