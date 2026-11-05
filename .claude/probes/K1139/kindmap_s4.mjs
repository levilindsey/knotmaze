import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { coverage, img } from "./cover_lib.mjs";
import { encodePNG } from "./png.mjs";
const [DIR, JI, OUTP, ORS] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const rc = meta.recs.find((r) => r.ji === Number(JI));
const kinds = coverage(DIR, rc);
const or = Number(ORS ?? 1);
const { w: BW, h: BH } = rc.box;
const S = 2, W = BW * S * 2 + 4, H = BH * S;
const data = Buffer.alloc(W * H * 3, 40);
const gN = img(DIR, 0, "n");
const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
const COL = [[0, 0, 0], [60, 220, 60], [80, 120, 255], [255, 60, 60]];
for (let Y = 0; Y < BH; Y++) for (let X = 0; X < BW; X++) {
  const i = Y * BW + X;
  const c = [0, 0, 0];
  for (let s = 0; s < 4; s++) { const k = kinds[(i * 4 + s) * 2 + or]; for (let j = 0; j < 3; j++) c[j] += COL[k][j] / 4; }
  const g = [0, 1, 2].map((j) => gN.data[((Y + oy) * gN.W + X + ox) * 3 + j]);
  for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
    const p = ((Y * S + dy) * W + X * S + dx) * 3;
    for (let j = 0; j < 3; j++) data[p + j] = g[j];
    const p2 = ((Y * S + dy) * W + BW * S + 4 + X * S + dx) * 3;
    for (let j = 0; j < 3; j++) data[p2 + j] = Math.round(c[j]);
  }
}
writeFileSync(OUTP, encodePNG({ W, H, data }));
console.log("wrote", OUTP, W, H);
