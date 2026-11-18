// K1436: the rp=gf bar test v2. v1 (../K1433/k1433_lib.ts) judged ink per pixel against fixed thresholds
// (break < 0.6, thin < 0.5), so shallow dips passed and its `plain` class fired beside ordinary crossings.
// v2 keeps v1's raster (rasterJudge: ink, cov, chain, s, group, class per pixel) and its two stray tests
// (dstray, rstray), and replaces dbreak / rbreak / rthin by a BAND PROFILE along every exposed edge:
//   sites  every 4-neighbour pixel pair on two different surfaces (v1's `same`) gives a site on each COVERED
//          side; its normal points into that side. Normals are averaged over the sites of the same boundary
//          within SMOOTH px.
//   ray    along the normal, ink sampled bilinearly every STEP px from 2 aa outside the edge to W + 3 aa + W/2
//          inside. tOut = where the ink rises through 0.5 (the band's outer edge), tIn = where it next falls
//          through 0.5 (its inner edge), both on the same ray, so the band's width wIn = tIn - tOut does not
//          depend on where the staircase put the site. The ray is CUT where it leaves the side's own surface:
//          the geometric crossing exemption (an under thread's band ends where the over thread covers it, so
//          its ray stops there; nothing past the cut is judged, and a cut ray's width is not measured).
//   core   the least ink between tOut + aa and tIn - aa (a hole inside the band);
//   past   the ink integrated from tIn + 2 aa over W / 2 (a smear, stub or wedge hanging off the band).
// Each width is judged against the band's OWN running level: a least-squares line through the widths of the
// boundary's measured sites within LEVEL aa along it (the level follows a slow taper, a corner's mitre, a
// fade), and the site's residual from that line is the dip or step:
//   vdip   residual < -DW aa (the inner edge steps in: a notch, a bite, a thinned or broken band), or a core
//          hole (core < CORE);
//   vwide  residual > +DW aa (the inner edge steps out: a nick, a wedge, a stub), or past > PAST aa of ink.
// Finds: v1's finds() (connected flagged pixels, gaps of 2 bridged) with a length floor of MINLEN aa of edge.
// Classes as v1 (plain, ramp, tie, thru) from the site's pixel. Thresholds and their measurement: k1436_scan.ts.
import { analyze, finds, type Find, type Raster } from "../K1433/k1433_lib.ts";
export { makeJudge, rasterJudge, modelOf, tablesOf, loadEval, CLS, type Find, type Raster } from "../K1433/k1433_lib.ts";

const env = (k: string, d: number): number => (process.env[k] !== undefined && process.env[k] !== "" ? +process.env[k]! : d);
export const P = {
  STEP: 0.25,                       // px between ray samples
  SMOOTH: 2.5,                      // px: the normal's least averaging radius
  NSM: env("K1436_NSM", 1),
  CORNER: env("K1436_CORNER", 0.87), // the normal turn (cos) within the normal radius that marks a corner         // aa: the normal's averaging radius
  LEVEL: env("K1436_LEVEL", 4),     // aa: the running level's half window along the edge
  DW: env("K1436_DW", 0.08),        // aa: the width residual that flags (dip or wide)
  CORE: env("K1436_CORE", 0.75),    // ink: a hole in the band's core
  PAST: env("K1436_PAST", 0.5),     // aa of full ink past the band
  MINLEN: env("K1436_MINLEN", 0.5),
  RSM: env("K1436_RSM", 0.5),     // aa: the residual's averaging radius along the edge
  FIT: env("K1436_FIT", 2),         // the level's polynomial degree (1 line, 2 quadratic) // aa: the least edge length (px of flagged sites) a find needs, at least 2 px
};

export interface Sites {
  n: number; x: Float32Array; y: Float32Array; nx: Float32Array; ny: Float32Array; pix: Int32Array; oth: Int32Array;
  wIn: Float32Array; core: Float32Array; past: Float32Array; cut: Float32Array; res: Float32Array; lvl: Float32Array; flag: Uint8Array; why: Uint8Array;
}

export function sameFn(R: Raster, T: any): (a: number, b: number) => boolean {
  return (a: number, b: number): boolean => {
    const ca = R.cov[a] > 0.5, cb = R.cov[b] > 0.5; if (!ca && !cb) return true; if (ca !== cb) return false;
    if (R.chain[a] === R.chain[b] && Math.abs(R.s[a] - R.s[b]) < 2 * T.h) return true;
    return R.grp[a] >= 0 && R.grp[a] === R.grp[b];
  };
}

export function bandSites(R: Raster, T: any): Sites {
  const { w, h, ppu } = R; const same = sameFn(R, T);
  const aaP = T.aa * ppu, WP = T.W * ppu; const tMax = WP + 3 * aaP + WP / 2 + 1; const t0 = -2 * aaP - 1;
  const margin = Math.ceil(tMax + Math.max(P.SMOOTH, P.NSM * aaP) + 3);
  const X: number[] = [], Y: number[] = [], NX: number[] = [], NY: number[] = [], PI: number[] = [], PO: number[] = [];
  const add = (i: number, j: number, mx: number, my: number, nx: number, ny: number): void => { X.push(mx); Y.push(my); NX.push(nx); NY.push(ny); PI.push(i); PO.push(j); };
  for (let r = margin; r < h - margin; r++) for (let c = margin; c < w - margin; c++) {
    const i = r * w + c;
    if (!same(i, i + 1)) { if (R.cov[i] > 0.5) add(i, i + 1, c + 0.5, r, -1, 0); if (R.cov[i + 1] > 0.5) add(i + 1, i, c + 0.5, r, 1, 0); }
    if (!same(i, i + w)) { if (R.cov[i] > 0.5) add(i, i + w, c, r + 0.5, 0, -1); if (R.cov[i + w] > 0.5) add(i + w, i, c, r + 0.5, 0, 1); }
  }
  const n = X.length;
  const S: Sites = { n, x: Float32Array.from(X), y: Float32Array.from(Y), nx: Float32Array.from(NX), ny: Float32Array.from(NY), pix: Int32Array.from(PI), oth: Int32Array.from(PO),
    wIn: new Float32Array(n).fill(-1), core: new Float32Array(n).fill(1), past: new Float32Array(n), cut: new Float32Array(n), res: new Float32Array(n), lvl: new Float32Array(n).fill(-1), flag: new Uint8Array(n), why: new Uint8Array(n) };
  const CS = 8; const gw = Math.ceil(w / CS) + 1; const head = new Map<number, number[]>();
  for (let k = 0; k < n; k++) { const key = Math.floor(S.y[k] / CS) * gw + Math.floor(S.x[k] / CS); let a = head.get(key); if (!a) { a = []; head.set(key, a); } a.push(k); }
  const sameB = (a: number, b: number): boolean => same(S.pix[a], S.pix[b]) && same(S.oth[a], S.oth[b]);
  const near = (k: number, rad: number, fn: (q: number) => void): void => {
    const x = S.x[k], y = S.y[k]; const cx0 = Math.floor((x - rad) / CS), cx1 = Math.floor((x + rad) / CS), cy0 = Math.floor((y - rad) / CS), cy1 = Math.floor((y + rad) / CS);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) { const a = head.get(cy * gw + cx); if (!a) continue; for (const q of a) { const dx = S.x[q] - x, dy = S.y[q] - y; if (dx * dx + dy * dy <= rad * rad && sameB(k, q)) fn(q); } }
  };
  const nx2 = new Float32Array(n), ny2 = new Float32Array(n);
  // the normal averages EVERY site within SM whose raw normal is not opposed, whatever its labels: where the labels
  // change along an edge (a tie or ramp) a label-filtered average left staircase sites with a raw axis normal, and
  // the ray then measured the band 1/cos(tilt) too wide (muse_hash:21.99:2.97, 2026-11-17)
  const nearG = (k: number, rad: number, fn: (q: number) => void): void => {
    const x = S.x[k], y = S.y[k]; const cx0 = Math.floor((x - rad) / CS), cx1 = Math.floor((x + rad) / CS), cy0 = Math.floor((y - rad) / CS), cy1 = Math.floor((y + rad) / CS);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) { const a = head.get(cy * gw + cx); if (!a) continue; for (const q of a) { const dx = S.x[q] - x, dy = S.y[q] - y; if (dx * dx + dy * dy <= rad * rad && S.nx[k] * S.nx[q] + S.ny[k] * S.ny[q] >= 0) fn(q); } }
  };
  const SM = Math.max(P.SMOOTH, P.NSM * aaP); for (let k = 0; k < n; k++) { let sx = 0, sy = 0; nearG(k, SM, (q) => { sx += S.nx[q]; sy += S.ny[q]; }); const l = Math.hypot(sx, sy) || 1; nx2[k] = sx / l; ny2[k] = sy / l; }
  S.nx.set(nx2); S.ny.set(ny2);
  // corners: a site whose smoothed normal turns by more than acos(CORNER) within SM along its boundary (a cusp,
  // the band's mitre at a sharp tip: the width there follows no smooth level); width flags skip sites within
  // one aa of one
  const cornr = new Uint8Array(n); const nearC = new Uint8Array(n);
  for (let k = 0; k < n; k++) { let mn = 1; near(k, SM, (q) => { const d = nx2[k] * nx2[q] + ny2[k] * ny2[q]; if (d < mn) mn = d; }); if (mn < P.CORNER) cornr[k] = 1; }
  for (let k = 0; k < n; k++) if (cornr[k]) near(k, aaP, (q) => { nearC[q] = 1; });
  const ink = (x: number, y: number): number => {
    const c = Math.floor(x), r = Math.floor(y); const fx = x - c, fy = y - r; const i = r * w + c;
    return (R.ink[i] * (1 - fx) + R.ink[i + 1] * fx) * (1 - fy) + (R.ink[i + w] * (1 - fx) + R.ink[i + w + 1] * fx) * fy;
  };
  const ns = Math.ceil((tMax - t0) / P.STEP) + 1; const prof = new Float32Array(ns);
  for (let k = 0; k < n; k++) {
    const x0 = S.x[k], y0 = S.y[k], nx = nx2[k], ny = ny2[k]; const own = S.pix[k];
    let m = 0; let cut = tMax;
    for (let j = 0; j < ns; j++) {
      const t = t0 + j * P.STEP; const px = x0 + nx * t, py = y0 + ny * t;
      if (t > 0.5) { const q = Math.round(py) * w + Math.round(px); if (!same(own, q)) { cut = t; break; } }
      prof[j] = ink(px, py); m = j + 1;
    }
    S.cut[k] = cut;
    // tOut: the last rise through 0.5 at or before t = aa; tIn: the next fall through 0.5
    let jo = -1; for (let j = 1; j < m; j++) { const t = t0 + j * P.STEP; if (t > aaP) break; if (prof[j - 1] < 0.5 && prof[j] >= 0.5) jo = j; }
    if (jo < 0) { if (prof[0] < 0.5) { S.wIn[k] = 0; S.core[k] = 0; } continue; } // no band at the edge / ink on both sides
    const tOut = t0 + jo * P.STEP - P.STEP * (prof[jo] - 0.5) / Math.max(1e-6, prof[jo] - prof[jo - 1]);
    let ji = -1; for (let j = jo + 1; j < m; j++) if (prof[j] < 0.5) { ji = j; break; }
    const tEnd = ji < 0 ? t0 + (m - 1) * P.STEP : t0 + ji * P.STEP - P.STEP * (0.5 - prof[ji]) / Math.max(1e-6, prof[ji - 1] - prof[ji]);
    let cm = 1; for (let j = jo; j < m; j++) { const t = t0 + j * P.STEP; if (t < tOut + aaP) continue; if (t > tEnd - aaP) break; if (prof[j] < cm) cm = prof[j]; }
    S.core[k] = cm;
    if (ji < 0) continue; // cut (or ran out) inside the band: no width
    S.wIn[k] = tEnd - tOut;
    let past = 0; for (let j = ji; j < m; j++) { const t = t0 + j * P.STEP; if (t < tEnd + 2 * aaP) continue; if (t > tEnd + 2 * aaP + WP / 2) break; past += prof[j] * P.STEP; }
    S.past[k] = past;
  }
  // the running level: a least-squares line of width against the tangent coordinate over the boundary's
  // measured sites within LEVEL aa; the residual is the site's step
  const LR = P.LEVEL * aaP; const DW = P.DW * aaP;
  for (let k = 0; k < n; k++) {
    const tx = -S.ny[k], ty = S.nx[k];
    let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, sw = 0, suw = 0, suuw = 0;
    near(k, LR, (q) => { if (S.wIn[q] < 0) return; const u = ((S.x[q] - S.x[k]) * tx + (S.y[q] - S.y[k]) * ty) / LR; const u2 = u * u; s0++; s1 += u; s2 += u2; s3 += u2 * u; s4 += u2 * u2; sw += S.wIn[q]; suw += u * S.wIn[q]; suuw += u2 * S.wIn[q]; });
    let why = 0;
    if (s0 >= 6) {
      let a: number;
      if (P.FIT === 2) { // quadratic: solve [s0 s1 s2; s1 s2 s3; s2 s3 s4] c = [sw suw suuw] for c0
        const d = s0 * (s2 * s4 - s3 * s3) - s1 * (s1 * s4 - s3 * s2) + s2 * (s1 * s3 - s2 * s2);
        if (Math.abs(d) > 1e-9) a = (sw * (s2 * s4 - s3 * s3) - s1 * (suw * s4 - s3 * suuw) + s2 * (suw * s3 - s2 * suuw)) / d;
        else a = sw / s0;
      } else { const den = s0 * s2 - s1 * s1; const b = Math.abs(den) > 1e-9 ? (s0 * suw - s1 * sw) / den : 0; a = (sw - b * s1) / s0; }
      S.lvl[k] = a;
      if (a >= 2 * aaP && S.wIn[k] >= 0) S.res[k] = S.wIn[k] - a;
    }
    S.why[k] = why;
  }
  // the residual's MEDIAN over the boundary's measured sites within RSM aa (a lone staircase outlier is noise;
  // a notch spans more than an aa), then the flags
  const RS = Math.max(1.01, P.RSM * aaP); const res2 = new Float32Array(n);
  for (let k = 0; k < n; k++) { if (S.lvl[k] < 2 * aaP || S.wIn[k] < 0) continue; const bf: number[] = []; near(k, RS, (q) => { if (S.lvl[q] >= 2 * aaP && S.wIn[q] >= 0) bf.push(S.res[q]); }); bf.sort((a, b) => a - b); const m = bf.length; res2[k] = m ? (m & 1 ? bf[m >> 1] : 0.5 * (bf[m / 2 - 1] + bf[m / 2])) : 0; }
  for (let k = 0; k < n; k++) {
    let why = 0; const r = res2[k];
    if (S.lvl[k] >= 2 * aaP && S.wIn[k] >= 0 && !nearC[k]) { if (r < -DW) why = 1; else if (r > DW) why = 3; }
    if (!why && S.core[k] < P.CORE) why = 2;
    if (!why && S.past[k] > P.PAST * aaP) why = 4;
    S.why[k] = why; S.flag[k] = why ? 1 : 0;
  }
  S.res.set(res2);
  return S;
}

// finds: v1's finds() over the flagged sites' pixels, split by kind (dip = why 1|2, wide = why 3|4)
export function bandFinds(R: Raster, T: any, c0: number, r0: number, S: Sites): Find[] {
  const n = R.w * R.h; const dip = new Uint8Array(n), wide = new Uint8Array(n); const pk = new Float32Array(n); const aaP = T.aa * R.ppu;
  for (let k = 0; k < S.n; k++) if (S.flag[k]) { const i = S.pix[k]; if (S.why[k] <= 2) dip[i] = 1; else wide[i] = 1; const d = S.why[k] === 2 ? 1 - S.core[k] : S.why[k] === 4 ? S.past[k] / aaP : Math.abs(S.res[k]) / aaP; if (d > pk[i]) pk[i] = d; }
  const minPx = Math.max(2, Math.round(P.MINLEN * aaP));
  return [...finds(dip, R, c0, r0, "vdip", (i) => pk[i], minPx), ...finds(wide, R, c0, r0, "vwide", (i) => pk[i], minPx)];
}

// every v2 test: v1's depth and raster strays, plus the band profile
// roi = [col0, row0, col1, row1] (raster px): flags outside are dropped first (the spots tool rasterizes a
// padded frame for the rays but judges v1's 480 px frame, so a stray's centroid stays where v1 put it)
export function allFindsV2(R: Raster, T: any, c0: number, r0: number, minPx = 2, roi?: number[]): { finds: Find[]; S: Sites } {
  const F = analyze(R, T); const S = bandSites(R, T);
  let ds = R.dstray, rs = F.rstray;
  if (roi) {
    const clip = (a: Uint8Array): Uint8Array => { const b = new Uint8Array(a.length); for (let r = roi[1]; r < roi[3]; r++) for (let c = roi[0]; c < roi[2]; c++) b[r * R.w + c] = a[r * R.w + c]; return b; };
    ds = clip(ds); rs = clip(rs);
    for (let k = 0; k < S.n; k++) { const c = S.pix[k] % R.w, r = (S.pix[k] / R.w) | 0; if (c < roi[0] || r < roi[1] || c >= roi[2] || r >= roi[3]) S.flag[k] = 0; }
  }
  return { S, finds: [
    ...finds(ds, R, c0, r0, "dstray", (i) => R.ink[i], minPx),
    ...finds(rs, R, c0, r0, "rstray", (i) => R.ink[i], minPx),
    ...bandFinds(R, T, c0, r0, S),
  ] };
}
