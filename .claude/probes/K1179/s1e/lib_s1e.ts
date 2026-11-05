// K1179 S1e (K1184 Run I): the pinned round with form B's own gate
// integral, offline. Per corner form B makes (same cyclically adjacent
// arm pairs; style, cr, h, theta and r0 as solveCorner has them,
// r0 = style*(cr/3)*min(2h, 1.5h*tan(theta/2))):
// - V and theta exactly as solveCorner computes them (measurement path
//   reads the built corner's V; production path solveVPair, S1c/S1d's
//   pair iteration, measured |dV| in the cost script).
// - Nodes k=0..K at r_k = k*r0/K. Edge points E_a,E_b at arc length
//   r_k*cot(theta/2) from V along each arm's exact edge (Run H's walk,
//   built once per corner-arm and walked cumulatively across nodes).
//   Centreline feet are E - h*n (n the edge's unit normal away from its
//   centreline, foot tracked locally along the walk, then read exactly
//   on the centreline at the interpolated arm distance). Probe point
//   q_k = mean(E_a + r_k*n_a, E_b + r_k*n_b): form B's ball centre on
//   straight arms by construction.
// - w_k = wOf at node k, all four factors as form B has them: margin
//   (marginOf's own definition: each arm's window outside its foot's
//   basin, against dc=|q_k - that arm's centreline foot|; evaluated by
//   marginOfWin, the window form in s1c/closed.ts, checked against the
//   s1b copy of form_b's marginOf to 5.8e-15 world on 536 nodes),
//   steep (den=1+n_a.n_b from the normals at the feet, den(V) as
//   denV), cap (slackOf's slack at the feet), root (each centreline
//   foot's distance from its root over rbEff).
// - S_0=w_0, S_k=min(S_{k-1},w_k), r = sum 1/2(S_{k-1}+S_k)*r0/K.
//   A node whose feet would pass an arm's window end (foot at the span
//   end, or arc past the walk's end) ends the sum: its segment is
//   counted with S=0 and S is 0 past it, as the branch's end in form B.
// - Feet at arc r*cot(theta/2), Run H's rational quadratic (C where the
//   feet's tangent lines meet, weight cos(phi/2)). Where C is not on
//   the fill side or is farther than 4h from V, the largest node radius
//   r_k <= r at which it is is used (null at k=0). No cubic fallback.
// Deterministic and cold: no warm start, no tracking across frames, no
// Newton, no bisection in the rule. Most work a corner can take: two
// exact-edge builds (each the outline pieces over at most maxArc+2h of
// centreline, maxArc=r0*cot(theta/2)<=style*(cr/3)*1.5h), K+1 node
// evaluations (each: two cumulative walk steps, two centreline reads,
// two marginOf basin walks each scanning its arm window once plus two
// windowed foot searches), and at most K+1 round constructions in the
// node-fallback search (normally one).
import { ss } from "../../../../src/render/field/form_b";
import { armFrame, rootBandEff, facingSide } from "../outline";
import { buildWindow, marginOfWin } from "../s1c/closed";
import type { WinArm } from "../s1c/closed";
import { walkEdge, curvAt } from "../s1d/lib_s1d";
import type { Walk } from "../s1d/lib_s1d";

export const fmt = (v: number, d = 4): string => (Number.isFinite(v) ? v.toFixed(d) : String(v));
export const pctile = (xs: number[], q: number): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
export const keyOf = (c: any): string => `${c.j}|${c.a}-${c.b}`;
export const siteOf = (fb: any, sc: any, c: any): string =>
  `${sc.junctions[c.j]?.id ?? `j${c.j}`} arms ${fb.arms[c.a].ei}-${fb.arms[c.b].ei}`;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const cross2 = (ax: number, ay: number, bx: number, by: number): number => ax * by - ay * bx;
export { curvAt };

// ------------------------------------------------------------- timing
export interface S1eTiming {
  edgeBuild: number; vTheta: number; nodeFeet: number;
  gateMargin: number; gateSteep: number; gateCap: number; gateRoot: number;
  round: number; calls: number; nodeEvals: number;
}
export const newTiming = (): S1eTiming => ({
  edgeBuild: 0, vTheta: 0, nodeFeet: 0, gateMargin: 0, gateSteep: 0,
  gateCap: 0, gateRoot: 0, round: 0, calls: 0, nodeEvals: 0,
});

// ------------------------------------------------------------- edge walk
export interface EWalkPt { x: number; y: number; cum: number; dFoot: number }
export interface EWalk {
  pts: EWalkPt[];
  total: number;
  at(arc: number): { x: number; y: number; tx: number; ty: number; dFoot: number };
  arcOf(x: number, y: number): number;
}

/** Run H's exact edge from V, annotated with each point's local
 * centreline-foot arm distance (tracked in a +-0.6h window about the
 * running foot, so a folded arm cannot steal the foot). Built once;
 * at() advances a cursor for the nodes' increasing arcs. */
export function buildEWalk(fb: any, ai: number, side: number, dV: number, Vx: number, Vy: number, maxArc: number): EWalk {
  const h: number = fb.h;
  const A = fb.arms[ai];
  const raw: Walk = walkEdge(fb, ai, side, dV, Vx, Vy, Math.max(maxArc, 1e-9));
  const pts: EWalkPt[] = [];
  let pred = dV;
  for (let i = 0; i < raw.pts.length; i++) {
    const p = raw.pts[i];
    const arcStep = i === 0 ? 0 : Math.hypot(p.x - raw.pts[i - 1].x, p.y - raw.pts[i - 1].y);
    const dLo = clamp(pred - 0.6 * h, 0, A.L);
    const dHi = clamp(pred + arcStep + 0.6 * h, 0, A.L);
    const f = fb.footArm(ai, p.x, p.y, Math.min(dLo, dHi), Math.max(dLo, dHi));
    let dFoot = fb.armDist(ai, f.s);
    if (!(dFoot >= dV - 0.25 * h)) dFoot = pred;
    if (dFoot < pred - 0.25 * h) dFoot = pred;
    pts.push({ x: p.x, y: p.y, cum: p.cum, dFoot });
    pred = Math.max(pred, dFoot);
  }
  if (!pts.length) pts.push({ x: Vx, y: Vy, cum: 0, dFoot: dV });
  let cursor = 1;
  let lastArc = 0;
  const at = (arcIn: number): { x: number; y: number; tx: number; ty: number; dFoot: number } => {
    const arc = clamp(arcIn, 0, raw.total);
    if (arc < lastArc - 1e-12) cursor = 1;
    lastArc = arc;
    while (cursor < pts.length - 1 && pts[cursor].cum < arc) cursor++;
    while (cursor > 1 && pts[cursor - 1].cum > arc) cursor--;
    const p0 = pts[cursor - 1];
    const p1 = pts[cursor] ?? p0;
    const seg = Math.max(p1.cum - p0.cum, 1e-300);
    const f = clamp((arc - p0.cum) / seg, 0, 1);
    const ex = p1.x - p0.x, ey = p1.y - p0.y;
    const el = Math.hypot(ex, ey) || 1;
    return {
      x: p0.x + ex * f, y: p0.y + ey * f,
      tx: ex / el, ty: ey / el,
      dFoot: p0.dFoot + (p1.dFoot - p0.dFoot) * f,
    };
  };
  const arcOf = (x: number, y: number): number => {
    let best = Infinity, bestArc = 0;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i];
      const ex = p1.x - p0.x, ey = p1.y - p0.y;
      const l2 = ex * ex + ey * ey;
      const f = l2 > 0 ? clamp(((x - p0.x) * ex + (y - p0.y) * ey) / l2, 0, 1) : 0;
      const dd = Math.hypot(x - (p0.x + ex * f), y - (p0.y + ey * f));
      if (dd < best) { best = dd; bestArc = p0.cum + Math.sqrt(l2) * f; }
    }
    return bestArc;
  };
  return { pts, total: raw.total, at, arcOf };
}

// ------------------------------------------------------------- the rule
export interface NodeRec {
  k: number; rk: number; arc: number;
  Ea: { x: number; y: number }; Eb: { x: number; y: number };
  tA: { x: number; y: number }; tB: { x: number; y: number };
  footA: { x: number; y: number }; footB: { x: number; y: number };
  dFootA: number; dFootB: number; sFootA: number; sFootB: number;
  nA: { x: number; y: number }; nB: { x: number; y: number };
  qx: number; qy: number; dcA: number; dcB: number;
  mA: number; mB: number; marginF: number; den: number; steepF: number;
  slack: number; capF: number; rootF: number; w: number; S: number;
  beyond: boolean;
}

export interface S1eCorner {
  j: number; a: number; b: number; theta: number; style: number;
  Vx: number; Vy: number; dVa: number; dVb: number;
  r0: number; r: number; rEff: number; K: number;
  L: number; g: number; cap: number; steep: number; den: number; denV: number; slack: number;
  marginM: number; marginGate: number;
  Fa: { x: number; y: number }; Fb: { x: number; y: number };
  dFootA: number; dFootB: number; sFootA: number; sFootB: number;
  tA: { x: number; y: number }; tB: { x: number; y: number };
  kind: "quad" | "none"; fallback: boolean; nodeFallback: boolean; fallbackToK: number;
  Cx: number; Cy: number; w: number;
  live: boolean; beyondA: boolean; beyondB: boolean;
  walkA: EWalk; walkB: EWalk;
  nodes: NodeRec[];
  limitingK: number; limitingFactor: string;
}

function tryRound(
  Fa: { x: number; y: number }, Fb: { x: number; y: number },
  tA: { x: number; y: number }, tB: { x: number; y: number },
  Vx: number, Vy: number, h: number,
): { Cx: number; Cy: number; w: number } | null {
  const d0 = { x: -tA.x, y: -tA.y }, d1 = { x: tB.x, y: tB.y };
  const det = cross2(d0.x, d0.y, d1.x, d1.y);
  if (Math.abs(det) <= 1e-12) return null;
  const Dx = Fb.x - Fa.x, Dy = Fb.y - Fa.y;
  if (Math.hypot(Dx, Dy) <= 1e-12) return null;
  const s = cross2(Dx, Dy, d1.x, d1.y) / det;
  const u = cross2(Dx, Dy, d0.x, d0.y) / det;
  if (!(s > 1e-12 && u < -1e-12)) return null;
  const Cx = Fa.x + s * d0.x, Cy = Fa.y + s * d0.y;
  if (Math.hypot(Cx - Vx, Cy - Vy) > 4 * h) return null;
  const cosPhi = clamp(d0.x * d1.x + d0.y * d1.y, -1, 1);
  return { Cx, Cy, w: Math.cos(Math.acos(cosPhi) / 2) };
}

export function s1eCorner(
  fb: any,
  src: { j: number; a: number; b: number; theta: number; style: number; Vx: number; Vy: number; dVa: number; dVb: number },
  K: number,
  timing?: S1eTiming,
  opts?: { noMargin?: boolean; winCache?: Map<number, WinArm> },
): S1eCorner {
  const h: number = fb.h;
  const A = fb.arms[src.a], B = fb.arms[src.b];
  const theta = src.theta, style = src.style;
  const noMargin = !!opts?.noMargin;
  const tan2 = Math.tan(theta / 2);
  const r0 = style * (fb.cr / 3) * Math.min(2 * h, 1.5 * h * tan2);
  const cot = tan2 > 1e-300 ? 1 / tan2 : 0;
  const maxArc = r0 * cot;

  const tE = timing ? performance.now() : 0;
  const sideA = facingSide(fb, src.a, src.dVa, src.Vx, src.Vy);
  const sideB = facingSide(fb, src.b, src.dVb, src.Vx, src.Vy);
  const walkA = buildEWalk(fb, src.a, sideA, src.dVa, src.Vx, src.Vy, maxArc);
  const walkB = buildEWalk(fb, src.b, sideB, src.dVb, src.Vx, src.Vy, maxArc);
  if (timing) timing.edgeBuild += performance.now() - tE;

  // den(V): V's centreline feet from its arm distances.
  const fvA = armFrame(fb, src.a, src.dVa);
  const fvB = armFrame(fb, src.b, src.dVb);
  const dvA = Math.hypot(src.Vx - fvA.cx, src.Vy - fvA.cy) || h;
  const dvB = Math.hypot(src.Vx - fvB.cx, src.Vy - fvB.cy) || h;
  const nVa = { x: (src.Vx - fvA.cx) / dvA, y: (src.Vy - fvA.cy) / dvA };
  const nVb = { x: (src.Vx - fvB.cx) / dvB, y: (src.Vy - fvB.cy) / dvB };
  const denV = 1 + nVa.x * nVb.x + nVa.y * nVb.y;
  const rbEff = rootBandEff(fb, theta);
  // Margin windows, shared across a frame when the caller passes a
  // cache (each arm's window built once a frame, inside the margin
  // timing below). marginOfWin is the window form of marginOf's basin
  // definition (s1c/closed.ts); on the smoke3 check (536 node margins,
  // muse_default_tw) it agreed with the s1b copy of form_b's marginOf
  // to 5.8e-15 world.
  const winCache: Map<number, WinArm> = opts?.winCache ?? new Map();

  // --- nodes, basics (feet and probe points), walked cumulatively
  const tF = timing ? performance.now() : 0;
  const nodes: NodeRec[] = [];
  const dr = K > 0 ? r0 / K : 0;
  for (let k = 0; k <= K; k++) {
    const rk = dr * k;
    const arc = rk * cot;
    const eA = walkA.at(arc);
    const eB = walkB.at(arc);
    const frA = armFrame(fb, src.a, clamp(eA.dFoot, 0, A.L));
    const frB = armFrame(fb, src.b, clamp(eB.dFoot, 0, B.L));
    let nAx = eA.x - frA.cx, nAy = eA.y - frA.cy;
    let nBx = eB.x - frB.cx, nBy = eB.y - frB.cy;
    const lA = Math.hypot(nAx, nAy), lB = Math.hypot(nBx, nBy);
    if (lA > 1e-12) { nAx /= lA; nAy /= lA; } else { nAx = nVa.x; nAy = nVa.y; }
    if (lB > 1e-12) { nBx /= lB; nBy /= lB; } else { nBx = nVb.x; nBy = nVb.y; }
    const qx = ((eA.x + rk * nAx) + (eB.x + rk * nBx)) / 2;
    const qy = ((eA.y + rk * nAy) + (eB.y + rk * nBy)) / 2;
    const beyond = arc > walkA.total + 1e-9 || arc > walkB.total + 1e-9
      || eA.dFoot >= A.L - 1e-9 || eB.dFoot >= B.L - 1e-9;
    nodes.push({
      k, rk, arc,
      Ea: { x: eA.x, y: eA.y }, Eb: { x: eB.x, y: eB.y },
      tA: { x: eA.tx, y: eA.ty }, tB: { x: eB.tx, y: eB.ty },
      footA: { x: frA.cx, y: frA.cy }, footB: { x: frB.cx, y: frB.cy },
      dFootA: eA.dFoot, dFootB: eB.dFoot, sFootA: frA.sAbs, sFootB: frB.sAbs,
      nA: { x: nAx, y: nAy }, nB: { x: nBx, y: nBy },
      qx, qy,
      dcA: Math.hypot(qx - frA.cx, qy - frA.cy), dcB: Math.hypot(qx - frB.cx, qy - frB.cy),
      mA: Infinity, mB: Infinity, marginF: 1, den: 1, steepF: 1,
      slack: 0, capF: 1, rootF: 1, w: 0, S: 0, beyond,
    });
    if (timing) timing.nodeEvals++;
  }
  if (timing) timing.nodeFeet += performance.now() - tF;

  // --- gate factors, each timed apart (cost task)
  const tM = timing ? performance.now() : 0;
  if (!noMargin) {
    let wA = winCache.get(src.a);
    if (!wA) { wA = buildWindow(fb, src.a); winCache.set(src.a, wA); }
    let wB = winCache.get(src.b);
    if (!wB) { wB = buildWindow(fb, src.b); winCache.set(src.b, wB); }
    for (const nd of nodes) {
      if (nd.beyond) continue;
      nd.mA = marginOfWin(wA, nd.qx, nd.qy, nd.dFootA, nd.dcA);
      nd.mB = marginOfWin(wB, nd.qx, nd.qy, nd.dFootB, nd.dcB);
      nd.marginF = ss(0, 1, 1 + Math.min(0, nd.mA, nd.mB) / (0.05 * h));
    }
  }
  if (timing) timing.gateMargin += performance.now() - tM;
  const tS = timing ? performance.now() : 0;
  for (const nd of nodes) {
    nd.den = 1 + nd.nA.x * nd.nB.x + nd.nA.y * nd.nB.y;
    nd.steepF = ss(0, 1, (nd.den / denV - 0.3) / 0.4);
  }
  if (timing) timing.gateSteep += performance.now() - tS;
  const tC = timing ? performance.now() : 0;
  for (const nd of nodes) {
    nd.slack = Math.min(A.L - fb.W - nd.dFootA, B.L - fb.W - nd.dFootB);
    nd.capF = ss(0, 1, nd.slack / (0.5 * h));
  }
  if (timing) timing.gateCap += performance.now() - tC;
  const tR = timing ? performance.now() : 0;
  for (const nd of nodes) {
    nd.rootF = fb.rootBand > 0
      ? ss(0, 1, nd.dFootA / rbEff) * ss(0, 1, nd.dFootB / rbEff)
      : 1;
    nd.w = nd.beyond ? 0 : nd.marginF * nd.steepF * nd.capF * nd.rootF;
  }
  if (timing) timing.gateRoot += performance.now() - tR;

  // --- the gate integral (form B's trapezoid of the running minimum)
  let r = 0;
  if (K > 0 && r0 > 0) {
    nodes[0].S = nodes[0].w;
    let sPrev = nodes[0].S;
    for (let k = 1; k <= K; k++) {
      const nd = nodes[k];
      const sK = nd.beyond ? 0 : Math.min(sPrev, nd.w);
      nd.S = sK;
      r += 0.5 * (sPrev + sK) * dr;
      sPrev = sK;
      if (nd.beyond) {
        for (let k2 = k + 1; k2 <= K; k2++) nodes[k2].S = 0;
        break;
      }
      if (sK === 0 && sPrev === 0 && k > 1) {
        // running minimum already 0: later segments add nothing
        // (S values already 0 by the min, keep them for the record)
      }
    }
    // fill S for nodes never reached because sPrev hit 0 early
    let runMin = nodes[0].w;
    for (let k = 1; k <= K; k++) {
      if (nodes[k].S === 0 && !nodes[k].beyond) {
        runMin = Math.min(runMin, nodes[k].w);
        nodes[k].S = runMin;
      } else runMin = nodes[k].S;
    }
  } else if (nodes.length) {
    nodes[0].S = nodes[0].w;
  }

  // limiting node/factor: first node where the running minimum attains
  // its value at the last node contributing to r, and its smallest factor
  let limitingK = 0;
  let limitingFactor = "none";
  {
    let bestW = Infinity;
    for (const nd of nodes) {
      if (nd.beyond) break;
      if (nd.w < bestW - 1e-15) { bestW = nd.w; limitingK = nd.k; }
      if (nd.rk > r + 1e-12 && r > 0) break;
    }
    if (bestW >= 1 - 1e-12) {
      limitingFactor = "none";
      limitingK = -1;
    } else {
      const nd = nodes[limitingK];
      if (nd) {
        const facs: [string, number][] = [
          ["margin", nd.marginF], ["steep", nd.steepF], ["cap", nd.capF], ["root", nd.rootF],
        ];
        facs.sort((x, y) => x[1] - y[1]);
        limitingFactor = facs[0][0];
      }
    }
  }

  // --- final feet and the round, with the node fallback
  const tRd = timing ? performance.now() : 0;
  const c: S1eCorner = {
    j: src.j, a: src.a, b: src.b, theta, style, Vx: src.Vx, Vy: src.Vy, dVa: src.dVa, dVb: src.dVb,
    r0, r, rEff: r, K, L: maxArc, g: r0 > 0 ? r / r0 : 0,
    cap: 1, steep: 1, den: denV, denV, slack: nodes.length ? nodes[nodes.length - 1].slack : 0,
    marginM: Infinity, marginGate: 1,
    Fa: { x: src.Vx, y: src.Vy }, Fb: { x: src.Vx, y: src.Vy },
    dFootA: src.dVa, dFootB: src.dVb, sFootA: fvA.sAbs, sFootB: fvB.sAbs,
    tA: { x: 1, y: 0 }, tB: { x: 1, y: 0 },
    kind: "none", fallback: false, nodeFallback: false, fallbackToK: -1,
    Cx: NaN, Cy: NaN, w: 1, live: false, beyondA: false, beyondB: false,
    walkA, walkB, nodes, limitingK, limitingFactor,
  };
  if (r > 1e-12) {
    const arcR = r * cot;
    const eA = walkA.at(arcR);
    const eB = walkB.at(arcR);
    const frA = armFrame(fb, src.a, clamp(eA.dFoot, 0, A.L));
    const frB = armFrame(fb, src.b, clamp(eB.dFoot, 0, B.L));
    c.Fa = { x: eA.x, y: eA.y }; c.Fb = { x: eB.x, y: eB.y };
    c.tA = { x: eA.tx, y: eA.ty }; c.tB = { x: eB.tx, y: eB.ty };
    c.dFootA = eA.dFoot; c.dFootB = eB.dFoot;
    c.sFootA = frA.sAbs; c.sFootB = frB.sAbs;
    c.beyondA = arcR > walkA.total + 1e-9;
    c.beyondB = arcR > walkB.total + 1e-9;
    // logging gates at the final feet (cap/steep from their normals)
    let nAx = eA.x - frA.cx, nAy = eA.y - frA.cy;
    let nBx = eB.x - frB.cx, nBy = eB.y - frB.cy;
    const lA = Math.hypot(nAx, nAy), lB = Math.hypot(nBx, nBy);
    if (lA > 1e-12) { nAx /= lA; nAy /= lA; }
    if (lB > 1e-12) { nBx /= lB; nBy /= lB; }
    c.den = 1 + nAx * nBx + nAy * nBy;
    c.steep = ss(0, 1, (c.den / denV - 0.3) / 0.4);
    c.slack = Math.min(A.L - fb.W - eA.dFoot, B.L - fb.W - eB.dFoot);
    c.cap = ss(0, 1, c.slack / (0.5 * h));
    const prim = tryRound(c.Fa, c.Fb, c.tA, c.tB, src.Vx, src.Vy, h);
    if (prim) {
      c.kind = "quad"; c.Cx = prim.Cx; c.Cy = prim.Cy; c.w = prim.w; c.live = true;
      c.fallbackToK = K; // primary, not a fallback (k sentinel = K means at r)
    } else {
      c.nodeFallback = true; c.fallback = true;
      const kMax = clamp(Math.floor(r / dr + 1e-9), 0, K);
      let used: NodeRec | null = null;
      let usedTry: { Cx: number; Cy: number; w: number } | null = null;
      for (let k = kMax; k >= 1; k--) {
        const nd = nodes[k];
        if (!nd || nd.beyond) continue;
        const tr = tryRound(nd.Ea, nd.Eb, nd.tA, nd.tB, src.Vx, src.Vy, h);
        if (tr) { used = nd; usedTry = tr; break; }
      }
      if (used && usedTry) {
        c.Fa = { ...used.Ea }; c.Fb = { ...used.Eb };
        c.tA = { ...used.tA }; c.tB = { ...used.tB };
        c.dFootA = used.dFootA; c.dFootB = used.dFootB;
        c.sFootA = used.sFootA; c.sFootB = used.sFootB;
        c.rEff = used.rk;
        c.kind = "quad"; c.Cx = usedTry.Cx; c.Cy = usedTry.Cy; c.w = usedTry.w; c.live = true;
        c.fallbackToK = used.k;
        c.den = used.den; c.steep = used.steepF; c.cap = used.capF; c.slack = used.slack;
      } else {
        c.live = false; c.kind = "none"; c.rEff = 0; c.fallbackToK = 0;
      }
    }
  }
  if (timing) { timing.round += performance.now() - tRd; timing.calls++; }
  return c;
}
