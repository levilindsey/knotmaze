// K1407 23A crops: per spot, three single panels (gf mirror, form B reference, rp=outline) at 4x.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407_crops.ts <outDir> <scene:x:y,...>
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { buildModel, refEval, rasterOutline, type Model } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { writePng } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_crops.ts";
import { runAt, runColour, type RGB } from "../../../src/render/outline/paint.ts";
import { rasterGf } from "../K1362/k1362s1_census.ts";

const OUT = process.argv[2];
const spots = process.argv[3].split(",");
mkdirSync(OUT, { recursive: true });
const P = 480, WH = process.env.K1407_WH ? +process.env.K1407_WH : 2.5;
const col: RGB = [0, 0, 0];
const models = new Map<string, Model>();
const modelOf = (nm: string): Model => { let m = models.get(nm); if (!m) { m = buildModel(nm); models.set(nm, m); } return m; };

for (const sp of spots) {
  const [nm, xs, ys] = sp.split(":");
  const X = +xs, Y = +ys;
  const m = modelOf(nm);
  const h = m.scene.look.halfWidth;
  const S = WH * h, ppu = P / S;
  const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
  const panels: Record<string, Uint8Array> = { gf: new Uint8Array(P * P * 3).fill(255), fb: new Uint8Array(P * P * 3).fill(255), ol: new Uint8Array(P * P * 3).fill(255) };
  const put = (img: Uint8Array, c: number, r: number, rgb: number[]): void => { const o = 3 * (r * P + c); img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; };
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const ev = refEval(m, (c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu);
    let f = [1, 1, 1];
    if (ev.top >= 0 && ev.chain >= 0) { const k = runAt(m.sp, ev.chain, ev.s); if (k >= 0) { runColour(m.sp.runs[k], ev.s, col); f = [col[0], col[1], col[2]]; } }
    const a = Math.min(1, Math.max(0, ev.ink));
    put(panels.fb, c, r, f.map((v) => Math.round(255 * v * (1 - a))));
  }
  for (const [key, R] of [["gf", rasterGf(m, c0, r0, P, P, ppu)], ["ol", rasterOutline(m, c0, r0, P, P, ppu)]] as const) {
    for (let i = 0; i < P * P; i++) {
      const c = i % P, r = (i - c) / P, a = Math.min(1, Math.max(0, R.ink[i]));
      const f = R.own[i] > 0 && R.rgb[3 * i] >= 0 ? [R.rgb[3 * i], R.rgb[3 * i + 1], R.rgb[3 * i + 2]] : [1, 1, 1];
      put(panels[key], c, r, f.map((v) => Math.round(255 * v * (1 - a))));
    }
  }
  const rr = 0.6 * h * ppu, cx = X * ppu - c0, cy = Y * ppu - r0;
  for (const img of Object.values(panels)) for (let t = 0; t < 720; t++) {
    const c = Math.round(cx + rr * Math.cos((t * Math.PI) / 360)), r = Math.round(cy + rr * Math.sin((t * Math.PI) / 360));
    if (c >= 0 && c < P && r >= 0 && r < P) put(img, c, r, [230, 0, 0]);
  }
  const base = `${nm}_${X.toFixed(2)}_${Y.toFixed(2)}`;
  for (const [k, img] of Object.entries(panels)) { writePng(join(OUT, `${base}_${k}.png`), img, P, P); writeFileSync(join(OUT, `${base}_${k}.bin`), img); }
  console.log(base);
}
