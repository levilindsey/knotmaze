// K1040 S1b: a crop around a site, three panels side by side: form B's ink
// (paper enclosed by the top group tinted red where q5holes would see it is
// not computed here; paper inside a group's outline shows as white), the
// oracle's ink (FieldModel, K883's mapping at cr 3, as scenes.ts), and form B's
// top surface (a colour per surface, paper white, fade bits darkened).
// Run: npx vite-node .claude/probes/K1040/s1/b_crop.ts <scene> <x> <y> [dpr=2] [halfWorld=0.8] [zoom=4] [tag]
// Writes out/s1b/crops/<scene>_<x>_<y>[_tag].png (OUT overrides the folder;
// SUB samples each device px SUB x SUB times, the field kept at dpr).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FieldModel, cornerRadius, type OracleParams } from "../../../../src/render/field/oracle";
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";
import { encodePng } from "../../../../test/render/field/png";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.OUT ?? join(here, "out", "s1b", "crops");
mkdirSync(outDir, { recursive: true });
const [name = "muse_hash", xs = "26.675", ys = "1.096", ds = "2", hw = "0.8", zs = "4", tag = ""] = process.argv.slice(2);
const s = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
s.look.ctrlArc ??= 0.47;
const h0 = s.look.halfWidth;
const mapping: OracleParams = { rRound: 0, rOf: (_j, _i, th, st) => (st === "round" ? cornerRadius(3, h0, th) : 0), spans: "k883", crMax: 3 };
const fb = new FormB(s, { dpr: Number(ds) });
const m = new FieldModel(s, mapping);
const X = Number(xs);
const Y = Number(ys);
const half = Number(hw);
const zoom = Math.max(1, Math.round(Number(zs)));
const SUB = Number(process.env.SUB ?? 1); // samples per device px (the field stays at dpr)
const n = Math.max(8, Math.round(2 * half * fb.ppuDev * SUB));
const px = (2 * half) / n;
const W3 = 3 * n * zoom + 2 * zoom;
const H = n * zoom;
const rgba = new Uint8Array(W3 * H * 4).fill(255);
const hue = (k: number): [number, number, number] => {
  const a = (k * 2654435761) >>> 0;
  return [80 + (a & 127), 80 + ((a >>> 8) & 127), 80 + ((a >>> 16) & 127)];
};
const put = (i: number, j: number, c: [number, number, number]) => {
  for (let v = 0; v < zoom; v++)
    for (let u = 0; u < zoom; u++) {
      const o = ((j * zoom + v) * W3 + i + u) * 4;
      rgba[o] = c[0];
      rgba[o + 1] = c[1];
      rgba[o + 2] = c[2];
    }
};
let inkB = 0;
let inkO = 0;
for (let j = 0; j < n; j++)
  for (let i = 0; i < n; i++) {
    const x = X - half + (i + 0.5) * px;
    const y = Y - half + (j + 0.5) * px;
    const r = fb.evalPoint(x, y);
    const g = Math.round(255 * (1 - r.ink));
    inkB += r.ink;
    put(i * zoom, j, r.top < 0 ? [255, 255, 255] : [g, g, g]);
    const o = m.evalPoint(x, y, false);
    inkO += o.ink ? 1 : 0;
    put((n + 1) * zoom + i * zoom, j, o.ink ? [0, 0, 0] : o.inside ? [215, 215, 215] : [255, 255, 255]);
    let c: [number, number, number] = r.top < 0 ? [255, 255, 255] : hue(r.top + 1);
    if (r.fade) c = [c[0] >> 1, c[1] >> 1, c[2] >> 1];
    if (r.ink > 0.5) c = [20, 20, 20];
    put(2 * (n + 1) * zoom + i * zoom, j, c);
  }
// The site: a red cross in every panel.
const ci = Math.floor(n / 2);
for (let p = 0; p < 3; p++)
  for (let k = -3; k <= 3; k++) {
    put(p * (n + 1) * zoom + (ci + k) * zoom, ci, [230, 0, 0]);
    put(p * (n + 1) * zoom + ci * zoom, ci + k, [230, 0, 0]);
  }
const file = join(outDir, `${name}_${X}_${Y}${tag ? "_" + tag : ""}.png`);
writeFileSync(file, encodePng(W3, H, rgba));
console.log(`${file}: ${n}x${n} device px at dpr ${ds} (px ${px.toFixed(4)} world), form B ink ${inkB.toFixed(0)} px, oracle ink ${inkO} px`);
