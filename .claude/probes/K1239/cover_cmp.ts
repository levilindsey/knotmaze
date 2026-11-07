// K1239: FormB ink vs GPU cover (cover_def_zoom.png) over a world rect at the zoomed view.
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { FormB } from "../../../src/render/field/form_b";
import type { FieldScene } from "../../../src/render/field/scene";

function decode(file: string) {
  const buf = readFileSync(file);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), ct = buf[25];
  const bpp = ct === 6 ? 4 : 3;
  const idat: Buffer[] = [];
  for (let o = 8; o < buf.length;) { const len = buf.readUInt32BE(o), t = buf.toString("ascii", o + 4, o + 8); if (t === "IDAT") idat.push(buf.subarray(o + 8, o + 8 + len)); o += 12 + len; }
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i], a = i >= bpp ? px[dst + i - bpp] : 0, b = y > 0 ? px[dst - stride + i] : 0, c = i >= bpp && y > 0 ? px[dst - stride + i - bpp] : 0;
      let v: number;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      px[dst + i] = v & 255;
    }
  }
  return { w, h, bpp, px };
}
const cov = decode(".claude/probes/K1239/out/cover_def_zoom.png");
const d = JSON.parse(readFileSync(".claude/probes/K1239/out/diag_def.json", "utf8"));
const scene: FieldScene = d.scene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 1.5 });
const V = { x: -2417.3734321596594, y: -2768.7060193280076, s: 178.742962830417 };
const toDev = (wx: number, wy: number): [number, number] => [(V.s * wx + V.x) * 1.5, (V.s * wy + V.y) * 1.5];
const [x0, x1, y0, y1, step] = process.argv.slice(2).map(Number);
let both = 0, fOnly = 0, gOnly = 0, neither = 0;
const gPts: string[] = [], fPts: string[] = [];
for (let wy = y0; wy <= y1; wy += step) for (let wx = x0; wx <= x1; wx += step) {
  const ink = fb.evalPoint(wx, wy).ink > 0.5;
  const [dx, dy] = toDev(wx, wy);
  const ci = (Math.round(dy) * cov.w + Math.round(dx)) * cov.bpp;
  const g = cov.px[ci] > 127;
  if (ink && g) both++;
  else if (ink) { fOnly++; if (fPts.length < 15) fPts.push(`(${wx.toFixed(2)},${wy.toFixed(2)})`); }
  else if (g) { gOnly++; if (gPts.length < 15) gPts.push(`(${wx.toFixed(2)},${wy.toFixed(2)})`); }
  else neither++;
}
console.log(`both=${both} formB-only=${fOnly} gpu-only=${gOnly} neither=${neither}`);
console.log("formB-only at:", fPts.join(" "));
console.log("gpu-only at:", gPts.join(" "));
