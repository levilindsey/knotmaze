// K1362 s1: the per-pixel evaluation, the CPU mirror of gf_glsl.ts's
// fragment shader. Written loop for loop in the shader's style (fixed
// capacities, flat arrays, no allocation per pixel) so the two can be proved
// equal by reading the GPU's pixels back.
//
// Per pixel, from the tables (tables.ts) alone:
// 1. Pieces: every segment of the pixel's bin within rc folds by chain and
//    arc length (|ds| < sigma = pi h, the nearer kept) into at most MAXP
//    pieces, each with its foot, its s, and the segment range it spans.
// 2. Each piece's key z - d zt / h (z: the pins' hats, form B's diagram
//    depth) and its membership (the arm table: group and cap ramp).
// 3. The ramping pieces (0 < ramp < 1) mix whole composites, one per
//    configuration (form B's Q2), at most MAXR of them.
// 4. Surfaces (a group, or a piece of its own) in key order; per surface the
//    coverage and the ink, the max over its exposed-outline terms: each
//    member's side foot (buried by another member's tube or a fillet of the
//    group) and each fillet's arc. The term that wins is kept (`win*`):
//    which piece side or which fillet draws the pixel's outline.
// 5. The composite top-down (ink += T v, T *= 1 - a), with one adjacent
//    swap mixed where two surfaces' keys tie within zt (form B's tie).
// The label (chain, s) is the top covering surface's max-key covering member.

import { CH, MAXP, type GfTables } from "./tables";

export const MAXR = 2; // ramping pieces mixed per pixel
export const MAXK = 6; // corners per pixel
const TANGENT_TERMS = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GF_TANG !== "0";
const SELF_BURIAL =(globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GF_SELFBUR === "1";
const MAXS = MAXP + MAXK; // surfaces

export function ss(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export interface GfPixel {
  ink: number;
  /** Fill coverage (K1362 s2): the configurations' weighted 1 - T after the top-down composite. */
  cov: number;
  /** Label chain index (scene order), -1 for paper. */
  chain: number;
  s: number;
  /** Winning outline term: 0 none, 1 a side (winA = chain, winB = +-1 side), 2 a fillet arc (winA = corner), 3 a cap/end (side at an open end), 4 a fillet tangent point (winA = corner, winB = 0 A / 1 B), 5 a K1049 through-pass arc. */
  winKind: number; winA: number; winB: number;
  /** Candidates tested: segments and corners. */
  nSeg: number; nK: number;
}

/** Scratch for one pixel; reused. */
export class GfEval {
  readonly T: GfTables;
  // pieces
  private pc = new Int32Array(MAXP); private ps = new Float64Array(MAXP); private pd = new Float64Array(MAXP);
  private pfx = new Float64Array(MAXP); private pfy = new Float64Array(MAXP); private plo = new Int32Array(MAXP); private phi = new Int32Array(MAXP);
  private pz = new Float64Array(MAXP); private pkey = new Float64Array(MAXP); private pg = new Int32Array(MAXP); private pramp = new Float64Array(MAXP);
  private ptx = new Float64Array(MAXP); private pty = new Float64Array(MAXP); private pend = new Uint8Array(MAXP);
  private psurf = new Int32Array(MAXP);
  private np = 0;
  // corners near p
  private kk = new Int32Array(MAXK); private krho = new Float64Array(MAXK); private kIn = new Uint8Array(MAXK); private nk = 0; private tj = new Int32Array(8); private kSec = new Uint8Array(MAXK);
  // surfaces
  private sid = new Int32Array(MAXS); private skey = new Float64Array(MAXS); private sckey = new Float64Array(MAXS);
  private scch = new Int32Array(MAXS); private scs = new Float64Array(MAXS); private scov = new Uint8Array(MAXS);
  private sv = new Float64Array(MAXS); private sa = new Float64Array(MAXS); private swk = new Int32Array(MAXS); private swa = new Int32Array(MAXS); private swb = new Int32Array(MAXS);
  private sord = new Int32Array(MAXS); private ns = 0;
  readonly out: GfPixel = { ink: 0, cov: 0, chain: -1, s: 0, winKind: 0, winA: -1, winB: 0, nSeg: 0, nK: 0 };

  constructor(T: GfTables) { this.T = T; }

  /** Membership of (c, s): group (-1 none) and cap ramp (form B's member()). */
  private member(c: number, s: number): void {
    const T = this.T; const a0 = T.cArm0[c]; const an = T.cArmN[c]; const lam = T.h;
    const closed = T.cClosed[c] === 1; const len = T.cLen[c];
    let g = -1; let ramp = 0;
    for (let i = a0; i < a0 + an; i++) {
      let d = (s - T.aSR[i]) * T.aDir[i]; if (closed) d = ((d % len) + len) % len;
      if (d < -1e-12 || d > T.aL[i] + 1e-12) continue;
      const Lc = T.aLcut[i];
      const rp = Lc === Infinity ? 1 : ss(Lc, Lc - lam, d);
      if (g < 0 || rp > ramp) { g = T.aG[i]; ramp = rp; }
    }
    if (g >= 0 && ramp > 0) {
      for (let i = a0; i < a0 + an; i++) {
        const Lc = T.aLcut[i]; if (T.aG[i] !== g || Lc === Infinity) continue;
        let d = (s - T.aSR[i]) * T.aDir[i]; if (closed) { d = ((d % len) + len) % len; if (d > len / 2) d -= len; }
        if (!(d < 1e-12 && d > Lc - lam)) continue;
        ramp = Math.min(ramp, ss(Lc, Lc - lam, d));
      }
    }
    this.mg = g; this.mramp = g < 0 ? 1 : ramp;
  }
  private mg = -1; private mramp = 1;

  /** Diagram depth (tables.depthAt, inlined for the shader). */
  private depth(c: number, s: number): number {
    const T = this.T; const n = T.cPinN[c]; if (n === 0) return 0;
    const b = T.cPin0[c]; const win = T.win;
    let u = s; const len = T.cLen[c];
    if (T.cClosed[c]) { u = (s - T.cS0[c]) % len; if (u < 0) u += len; u += T.cS0[c]; }
    let lo = -1; let hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.pinS[b + m] <= u) lo = m; else hi = m; }
    let zL = 0; let dL = 0; let zR = 0; let dR = 0; let w = win;
    if (T.cClosed[c]) {
      const iL = lo < 0 ? n - 1 : lo; const sL = lo < 0 ? T.pinS[b + iL] - len : T.pinS[b + iL];
      const iR = lo + 1 >= n ? 0 : lo + 1; const sR = lo + 1 >= n ? T.pinS[b + iR] + len : T.pinS[b + iR];
      w = Math.min(win, sR - sL); zL = T.pinZ[b + iL]; dL = u - sL; zR = T.pinZ[b + iR]; dR = sR - u;
    } else if (lo < 0) { zR = T.pinZ[b]; dR = T.pinS[b] - u; dL = Infinity; }
    else if (lo + 1 >= n) { zL = T.pinZ[b + n - 1]; dL = u - T.pinS[b + n - 1]; dR = Infinity; }
    else { w = Math.min(win, T.pinS[b + lo + 1] - T.pinS[b + lo]); zL = T.pinZ[b + lo]; dL = u - T.pinS[b + lo]; zR = T.pinZ[b + lo + 1]; dR = T.pinS[b + lo + 1] - u; }
    const hat = (z: number, d: number): number => (w <= 1e-12 ? (d <= 0 ? z : 0) : d >= w ? 0 : z * (1 - d / w));
    return hat(zL, dL) + hat(zR, dR);
  }

  /** Squared distance from (x, y) to piece j's segments (its fold range). */
  /** form B's inFill arm test: (x, y) lies outside both arms' tubes (deeper than h - 2aa inside one is not
   * the fill), the arm on the foot's own chain skipped; the arms read through the gathered pieces. */
  private outsideArms(k: number, own: number, x: number, y: number): boolean {
    const T = this.T; const lim = T.h - 2 * T.aa; const lim2 = lim * lim;
    for (let side = 0; side < 2; side++) {
      const c = side === 0 ? T.kCa[k] : T.kCb[k]; if (c === own) continue;
      for (let m = 0; m < this.np; m++) if (this.pc[m] === c && this.pieceD(m, x, y) < lim2) return false;
    }
    return true;
  }

  private pieceD(j: number, x: number, y: number): number {
    const T = this.T; const c = this.pc[j]; const v0 = T.cV0[c]; const nseg = T.cNV[c] - 1; const closed = T.cClosed[c] === 1;
    let d2 = Infinity;
    for (let kk = this.plo[j]; kk <= this.phi[j]; kk++) {
      let k = kk; if (closed) k = ((k % nseg) + nseg) % nseg; else if (k < 0 || k >= nseg) continue;
      const v = v0 + k; const ax = T.vx[v]; const ay = T.vy[v]; const dx = T.vx[v + 1] - ax; const dy = T.vy[v + 1] - ay;
      const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
      const ex = x - ax - dx * u; const ey = y - ay - dy * u; const e2 = ex * ex + ey * ey;
      if (e2 < d2) d2 = e2;
    }
    return d2;
  }

  /** Is (x, y) inside corner k's sector (between its rays, the short way)? */
  private inSector(k: number, x: number, y: number): boolean {
    const T = this.T; const rx = x - T.kCx[k]; const ry = y - T.kCy[k];
    const ax = T.kEax[k]; const ay = T.kEay[k]; const bx = T.kEbx[k]; const by = T.kEby[k];
    const cab = ax * by - ay * bx; // orientation of a -> b
    const c1 = ax * ry - ay * rx; const c2 = rx * by - ry * bx;
    return cab >= 0 ? c1 >= 0 && c2 >= 0 : c1 <= 0 && c2 <= 0;
  }

  eval(x: number, y: number): GfPixel {
    const T = this.T; const h = T.h; const aa = T.aa; const W = T.W; const o = this.out;
    o.ink = 0; o.cov = 0; o.chain = -1; o.s = 0; o.winKind = 0; o.winA = -1; o.winB = 0; o.nSeg = 0; o.nK = 0;
    const gx = Math.floor((x - T.gx0) / T.G); const gy = Math.floor((y - T.gy0) / T.G);
    if (gx < 0 || gy < 0 || gx >= T.gW || gy >= T.gH) return o;
    const cell = gy * T.gW + gx; const rc = T.rc; const rc2 = rc * rc;
    // 1. pieces
    let np = 0;
    const c0 = T.cellCh0[cell]; const cn = T.cellChN[cell];
    for (let q = c0; q < c0 + cn; q++) {
      const ch = T.cellChList[q]; const b = 4 * ch;
      const bx = Math.max(T.chBox[b] - x, 0, x - T.chBox[b + 2]); const by = Math.max(T.chBox[b + 1] - y, 0, y - T.chBox[b + 3]);
      if (bx * bx + by * by >= rc2) continue;
      const c = T.chC[ch]; const v0 = T.chV0[ch]; const nseg = T.cNV[c] - 1; const closed = T.cClosed[c] === 1; const len = T.cLen[c];
      for (let i = 0; i < T.chN[ch]; i++) {
        const v = v0 + i; o.nSeg++;
        const ax = T.vx[v]; const ay = T.vy[v]; const dx = T.vx[v + 1] - ax; const dy = T.vy[v + 1] - ay;
        const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
        const fx = ax + dx * u; const fy = ay + dy * u; const ex = x - fx; const ey = y - fy; const d2 = ex * ex + ey * ey;
        if (d2 >= rc2) continue;
        const d = Math.sqrt(d2); const s = T.vs[v] + u * (T.vs[v + 1] - T.vs[v]); const k = v - T.cV0[c];
        // fold into a piece of chain c within sigma
        let j = -1;
        for (let m = 0; m < np; m++) {
          if (this.pc[m] !== c) continue;
          let ds = Math.abs(s - this.ps[m]); if (closed) ds = Math.min(ds, len - ds);
          if (ds < T.sigma) { j = m; break; }
        }
        if (j >= 0) {
          // unwrapped segment index nearest the piece's range
          let kk = k; if (closed) { const ref = this.plo[j]; while (kk - ref > nseg / 2) kk -= nseg; while (ref - kk > nseg / 2) kk += nseg; }
          if (kk < this.plo[j]) this.plo[j] = kk; if (kk > this.phi[j]) this.phi[j] = kk;
          if (d < this.pd[j]) { this.pd[j] = d; this.ps[j] = s; this.pfx[j] = fx; this.pfy[j] = fy; this.ptx[j] = dx; this.pty[j] = dy; this.pend[j] = (!closed && ((k === 0 && u <= 0) || (k === nseg - 1 && u >= 1))) ? 1 : 0; }
          continue;
        }
        if (np < MAXP) j = np++;
        else { let far = 0; for (let m = 1; m < MAXP; m++) if (this.pd[m] > this.pd[far]) far = m; if (this.pd[far] <= d) continue; j = far; }
        this.pc[j] = c; this.pd[j] = d; this.ps[j] = s; this.pfx[j] = fx; this.pfy[j] = fy; this.plo[j] = k; this.phi[j] = k; this.ptx[j] = dx; this.pty[j] = dy;
        this.pend[j] = (!closed && ((k === 0 && u <= 0) || (k === nseg - 1 && u >= 1))) ? 1 : 0;
      }
    }
    this.np = np;
    // 2. keys and membership
    const zK = T.zt / h;
    let nr = 0; const rIdx = [0, 0]; // the ramping pieces
    for (let j = 0; j < np; j++) {
      this.pz[j] = this.depth(this.pc[j], this.ps[j]); this.pkey[j] = this.pz[j] - this.pd[j] * zK;
      this.member(this.pc[j], this.ps[j]); this.pg[j] = this.mg; this.pramp[j] = this.mramp;
      if (this.mg >= 0 && this.mramp > 0 && this.mramp < 1) {
        if (nr < MAXR) rIdx[nr++] = j;
        else { /* past MAXR: rounds to the nearer configuration */ this.pramp[j] = this.mramp >= 0.5 ? 1 : 0; }
      }
    }
    // corners near p. kIn: 2 = p in the fill region (in sector, inside the far bound) past the ball's AA,
    // 1 = in the region inside it, 0 = only a burier (its fill may hold the foot of a side term, which lies
    // within W + aa of p).
    let nk = 0;
    const k0 = T.cellK0[cell]; const kn = T.cellKN[cell];
    // K1049: a through pass's bend corner counts only inside its cone (in its sector, within rV + W + 4aa),
    // where the open eye is the arc's band; a non-through corner of another junction whose sector holds p
    // yields it (the census reference's filletPick, arcInk and yieldInk, less yieldInk's inner ramp).
    let thruK = -1; let thruQ = 0; let yielded = false; let nTj = 0;
    for (let q = k0; q < k0 + kn; q++) {
      const k = T.cellKList[q]; if (!T.kThru[k]) continue;
      const rx = x - T.kCx[k]; const ry = y - T.kCy[k]; const d2 = rx * rx + ry * ry; const lim = T.kRV[k] + W + 4 * aa;
      if (d2 <= lim * lim && this.inSector(k, x, y)) { if (thruK < 0) { thruK = k; thruQ = Math.sqrt(d2); } if (nTj < 8) this.tj[nTj++] = T.kJ[k]; }
    }
    if (thruK >= 0) {
      for (let q = k0; q < k0 + kn && !yielded; q++) {
        const k = T.cellKList[q]; if (T.kThru[k]) continue;
        let same = false; for (let i = 0; i < nTj; i++) if (this.tj[i] === T.kJ[k]) same = true;
        if (!same && this.inSector(k, x, y)) yielded = true;
      }
    }
    for (let q = k0; q < k0 + kn && nk < MAXK; q++) {
      const k = T.cellKList[q]; o.nK++;
      if (T.kThru[k]) {
        if (yielded) continue;
        const tx = x - T.kCx[k]; const ty = y - T.kCy[k]; const lim = T.kRV[k] + W + 4 * aa;
        if (!(tx * tx + ty * ty <= lim * lim) || !this.inSector(k, x, y)) continue;
      }
      const rx = x - T.kCx[k]; const ry = y - T.kCy[k]; const rho = Math.sqrt(rx * rx + ry * ry);
      if (!(rho > T.kR[k] - aa - W) || rho > T.kRmax[k] + W + 2 * aa) continue;
      const sec = this.inSector(k, x, y); const inR = rho <= T.kRmax[k] && sec;
      this.kSec[nk] = sec ? 1 : 0; // form B's arc term reads the wedge alone, not the fill's far bound rV
      this.kk[nk] = k; this.krho[nk] = rho; this.kIn[nk] = !inR ? 0 : rho > T.kR[k] - aa ? 2 : 1; nk++;
    }
    this.nk = nk;
    // 3. configurations over the ramping pieces
    if (nr === 2 && this.pramp[rIdx[0]] < this.pramp[rIdx[1]]) { const t = rIdx[0]; rIdx[0] = rIdx[1]; rIdx[1] = t; }
    let ink = 0; let cov = 0; let lab = -1; let labS = 0; let wk = 0; let wa = -1; let wb = 0; let bestW = -1;
    for (let cfg = 0; cfg <= nr; cfg++) {
      // cfg: the first cfg ramping pieces (by ramp, descending) are members
      const hiR = cfg === 0 ? 1 : this.pramp[rIdx[cfg - 1]];
      const loR = cfg === nr ? 0 : this.pramp[rIdx[cfg]];
      const wgt = hiR - loR; if (!(wgt > 0) && nr > 0) continue;
      for (let j = 0; j < np; j++) {
        let mem = this.pg[j] >= 0 && this.pramp[j] >= 1;
        if (this.pg[j] >= 0 && this.pramp[j] > 0 && this.pramp[j] < 1) { mem = false; for (let r = 0; r < cfg; r++) if (rIdx[r] === j) mem = true; }
        this.psurf[j] = mem ? this.pg[j] : -1 - j; // a piece of its own: -1 - j
      }
      this.layers(x, y);
      const r = this.composite();
      const w = nr === 0 ? 1 : wgt;
      ink += w * r; cov += w * this.cCov;
      if (w > bestW) { bestW = w; lab = this.labC; labS = this.labS; wk = this.cWk; wa = this.cWa; wb = this.cWb; }
    }
    if (thruK >= 0) {
      const own = T.kCa[thruK]; const r = T.kR[thruK]; const out = 1 - ss(r + W - aa, r + W + aa, thruQ);
      if (!yielded) { if (lab < 0 || lab === own) { ink = ss(r - aa, r + aa, thruQ) * out; if (lab < 0 && ink > 0) { lab = own; labS = T.kSa[thruK]; } wk = 5; wa = thruK; } }
      else if (lab === own) ink = Math.min(ink, out);
    }
    o.ink = Math.min(1, ink); o.cov = Math.min(1, cov); o.chain = lab; o.s = labS; o.winKind = wk; o.winA = wa; o.winB = wb;
    return o;
  }

  private labC = -1; private labS = 0; private cCov = 0; private cWk = 0; private cWa = -1; private cWb = 0;

  /** Surfaces of the current configuration, their keys, cover, labels, coverage and ink. */
  private layers(x: number, y: number): void {
    const T = this.T; const h = T.h; const aa = T.aa; const W = T.W;
    let ns = 0;
    const entry = (id: number): number => {
      for (let i = 0; i < ns; i++) if (this.sid[i] === id) return i;
      const i = ns++; this.sid[i] = id; this.skey[i] = -Infinity; this.sckey[i] = -Infinity; this.scch[i] = -1; this.scs[i] = 0; this.scov[i] = 0; return i;
    };
    for (let j = 0; j < this.np; j++) {
      if (!(this.pd[j] < h + aa)) continue;
      const e = entry(this.psurf[j]);
      if (this.pkey[j] > this.skey[e]) this.skey[e] = this.pkey[j];
      if (this.pd[j] < h) { this.scov[e] = 1; if (this.pkey[j] > this.sckey[e]) { this.sckey[e] = this.pkey[j]; this.scch[e] = this.pc[j]; this.scs[e] = this.ps[j]; } }
    }
    const zt = T.zt;
    for (let i = 0; i < this.nk; i++) {
      const k = this.kk[i]; if (this.kIn[i] !== 2) continue;
      const nearerA = (x - T.kTax[k]) ** 2 + (y - T.kTay[k]) ** 2 <= (x - T.kTbx[k]) ** 2 + (y - T.kTby[k]) ** 2;
      const z = nearerA ? T.kZa[k] : T.kZb[k]; const key = z - zt;
      const e = entry(T.kG[k]);
      if (key > this.skey[e]) this.skey[e] = key;
      if (this.krho[i] > T.kR[k]) { this.scov[e] = 1; if (key > this.sckey[e]) { this.sckey[e] = key; this.scch[e] = nearerA ? T.kCa[k] : T.kCb[k]; this.scs[e] = nearerA ? T.kSa[k] : T.kSb[k]; } }
    }
    this.ns = ns;
    // order by key, descending (insertion sort; ns is small)
    for (let i = 0; i < ns; i++) this.sord[i] = i;
    for (let i = 1; i < ns; i++) { const v = this.sord[i]; let m = i - 1; while (m >= 0 && this.skey[this.sord[m]] < this.skey[v]) { this.sord[m + 1] = this.sord[m]; m--; } this.sord[m + 1] = v; }
    // per surface: coverage a and ink v (max over exposed terms, the winner kept)
    const band2 = (D: number): number => (1 - ss(W - aa, W + aa, D)) * ss(-aa, aa, D);
    for (let e = 0; e < ns; e++) {
      const S = this.sid[e]; let D = -Infinity; let v = 0; let wk = 0; let wa = -1; let wb = 0;
      for (let j = 0; j < this.np; j++) {
        if (this.psurf[j] !== S || !(this.pd[j] < h + aa)) continue;
        const X = this.pd[j]; if (h - X > D) D = h - X;
        if (!(X > h - W - aa && X > 1e-12)) continue;
        const qx = this.pfx[j] + (h * (x - this.pfx[j])) / X; const qy = this.pfy[j] + (h * (y - this.pfy[j])) / X;
        let bur = 0;
        for (let m = 0; m < this.np && bur < 1; m++) {
          if (m === j || this.psurf[m] !== S) continue;
          const wb2 = 1 - ss(h - 2 * aa, h, Math.sqrt(this.pieceD(m, qx, qy)));
          if (wb2 > bur) bur = wb2;
        }
        // the piece's own tube elsewhere along its fold (a tight bend folded into one piece): OFF, form B never
        // buries a piece by its own fold (K1362 s1: 132 census finds were this self-burial)
        if (SELF_BURIAL && bur < 1 && this.phi[j] - this.plo[j] > 1) {
          const wb2 = 1 - ss(h - 2 * aa, h, Math.sqrt(this.pieceD(j, qx, qy)));
          if (wb2 > bur) bur = wb2;
        }
        for (let i = 0; i < this.nk && bur < 1; i++) {
          const k = this.kk[i]; if (T.kG[k] !== S) continue;
          const rq = Math.hypot(qx - T.kCx[k], qy - T.kCy[k]);
          if (rq > T.kR[k] && rq < T.kRmax[k] && this.inSector(k, qx, qy) && this.outsideArms(k, this.pc[j], qx, qy)) bur = 1;
        }
        const val = (1 - bur) * band2(h - X);
        if (val > v) { v = val; wk = this.pend[j] ? 3 : 1; wa = this.pc[j]; wb = this.ptx[j] * (y - this.pfy[j]) - this.pty[j] * (x - this.pfx[j]) >= 0 ? 1 : -1; }
      }
      for (let i = 0; i < this.nk; i++) {
        const k = this.kk[i]; if (T.kG[k] !== S || !this.kSec[i]) continue;
        const rho = this.krho[i]; const Dk = rho - T.kR[k];
        if (this.kIn[i] === 2 && Dk > D) D = Dk;
        if (!(rho > 1e-12)) continue;
        const qx = T.kCx[k] + (T.kR[k] * (x - T.kCx[k])) / rho; const qy = T.kCy[k] + (T.kR[k] * (y - T.kCy[k])) / rho;
        let bur = 0;
        for (let m = 0; m < this.np && bur < 1; m++) {
          if (this.psurf[m] !== S) continue;
          const wb2 = 1 - ss(h - 2 * aa, h, Math.sqrt(this.pieceD(m, qx, qy)));
          if (wb2 > bur) bur = wb2;
        }
        const val = (1 - bur) * band2(Dk);
        if (val > v) { v = val; wk = 2; wa = k; wb = 0; }
      }
      // form B's T_TA / T_TB: a fillet's tangent points are points of the trimmed outline, so their distance
      // bounds the true one from above (never ink outside the true band); they close the wedge between a side
      // cut at the fillet and the arc's sector, which neither covers (the hairline seams of K1362 s1's census)
      if (TANGENT_TERMS) for (let i = 0; i < this.nk; i++) {
        const k = this.kk[i]; if (T.kG[k] !== S || T.kThru[k]) continue;
        for (let t = 0; t < 2; t++) {
          const tx = t ? T.kTbx[k] : T.kTax[k]; const ty = t ? T.kTby[k] : T.kTay[k];
          const dT = Math.sqrt((x - tx) * (x - tx) + (y - ty) * (y - ty)); if (!(dT < W + aa)) continue;
          let bur = 0;
          for (let m = 0; m < this.np && bur < 1; m++) {
            if (this.psurf[m] !== S) continue;
            const wb2 = 1 - ss(h - 2 * aa, h, Math.sqrt(this.pieceD(m, tx, ty)));
            if (wb2 > bur) bur = wb2;
          }
          const val = (1 - bur) * band2(dT) * ss(-aa, aa, D);
          if (val > v) { v = val; wk = 4; wa = k; wb = t; }
        }
      }
      this.sv[e] = v; this.sa[e] = ss(-aa, aa, D); this.swk[e] = wk; this.swa[e] = wa; this.swb[e] = wb;
    }
    // the label: the top covering surface's max-key covering member
    let top = -1;
    for (let i = 0; i < ns; i++) if (this.scov[i] && (top < 0 || this.sckey[i] > this.sckey[top])) top = i;
    this.labC = top >= 0 ? this.scch[top] : -1; this.labS = top >= 0 ? this.scs[top] : 0;
  }

  /** Top-down composite; one adjacent swap mixed where keys tie within zt. */
  private composite(): number {
    const ns = this.ns; const zt = this.T.zt;
    const comp = (sw: number): number => {
      let Tt = 1; let ink = 0; let best = 0;
      for (let i = 0; i < ns; i++) {
        let e = this.sord[i]; if (sw >= 0 && i === sw) e = this.sord[i + 1]; else if (sw >= 0 && i === sw + 1) e = this.sord[i - 1];
        const c = Tt * this.sv[e];
        if (c > 0) { ink += c; if (c > best && sw < 0) { best = c; this.cWk = this.swk[e]; this.cWa = this.swa[e]; this.cWb = this.swb[e]; } }
        Tt *= 1 - this.sa[e];
        if (!(Tt > 0)) break;
      }
      if (sw < 0) this.cCov = 1 - Math.max(Tt, 0);
      return Math.min(1, ink);
    };
    this.cWk = 0; this.cWa = -1; this.cWb = 0;
    let r = comp(-1);
    for (let i = 0; i + 1 < ns; i++) {
      const gap = this.skey[this.sord[i]] - this.skey[this.sord[i + 1]];
      if (!(gap < zt)) continue;
      const r2 = comp(i);
      if (r2 === r) continue;
      const t = ss(-zt, zt, gap);
      r = t * r + (1 - t) * r2;
      break;
    }
    return r;
  }
}

export { CH };
