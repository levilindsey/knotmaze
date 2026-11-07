// K1040 S4a: the band pass's tables - form B's term 1 (the foot) on the GPU.
//
// The band draws into whatever framebuffer is bound (the frame's own pass:
// no full-size target of its own, which costs the Pixel a fixed ~1.5 ms a
// pass, S3f2/S3f5), reading the label (label_b_pass.ts's L) and these
// tables beside label_b's PTS, CHAIN and SPAN (shared, not rebuilt). The
// fragment rule is band_b_glsl.ts's header. Nothing in the app imports this:
// it is the probe's switch until S4b's flag.
//
// Tables (RGBA32F, TEX_W wide, fetched as label_b's):
//   ARM   2 texels per arm: (g, sR, dir, L), (Lcut or 1e30, 0, 0, 0)
//   CARM  1 texel per chain: (arm offset, arm count, 0, 0) - armsOf[chain]
//         in order, each as an index into ARM
//   AIX   1 texel per (chain, arm): (arm index, 0, 0, 0)
//   GRP   1 texel per group: (window offset, window count, corner offset,
//         corner count) - the corners index CRN, which holds them in group
//         order (K1040 S4b)
//   CRN   CRN_TEXELS per corner, in group order (K1040 S4b): (qx, qy, r,
//         rV), (tax, tay, tbx, tby), (Vx, Vy, omega, Rf) with Rf inFill's
//         reach rV + 2aa / max(0.1, sin(theta/2)), (arm a, arm b, chain a,
//         chain b), arm a's and arm b's windows over [0, max(dV, d) + 2h]
//         (label_b armWindowWalk: inFill's and F9's footArm), form B's
//         corner-grid cell box (x0, x1, y0, y1) - cornersNear's list, so F9
//         reads the corners form B reads - and the terms' world bbox (x0,
//         y0, x1, y1; empty when the corner has no term)
//   GW    2 texels per group window: (chain, k0, cnt, arm), (cx, cy, rad, 0)
//         - an arm's segments from its root to the burial's reach (the
//         farthest corner foot on the arm, + 2h, at most L) and a circle
//         holding them, so a pixel skips a far arm in one test
//   NB2   per segment (as PTS): the band's merge/fold scan (m-, m+), label_b
//         nbWindows at the candidate radius R = h + W + 2aa and 3 sigma (a
//         piece's fold partner lies within 2 sigma of the piece X merges
//         into, which lies within sigma of X)
// Instances: (chain, k, side) per strip, two per segment (side +1, -1).

import { FormB } from "./form_b";
import { TEX_W, armWindowWalk, nbWindows, type LabelBTables } from "./label_b";

export interface BandBTables {
  arm: Float32Array;
  armRows: number;
  carm: Float32Array;
  carmRows: number;
  aix: Float32Array;
  aixRows: number;
  grp: Float32Array;
  grpRows: number;
  gw: Float32Array;
  gwRows: number;
  nb2: Float32Array;
  nb2Rows: number;
  /** K1040 S4b: the corners (CRN), in group order; one corner quad each. */
  crn: Float32Array;
  crnRows: number;
  nCorners: number;
  /** form B's corner-grid cell (cornersNear). */
  cell: number;
  inst: Float32Array;
  nInst: number;
  nGroups: number;
  nWin: number;
  /** The widest group (windows) and the longest window (segments): the shader's loop bounds. */
  maxGroupWin: number;
  maxWinSegs: number;
  /** form B's constants the shader takes as uniforms. */
  h: number;
  W: number;
  aa: number;
  sigma: number;
  lambda: number;
  /** 1 / K of form B's cone key (0 for the max form). K1040 S4a2. */
  invK: number;
  delta: number;
  R: number;
}

function rows(n: number): number {
  return Math.max(1, Math.ceil(n / TEX_W));
}

/** K1040 S4b: texels per corner in CRN. */
export const CRN_TEXELS = 8;

/** How far along arm ai a burial can reach: its corners' feet (V's and the ball's), + 2h, at most L. */
export function armReach(fb: FormB, ai: number): number {
  const a = fb.arms[ai];
  let r = 0;
  for (const c of fb.corners) {
    if (c.a === ai) r = Math.max(r, c.dVa, c.dA);
    if (c.b === ai) r = Math.max(r, c.dVb, c.dB);
  }
  const d = r + 2 * fb.h;
  return Math.min(a.L, Number.isFinite(d) ? d : a.L);
}

export function buildBandB(fb: FormB, T: LabelBTables): BandBTables {
  const P = fb.polys;
  const nArms = fb.arms.length;
  const arm = new Float32Array(rows(2 * nArms) * TEX_W * 4);
  fb.arms.forEach((a, i) => {
    arm.set([a.g, a.sR, a.dir, a.L], 8 * i);
    arm.set([a.Lcut === Infinity ? 1e30 : a.Lcut, 0, 0, 0], 8 * i + 4);
  });
  const carm = new Float32Array(rows(P.length) * TEX_W * 4);
  let nAix = 0;
  for (let ci = 0; ci < P.length; ci++) nAix += fb.armsOf[ci].length;
  const aix = new Float32Array(rows(Math.max(1, nAix)) * TEX_W * 4);
  let o = 0;
  for (let ci = 0; ci < P.length; ci++) {
    const list = fb.armsOf[ci];
    carm.set([o, list.length, 0, 0], 4 * ci);
    for (const ai of list) aix[4 * o++] = ai;
  }
  // Group windows.
  const byGroup: number[][] = Array.from({ length: fb.nGroups }, () => []);
  fb.arms.forEach((a, i) => {
    if (a.g >= 0 && a.g < fb.nGroups) byGroup[a.g].push(i);
  });
  const wins: number[][] = [];
  const grp = new Float32Array(rows(Math.max(1, fb.nGroups)) * TEX_W * 4);
  let maxGroupWin = 0;
  let maxWinSegs = 0;
  for (let g = 0; g < fb.nGroups; g++) {
    const off = wins.length;
    for (const ai of byGroup[g]) {
      const a = fb.arms[ai];
      const p = P[a.pi];
      const [, sHi, k0, cnt] = armWindowWalk(fb, ai, armReach(fb, ai));
      if (!(cnt > 0) || !(sHi >= 0 || sHi < 0)) continue;
      // The circle: the window's points.
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (let q = 0; q <= cnt; q++) {
        let k = k0 + q;
        if (k >= p.n) k -= p.closed ? p.nseg : p.n;
        if (k < 0 || k >= p.n) continue;
        x0 = Math.min(x0, p.x[k]);
        y0 = Math.min(y0, p.y[k]);
        x1 = Math.max(x1, p.x[k]);
        y1 = Math.max(y1, p.y[k]);
      }
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      let rad = 0;
      for (let q = 0; q <= cnt; q++) {
        let k = k0 + q;
        if (k >= p.n) k -= p.closed ? p.nseg : p.n;
        if (k < 0 || k >= p.n) continue;
        rad = Math.max(rad, Math.hypot(p.x[k] - cx, p.y[k] - cy));
      }
      wins.push([a.pi, k0, cnt, ai, cx, cy, rad * (1 + 1e-6) + 1e-6, 0]);
      maxWinSegs = Math.max(maxWinSegs, cnt);
    }
    grp.set([off, wins.length - off, 0, 0], 4 * g);
    maxGroupWin = Math.max(maxGroupWin, wins.length - off);
  }
  const gw = new Float32Array(rows(Math.max(1, 2 * wins.length)) * TEX_W * 4);
  wins.forEach((w, i) => gw.set(w, 8 * i));
  // K1040 S4b: the corners, in group order (GRP's corner offset and count).
  const byGroupC: number[][] = Array.from({ length: fb.nGroups }, () => []);
  fb.corners.forEach((c, i) => {
    if (c.g >= 0 && c.g < fb.nGroups) byGroupC[c.g].push(i);
  });
  const order: number[] = [];
  for (let g = 0; g < fb.nGroups; g++) {
    grp[4 * g + 2] = order.length;
    grp[4 * g + 3] = byGroupC[g].length;
    for (const ci of byGroupC[g]) order.push(ci);
  }
  const crn = new Float32Array(rows(Math.max(1, CRN_TEXELS * order.length)) * TEX_W * 4);
  const fin = (v: number) => (Number.isFinite(v) ? v : 1e30);
  // form B's corner-grid cell (private there; read, not recomputed).
  const cs = (fb as unknown as { cell: number }).cell;
  const reachW = fb.W + fb.aa;
  order.forEach((ci, i) => {
    const c = fb.corners[ci];
    const o = CRN_TEXELS * 4 * i;
    const Rf = c.rV + (2 * fb.aa) / Math.max(0.1, Math.sin(c.theta / 2)) + 1e-12;
    crn.set([fin(c.qx), fin(c.qy), fin(c.r), fin(c.rV)], o);
    crn.set([fin(c.tax), fin(c.tay), fin(c.tbx), fin(c.tby)], o + 4);
    crn.set([fin(c.Vx), fin(c.Vy), c.omega, fin(Rf)], o + 8);
    crn.set([c.a, c.b, fb.arms[c.a].pi, fb.arms[c.b].pi], o + 12);
    crn.set(armWindowWalk(fb, c.a, Math.max(c.dVa, c.dA) + 2 * fb.h), o + 16);
    crn.set(armWindowWalk(fb, c.b, Math.max(c.dVb, c.dB) + 2 * fb.h), o + 20);
    // form B addCorner's cell box.
    const R = Math.max(c.rV, c.r + fb.W) + 2 * fb.W + 4 * fb.aa;
    crn.set([Math.floor((c.qx - R) / cs), Math.floor((c.qx + R) / cs), Math.floor((c.qy - R) / cs), Math.floor((c.qy + R) / cs)].map(fin), o + 24);
    // The terms' bbox: the discs (t_a, t_b when omega > 0; V when omega < 1)
    // and the arc's annulus.
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const box = (x: number, y: number, r: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r)) return;
      x0 = Math.min(x0, x - r);
      y0 = Math.min(y0, y - r);
      x1 = Math.max(x1, x + r);
      y1 = Math.max(y1, y + r);
    };
    if (c.omega > 0) {
      box(c.tax, c.tay, reachW);
      box(c.tbx, c.tby, reachW);
      if (c.r > 0) box(c.qx, c.qy, c.r + reachW);
    }
    if (c.omega < 1) box(c.Vx, c.Vy, reachW);
    if (x1 >= x0) crn.set([x0, y0, x1, y1], o + 28);
    else crn.set([1, 1, 0, 0], o + 28);
  });
  // NB2, indexed as PTS.
  const R = fb.h + fb.W + 2 * fb.aa;
  const nb2 = new Float32Array(T.ptsRows * TEX_W * 4);
  P.forEach((p, ci) => nbWindows(p, R, 3 * fb.sigma, nb2, T.ptOff[ci]));
  // Two strips per segment.
  const inst = new Float32Array(T.nInst * 2 * 3);
  let ii = 0;
  P.forEach((p, ci) => {
    for (let k = 0; k < p.nseg; k++)
      for (const side of [1, -1]) {
        inst[ii++] = ci;
        inst[ii++] = k;
        inst[ii++] = side;
      }
  });
  return {
    arm,
    armRows: rows(2 * nArms),
    carm,
    carmRows: rows(P.length),
    aix,
    aixRows: rows(Math.max(1, nAix)),
    grp,
    grpRows: rows(Math.max(1, fb.nGroups)),
    gw,
    gwRows: rows(Math.max(1, 2 * wins.length)),
    nb2,
    nb2Rows: T.ptsRows,
    crn,
    crnRows: rows(Math.max(1, CRN_TEXELS * order.length)),
    nCorners: order.length,
    cell: cs,
    inst,
    nInst: ii / 3,
    nGroups: fb.nGroups,
    nWin: wins.length,
    maxGroupWin,
    maxWinSegs,
    h: fb.h,
    W: fb.W,
    aa: fb.aa,
    sigma: fb.sigma,
    lambda: fb.lambda,
    invK: fb.K === Infinity ? 0 : 1 / fb.K,
    delta: fb.delta,
    R,
  };
}
