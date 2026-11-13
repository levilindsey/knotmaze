// K1314 s14: k1314s13_crops.ts; master = K1314S13 and K1314S14 all off (master's look), after = both as set (k1314s14_set.ts).
// K1344 s1: crops form B | master | after at spots, from the census's evaluators (refEval; rasterOutline's fill
// and band), with the band's ink optionally from the app's own band (--app: band_gpu's quads, the tie per pixel,
// as BAND_FS; k1324_s3_app's raster). master = src's outline; after = outline_proto.ts with K1344.fix on
// (--after=src: src's outline too, once the fix is in place; --master=proto-off: the proto with the fix off).
//   node scripts/run_node.mjs .claude/probes/K1344/k1344_crops.ts --spots=scene:x:y:label,... [--px=480] [--w=2.5]
//        [--out=.claude/probes/K1344/out/s1/x4] [--app] [--after=src|proto] [--master=src|proto-off] [--sheet=<name>]
// 4x = --px=480 --w=2.5 (192 px per h), 8x = --px=480 --w=1.25. A red ring marks the spot (r = 0.6 h).
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import * as D from "../../../src/render/outline/draw";
import { bandGpu } from "../../../src/render/outline/band_gpu";
import { buildModel, refEval, rasterOutline, type Model } from "../K1314/k1314_census";
import { runAt, runColour, type RGB } from "../../../src/render/outline/paint";
import { writePng } from "../K1314/k1314_crops";
import * as O from "../../../src/render/outline/outline";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const OUT = opt("out") ?? ".claude/probes/K1344/out/s1/x4"; const P = Number(opt("px") ?? 480); const WH = Number(opt("w") ?? 2.5);
const APP = args.includes("--app"); const AFTER = opt("after") ?? "proto"; const MASTER = opt("master") ?? "src";
mkdirSync(OUT, { recursive: true });
const col: RGB = [0, 0, 0];
// --sheet=<name>: also stack every crop of this run, top to bottom, into <out>/<name> (a 6 px grey rule between).
const SHEET: Uint8Array[] = []; const SHEET_NAME = opt("sheet");

/** The app's band ink over a window (band_gpu, tie per pixel). */
export function appInk(m: Model, c0: number, r0: number, W: number, H: number, ppu: number): Float32Array {
  const b = bandGpu(m.table, m.scene, m.zz); const tie = D.tieAlpha(m.zz, b.h, b.W, b.zt);
  const ink = new Float32Array(W * H);
  const wx0 = c0 / ppu; const wy0 = r0 / ppu; const wx1 = (c0 + W) / ppu; const wy1 = (r0 + H) / ppu;
  for (let t = 0; 3 * t + 2 < b.count; t++) {
    const v = [3 * t, 3 * t + 1, 3 * t + 2];
    const X = v.map((k) => b.pos[2 * k]); const Y = v.map((k) => b.pos[2 * k + 1]);
    if (Math.max(...X) < wx0 || Math.min(...X) > wx1 || Math.max(...Y) < wy0 || Math.min(...Y) > wy1) continue;
    const ch = b.chain[v[0]];
    const den = (Y[1] - Y[2]) * (X[0] - X[2]) + (X[2] - X[1]) * (Y[0] - Y[2]); if (!(Math.abs(den) > 1e-18)) continue;
    const ca = Math.max(0, Math.floor(Math.min(...X) * ppu - c0 - 0.5)); const cb = Math.min(W - 1, Math.ceil(Math.max(...X) * ppu - c0 - 0.5));
    const ra = Math.max(0, Math.floor(Math.min(...Y) * ppu - r0 - 0.5)); const rb = Math.min(H - 1, Math.ceil(Math.max(...Y) * ppu - r0 - 0.5));
    const sl = b.slots.subarray(4 * v[0], 4 * v[0] + 4); const tied = ch >= 0 && Array.from(sl).some((q) => q >= 0);
    for (let r = ra; r <= rb; r++) for (let c = ca; c <= cb; c++) {
      const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu;
      const l1 = ((Y[1] - Y[2]) * (x - X[2]) + (X[2] - X[1]) * (y - Y[2])) / den; const l2 = ((Y[2] - Y[0]) * (x - X[2]) + (X[0] - X[2]) * (y - Y[2])) / den; const l3 = 1 - l1 - l2;
      if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
      const L = [l1, l2, l3]; const at = (k: number): number => L[0] * b.attr[4 * v[0] + k] + L[1] * b.attr[4 * v[1] + k] + L[2] * b.attr[4 * v[2] + k];
      const a = Math.min(1, Math.max(0, tied ? at(3) * tie(ch, x, y, at(0), at(1)) : at(3)));
      const i = r * W + c; ink[i] = 1 - (1 - ink[i]) * (1 - a);
    }
  }
  return ink;
}

function crop(file: string, mM: Model, mA: Model, X: number, Y: number): void {
  const h = mM.scene.look.halfWidth; const S = WH * h; const ppu = P / S;
  const c0 = Math.round(X * ppu - P / 2); const r0 = Math.round(Y * ppu - P / 2);
  const Wt = 3 * P + 8; const img = new Uint8Array(Wt * P * 3).fill(255);
  const put = (k: number, c: number, r: number, rgb: number[]): void => { const o = 3 * (r * Wt + k * (P + 4) + c); img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; };
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const ev = refEval(mM, (c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu);
    let f = [1, 1, 1];
    if (ev.top >= 0 && ev.chain >= 0) { const k = runAt(mM.sp, ev.chain, ev.s); if (k >= 0) { runColour(mM.sp.runs[k], ev.s, col); f = [col[0], col[1], col[2]]; } }
    const a = Math.min(1, Math.max(0, ev.ink)); put(0, c, r, f.map((v) => Math.round(255 * v * (1 - a))));
  }
  let dmax = 0; let nd = 0; let inkM: Float32Array | null = null;
  for (const [k, m] of [[1, mM], [2, mA]] as const) {
    const R = rasterOutline(m, c0, r0, P, P, ppu);
    const ink = APP ? appInk(m, c0, r0, P, P, ppu) : R.ink;
    if (k === 1) inkM = ink; else if (inkM) for (let i = 0; i < P * P; i++) { const d = Math.abs(ink[i] - inkM[i]); if (d > 0.02) nd++; dmax = Math.max(dmax, d); }
    for (let i = 0; i < P * P; i++) {
      const c = i % P; const r = (i - c) / P; const a = Math.min(1, Math.max(0, ink[i]));
      const f = R.own[i] > 0 && R.rgb[3 * i] >= 0 ? [R.rgb[3 * i], R.rgb[3 * i + 1], R.rgb[3 * i + 2]] : [1, 1, 1];
      put(k, c, r, f.map((v) => Math.round(255 * v * (1 - a))));
    }
  }
  const rr = 0.6 * h * ppu; const cx = X * ppu - c0; const cy = Y * ppu - r0;
  for (let k = 0; k < 3; k++) for (let t = 0; t < 720; t++) {
    const c = Math.round(cx + rr * Math.cos(t * Math.PI / 360)); const r = Math.round(cy + rr * Math.sin(t * Math.PI / 360));
    if (c >= 0 && c < P && r >= 0 && r < P) put(k, c, r, [230, 0, 0]);
  }
  writePng(join(OUT, file), img, Wt, P); SHEET.push(img);
  console.log(`${file}: ${S.toFixed(3)} world wide, ${APP ? "app" : "census"} band; master vs after: max |d ink| ${dmax.toFixed(3)}, ${nd} px > .02`);
}

const models = new Map<string, [Model, Model]>();
for (const s of (opt("spots") ?? "").split(",").filter(Boolean)) {
  const [nm, x, y, label] = s.split(":"); let mm = models.get(nm);
  if (!mm) {
    O.K1346.fill = O.K1346.chevron = O.K1346.fan = O.K1346.loops = O.K1346.fanDrop = true; const objs = [O.K1314S13, O.K1314S14] as unknown as Record<string, boolean>[]; const on0 = objs.map((o) => ({ ...o })); objs.forEach((o) => Object.keys(o).forEach((k) => (o[k] = false))); const mM = buildModel(nm);
    objs.forEach((o, i) => Object.assign(o, on0[i])); const mA = buildModel(nm);
    mm = [mM, mA]; models.set(nm, mm);
  }
  crop(`${label}.png`, mm[0], mm[1], +x, +y);
}
if (SHEET_NAME && SHEET.length) {
  const Wt = 3 * P + 8; const H = SHEET.length * (P + 6) - 6; const all = new Uint8Array(Wt * H * 3).fill(128);
  SHEET.forEach((im, k) => all.set(im, k * (P + 6) * Wt * 3));
  writePng(join(OUT, SHEET_NAME), all, Wt, H); console.log(`${SHEET_NAME}: ${SHEET.length} crops`);
}
