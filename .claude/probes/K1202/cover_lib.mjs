// K1202 (batch 20 Run C): copied verbatim from .claude/probes/K1139/cover_lib.mjs (stand links and moves unchanged); only the folder changed.
// K1139 Stage 4 (4.2 task 2): what the GPU's 4x MSAA samples show at each
// fan pixel, from diag_s4.mjs's triangle capture. Per pixel and sample, the
// LAST covering primitive of the fillet meshes in draw order wins (no
// blending at rest: aM = 1, gk = 1 and lookA = 1 in the default look), and
// a fan triangle whose aLook, interpolated at the PIXEL CENTRE (no centroid
// sampling), exceeds 1.001 discards the whole pixel (JUNCTION_FRAG: the
// outer rim ring is border look only), so it writes no sample there. A cover
// strip is never discarded by its look. Kinds: 1 = this record's fan, 2 =
// this record's cover strip, 3 = any other record's primitive, 0 = nothing
// (the webs-off frame shows). Not modelled: gk (a foreign over thread's
// silhouette discards a fan fragment) and the fill rule's tie-break on an
// exact edge.
//
// Sample offsets: D3D11's standard 4x pattern in 1/16 px, (-2,-6) (6,-2)
// (-6,2) (2,6), y down; orientation 1 mirrors y, in case ANGLE's flip puts
// the pattern upside down on screen. cover_s4.mjs picks the one that fits.
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { decodePNG, toRGB } from "./png.mjs";

export const NB = 4, PB = 9, PX = NB * PB + 10;
const OFFS = [
  [[-2, -6], [6, -2], [-6, 2], [2, 6]],
  [[-2, 6], [6, 2], [-6, -2], [2, -6]],
].map((o) => o.map(([x, y]) => [x / 16, y / 16]));

// kinds[(i * 4 + s) * 2 + orient] for box pixel i, sample s.
export function coverage(DIR, rc) {
  const { w: BW, h: BH } = rc.box;
  const n = BW * BH;
  const kinds = new Uint8Array(n * 8);
  const f = join(DIR, `r${rc.ji}.tri.bin`);
  if (!existsSync(f)) return null;
  const buf = readFileSync(f);
  const T = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  const nt = T.length / 14;
  for (let t = 0; t < nt; t++) {
    const o = t * 14;
    const ax = T[o + 2], ay = T[o + 3], bx = T[o + 4], by = T[o + 5], cx = T[o + 6], cy = T[o + 7];
    const la = T[o + 8], lb = T[o + 9], lc = T[o + 10];
    const rec = T[o + 11];
    const ri = Math.floor(rec + 0.5), strip = rec - Math.floor(rec) > 0.125;
    const kind = ri === rc.rb ? (strip ? 2 : 1) : 3;
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx) - rc.box.x) - 1), x1 = Math.min(BW - 1, Math.ceil(Math.max(ax, bx, cx) - rc.box.x) + 1);
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy) - rc.box.y) - 1), y1 = Math.min(BH - 1, Math.ceil(Math.max(ay, by, cy) - rc.box.y) + 1);
    for (let Y = y0; Y <= y1; Y++)
      for (let X = x0; X <= x1; X++) {
        const px = rc.box.x + X + 0.5, py = rc.box.y + Y + 0.5;
        // Barycentrics at the pixel centre (extrapolated outside the triangle).
        const wa = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / area;
        const wb = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area;
        const wc = 1 - wa - wb;
        if (!strip && wa * la + wb * lb + wc * lc > 1.001) continue;
        const i = Y * BW + X;
        for (let s = 0; s < 4; s++)
          for (let or = 0; or < 2; or++) {
            const qx = px + OFFS[or][s][0], qy = py + OFFS[or][s][1];
            const ea = ((bx - qx) * (cy - qy) - (by - qy) * (cx - qx)) / area;
            const eb = ((cx - qx) * (ay - qy) - (cy - qy) * (ax - qx)) / area;
            const ec = 1 - ea - eb;
            if (ea >= 0 && eb >= 0 && ec >= 0) kinds[(i * 4 + s) * 2 + or] = kind;
          }
      }
  }
  return kinds;
}

// Per pixel and sample (one orientation): the record id (aRec, strips
// carry rec + 0.25) of the last covering primitive, NaN where none.
export function owners(DIR, rc, or) {
  const { w: BW, h: BH } = rc.box;
  const own = new Float32Array(BW * BH * 4).fill(NaN);
  const buf = readFileSync(join(DIR, `r${rc.ji}.tri.bin`));
  const T = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  for (let t = 0; t < T.length / 14; t++) {
    const o = t * 14;
    const ax = T[o + 2], ay = T[o + 3], bx = T[o + 4], by = T[o + 5], cx = T[o + 6], cy = T[o + 7];
    const la = T[o + 8], lb = T[o + 9], lc = T[o + 10], rec = T[o + 11];
    const strip = rec - Math.floor(rec) > 0.125;
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx) - rc.box.x) - 1), x1 = Math.min(BW - 1, Math.ceil(Math.max(ax, bx, cx) - rc.box.x) + 1);
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy) - rc.box.y) - 1), y1 = Math.min(BH - 1, Math.ceil(Math.max(ay, by, cy) - rc.box.y) + 1);
    for (let Y = y0; Y <= y1; Y++)
      for (let X = x0; X <= x1; X++) {
        const px = rc.box.x + X + 0.5, py = rc.box.y + Y + 0.5;
        const wa = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / area;
        const wb = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area;
        if (!strip && wa * la + wb * lb + (1 - wa - wb) * lc > 1.001) continue;
        for (let s = 0; s < 4; s++) {
          const qx = px + OFFS[or][s][0], qy = py + OFFS[or][s][1];
          const ea = ((bx - qx) * (cy - qy) - (by - qy) * (cx - qx)) / area;
          const eb = ((cx - qx) * (ay - qy) - (cy - qy) * (ax - qx)) / area;
          if (ea >= 0 && eb >= 0 && 1 - ea - eb >= 0) own[(Y * BW + X) * 4 + s] = rec;
        }
      }
  }
  return own;
}

const imgCache = new Map();
export const img = (DIR, k, v) => {
  const p = join(DIR, `t${k}_${v}.png`);
  if (imgCache.has(p)) return imgCache.get(p);
  const im = existsSync(p) ? toRGB(decodePNG(readFileSync(p))) : null;
  imgCache.set(p, im);
  return im;
};

const f32of = (p) => {
  const b = readFileSync(p);
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};

// The twin's dumps for one record and phase: fan (strip = false) and strip.
export function loadTwin(DIR, ji, k) {
  const base = join(DIR, `r${ji}_t${k}`);
  if (!existsSync(`${base}.u8`)) return null;
  const T = {
    u8: new Uint8Array(readFileSync(`${base}.u8`)), f32: f32of(`${base}.f32`), fa32: f32of(`${base}.fa32`), c32: f32of(`${base}.c32`),
  };
  if (existsSync(`${base}.s.u8`)) T.s = { u8: new Uint8Array(readFileSync(`${base}.s.u8`)), f32: f32of(`${base}.s.f32`), fa32: f32of(`${base}.s.fa32`) };
  if (existsSync(`${base}.k32`)) T.k32 = f32of(`${base}.k32`);
  return T;
}

// Debug 5's G as the twin computes it at pixel i: max over bands of cr * cov.
export const twinG = (D, i) => {
  let g = 0;
  for (let b = 0; b < NB; b++) {
    const cr = D.fa32[(i * NB + b) * 2];
    if (!(cr >= 0) || D.f32[(i * NB + b) * 2] > 1e8) continue;
    g = Math.max(g, Math.min(1, cr) * (D.u8[i * PX + b * PB + 1] / 255));
  }
  return 255 * g;
};

// Per pixel: the composite debug-5 G and normal-look RGB the coverage model
// predicts, the sample counts per kind, and the GPU's values.
export function composite(DIR, meta, rc, kinds, k, or, T) {
  const { w: BW, h: BH } = rc.box;
  const n = BW * BH;
  const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
  const gN = img(DIR, k, "n"), gW = img(DIR, k, "w"), gD = img(DIR, k, "d"), gDW = img(DIR, k, "dw");
  const at = (im, X, Y, c) => {
    const x = X + ox, y = Y + oy;
    if (!im || x < 0 || y < 0 || x >= im.W || y >= im.H) return -1;
    return im.data[(y * im.W + x) * 3 + c];
  };
  const G = new Float32Array(n), RGB = new Float32Array(n * 3), cnt = new Uint8Array(n * 4), gpuG = new Float32Array(n), gpuN = new Float32Array(n * 3);
  const foot = new Uint8Array(n);
  for (let Y = 0; Y < BH; Y++)
    for (let X = 0; X < BW; X++) {
      const i = Y * BW + X;
      const gf = Math.round(twinG(T, i)), gs = T.s ? Math.round(twinG(T.s, i)) : gf;
      const gdw = at(gDW, X, Y, 1);
      let g = 0;
      const rgb = [0, 0, 0];
      for (let s = 0; s < 4; s++) {
        const kd = kinds[(i * 4 + s) * 2 + or];
        cnt[i * 4 + kd]++;
        if (kd === 1) { g += gf; for (let c = 0; c < 3; c++) rgb[c] += T.u8[i * PX + 42 + c]; }
        else if (kd === 2) { g += gs; for (let c = 0; c < 3; c++) rgb[c] += (T.s ? T.s.u8 : T.u8)[i * PX + 42 + c]; }
        else { g += gdw; for (let c = 0; c < 3; c++) rgb[c] += at(gW, X, Y, c); }
      }
      G[i] = g / 4;
      for (let c = 0; c < 3; c++) { RGB[i * 3 + c] = rgb[c] / 4; gpuN[i * 3 + c] = at(gN, X, Y, c); }
      gpuG[i] = at(gD, X, Y, 1);
      let d = 0;
      for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(at(gD, X, Y, c) - at(gDW, X, Y, c)), Math.abs(at(gN, X, Y, c) - at(gW, X, Y, c)));
      foot[i] = d > 0 ? 1 : 0;
    }
  return { G, RGB, cnt, gpuG, gpuN, foot, at, gN, gW, gD, gDW, ox, oy };
}

// The orientation whose composite fits the GPU's debug-5 G best on this
// record's pixels with no other record's sample (cnt[3] = 0).
export function pickOrient(DIR, meta, rc, kinds, phases) {
  const score = [0, 0], nn = [0, 0];
  for (const k of phases) {
    const T = loadTwin(DIR, rc.ji, k);
    if (!T) continue;
    for (let or = 0; or < 2; or++) {
      const C = composite(DIR, meta, rc, kinds, k, or, T);
      for (let i = 0; i < C.G.length; i++) {
        if (C.cnt[i * 4 + 3] || C.cnt[i * 4] === 4) continue;
        score[or] += Math.abs(C.G[i] - C.gpuG[i]);
        nn[or]++;
      }
    }
  }
  return { or: score[1] < score[0] ? 1 : 0, mean: [score[0] / Math.max(1, nn[0]), score[1] / Math.max(1, nn[1])] };
}
