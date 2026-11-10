// K268 proof stage: judge one shaped slot's S / R / F frames against the CPU
// ideal. Shared by census3a.mjs (live) and proof_offline.mjs (saved dumps).
//
// The pixel is linear in this slot's keep, so the measured m = (S-R)/(F-R)
// on the channel with the largest F-R step, judged where |F-R| >= 48.
//
// AFTER (the ideal this stage built, ideal.mjs): idealM mirrors gapKeepAt
// with the explore edits line for line, casing included (the full search,
// margin/fade, the far branch, the SHAPE edit's dots/beacon distance), so
// m_ideal = cutEff(S) / cutEff(F). A GHOST is a pixel whose ideal is 0 on
// its whole 3x3 neighbourhood that S still cuts (dSR > 3); an UNDER-CUT one
// whose ideal is >= 0.999 on its 3x3 that S cuts less than F (dSF > 3);
// elsewhere |m - m_ideal| is the error (p95 <= 0.08). Pixels the protect
// waiver touches (not mirrored) are counted as prot and not judged; pixels
// where the CPU's F does not cut but the GPU's does are counted as fmiss.
//
// BEFORE (the stage 3a ideal, kept for the record): exploreCutCover's twin
// at the projection arc, look >= 3 as the pre-K397 dotted line at lat 0 and
// no casing (the cause of the 2026-11-10 beacon PROOF fail).
import { slotModel, idealM } from "./ideal.mjs";

const smooth01 = (x) => { const c = x < 0 ? 0 : x > 1 ? 1 : x; return c * c * (3 - 2 * c); };
function lookCpu(look, v, u, s, lat, sideFw, pxW, tw, HC) {
  if (u < 0 || look < 2) return v;
  if (look === 2) return 1 - smooth01((u - 0.4) / 0.6);
  if (look === 4) {
    const fl = lat * 2;
    let cov = 0;
    for (let i = -1; i <= 1; i++) {
      const cf = i * (0.5 + 0.3 * u) + 0.12 * u * Math.sin(s * 7 + i * 2.1);
      const wf = 0.34 + (0.1 - 0.34) * u;
      const c = (wf - Math.abs(fl - cf)) / Math.max(4 * sideFw, 1e-4) + 0.5;
      cov = Math.max(cov, c < 0 ? 0 : c > 1 ? 1 : c);
    }
    const g = smooth01(u / 0.12);
    cov = 1 + (cov - 1) * g;
    return cov * (1 - smooth01((u - 0.5) / 0.5));
  }
  const sp = 0.95 * tw, la = lat * tw;
  const dCap = Math.sqrt(s * s + la * la) - 0.5 * tw;
  const kk = Math.max(1, Math.floor(s / sp + 0.5));
  const dx = s - kk * sp;
  const dDot = Math.sqrt(dx * dx + la * la) - 0.3 * tw * (1 - 0.4 * u);
  const c = -Math.min(dCap, dDot) / pxW + 0.5;
  return (c < 0 ? 0 : c > 1 ? 1 : c) * (HC ? 1 : 1 - 0.55 * u * u);
}
export function cutCoverOld(prof, A, look, tw, pxW, HC) {
  const fl = Math.round(prof[9]);
  const mx = (fl & 16) !== 0;
  let best = mx ? 0 : 2, bu = -1, bs = 0;
  for (let r = 0; r < 2; r++) {
    if ((fl & (1 << r)) === 0) continue;
    const aS = prof[r * 4], F = prof[r * 4 + 1], dK = prof[r * 4 + 2], tK = prof[r * 4 + 3];
    const d = (A - aS) / F;
    let v = 1, u = -1;
    if (d > 0) {
      let t = d < dK ? d * (tK / dK) : tK + (d - dK) * ((1 - tK) / Math.max(1 - dK, 1e-6));
      t = Math.min(t, 1);
      v = 1 - t * t * (3 - 2 * t);
      if (t < 1 && (fl & (4 << r)) !== 0) u = t;
    }
    if (mx ? v > best || (v === best && u < 0) : v < best) { best = v; bu = u; bs = Math.abs(A - aS); }
  }
  if (best > 1) return 1;
  return lookCpu(look, best, bu, bs, 0, pxW / Math.max(tw, 1e-6), pxW, tw, HC);
}
export function projA(sl, wx, wy) {
  const { pts, n, ps, step } = sl;
  let best = Infinity, bk = -1, bt = 0;
  for (let k = 0; k < n - 1; k++) {
    const ax = pts[2 * k], ay = pts[2 * k + 1], dx = pts[2 * k + 2] - ax, dy = pts[2 * k + 3] - ay;
    const L2 = dx * dx + dy * dy;
    let t = L2 > 0 ? ((wx - ax) * dx + (wy - ay) * dy) / L2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + t * dx - wx, qy = ay + t * dy - wy, d2 = qx * qx + qy * qy;
    if (d2 < best) { best = d2; bk = k; bt = t; }
  }
  return ps + Math.min(bk + bt, n - 1) * step;
}

// F's row: setSlot(c, 1) = setShape(c, null) (flag bit 4 off, profile 0)
// then setVis(c, 1) (texel 1.w = the solved strength; 0.z/0.w as solved).
export function rowF(T, solved) {
  const F = T.slice();
  F[7] = solved[0];
  F[2] = solved[1];
  F[3] = solved[2];
  F[15] = Math.round(F[15]) & ~4;
  for (let i = 22 * 4; i < 25 * 4; i++) F[i] = 0;
  return F;
}

const pct = (arr) => {
  const e = arr.slice().sort((a, b) => a - b);
  const q = (f) => (e.length ? +e[Math.min(e.length - 1, Math.floor(f * e.length))].toFixed(3) : null);
  return { n: e.length, mean: e.length ? +(e.reduce((a, b) => a + b, 0) / e.length).toFixed(4) : null, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1) };
};

// S, R, F: decoded images ({W, H, ch, data}) of the clip at (x0, y0).
// sl: the slot's SHAPED_INFO record; info: {v, tw, U}; look: the look index.
// Returns { after, before, farProfile, img } (img: the 3x3 panel when wantImg).
export function judgeSlot({ S, R, F, sl, info, x0, y0, look, HC = false, wantImg = false, farFlags = "slot" }) {
  const W = S.W, H = S.H, N = W * H;
  const pxW = 1 / info.v.s;
  const U = info.U || [HC ? 2 : 1, look, 1, info.tw];
  const dump = { T: sl.T, overPts: sl.overPts, under: sl.under, U };
  const smS = slotModel({ ...dump, farFlags });
  const smF = slotModel({ ...dump, T: rowF(sl.T, sl.solved) });
  const smP = slotModel({ ...dump, farFlags: "profile" });
  // Per-pixel measurement.
  const meas = new Float32Array(N).fill(NaN), dSRa = new Float32Array(N), dSFa = new Float32Array(N);
  const judged = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const p = i * S.ch;
    let ch = 0, step = 0, dSR = 0, dSF = 0;
    for (let q = 0; q < 3; q++) {
      const fr = F.data[p + q] - R.data[p + q];
      if (Math.abs(fr) > Math.abs(step)) { step = fr; ch = q; }
      dSR = Math.max(dSR, Math.abs(S.data[p + q] - R.data[p + q]));
      dSF = Math.max(dSF, Math.abs(S.data[p + q] - F.data[p + q]));
    }
    dSRa[i] = dSR; dSFa[i] = dSF;
    if (Math.abs(step) < 48) continue;
    judged[i] = 1;
    meas[i] = (S.data[p + ch] - R.data[p + ch]) / step;
  }
  // The new ideal on the judged pixels and their 3x3 neighbourhood.
  const need = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!judged[y * W + x]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) need[yy * W + xx] = 1;
    }
  }
  const idN = new Float32Array(N).fill(NaN), idP = new Float32Array(N).fill(NaN);
  const prot = new Uint8Array(N), far = new Uint8Array(N), cutOnA = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (!need[i]) continue;
    const x = i % W, y = (i / W) | 0;
    const wp = [(x0 + x + 0.5 - info.v.x) / info.v.s, (y0 + y + 0.5 - info.v.y) / info.v.s];
    const a = idealM(smS, wp, pxW, smF);
    if (a.m !== null && a.m !== undefined) idN[i] = a.m;
    prot[i] = a.prot ? 1 : 0;
    far[i] = a.far ? 1 : 0;
    cutOnA[i] = a.S && a.S.cutOn ? 1 : 0;
    if (a.far) {
      const b = idealM(smP, wp, pxW, smF);
      if (b.m !== null && b.m !== undefined) idP[i] = b.m;
    } else idP[i] = idN[i];
  }
  const classify = (ID, tag) => {
    const rec = { px: 0, ghosts: 0, under: 0, between: 0, prot: 0, fmiss: 0, maxErr: 0, far: 0, errs: [] };
    const cls = new Uint8Array(N); // 0 unjudged, 1 between, 2 ghost, 3 under, 4 prot, 5 fmiss, 6 ok-zero, 7 ok-one
    for (let i = 0; i < N; i++) {
      if (!judged[i]) continue;
      rec.px++;
      if (prot[i]) { rec.prot++; cls[i] = 4; continue; }
      if (Number.isNaN(ID[i])) { rec.fmiss++; cls[i] = 5; continue; }
      if (far[i]) rec.far++;
      const x = i % W, y = (i / W) | 0;
      let allZero = true, allOne = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const v = ID[yy * W + xx];
        if (Number.isNaN(v)) continue;
        if (v !== 0) allZero = false;
        if (v < 0.999) allOne = false;
      }
      if (allZero) { if (dSRa[i] > 3) { rec.ghosts++; cls[i] = 2; } else cls[i] = 6; continue; }
      if (allOne) { if (dSFa[i] > 3) { rec.under++; cls[i] = 3; } else cls[i] = 7; continue; }
      const e = Math.abs(meas[i] - ID[i]);
      rec.between++;
      rec.maxErr = Math.max(rec.maxErr, e);
      rec.errs.push(e);
      cls[i] = 1;
    }
    rec.err = pct(rec.errs);
    rec.maxErr = +rec.maxErr.toFixed(3);
    return { rec, cls, tag };
  };
  const after = classify(idN, "after");
  const farProfile = classify(idP, "farProfile");
  // BEFORE: the stage 3a ideal (1D in A, +-1.5 px of arc).
  const before = { px: 0, ghosts: 0, under: 0, between: 0, maxErr: 0, errs: [] };
  const idO = new Float32Array(N).fill(NaN), clsO = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (!judged[i]) continue;
    const x = i % W, y = (i / W) | 0;
    const wx = (x0 + x + 0.5 - info.v.x) / info.v.s, wy = (y0 + y + 0.5 - info.v.y) / info.v.s;
    const A = projA(sl, wx, wy), d = 1.5 * pxW;
    const id = cutCoverOld(sl.prof, A, look, info.tw, pxW, HC);
    const lo = cutCoverOld(sl.prof, A - d, look, info.tw, pxW, HC), hi = cutCoverOld(sl.prof, A + d, look, info.tw, pxW, HC);
    idO[i] = id;
    before.px++;
    if (id === 0 && lo === 0 && hi === 0) { if (dSRa[i] > 3) { before.ghosts++; clsO[i] = 2; } else clsO[i] = 6; continue; }
    if (id >= 0.999 && lo >= 0.999 && hi >= 0.999) { if (dSFa[i] > 3) { before.under++; clsO[i] = 3; } else clsO[i] = 7; continue; }
    const e = Math.abs(meas[i] - id);
    before.between++;
    before.maxErr = Math.max(before.maxErr, e);
    before.errs.push(e);
    clsO[i] = 1;
  }
  before.err = pct(before.errs);
  before.maxErr = +before.maxErr.toFixed(3);
  delete before.errs;
  const errsAfter = after.rec.errs;
  delete after.rec.errs;
  delete farProfile.rec.errs;
  let img = null;
  if (wantImg) {
    // 3 x 3 at scale 3: S, R, F / old ideal, new ideal, measured /
    // old classes, new classes, |measured - new ideal| x 4.
    // Classes: ghost red, under blue, between grey (brighter = larger error),
    // prot purple, fmiss yellow, unjudged dark blue, agreeing 0 / 1 dark /
    // light green.
    const grey = (v) => { const g = Number.isNaN(v) ? -1 : Math.round(255 * Math.max(0, Math.min(1, v))); return g < 0 ? [20, 20, 60] : [g, g, g]; };
    const clsRgb = (c, i, ID) => {
      switch (c) {
        case 0: return [20, 20, 60];
        case 2: return [255, 0, 0];
        case 3: return [0, 80, 255];
        case 4: return [170, 60, 200];
        case 5: return [230, 210, 0];
        case 6: return [0, 70, 0];
        case 7: return [90, 200, 90];
        default: { const e = Math.min(1, Math.abs(meas[i] - ID[i]) * 2); const g = Math.round(60 + 160 * e); return [g, g, g]; }
      }
    };
    const fromImg = (im) => (i) => [im.data[i * im.ch], im.data[i * im.ch + 1], im.data[i * im.ch + 2]];
    const panels = [
      fromImg(S), fromImg(R), fromImg(F),
      (i) => (judged[i] ? grey(idO[i]) : [20, 20, 60]), (i) => (judged[i] ? grey(idN[i]) : [20, 20, 60]), (i) => grey(meas[i]),
      (i) => clsRgb(clsO[i], i, idO), (i) => clsRgb(after.cls[i], i, idN),
      (i) => { if (!judged[i] || Number.isNaN(idN[i])) return [20, 20, 60]; const e = Math.min(1, Math.abs(meas[i] - idN[i]) * 4); return [Math.round(255 * e), Math.round(255 * (1 - e) * 0.3), 0]; },
    ];
    const SC = 3, PW = W * SC, PH = H * SC, cols = 3, rows = 3, G = 4;
    const OW = cols * PW + (cols + 1) * G, OH = rows * PH + (rows + 1) * G;
    const od = Buffer.alloc(OW * OH * 3, 128);
    panels.forEach((get, k) => {
      const ox = G + (k % cols) * (PW + G), oy = G + ((k / cols) | 0) * (PH + G);
      for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
        const c = get(((y / SC) | 0) * W + ((x / SC) | 0)), o = ((oy + y) * OW + ox + x) * 3;
        od[o] = c[0]; od[o + 1] = c[1]; od[o + 2] = c[2];
      }
    });
    img = { W: OW, H: OH, data: od };
  }
  // Where the new ideal's ghosts sit (for attribution): their pixel list.
  const ghostPx = [];
  for (let i = 0; i < N && ghostPx.length < 400; i++) if (after.cls[i] === 2) ghostPx.push([x0 + (i % W), y0 + ((i / W) | 0)]);
  const underPx = [];
  for (let i = 0; i < N && underPx.length < 400; i++) if (after.cls[i] === 3) underPx.push([x0 + (i % W), y0 + ((i / W) | 0)]);
  return { after: after.rec, errsAfter, before, farProfile: farProfile.rec, ghostPx, underPx, img, cutOnPx: cutOnA.reduce((a, b) => a + b, 0) };
}
