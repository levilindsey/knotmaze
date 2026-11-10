// K1247 WASM, the SIMD variant: kernels.ts with fwScan's per-segment box
// reject done two segments at a time (f64x2). A pair is skipped only when
// both lanes reject; a lane's reject implies the scalar test's (same
// selected difference when bx0 <= bx1; a NaN lane never rejects), and lim2
// only falls, so every answer stays bit-exact. Build:
//   build.ps1 -Source kernels_simd.ts -Out kernels_simd.wasm -Simd
//
// K1247 WASM: footNearM, footWinFast (+ fwScan) and marginOfC from
// ../../proto/outline.ts, ported line for line to AssemblyScript over raw
// linear memory (no managed arrays). Build: build.ps1 (-O3, --runtime stub).
//
// Poly table: HDR + pi * 128 bytes, laid out by the JS host (wasm_host.ts):
//   i32 n @0, nseg @4, closed @8, nblk @12; f64 len @16, s0 @24;
//   i32 byte offsets of the f64 arrays: x @32, y @36, s @40, segLen @44,
//   dx @48, dy @52, bx0 @56, by0 @60, bx1 @64, by1 @68, bk @72,
//   tanTx @76, tanTy @80, tanGF @84, tanGB @88.
// A foot answer is 6 f64 at OUT: d x y s k u (FFoot's order).
// A WalkCache is 15 f64: valid qx qy footStartS footEndS hiS kHi bkHi minF
// loS kLo bkLo maxB oLo oHi.

let HDR: usize = 0;
let OUT: usize = 0;
let MFOOT: usize = 0;
let CACHE: usize = 0;
let H: f64 = 0;

export function heapBase(): usize { return __heap_base; }
export function setup(hdr: usize, out: usize, mfoot: usize, cache: usize, h: f64): void { HDR = hdr; OUT = out; MFOOT = mfoot; CACHE = cache; H = h; }

@inline function ph(pi: i32): usize { return HDR + (<usize>pi << 7); }
@inline function arr(p: usize, f: usize): usize { return <usize>load<i32>(p + f); }
@inline function at(a: usize, k: i32): f64 { return load<f64>(a + (<usize>k << 3)); }
// JS `v || 1` for a double.
@inline function or1(v: f64): f64 { return v == 0 || v != v ? 1.0 : v; }
// JS Math.round: nearest integer, ties toward +Infinity, -0 kept.
@inline function jsRound(x: f64): f64 { const c = Math.ceil(x); return c - 0.5 > x ? c - 1.0 : c; }

function normS(p: usize, s: f64): f64 {
  const len = load<f64>(p + 16); const s0 = load<f64>(p + 24);
  if (load<i32>(p + 8) != 0 && len > 0) { let u = (s - s0) % len; if (u < 0) u += len; return s0 + u; }
  return min<f64>(max<f64>(s, s0), s0 + len);
}
// segOfS(p, s).k
function segOfSk(p: usize, s: f64): i32 {
  const u = normS(p, s);
  const n = load<i32>(p);
  if (n == 0) return 0;
  const PS = arr(p, 40);
  if (u >= at(PS, n - 1)) {
    if (load<i32>(p + 8) != 0) return n - 1;
    return max<i32>(0, load<i32>(p + 4) - 1);
  }
  let lo = 0; let hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (at(PS, mid) <= u) lo = mid; else hi = mid; }
  return lo;
}

// ---- footWinFast + fwScan -------------------------------------------------
// fwS as locals of fwScan, carried in globals between scans (wasm globals
// are unboxed).
let sBd2: f64 = 0; let sBx: f64 = 0; let sBy: f64 = 0; let sBs: f64 = 0; let sBk: f64 = 0;

function fwScan(p: usize, px: f64, py: f64, pr2: f64, stop2: f64, rlo: f64, rhi: f64, stopOn: bool): void {
  let bd2 = sBd2; let bx = sBx; let by = sBy; let bs = sBs; let bk = sBk;
  let lim2 = bd2 < pr2 ? bd2 : pr2;
  const closed = load<i32>(p + 8) != 0; const len = load<f64>(p + 16); const nseg = load<i32>(p + 4);
  const ps = arr(p, 40); const pl = arr(p, 44);
  const nblk = load<i32>(p + 12); const pbk = arr(p, 72);
  const bx0 = arr(p, 56); const bx1 = arr(p, 64); const by0 = arr(p, 60); const by1 = arr(p, 68);
  const PX = arr(p, 32); const PY = arr(p, 36); const PDX = arr(p, 48); const PDY = arr(p, 52);
  const VPX = f64x2.splat(px); const VPY = f64x2.splat(py); const VZ = f64x2.splat(0);
  let si0: f64 = 0; let si1: f64 = 0;
  if (closed && len > 0) { si0 = max<f64>(-1, Math.floor((rlo - at(ps, 0)) / len) - 1); si1 = min<f64>(1, Math.floor((rhi - at(ps, 0)) / len)); }
  let stopAll = false;
  for (let si = si0; si <= si1; si++) {
    const sh = closed ? si * len : 0.0;
    let a = 0; let b = nseg;
    while (a < b) { const m = (a + b) >> 1; if (at(ps, m) + at(pl, m) + sh >= rlo) b = m; else a = m + 1; }
    const k0 = a;
    b = nseg;
    while (a < b) { const m = (a + b) >> 1; if (at(ps, m) + sh > rhi) b = m; else a = m + 1; }
    for (let k = k0; k < a; k++) {
      if (((k & 31) == 0 || k == k0) && lim2 < Infinity && nblk > 0) {
        const bi = k >> 5;
        if (bi < nblk) {
          const q = 4 * bi;
          const b0 = at(pbk, q); const b1 = at(pbk, q + 1); const b2 = at(pbk, q + 2); const b3 = at(pbk, q + 3);
          const dxb = px < b0 ? b0 - px : px > b2 ? px - b2 : 0.0;
          const dyb = py < b1 ? b1 - py : py > b3 ? py - b3 : 0.0;
          if (dxb * dxb + dyb * dyb >= lim2) { k = min<i32>(a, (bi + 1) * 32) - 1; continue; }
        }
      }
      if (lim2 < Infinity && k + 1 < a && ((k + 1) & 31) != 0) {
        const o = <usize>k << 3;
        const vx0 = v128.load(bx0 + o); const vx1 = v128.load(bx1 + o); const vy0 = v128.load(by0 + o); const vy1 = v128.load(by1 + o);
        const vdx = f64x2.max(f64x2.max(f64x2.sub(vx0, VPX), f64x2.sub(VPX, vx1)), VZ);
        const vdy = f64x2.max(f64x2.max(f64x2.sub(vy0, VPY), f64x2.sub(VPY, vy1)), VZ);
        const vd2 = f64x2.add(f64x2.mul(vdx, vdx), f64x2.mul(vdy, vdy));
        if (i64x2.all_true(f64x2.ge(vd2, f64x2.splat(lim2)))) { k++; continue; }
      }
      if (lim2 < Infinity) {
        const x0 = at(bx0, k); const x1 = at(bx1, k); const y0 = at(by0, k); const y1 = at(by1, k);
        const dxb = px < x0 ? x0 - px : px > x1 ? px - x1 : 0.0;
        const dyb = py < y0 ? y0 - py : py > y1 ? py - y1 : 0.0;
        if (dxb * dxb + dyb * dyb >= lim2) continue;
      }
      const sa = at(ps, k); const plk = at(pl, k); const sb = sa + plk;
      const aa = max<f64>(rlo, sa + sh); const bb = min<f64>(rhi, sb + sh);
      if (bb < aa) continue;
      const l = or1(plk);
      const ta = min<f64>(1, max<f64>(0, (aa - sh - sa) / l));
      const tb = min<f64>(1, max<f64>(0, (bb - sh - sa) / l));
      const dxk = at(PDX, k); const dyk = at(PDY, k);
      const ax = at(PX, k) + dxk * ta; const ay = at(PY, k) + dyk * ta;
      const ex2 = dxk * (tb - ta); const ey2 = dyk * (tb - ta);
      const l2 = ex2 * ex2 + ey2 * ey2;
      let tt = l2 > 0 ? ((px - ax) * ex2 + (py - ay) * ey2) / l2 : 0.0;
      tt = min<f64>(1, max<f64>(0, tt));
      const qx = ax + ex2 * tt; const qy = ay + ey2 * tt;
      const ddx = px - qx; const ddy = py - qy;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 < bd2) {
        const t2 = ta + (tb - ta) * tt; bd2 = d2; bx = qx; by = qy; bs = sa + t2 * plk; bk = <f64>k;
        if (bd2 < lim2) lim2 = bd2;
        if (stopOn && bd2 <= stop2) { stopAll = true; break; }
      }
    }
    if (stopAll) break;
  }
  sBd2 = bd2; sBx = bx; sBy = by; sBs = bs; sBk = bk;
}

function footWinFastP(p: usize, out: usize, px: f64, py: f64, lo: f64, hi: f64, stopAt: f64, initBd: f64, hintLo: f64, hintHi: f64, prune: f64): void {
  sBd2 = initBd * initBd; sBx = px; sBy = py; sBs = lo; sBk = 0;
  if (load<i32>(p + 4) == 0 || hi < lo) {
    store<f64>(out, initBd); store<f64>(out, px, 8); store<f64>(out, py, 16); store<f64>(out, lo, 24); store<f64>(out, 0, 32); store<f64>(out, lo, 40); return;
  }
  const pr2 = prune < Infinity ? prune * prune * (1 + 1e-9) + 1e-300 : Infinity;
  const stopOn = stopAt >= 0; const stop2 = stopAt * stopAt;
  if (isFinite(hintLo) && hintHi > hintLo && hintHi > lo && hintLo < hi) {
    fwScan(p, px, py, pr2, stop2, max<f64>(lo, hintLo), min<f64>(hi, hintHi), stopOn);
    if (!(stopOn && sBd2 <= stop2)) {
      if (hintLo > lo) fwScan(p, px, py, pr2, stop2, lo, min<f64>(hi, hintLo), stopOn);
      if (hintHi < hi && !(stopOn && sBd2 <= stop2)) fwScan(p, px, py, pr2, stop2, max<f64>(lo, hintHi), hi, stopOn);
    }
  } else fwScan(p, px, py, pr2, stop2, lo, hi, stopOn);
  store<f64>(out, Math.sqrt(sBd2)); store<f64>(out, sBx, 8); store<f64>(out, sBy, 16); store<f64>(out, sBs, 24); store<f64>(out, sBk, 32); store<f64>(out, sBs, 40);
}

export function fwf(pi: i32, px: f64, py: f64, lo: f64, hi: f64, stopAt: f64, initBd: f64, hintLo: f64, hintHi: f64, prune: f64): void {
  footWinFastP(ph(pi), OUT, px, py, lo, hi, stopAt, initBd, hintLo, hintHi, prune);
}
// Batched: records of 10 f64 (pi, fwA[0..8]) -> 6 f64 each.
export function fwfBatch(inp: usize, outp: usize, count: i32): void {
  for (let i = 0; i < count; i++) {
    const r = inp + <usize>i * 80;
    footWinFastP(ph(<i32>load<f64>(r)), outp + <usize>i * 48, load<f64>(r, 8), load<f64>(r, 16), load<f64>(r, 24), load<f64>(r, 32), load<f64>(r, 40), load<f64>(r, 48), load<f64>(r, 56), load<f64>(r, 64), load<f64>(r, 72));
  }
}

// ---- footNearM -------------------------------------------------------------
function footNearMP(pi: i32, dir: f64, sR: f64, L: f64, x: f64, y: f64, hintS: f64, hintK: f64, out: usize): void {
  const p = ph(pi); const h = H;
  const closed = load<i32>(p + 8) != 0; const plen = load<f64>(p + 16); const nseg = load<i32>(p + 4);
  const winLoR = dir > 0 ? sR : sR - L;
  const winHiR = dir > 0 ? sR + L : sR;
  const w = h / 32;
  let sv = hintS;
  let k0: i32;
  if (hintK < 0 || hintK >= <f64>nseg) k0 = segOfSk(p, normS(p, sv)); else k0 = <i32>hintK;
  let shiftW: f64 = 0;
  if (closed && plen > 0) shiftW = jsRound((sv - (winLoR + winHiR) / 2) / plen) * plen;
  const winLo = winLoR + shiftW; const winHi = winHiR + shiftW;
  const PX = arr(p, 32); const PY = arr(p, 36); const PS = arr(p, 40); const PSL = arr(p, 44); const PDX = arr(p, 48); const PDY = arr(p, 52);
  const segShift = closed && plen > 0 ? jsRound((sv - at(PS, k0)) / plen) * plen : 0.0;
  for (let it = 0; it < 128; it++) {
    const lo = max<f64>(winLo, sv - w);
    const hi = min<f64>(winHi, sv + w);
    let bd2: f64 = Infinity; let bx = x; let by = y; let bs = sv; let bk = k0; let bu = sv;
    let covered = false;
    {
      let segS = at(PS, k0) + segShift;
      if (closed && plen > 0) { if (segS < sv - plen / 2) segS += plen; else if (segS > sv + plen / 2) segS -= plen; }
      const sl = at(PSL, k0);
      const segE = segS + sl;
      if (segS <= lo && segE >= hi) {
        covered = true;
        const ex = at(PDX, k0); const ey = at(PDY, k0);
        const l = or1(sl);
        const ta = min<f64>(1, max<f64>(0, (lo - segS) / l));
        const tb = min<f64>(1, max<f64>(0, (hi - segS) / l));
        const l2 = ex * ex + ey * ey;
        const pxk = at(PX, k0); const pyk = at(PY, k0);
        let t = l2 > 0 ? ((x - pxk) * ex + (y - pyk) * ey) / l2 : 0.0;
        t = min<f64>(tb, max<f64>(ta, t));
        const qx = pxk + ex * t; const qy = pyk + ey * t;
        bd2 = (x - qx) * (x - qx) + (y - qy) * (y - qy); bx = qx; by = qy; bs = at(PS, k0) + t * sl; bk = k0; bu = segS + t * sl;
      }
    }
    for (let dk = covered ? 3 : -2; dk <= 2; dk++) {
      let kk = k0 + dk;
      if (closed) kk = ((kk % nseg) + nseg) % nseg; else if (kk < 0 || kk >= nseg) continue;
      let segS = at(PS, kk) + segShift;
      if (closed && plen > 0) { if (segS < sv - plen / 2) segS += plen; else if (segS > sv + plen / 2) segS -= plen; }
      const sl = at(PSL, kk);
      const segE = segS + sl;
      if (segE < lo || segS > hi) continue;
      const ex = at(PDX, kk); const ey = at(PDY, kk);
      const l = or1(sl);
      const ta = min<f64>(1, max<f64>(0, (max<f64>(lo, segS) - segS) / l));
      const tb = min<f64>(1, max<f64>(0, (min<f64>(hi, segE) - segS) / l));
      if (tb < ta) continue;
      const l2 = ex * ex + ey * ey;
      const pxk = at(PX, kk); const pyk = at(PY, kk);
      let t = l2 > 0 ? ((x - pxk) * ex + (y - pyk) * ey) / l2 : 0.0;
      t = min<f64>(tb, max<f64>(ta, t));
      const qx = pxk + ex * t; const qy = pyk + ey * t;
      const d2 = (x - qx) * (x - qx) + (y - qy) * (y - qy);
      if (d2 < bd2) { bd2 = d2; bx = qx; by = qy; bs = at(PS, kk) + t * sl; bk = kk; bu = segS + t * sl; }
    }
    if (!isFinite(bd2)) {
      footWinFastP(p, out, x, y, winLoR, winHiR, -1, Infinity, NaN, NaN, Infinity);
      store<f64>(out, load<f64>(out, 24), 40); return;
    }
    store<f64>(out, Math.sqrt(bd2)); store<f64>(out, bx, 8); store<f64>(out, by, 16); store<f64>(out, bs, 24); store<f64>(out, <f64>bk, 32); store<f64>(out, bu, 40);
    const edge = (bu <= lo + 1e-9 * h && lo > winLo) || (bu >= hi - 1e-9 * h && hi < winHi);
    if (!edge || Math.abs(bu - sv) <= 1e-12 * h) return;
    sv = bu; k0 = bk;
  }
}
export function fnm(pi: i32, dir: f64, sR: f64, L: f64, x: f64, y: f64, hintS: f64, hintK: f64): void {
  footNearMP(pi, dir, sR, L, x, y, hintS, hintK, OUT);
}
// Batched: records of 8 f64 (pi dir sR L x y hintS hintK) -> 6 f64 each.
export function fnmBatch(inp: usize, outp: usize, count: i32): void {
  for (let i = 0; i < count; i++) {
    const r = inp + <usize>i * 64;
    footNearMP(<i32>load<f64>(r), load<f64>(r, 8), load<f64>(r, 16), load<f64>(r, 24), load<f64>(r, 32), load<f64>(r, 40), load<f64>(r, 48), load<f64>(r, 56), outp + <usize>i * 48);
  }
}

// ---- marginOfC -------------------------------------------------------------
function marginOfCP(pi: i32, dir: f64, sR: f64, L: f64, x: f64, y: f64, sf: f64, dc: f64, kFootF: f64, cache: usize): f64 {
  const pl = ph(pi);
  const h = H;
  const kFoot = <i32>kFootF;
  const closed = load<i32>(pl + 8) != 0; const plen = load<f64>(pl + 16); const nseg = load<i32>(pl + 4);
  const PS = arr(pl, 40); const PSL = arr(pl, 44);
  const winLo = dir > 0 ? sR : sR - L;
  const winHi = dir > 0 ? sR + L : sR;
  const base = sf - normS(pl, sf);
  const TXm = arr(pl, 76); const TYm = arr(pl, 80); const GFm = arr(pl, 84); const GBm = arr(pl, 88);
  const footStartS = base + at(PS, kFoot);
  const footEndS = footStartS + at(PSL, kFoot);
  const cValid = load<f64>(cache) != 0;
  const cqx = load<f64>(cache, 8); const cqy = load<f64>(cache, 16);
  const cFootStartS = load<f64>(cache, 24); const cHiS = load<f64>(cache, 40);
  const cKHi = load<f64>(cache, 48); const cBkHi = load<f64>(cache, 56); const cMinF = load<f64>(cache, 64);
  const cLoS = load<f64>(cache, 72); const cKLo = load<f64>(cache, 80); const cBkLo = load<f64>(cache, 88); const cMaxB = load<f64>(cache, 96);
  const delta = cValid ? Math.sqrt((x - cqx) * (x - cqx) + (y - cqy) * (y - cqy)) : Infinity;
  let hi = winHi;
  let minF: f64 = Infinity;
  let kHi: f64 = -1; let bkHi: f64 = 0;
  const resumeF = cValid && cFootStartS <= footStartS && footEndS <= cHiS && cMinF - delta > 0;
  if (resumeF && cKHi < 0) { minF = cMinF - delta; }
  else {
    let k = kFoot; let bk = base;
    if (resumeF) { k = <i32>cKHi; bk = cBkHi; minF = cMinF - delta; }
    let stopped = false;
    for (let it = 0; it <= nseg; it++) {
      const sv = bk + at(PS, k) + at(PSL, k);
      if (sv >= winHi) break;
      let k2 = k + 1; let b2 = bk;
      if (k2 >= nseg) { if (!closed) break; k2 = 0; b2 = bk + plen; }
      const dotF = at(GFm, k2) - (x * at(TXm, k2) + y * at(TYm, k2));
      if (dotF < 0) { hi = sv; kHi = <f64>k; bkHi = bk; stopped = true; break; }
      if (dotF < minF) minF = dotF;
      k = k2; bk = b2;
    }
    if (!stopped) kHi = -1;
  }
  let lo = winLo;
  let maxB: f64 = -Infinity;
  let kLo: f64 = -1; let bkLo: f64 = 0;
  const resumeB = cValid && footStartS <= cFootStartS && footStartS >= cLoS && cMaxB + delta < 0;
  if (resumeB && cKLo < 0) { maxB = cMaxB + delta; }
  else {
    let k = kFoot; let bk = base;
    if (resumeB) { k = <i32>cKLo; bk = cBkLo; maxB = cMaxB + delta; }
    let stopped = false;
    for (let it = 0; it <= nseg; it++) {
      const sv = bk + at(PS, k);
      if (sv <= winLo) break;
      let k2 = k - 1; let b2 = bk;
      if (k2 < 0) { if (!closed) break; k2 = nseg - 1; b2 = bk - plen; }
      const dotB = at(GBm, k) - (x * at(TXm, k2) + y * at(TYm, k2));
      if (dotB > 0) { lo = sv; kLo = <f64>k; bkLo = bk; stopped = true; break; }
      if (dotB > maxB) maxB = dotB;
      k = k2; bk = b2;
    }
    if (!stopped) kLo = -1;
  }
  store<f64>(cache, 1); store<f64>(cache, x, 8); store<f64>(cache, y, 16);
  store<f64>(cache, footStartS, 24); store<f64>(cache, footEndS, 32);
  store<f64>(cache, hi, 40); store<f64>(cache, kHi, 48); store<f64>(cache, bkHi, 56); store<f64>(cache, minF, 64);
  store<f64>(cache, lo, 72); store<f64>(cache, kLo, 80); store<f64>(cache, bkLo, 88); store<f64>(cache, maxB, 96);
  const stopAt = dc - 0.05 * h;
  let d2: f64 = Infinity;
  const mf = MFOOT;
  if (lo > winLo) {
    const oLo = load<f64>(cache, 104);
    footWinFastP(pl, mf, x, y, winLo, lo, stopAt, dc, oLo - 2 * h, oLo + 2 * h, Infinity);
    d2 = load<f64>(mf);
    if (d2 <= dc) { const fs = load<f64>(mf, 24); store<f64>(cache, closed && plen > 0 ? fs + jsRound(((winLo + lo) / 2 - fs) / plen) * plen : fs, 104); }
  }
  if (hi < winHi && d2 > stopAt) {
    const oHi = load<f64>(cache, 112);
    footWinFastP(pl, mf, x, y, hi, winHi, stopAt, dc, oHi - 2 * h, oHi + 2 * h, Infinity);
    const md = load<f64>(mf);
    if (md < d2) { d2 = md; if (d2 <= dc) { const fs = load<f64>(mf, 24); store<f64>(cache, closed && plen > 0 ? fs + jsRound(((hi + winHi) / 2 - fs) / plen) * plen : fs, 112); } }
  }
  return d2 - dc;
}
export function moc(pi: i32, dir: f64, sR: f64, L: f64, x: f64, y: f64, u: f64, d: f64, k: f64): f64 {
  return marginOfCP(pi, dir, sR, L, x, y, u, d, k, CACHE);
}
// Batched: records of 24 f64 (pi dir sR L qx qy u d k cache[15]) -> 16 f64
// (r cache[15]); the cache is copied to the output and updated there.
export function mocBatch(inp: usize, outp: usize, count: i32): void {
  for (let i = 0; i < count; i++) {
    const r = inp + <usize>i * 192;
    const o = outp + <usize>i * 128;
    memory.copy(o + 8, r + 72, 120);
    store<f64>(o, marginOfCP(<i32>load<f64>(r), load<f64>(r, 8), load<f64>(r, 16), load<f64>(r, 24), load<f64>(r, 32), load<f64>(r, 40), load<f64>(r, 48), load<f64>(r, 56), load<f64>(r, 64), o + 8));
  }
}
