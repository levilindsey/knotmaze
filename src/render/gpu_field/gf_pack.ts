// K1362 s2: the tables (tables.ts) packed into one RGBA32F data texture for
// the GPU pass (gf_glsl.ts). Pure: no GL here, so Node tests pin the layout.
//
// Layout, in texels of a GF_TW-wide texture (index i at (i & (TW-1), i >> LOG)):
//   CH   3 per chain:  (cV0, cNV, cClosed, cLen) (cS0, cPin0, cPinN, cArm0) (cArmN, 0, 0, 0)
//   V    1 per vertex: (vx, vy, vs, 0)
//   PIN  1 per pin:    (pinS, pinZ, 0, 0)
//   ARM  2 per arm:    (aSR, aDir, aL, aLcut) (aG, 0, 0, 0)
//   K    6 per corner: (kCx, kCy, kR, kRmax) (kThru, kRV, kG, kJ) (kEax, kEay, kEbx, kEby)
//                      (kCa, kCb, kSa, kSb) (kZa, kZb, kTax, kTay) (kTbx, kTby, 0, 0)
//   CHK  2 per chunk:  (chV0, chN, chC, 0) (box x0, y0, x1, y1)
//   CELL 1 per cell:   (cellCh0, cellChN, cellK0, cellKN)
//   CHL  cellChList, 4 per texel;  KL  cellKList, 4 per texel
//   KC   1 per chain:  (first bin, bins, bin width, s origin)              (gf_keys.ts, K1362 s6)
//   KB   1 per bin:    (pin search lo, hi, first candidate, candidates)
//   KA   2 per candidate: the candidate arm's two ARM texels, copied
// Integers ride as floats (exact below 2^24). A non-finite value is stored
// as +-GF_BIG (the shader tests `>= GF_BIG_TEST`): Infinity is aLcut's "no cap".
import type { GfTables } from "./tables";
import { buildKeys, type GfKeys } from "./gf_keys";

export const GF_LOG = 11;
export const GF_TW = 1 << GF_LOG;
export const GF_BIG = 1e30;

export interface GfPacked {
  data: Float32Array;
  rows: number;
  /** Section bases, texels. */
  o: { ch: number; v: number; pin: number; arm: number; k: number; chk: number; cell: number; chl: number; kl: number; kc: number; kb: number; ka: number };
}

const fin = (v: number): number => (v === Infinity ? GF_BIG : v === -Infinity ? -GF_BIG : v);

export function packTables(T: GfTables, reuse?: GfPacked, keys: GfKeys = buildKeys(T)): GfPacked {
  const o = { ch: 0, v: 0, pin: 0, arm: 0, k: 0, chk: 0, cell: 0, chl: 0, kl: 0, kc: 0, kb: 0, ka: 0 };
  let n = 0;
  o.ch = n; n += 3 * T.nC;
  o.v = n; n += T.nV;
  o.pin = n; n += T.pinS.length;
  o.arm = n; n += 2 * T.nA;
  o.k = n; n += 6 * T.nK;
  o.chk = n; n += 2 * T.nCh;
  o.cell = n; n += T.gW * T.gH;
  o.chl = n; n += Math.ceil(T.cellChList.length / 4);
  o.kl = n; n += Math.ceil(T.cellKList.length / 4);
  o.kc = n; n += T.nC;
  o.kb = n; n += keys.nB;
  o.ka = n; n += 2 * keys.nKA;
  const rows = Math.max(1, Math.ceil(n / GF_TW));
  const need = rows * GF_TW * 4;
  const data = reuse && reuse.data.length >= need ? reuse.data : new Float32Array(need);
  const put = (t: number, a: number, b: number, c: number, d: number): void => {
    const i = 4 * t; data[i] = fin(a); data[i + 1] = fin(b); data[i + 2] = fin(c); data[i + 3] = fin(d);
  };
  for (let c = 0; c < T.nC; c++) {
    put(o.ch + 3 * c, T.cV0[c], T.cNV[c], T.cClosed[c], T.cLen[c]);
    put(o.ch + 3 * c + 1, T.cS0[c], T.cPin0[c], T.cPinN[c], T.cArm0[c]);
    put(o.ch + 3 * c + 2, T.cArmN[c], 0, 0, 0);
  }
  for (let v = 0; v < T.nV; v++) put(o.v + v, T.vx[v], T.vy[v], T.vs[v], 0);
  for (let i = 0; i < T.pinS.length; i++) put(o.pin + i, T.pinS[i], T.pinZ[i], 0, 0);
  for (let a = 0; a < T.nA; a++) {
    put(o.arm + 2 * a, T.aSR[a], T.aDir[a], T.aL[a], T.aLcut[a]);
    put(o.arm + 2 * a + 1, T.aG[a], 0, 0, 0);
  }
  for (let k = 0; k < T.nK; k++) {
    const b = o.k + 6 * k;
    put(b, T.kCx[k], T.kCy[k], T.kR[k], T.kRmax[k]);
    put(b + 1, T.kThru[k], T.kRV[k], T.kG[k], T.kJ[k]);
    put(b + 2, T.kEax[k], T.kEay[k], T.kEbx[k], T.kEby[k]);
    put(b + 3, T.kCa[k], T.kCb[k], T.kSa[k], T.kSb[k]);
    put(b + 4, T.kZa[k], T.kZb[k], T.kTax[k], T.kTay[k]);
    put(b + 5, T.kTbx[k], T.kTby[k], 0, 0);
  }
  for (let q = 0; q < T.nCh; q++) {
    put(o.chk + 2 * q, T.chV0[q], T.chN[q], T.chC[q], 0);
    put(o.chk + 2 * q + 1, T.chBox[4 * q], T.chBox[4 * q + 1], T.chBox[4 * q + 2], T.chBox[4 * q + 3]);
  }
  for (let i = 0; i < T.gW * T.gH; i++) put(o.cell + i, T.cellCh0[i], T.cellChN[i], T.cellK0[i], T.cellKN[i]);
  for (let i = 0; i < T.cellChList.length; i++) data[4 * o.chl + i] = T.cellChList[i];
  for (let i = 0; i < T.cellKList.length; i++) data[4 * o.kl + i] = T.cellKList[i];
  for (let c = 0; c < T.nC; c++) put(o.kc + c, keys.kc[4 * c], keys.kc[4 * c + 1], keys.kc[4 * c + 2], keys.kc[4 * c + 3]);
  for (let b = 0; b < keys.nB; b++) put(o.kb + b, keys.kb[4 * b], keys.kb[4 * b + 1], keys.kb[4 * b + 2], keys.kb[4 * b + 3]);
  for (let q = 0; q < keys.nKA; q++) {
    const a = keys.ka[q];
    put(o.ka + 2 * q, T.aSR[a], T.aDir[a], T.aL[a], T.aLcut[a]);
    put(o.ka + 2 * q + 1, T.aG[a], 0, 0, 0);
  }
  return { data, rows, o };
}
