// K1324 s3: the app's band (band_gpu's quads, the tie per PIXEL: attr.w * draw.tieAlpha(chain, x, y, s, dC) with
// s and dC interpolated, as BAND_FS evaluates it, burial included) against the census's band (draw.ts bandData,
// the tie per VERTEX, interpolated), around a spot. Prints the ink deficit maps side by side (as k1324_s3_ink
// --fine: '#' ink >= .999, digit = deficit in percent, '.' < .5) and the max |app - census| ink.
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s3_app.ts <scene> <x> <y> [--r=0.25] [--ppu=960] [--cell=10]
import * as D from "../../../src/render/outline/draw";
import { bandGpu } from "../../../src/render/outline/band_gpu";
import { buildModel, rasterOutline } from "../K1314/k1314_census";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys] = args.filter((a) => !a.startsWith("--"));
const ppu = Number(opt("ppu") ?? 960); const cell = Number(opt("cell") ?? 10); const R = Number(opt("r") ?? 0.25);
const m = buildModel(nm); const x0 = Number(xs); const y0 = Number(ys);
const c0 = Math.floor((x0 - R) * ppu); const r0 = Math.floor((y0 - R) * ppu); const W = Math.ceil(2 * R * ppu); const H = W;
const O = rasterOutline(m, c0, r0, W, H, ppu);
const b = bandGpu(m.table, m.scene, m.zz);
const h = b.h; const zt = b.zt;
const tie = D.tieAlpha(m.zz, h, b.W, zt);
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
  for (let r = ra; r <= rb; r++) for (let c = ca; c <= cb; c++) {
    const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu;
    const l1 = ((Y[1] - Y[2]) * (x - X[2]) + (X[2] - X[1]) * (y - Y[2])) / den; const l2 = ((Y[2] - Y[0]) * (x - X[2]) + (X[0] - X[2]) * (y - Y[2])) / den; const l3 = 1 - l1 - l2;
    if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
    const L = [l1, l2, l3]; const at = (k: number): number => L[0] * b.attr[4 * v[0] + k] + L[1] * b.attr[4 * v[1] + k] + L[2] * b.attr[4 * v[2] + k];
    const s = at(0); const dC = at(1); const base = at(3);
    // A slot-less quad (untied piece) draws its own alpha; a tied one the tie (draw.tieAlpha reads every pass of
    // the chain, a superset of the quad's slots: equal wherever the slots hold them all).
    const sl = b.slots.subarray(4 * v[0], 4 * v[0] + 4); const tied = ch >= 0 && Array.from(sl).some((q) => q >= 0);
    const a = Math.min(1, Math.max(0, tied ? base * tie(ch, x, y, s, dC) : base));
    const i = r * W + c; ink[i] = 1 - (1 - ink[i]) * (1 - a);
  }
}
const dig = (v: number): string => (v >= 0.999 ? "#" : v < 0.5 ? "." : String(Math.min(9, Math.floor((1 - v) * 100))));
const nc = Math.floor(W / cell); const nr = Math.floor(H / cell);
console.log(`origin (${wx0.toFixed(3)}, ${wy0.toFixed(3)}) step ${(cell / ppu).toFixed(4)}; app (per pixel) | census (bandData)`);
for (let r = 0; r < nr; r++) {
  let a = ""; let bb = "";
  for (let c = 0; c < nc; c++) { const i = (r * cell + (cell >> 1)) * W + c * cell + (cell >> 1); a += dig(ink[i]); bb += dig(O.ink[i]); }
  console.log(`${String(r).padStart(3)} ${a} | ${bb}`);
}
let mx = 0; let n = 0; for (let i = 0; i < W * H; i++) { const d = Math.abs(ink[i] - O.ink[i]); if (d > 0.01) n++; mx = Math.max(mx, d); }
console.log(`max |app - census| ink ${mx.toFixed(3)}, ${n} px > .01`);
