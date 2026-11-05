// K1179 S1c (K1178 Run L), task 2: a closed-form corner solve of master's
// form B rule (docs/design/K1179_s1c.md). Same inputs and outputs as Run K
// task 3: the arm polylines within their windows as form B builds them,
// with h, theta, style and the gate constants; form B's Corner fields.
//
// Shape of the solve (no candidate grid, no stepped foot tracking, no
// Newton): the distance to a polyline is piecewise - each segment's offset
// line, a circle about each vertex - so a point at distance rho from both
// arms lies where two such pieces meet (line-line: a bisector; line-point:
// a parabola, here solved as offset-line/circle; point-point: a bisector
// line/circle). V (rho = h) is found by iterating that pair solve over the
// nearest-feature pair until the pair is stable. The ball's branch is then
// walked pair by pair: within a pair q(rho) is the closed form above, the
// next pair starts where a foot leaves its piece (found by bisection on
// the pair-validity predicate, 60 iterations max), and the gates are
// evaluated at the quadrature points of an adaptive Simpson integration
// of the running minimum S (form B samples 32 fixed nodes instead; where
// the two integrals differ, form B's discretisation is the cause).
//
// Stated maxima per corner: MAX_PAIR_STEPS pair intervals, MAX_BISECT
// bisection iterations per transition, MAX_QUAD_DEPTH Simpson depth,
// MAX_V_ITERS pair iterations for V. No warm start: every call is a pure
// function of the built form-B instance (its arms, windows, polylines),
// so a cold and a warm solve are the same solve.
import { candidates, dS, zAt } from "../../../../src/render/field/geom";
import { ss } from "../../../../src/render/field/form_b";
import { rootBandEff } from "../outline";

export const MAX_V_ITERS = 24;
export const MAX_PAIR_STEPS = 512;
export const MAX_BISECT = 60;
export const MAX_QUAD_DEPTH = 16;
export const MAX_W_EVALS = 512;

export interface ClosedTiming {
  windows: number; walk: number; gates: number; omega: number; calls: number;
  wEvals: number; pairSteps: number; nearestScans: number;
}
export const newTiming = (): ClosedTiming => ({ windows: 0, walk: 0, gates: 0, omega: 0, calls: 0, wEvals: 0, pairSteps: 0, nearestScans: 0 });

// ---------------------------------------------------------------- windows
/** One arm's window polyline in increasing arm-distance order. */
export interface WinArm {
  ai: number; pi: number; L: number; sR: number; dir: number;
  n: number; // points
  x: Float64Array; y: Float64Array; d: Float64Array; s: Float64Array;
  ux: Float64Array; uy: Float64Array; sl: Float64Array; // per segment
}

export function buildWindow(fb: any, ai: number): WinArm {
  const a = fb.arms[ai];
  const p = fb.polys[a.pi];
  const [lo, hi] = fb.armWindow(ai) as [number, number];
  // Walk the segments the window touches (pointAt's segment at lo, then
  // vertex by vertex to hi), in s order; d is measured from the root.
  const rows: { d: number; x: number; y: number; s: number }[] = [];
  const sRu = a.dir > 0 ? lo : hi;
  const start = pointAt(p, lo);
  rows.push({ s: lo, x: start.x, y: start.y, d: (lo - sRu) * a.dir });
  let k = start.k;
  let sCur = lo;
  // The first segment is clipped at lo: only its remainder remains.
  let segRem = p.s[k] + p.segLen[k] - normS(p, lo);
  for (let step = 0; step <= p.nseg + 1; step++) {
    const sNext = sCur + segRem;
    if (sNext >= hi - 1e-12) break;
    const bIdx = segB(p, k);
    rows.push({ s: sNext, x: p.x[bIdx], y: p.y[bIdx], d: (sNext - sRu) * a.dir });
    sCur = sNext;
    k = bIdx;
    segRem = p.segLen[k];
    if (!p.closed && k >= p.nseg) break;
  }
  const end = pointAt(p, hi);
  rows.push({ s: hi, x: end.x, y: end.y, d: (hi - sRu) * a.dir });
  if (a.dir < 0) rows.reverse();
  const pts: { d: number; x: number; y: number; s: number }[] = [];
  for (const r of rows) {
    if (pts.length && Math.abs(r.d - pts[pts.length - 1].d) < 1e-12) continue;
    pts.push(r);
  }
  const n = pts.length;
  const w: WinArm = {
    ai, pi: a.pi, L: a.L, sR: a.sR, dir: a.dir, n,
    x: new Float64Array(n), y: new Float64Array(n), d: new Float64Array(n), s: new Float64Array(n),
    ux: new Float64Array(Math.max(0, n - 1)), uy: new Float64Array(Math.max(0, n - 1)), sl: new Float64Array(Math.max(0, n - 1)),
  };
  for (let i = 0; i < n; i++) {
    w.x[i] = pts[i].x; w.y[i] = pts[i].y; w.d[i] = pts[i].d; w.s[i] = pts[i].s;
  }
  for (let i = 0; i + 1 < n; i++) {
    const dx = w.x[i + 1] - w.x[i];
    const dy = w.y[i + 1] - w.y[i];
    const l = Math.hypot(dx, dy) || 1;
    w.ux[i] = dx / l; w.uy[i] = dy / l; w.sl[i] = l;
  }
  return w;
}

// pointAt / segB on a chain, through the built instance's polys.
import { normS, pointAt, segB } from "../../../../src/render/field/geom";

// ---------------------------------------------------------------- nearest
export type Feat = { kind: "seg" | "vtx"; idx: number };
export interface Near { dist: number; fx: number; fy: number; fd: number; feat: Feat; t: number }

export function nearest(w: WinArm, qx: number, qy: number): Near {
  let best = Infinity;
  let fx = 0, fy = 0, fd = 0, bi = 0, bt = 0;
  for (let i = 0; i + 1 < w.n; i++) {
    const ax = w.x[i], ay = w.y[i];
    const ex = w.x[i + 1] - ax, ey = w.y[i + 1] - ay;
    const l2 = ex * ex + ey * ey;
    let t = l2 > 0 ? ((qx - ax) * ex + (qy - ay) * ey) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + ex * t, py = ay + ey * t;
    const dx = qx - px, dy = qy - py;
    const dd = Math.sqrt(dx * dx + dy * dy);
    if (dd < best) { best = dd; fx = px; fy = py; fd = w.d[i] + t * (w.d[i + 1] - w.d[i]); bi = i; bt = t; }
  }
  if (!Number.isFinite(best)) { // single-point window
    return { dist: Math.hypot(qx - w.x[0], qy - w.y[0]), fx: w.x[0], fy: w.y[0], fd: w.d[0], feat: { kind: "vtx", idx: 0 }, t: 0 };
  }
  const feat: Feat = bt <= 1e-9 ? { kind: "vtx", idx: bi } : bt >= 1 - 1e-9 ? { kind: "vtx", idx: bi + 1 } : { kind: "seg", idx: bi };
  return { dist: best, fx, fy, fd, feat, t: bt };
}

function featEq(a: Feat, b: Feat, w: WinArm, nearRes: Near): boolean {
  void w;
  // Canonicalise a segment foot at its endpoint to that vertex.
  const canon = (f: Feat, t: number, segIdx: number): Feat =>
    f.kind === "seg" && t <= 1e-7 ? { kind: "vtx", idx: segIdx } : f.kind === "seg" && t >= 1 - 1e-7 ? { kind: "vtx", idx: segIdx + 1 } : f;
  const ca = canon(nearRes.feat, nearRes.t, nearRes.feat.idx);
  return ca.kind === b.kind && ca.idx === b.idx;
}

// ---------------------------------------------------------------- pair solve
export interface Pair { fa: Feat; fb: Feat; sa: number; sb: number }
export interface PairPt { x: number; y: number; fxA: number; fyA: number; fdA: number; fxB: number; fyB: number; fdB: number }

function segLine(w: WinArm, f: Feat): { ax: number; ay: number; ux: number; uy: number; nx: number; ny: number } {
  const i = f.idx;
  return { ax: w.x[i], ay: w.y[i], ux: w.ux[i], uy: w.uy[i], nx: -w.uy[i], ny: w.ux[i] };
}

/** The point at distance rho from both pieces, the branch nearest hint. */
export function pairPoint(wA: WinArm, pair: Pair, wB: WinArm, rho: number, hx: number, hy: number): PairPt | null {
  const A = pair.fa, B = pair.fb;
  let x = 0, y = 0;
  if (A.kind === "seg" && B.kind === "seg") {
    const la = segLine(wA, A), lb = segLine(wB, B);
    const ca = la.nx * la.ax + la.ny * la.ay + pair.sa * rho;
    const cb = lb.nx * lb.ax + lb.ny * lb.ay + pair.sb * rho;
    const det = la.nx * lb.ny - la.ny * lb.nx;
    if (Math.abs(det) < 1e-14) return null;
    x = (ca * lb.ny - cb * la.ny) / det;
    y = (la.nx * cb - lb.nx * ca) / det;
  } else if (A.kind === "vtx" && B.kind === "vtx") {
    const cax = wA.x[A.idx], cay = wA.y[A.idx], cbx = wB.x[B.idx], cby = wB.y[B.idx];
    const dx = cbx - cax, dy = cby - cay;
    const dl = Math.hypot(dx, dy);
    if (!(dl > 0) || rho < dl / 2 - 1e-12) return null;
    const ex = dx / dl, ey = dy / dl;
    const mx = cax + ex * (dl / 2), my = cay + ey * (dl / 2);
    const t = Math.sqrt(Math.max(0, rho * rho - (dl / 2) * (dl / 2)));
    const px = -ey, py = ex;
    const sgn = (hx - mx) * px + (hy - my) * py >= 0 ? 1 : -1;
    x = mx + px * t * sgn; y = my + py * t * sgn;
  } else if (A.kind === "seg" && B.kind === "vtx") {
    const la = segLine(wA, A);
    const cx = wB.x[B.idx], cy = wB.y[B.idx];
    // Base point on the offset line, then line/circle for t along u.
    const bx = la.ax + la.nx * pair.sa * rho, by = la.ay + la.ny * pair.sa * rho;
    const vx = bx - cx, vy = by - cy;
    const bq = la.ux * vx + la.uy * vy;
    const cq = vx * vx + vy * vy - rho * rho;
    const disc = bq * bq - cq;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    const tHint = (hx - bx) * la.ux + (hy - by) * la.uy;
    const t1 = -bq + sq, t2 = -bq - sq;
    const t = Math.abs(t1 - tHint) <= Math.abs(t2 - tHint) ? t1 : t2;
    x = bx + la.ux * t; y = by + la.uy * t;
  } else {
    const lb = segLine(wB, B);
    const cx = wA.x[A.idx], cy = wA.y[A.idx];
    const bx = lb.ax + lb.nx * pair.sb * rho, by = lb.ay + lb.ny * pair.sb * rho;
    const vx = bx - cx, vy = by - cy;
    const bq = lb.ux * vx + lb.uy * vy;
    const cq = vx * vx + vy * vy - rho * rho;
    const disc = bq * bq - cq;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    const tHint = (hx - bx) * lb.ux + (hy - by) * lb.uy;
    const t1 = -bq + sq, t2 = -bq - sq;
    const t = Math.abs(t1 - tHint) <= Math.abs(t2 - tHint) ? t1 : t2;
    x = bx + lb.ux * t; y = by + lb.uy * t;
  }
  // Feet: projections for segments, the vertex itself for points.
  let fxA: number, fyA: number, fdA: number, fxB: number, fyB: number, fdB: number;
  if (A.kind === "seg") {
    const la = segLine(wA, A);
    const t = (x - la.ax) * la.ux + (y - la.ay) * la.uy;
    fxA = la.ax + la.ux * t; fyA = la.ay + la.uy * t;
    fdA = wA.d[A.idx] + t;
  } else { fxA = wA.x[A.idx]; fyA = wA.y[A.idx]; fdA = wA.d[A.idx]; }
  if (B.kind === "seg") {
    const lb = segLine(wB, B);
    const t = (x - lb.ax) * lb.ux + (y - lb.ay) * lb.uy;
    fxB = lb.ax + lb.ux * t; fyB = lb.ay + lb.uy * t;
    fdB = wB.d[B.idx] + t;
  } else { fxB = wB.x[B.idx]; fyB = wB.y[B.idx]; fdB = wB.d[B.idx]; }
  return { x, y, fxA, fyA, fdA, fxB, fyB, fdB };
}

function pairOf(wA: WinArm, nA: Near, wB: WinArm, nB: Near, qx: number, qy: number): Pair {
  const sign = (w: WinArm, f: Feat): number => {
    if (f.kind === "vtx") return 0;
    const la = segLine(w, f);
    const s = (qx - la.ax) * la.nx + (qy - la.ay) * la.ny;
    return s >= 0 ? 1 : -1;
  };
  return { fa: nA.feat, fb: nB.feat, sa: sign(wA, nA.feat), sb: sign(wB, nB.feat) };
}

// ---------------------------------------------------------------- margin
// form_b.ts marginOf on the window arrays: the basin about the foot (the
// run where the distance to q rises), then the nearest distance outside it.
export function marginOfWin(w: WinArm, qx: number, qy: number, footFd: number, rho: number): number {
  const n = w.n;
  if (n < 2) return Infinity;
  // Foot segment: last segment whose start is at or before the foot.
  let kf = 0;
  while (kf + 1 < n - 1 && w.d[kf + 1] <= footFd + 1e-12) kf++;
  if (footFd >= w.d[n - 1] - 1e-12) kf = n - 2;
  let hiD = w.d[n - 1];
  for (let j = kf + 1; j + 1 < n; j++) {
    if ((w.x[j] - qx) * (w.x[j + 1] - w.x[j]) + (w.y[j] - qy) * (w.y[j + 1] - w.y[j]) < 0) { hiD = w.d[j]; break; }
    if (j + 1 >= n - 1) hiD = w.d[n - 1];
  }
  if (kf + 1 >= n - 1) hiD = w.d[n - 1];
  let loD = w.d[0];
  for (let j = kf; j >= 1; j--) {
    if ((w.x[j] - qx) * (w.x[j - 1] - w.x[j]) + (w.y[j] - qy) * (w.y[j - 1] - w.y[j]) < 0) { loD = w.d[j]; break; }
    if (j <= 1) loD = w.d[0];
  }
  let d2 = Infinity;
  for (let i = 0; i + 1 < n; i++) {
    const d0 = w.d[i], d1 = w.d[i + 1];
    if (d0 >= loD && d1 <= hiD) continue; // wholly inside the basin
    // Sub-segments outside [loD, hiD], clipped in d (linear along segment).
    for (let part = 0; part < 2; part++) {
      const c0 = part === 0 ? d0 : Math.max(d0, hiD);
      const c1 = part === 0 ? Math.min(d1, loD) : d1;
      if (!(c1 > c0)) continue;
      const segLen = d1 - d0 || 1;
      const t0 = (c0 - d0) / segLen, t1 = (c1 - d0) / segLen;
      const ax = w.x[i] + (w.x[i + 1] - w.x[i]) * t0, ay = w.y[i] + (w.y[i + 1] - w.y[i]) * t0;
      const bx = w.x[i] + (w.x[i + 1] - w.x[i]) * t1, by = w.y[i] + (w.y[i + 1] - w.y[i]) * t1;
      const ex = bx - ax, ey = by - ay;
      const l2 = ex * ex + ey * ey;
      let t = l2 > 0 ? ((qx - ax) * ex + (qy - ay) * ey) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = qx - (ax + ex * t), dy = qy - (ay + ey * t);
      const dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < d2) d2 = dd;
    }
  }
  return d2 - rho;
}

// ---------------------------------------------------------------- the solve
export interface ClosedCtx {
  cache: Map<number, WinArm>;
  timing?: ClosedTiming;
  maxWork: { wEvals: number; pairSteps: number };
}

export function closedCorner(fb: any, ji: number, a: number, b: number, th0: number, style: number, ctx: ClosedCtx): any | null {
  const T = ctx.timing;
  const tWin = T ? performance.now() : 0;
  let wA = ctx.cache.get(a);
  if (!wA) { wA = buildWindow(fb, a); ctx.cache.set(a, wA); }
  let wB = ctx.cache.get(b);
  if (!wB) { wB = buildWindow(fb, b); ctx.cache.set(b, wB); }
  if (T) T.windows += performance.now() - tWin;
  const h: number = fb.h;
  const A = fb.arms[a], B = fb.arms[b];
  if (!(A.L > 1e-9 && B.L > 1e-9)) return null;
  const j = fb.scene.junctions[ji];
  const tWalk = T ? performance.now() : 0;
  // V: pair iteration from form B's straight-arm start.
  let bx = A.ux + B.ux, by = A.uy + B.uy;
  const bl = Math.hypot(bx, by) || 1;
  bx /= bl; by /= bl;
  const sn = Math.sin(th0 / 2);
  let qx = j.c[0] + (bx * h) / sn, qy = j.c[1] + (by * h) / sn;
  let pair: Pair | null = null;
  let okV = false;
  for (let it = 0; it < MAX_V_ITERS; it++) {
    if (T) T.nearestScans += 2;
    const nA = nearest(wA, qx, qy), nB = nearest(wB, qx, qy);
    pair = pairOf(wA, nA, wB, nB, qx, qy);
    const p = pairPoint(wA, pair, wB, h, qx, qy);
    if (!p) {
      // The seed's nearest pair can have no point at rho = h (an offset
      // line farther than h from the other piece's vertex). One damped
      // Newton step on the two feet (form B's solveEq step, capped at h)
      // moves the seed until a pair with a closed-form point takes over;
      // the branch walk itself stays closed-form. Bounded by MAX_V_ITERS
      // with the pair iterations above.
      const fa2 = nA, fb2 = nB;
      if (!(fa2.dist > 1e-12 && fb2.dist > 1e-12)) break;
      const gax = (qx - fa2.fx) / fa2.dist, gay = (qy - fa2.fy) / fa2.dist;
      const gbx = (qx - fb2.fx) / fb2.dist, gby = (qy - fb2.fy) / fb2.dist;
      const det = gax * gby - gay * gbx;
      if (Math.abs(det) < 1e-12) break;
      const Fa = fa2.dist - h, Fb = fb2.dist - h;
      let dx = (-Fa * gby + Fb * gay) / det;
      let dy = (-Fb * gax + Fa * gbx) / det;
      const dl = Math.hypot(dx, dy);
      if (dl > h) { dx *= h / dl; dy *= h / dl; }
      qx += dx; qy += dy;
      continue;
    }
    const moved = Math.hypot(p.x - qx, p.y - qy);
    if (moved > h) {
      // Damped step, as form B's Newton caps its step at h: a pair of
      // nearly parallel offset lines intersects far away, and taking the
      // whole jump lands on a different branch of the medial axis.
      qx += ((p.x - qx) * h) / moved;
      qy += ((p.y - qy) * h) / moved;
      continue;
    }
    qx = p.x; qy = p.y;
    if (moved < 1e-12 * h) { okV = true; break; }
    if (it === MAX_V_ITERS - 1) {
      const vA = nearest(wA, qx, qy), vB = nearest(wB, qx, qy);
      okV = Math.abs(vA.dist - h) < 1e-9 * Math.max(1, h) && Math.abs(vB.dist - h) < 1e-9 * Math.max(1, h);
    }
  }
  if (!okV || !pair) { if (T) T.walk += performance.now() - tWalk; return null; }
  const Vx = qx, Vy = qy;
  if (T) T.nearestScans += 2;
  const nVa = nearest(wA, Vx, Vy), nVb = nearest(wB, Vx, Vy);
  const dVa = nVa.fd, dVb = nVb.fd;
  const tol = 1e-9 * h;
  if (!(dVa > tol && dVa < A.L - tol && dVb > tol && dVb < B.L - tol)) { if (T) T.walk += performance.now() - tWalk; return null; }
  const crossA = A.ux * (Vy - j.c[1]) - A.uy * (Vx - j.c[0]);
  const crossB = B.ux * (Vy - j.c[1]) - B.uy * (Vx - j.c[0]);
  const sgn = Math.sign(A.ux * B.uy - A.uy * B.ux);
  if (!(crossA * sgn > 0 && crossB * sgn < 0)) { if (T) T.walk += performance.now() - tWalk; return null; }
  pair = pairOf(wA, nVa, wB, nVb, Vx, Vy);
  const theta = th0;
  const r0 = style * (fb.cr / 3) * Math.min(2 * h, 1.5 * h * Math.tan(theta / 2));
  const rbEff = rootBandEff(fb, theta);
  const denV = 1 + ((Vx - nVa.fx) * (Vx - nVb.fx) + (Vy - nVa.fy) * (Vy - nVb.fy)) / (h * h);
  let room = Math.min(A.L - fb.W - dVa, B.L - fb.W - dVb);
  let wEvals = 0;
  // w at a branch point given by the pair (feet from the closed form).
  const wOfPt = (p: PairPt, rho: number): number => {
    wEvals++;
    if (T) T.wEvals++;
    const slack = Math.min(A.L - fb.W - p.fdA, B.L - fb.W - p.fdB);
    if (slack < room) room = slack;
    const den = 1 + ((p.x - p.fxA) * (p.x - p.fxB) + (p.y - p.fyA) * (p.y - p.fyB)) / (rho * rho);
    const steep = ss(0, 1, (den / denV - 0.3) / 0.4);
    const cap = ss(0, 1, slack / (0.5 * h));
    const root = fb.rootBand > 0 ? ss(0, 1, p.fdA / rbEff) * ss(0, 1, p.fdB / rbEff) : 1;
    if (steep === 0 || cap === 0 || root === 0) return 0;
    const tG = T ? performance.now() : 0;
    const mA = marginOfWin(wA, p.x, p.y, p.fdA, rho);
    const mB = marginOfWin(wB, p.x, p.y, p.fdB, rho);
    if (T) T.gates += performance.now() - tG;
    // Master's band (form_b.ts wOf): ss(1 + min(0, mA, mB)/0.05h).
    return ss(0, 1, 1 + Math.min(0, mA, mB) / (0.05 * h)) * steep * cap * root;
  };
  let r = 0;
  let qPt: PairPt = { x: Vx, y: Vy, fxA: nVa.fx, fyA: nVa.fy, fdA: dVa, fxB: nVb.fx, fyB: nVb.fy, fdB: dVb };
  const bps: { rho: number; pair: Pair; x: number; y: number }[] = [{ rho: h, pair, x: Vx, y: Vy }];
  if (r0 > 0) {
    const rhoEnd = h + r0;
    let rho = h;
    let curPair: Pair = pair;
    let hx = Vx, hy = Vy;
    let wStart = wOfPt(qPt, h);
    let sRun = wStart; // running minimum of w up to rho
    let integ = 0;
    let steps = 0;
    // Adaptive Simpson on s (running-min integrand) over one pair interval.
    const rec = (pa: Pair, aa: number, bb: number, wa: number, wb: number, sIn: number, hintX: number, hintY: number, depth: number): { integ: number; minW: number } => {
      const sa = Math.min(sIn, wa);
      if (sa === 0) return { integ: 0, minW: 0 };
      const m = (aa + bb) / 2;
      const pm = pairPoint(wA, pa, wB, m, hintX, hintY);
      if (!pm) return { integ: sa * (bb - aa), minW: wa };
      const wm = wOfPt(pm, m);
      const sm = Math.min(sa, wm), sb = Math.min(sa, wm, wb);
      const simp = ((bb - aa) / 6) * (sa + 4 * sm + sb);
      const trap = ((bb - aa) / 2) * (sa + sb);
      if (depth <= 0 || bb - aa < 1e-7 * h || Math.abs(simp - trap) < 5e-5 * h || wEvals > MAX_W_EVALS) {
        return { integ: simp, minW: Math.min(wa, wm, wb) };
      }
      const left = rec(pa, aa, m, wa, wm, sIn, hintX, hintY, depth - 1);
      const right = rec(pa, m, bb, wm, wb, Math.min(sIn, left.minW), pm.x, pm.y, depth - 1);
      return { integ: left.integ + right.integ, minW: Math.min(left.minW, right.minW) };
    };
    // The next pair transition: the smallest rho where a foot leaves its
    // piece (a segment foot's t reaches an end, or a vertex foot's branch
    // point crosses an adjacent segment's direction). Each crossing is
    // bisected on that scalar with pair-point evaluations only (at most
    // TRANS_BISECT); one nearest scan per transition then verifies the
    // new pair (a folded arm can hand the foot to a non-adjacent piece).
    const TRANS_BISECT = 14;
    const transOf = (fromRho: number, hintX: number, hintY: number, limit: number): { end: number; pair: Pair } | null => {
      let bestEnd = Infinity;
      let bestPair: Pair | null = null;
      const pEndAll = pairPoint(wA, curPair, wB, limit, hintX, hintY);
      const arms: { w: WinArm; f: Feat; isA: boolean }[] = [
        { w: wA, f: curPair.fa, isA: true },
        { w: wB, f: curPair.fb, isA: false },
      ];
      for (const { w, f, isA } of arms) {
        const fdOf = (p: PairPt): number => (isA ? p.fdA : p.fdB);
        const consider = (candRho: number, nf: Feat) => {
          if (!(candRho < bestEnd)) return;
          const pq = pairPoint(wA, curPair, wB, candRho, hintX, hintY);
          if (!pq) return;
          let np: Pair;
          if (isA) {
            const s = nf.kind === "seg" ? ((pq.x - w.x[nf.idx]) * -w.uy[nf.idx] + (pq.y - w.y[nf.idx]) * w.ux[nf.idx] >= 0 ? 1 : -1) : 0;
            np = { fa: nf, fb: curPair.fb, sa: s, sb: curPair.sb };
          } else {
            const s = nf.kind === "seg" ? ((pq.x - w.x[nf.idx]) * -w.uy[nf.idx] + (pq.y - w.y[nf.idx]) * w.ux[nf.idx] >= 0 ? 1 : -1) : 0;
            np = { fa: curPair.fa, fb: nf, sa: curPair.sa, sb: s };
          }
          bestEnd = candRho;
          bestPair = np;
        };
        if (f.kind === "seg") {
          const lseg = w.d[f.idx + 1] - w.d[f.idx];
          const pE = pEndAll;
          if (!pE) continue;
          const tE = fdOf(pE) - w.d[f.idx];
          if (tE > lseg || tE < 0) {
            const bound = tE > lseg ? lseg : 0;
            let lo = fromRho, hi = rhoEnd;
            for (let bi = 0; bi < TRANS_BISECT; bi++) {
              const mid = (lo + hi) / 2;
              const pm2 = pairPoint(wA, curPair, wB, mid, hintX, hintY);
              if (!pm2) { hi = mid; continue; }
              const tm = fdOf(pm2) - w.d[f.idx];
              if ((bound === 0 && tm > 0) || (bound !== 0 && tm < bound)) lo = mid; else hi = mid;
            }
            consider(hi, { kind: "vtx", idx: bound === 0 ? f.idx : f.idx + 1 });
          }
        } else {
          const cx = w.x[f.idx], cy = w.y[f.idx];
          const adjs: { seg: number; ax: number; ay: number }[] = [];
          if (f.idx > 0) adjs.push({ seg: f.idx - 1, ax: -w.ux[f.idx - 1], ay: -w.uy[f.idx - 1] });
          if (f.idx + 1 < w.n) adjs.push({ seg: f.idx, ax: w.ux[f.idx], ay: w.uy[f.idx] });
          for (const adj of adjs) {
            const gOf = (p: PairPt): number => (p.x - cx) * adj.ax + (p.y - cy) * adj.ay;
            const pE = pEndAll;
            if (!pE || gOf(pE) <= 0) continue;
            let lo = fromRho, hi = rhoEnd;
            for (let bi = 0; bi < TRANS_BISECT; bi++) {
              const mid = (lo + hi) / 2;
              const pm2 = pairPoint(wA, curPair, wB, mid, hintX, hintY);
              if (!pm2) { hi = mid; continue; }
              if (gOf(pm2) <= 0) lo = mid; else hi = mid;
            }
            consider(hi, { kind: "seg", idx: adj.seg });
          }
        }
      }
      return bestPair ? { end: bestEnd, pair: bestPair } : null;
    };
    while (rho < rhoEnd - 1e-12 * rhoEnd && sRun > 0 && steps < MAX_PAIR_STEPS) {
      steps++;
      // The pair's locus can cease to exist before rhoEnd (an offset line
      // moving past a vertex's circle): bisect its existence and treat
      // that rho as a hard end, where the nearest scan hands the branch
      // to the next pair.
      let hardEnd = rhoEnd;
      let existenceEnd = false;
      if (!pairPoint(wA, curPair, wB, rhoEnd, hx, hy)) {
        let lo2 = rho, hi2 = rhoEnd;
        for (let bi = 0; bi < 24; bi++) {
          const mid = (lo2 + hi2) / 2;
          if (pairPoint(wA, curPair, wB, mid, hx, hy)) lo2 = mid; else hi2 = mid;
        }
        hardEnd = lo2;
        existenceEnd = hardEnd < rhoEnd - 1e-12 * h;
      }
      const trans = transOf(rho, hx, hy, hardEnd);
      const end = trans ? Math.min(trans.end, hardEnd) : hardEnd;
      if (end > rho + 1e-12 * h) {
        const pA = pairPoint(wA, curPair, wB, rho, hx, hy);
        const pB = pairPoint(wA, curPair, wB, end, pA ? pA.x : hx, pA ? pA.y : hy);
        if (!pA || !pB) break;
        const wa = rho === h && steps === 1 ? wStart : wOfPt(pA, rho);
        const wb = wOfPt(pB, end);
        const res = rec(curPair, rho, end, wa, wb, sRun, pA.x, pA.y, MAX_QUAD_DEPTH);
        integ += res.integ;
        sRun = Math.min(sRun, res.minW);
        rho = end;
        hx = pB.x; hy = pB.y;
      }
      if (rho >= rhoEnd - 1e-12 * rhoEnd) break;
      if (!trans && !existenceEnd) break;
      if (existenceEnd && !(trans && trans.end < hardEnd - 1e-9 * h)) {
        // Existence end: jump the branch point a hair past it by pair
        // iteration at the new rho (nearest pair, closed form, damped),
        // which lands on the next sheet of the branch.
        const target = Math.min(rhoEnd, rho + 1e-6 * h);
        let sx = hx, sy = hy;
        let solved = false;
        for (let it = 0; it < 12; it++) {
          if (T) T.nearestScans += 2;
          const n1 = nearest(wA, sx, sy), n2 = nearest(wB, sx, sy);
          const pr = pairOf(wA, n1, wB, n2, sx, sy);
          const p1 = pairPoint(wA, pr, wB, target, sx, sy);
          if (!p1) break;
          const mv = Math.hypot(p1.x - sx, p1.y - sy);
          if (mv > h) { sx += ((p1.x - sx) * h) / mv; sy += ((p1.y - sy) * h) / mv; continue; }
          sx = p1.x; sy = p1.y;
          if (mv < 1e-12 * h) { solved = true; break; }
          if (it === 11) solved = Math.abs(nearest(wA, sx, sy).dist - target) < 1e-7 * h && Math.abs(nearest(wB, sx, sy).dist - target) < 1e-7 * h;
        }
        if (!solved) break;
        integ += sRun * (target - rho);
        rho = target;
        hx = sx; hy = sy;
        if (T) T.nearestScans += 2;
        curPair = pairOf(wA, nearest(wA, sx, sy), wB, nearest(wB, sx, sy), sx, sy);
        bps.push({ rho, pair: curPair, x: sx, y: sy });
        continue;
      }
      if (trans) curPair = trans.pair;
      // Verify the new pair just past the transition (one scan per arm);
      // adopt the scanned pair where a fold hands the foot elsewhere.
      const probeRho = Math.min(rhoEnd, rho + Math.min(1e-6 * h, (rhoEnd - rho) / 2 + 1e-9 * h));
      const pp = pairPoint(wA, curPair, wB, probeRho, hx, hy);
      if (pp) {
        if (T) T.nearestScans += 2;
        const nnA = nearest(wA, pp.x, pp.y), nnB = nearest(wB, pp.x, pp.y);
        if (!featEq(nnA.feat, curPair.fa, wA, nnA) || !featEq(nnB.feat, curPair.fb, wB, nnB)) {
          curPair = pairOf(wA, nnA, wB, nnB, pp.x, pp.y);
        }
        bps.push({ rho, pair: curPair, x: pp.x, y: pp.y });
      } else {
        bps.push({ rho, pair: curPair, x: hx, y: hy });
      }
    }
    // Stepped continuation where the pair walk stopped short with S
    // still positive (a sheet the pair locus does not reach in closed
    // form): panels of (remaining rho)/64, each panel's branch point by
    // pair iteration from the last one, w on the same gates, trapezoid
    // of the running minimum as form B forms it. Still no candidate
    // grid and no warm start (each panel starts from this frame's last
    // branch point, never from a previous frame).
    if (rho < rhoEnd - 1e-12 * h && sRun > 0) {
      let prevPt: PairPt = { x: hx, y: hy, fxA: qPt.fxA, fyA: qPt.fyA, fdA: qPt.fdA, fxB: qPt.fxB, fyB: qPt.fyB, fdB: qPt.fdB };
      // Recompute the feet at (hx, hy) properly from the current pair.
      const atRho = pairPoint(wA, curPair, wB, rho, hx, hy);
      if (atRho) prevPt = atRho;
      let wPrev = wOfPt(prevPt, rho);
      const nSteps = 64;
      const dr = (rhoEnd - rho) / nSteps;
      for (let k = 1; k <= nSteps && sRun > 0; k++) {
        const target = rho + dr;
        let sx = hx, sy = hy;
        let pt: PairPt | null = null;
        for (let it = 0; it < 12; it++) {
          if (T) T.nearestScans += 2;
          const n1 = nearest(wA, sx, sy), n2 = nearest(wB, sx, sy);
          const pr = pairOf(wA, n1, wB, n2, sx, sy);
          const p1 = pairPoint(wA, pr, wB, target, sx, sy);
          if (!p1) break;
          const mv = Math.hypot(p1.x - sx, p1.y - sy);
          if (mv > h) { sx += ((p1.x - sx) * h) / mv; sy += ((p1.y - sy) * h) / mv; continue; }
          sx = p1.x; sy = p1.y;
          pt = p1;
          if (mv < 1e-12 * h) break;
        }
        if (!pt) break;
        const wT = wOfPt(pt, target);
        const sNew = Math.min(sRun, wT);
        integ += 0.5 * (Math.min(sRun, wPrev) + sNew) * dr;
        sRun = sNew;
        wPrev = wT;
        rho = target;
        hx = pt.x; hy = pt.y;
        if (T) T.nearestScans += 2;
        curPair = pairOf(wA, nearest(wA, sx, sy), wB, nearest(wB, sx, sy), sx, sy);
        bps.push({ rho, pair: curPair, x: sx, y: sy });
        qPt = pt;
      }
    }
    if (T) { T.pairSteps += steps; }
    ctx.maxWork.wEvals = Math.max(ctx.maxWork.wEvals, wEvals);
    ctx.maxWork.pairSteps = Math.max(ctx.maxWork.pairSteps, bps.length);
    r = integ;
    // q: the branch at rho = h + r, from the breakpoint pair holding it.
    const rhoQ = h + r;
    let bp = bps[0];
    for (const cand of bps) if (cand.rho <= rhoQ + 1e-12) bp = cand;
    const pq = pairPoint(wA, bp.pair, wB, rhoQ, bp.x, bp.y);
    if (pq) qPt = pq;
  }
  if (T) T.walk += performance.now() - tWalk;
  const rhoQ = h + r;
  // The ball's feet are the branch's tracked feet (the pair's feet at q),
  // as form B's footT tracks them - not a fresh global search, which at a
  // folded arm can land on a different part of the arm than the branch's.
  const fA = { dist: rhoQ, fx: qPt.fxA, fy: qPt.fyA, fd: qPt.fdA, feat: { kind: "seg" as const, idx: 0 }, t: 0 };
  const fB = { dist: rhoQ, fx: qPt.fxB, fy: qPt.fyB, fd: qPt.fdB, feat: { kind: "seg" as const, idx: 0 }, t: 0 };
  const qx2 = qPt.x, qy2 = qPt.y;
  const tax = fA.fx + (h * (qx2 - fA.fx)) / Math.max(rhoQ, 1e-300);
  const tay = fA.fy + (h * (qy2 - fA.fy)) / Math.max(rhoQ, 1e-300);
  const tbx = fB.fx + (h * (qx2 - fB.fx)) / Math.max(rhoQ, 1e-300);
  const tby = fB.fy + (h * (qy2 - fB.fy)) / Math.max(rhoQ, 1e-300);
  // Omega, as form_b.ts (the candidate scan over both arms' chains).
  const tOm = T ? performance.now() : 0;
  let ov = 0;
  const R = h + r;
  const pa = fb.polys[A.pi], pb = fb.polys[B.pi];
  for (const [ai, f] of [[a, fA], [b, fB]] as const) {
    const arm = fb.arms[ai];
    const p = fb.polys[arm.pi];
    const out: any[] = [];
    candidates(fb.grid, qx2, qy2, R, out, arm.pi);
    for (const cd of out) {
      const dd = fb.armDist(ai, cd.s);
      if (dd < 0 || dd > arm.L) continue;
      const sRef = ai === a ? wA.s[Math.min(f.feat.idx, wA.n - 1)] : wB.s[Math.min(f.feat.idx, wB.n - 1)];
      void sRef;
      // form B skips candidates within 0.5h of the foot's chain s; the
      // foot's s here is the window point's stored s at the foot.
      const footS = ai === a ? sAtFd(wA, f.fd) : sAtFd(wB, f.fd);
      if (Math.abs(dS(p, cd.s, footS)) < 0.5 * h) continue;
      ov = Math.max(ov, R - cd.d);
    }
  }
  void pa; void pb;
  const omega = fb.force?.omega ?? ss(0, 1, 1 - (ov - 0.05 * h) / fb.ovw);
  if (T) T.omega += performance.now() - tOm;
  if (T) T.calls++;
  return {
    j: ji, g: fb.groupOf[ji], a, b, ok: true, style, theta, r0, r1: r, r, room,
    Vx, Vy, qx: qx2, qy: qy2, tax, tay, tbx, tby,
    dVa, dVb, dA: fA.fd, dB: fB.fd,
    sA: sAtFd(wA, fA.fd), sB: sAtFd(wB, fB.fd),
    kA: fA.feat.idx, kB: fB.feat.idx,
    zA: zAt(fb.polys[A.pi], sAtFd(wA, fA.fd)), zB: zAt(fb.polys[B.pi], sAtFd(wB, fB.fd)),
    omega, ov, rV: Math.hypot(Vx - qx2, Vy - qy2),
  };
}

function sAtFd(w: WinArm, fd: number): number {
  // Chain s at arm-distance fd by interpolation over the window points.
  let i = 0;
  while (i + 1 < w.n - 1 && w.d[i + 1] < fd) i++;
  if (i + 1 >= w.n) return w.s[w.n - 1];
  const span = w.d[i + 1] - w.d[i];
  const t = span > 0 ? (fd - w.d[i]) / span : 0;
  // s may wrap on a closed chain; interpolate the short way via the points'
  // stored values as built (they are the scene's s, monotone in d here).
  return w.s[i] + (w.s[i + 1] - w.s[i]) * t;
}

/** The corner specs of a built instance, in form B's corner order. */
export function cornerSpecs(fb: any): { ji: number; a: number; b: number; th: number; style: number }[] {
  const specs: { ji: number; a: number; b: number; th: number; style: number }[] = [];
  fb.scene.junctions.forEach((j: any, ji: number) => {
    const ais = fb.arms.map((_: any, i: number) => i).filter((i: number) => fb.arms[i].j === ji);
    const n = ais.length;
    if (n < 2) return;
    ais.sort((u: number, v: number) => fb.arms[u].ang - fb.arms[v].ang);
    const styles = j.corners ?? [];
    for (let i = 0; i < n; i++) {
      const a = ais[i];
      const b = ais[(i + 1) % n];
      let th = fb.arms[b].ang - fb.arms[a].ang;
      th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (th <= 1e-6 || th >= Math.PI - 1e-6) continue;
      const ea = fb.arms[a].ei;
      const eb = fb.arms[b].ei;
      const xa = j.arms[ea];
      const xb = j.arms[eb];
      if (xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6) continue;
      const ne = j.arms.length;
      let st = styles[ea]?.style;
      if ((ea + 1) % ne !== eb && (eb + 1) % ne === ea) st = styles[eb]?.style;
      specs.push({ ji, a, b, th, style: st === "sharp" ? 0 : 1 });
    }
  });
  return specs;
}

/** Every closed-form corner of a built instance, in form B's corner order. */
export function closedCorners(fb: any, timing?: ClosedTiming): { corners: any[]; maxWork: { wEvals: number; pairSteps: number } } {
  const ctx: ClosedCtx = { cache: new Map(), timing, maxWork: { wEvals: 0, pairSteps: 0 } };
  const out: any[] = [];
  fb.scene.junctions.forEach((j: any, ji: number) => {
    const ais = fb.arms.map((_: any, i: number) => i).filter((i: number) => fb.arms[i].j === ji);
    const n = ais.length;
    if (n < 2) return;
    ais.sort((u: number, v: number) => fb.arms[u].ang - fb.arms[v].ang);
    const styles = j.corners ?? [];
    for (let i = 0; i < n; i++) {
      const a = ais[i];
      const b = ais[(i + 1) % n];
      let th = fb.arms[b].ang - fb.arms[a].ang;
      th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (th <= 1e-6 || th >= Math.PI - 1e-6) continue;
      const ea = fb.arms[a].ei;
      const eb = fb.arms[b].ei;
      const xa = j.arms[ea];
      const xb = j.arms[eb];
      if (xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6) continue;
      const ne = j.arms.length;
      let st = styles[ea]?.style;
      if ((ea + 1) % ne !== eb && (eb + 1) % ne === ea) st = styles[eb]?.style;
      const style = st === "sharp" ? 0 : 1;
      const c = closedCorner(fb, ji, a, b, th, style, ctx);
      if (c) out.push(c);
    }
  });
  return { corners: out, maxWork: ctx.maxWork };
}
