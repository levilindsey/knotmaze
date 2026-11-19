import { readFileSync } from "node:fs";
const raw = JSON.parse(readFileSync(process.argv[2], "utf8")); const g = (k: string) => raw[k].v ?? raw[k];
const c = +process.argv[3], s0 = +process.argv[4], s1 = +process.argv[5];
const cV0 = g("cV0"), cNV = g("cNV"), vx = g("vx"), vy = g("vy"), vs = g("vs");
console.log("chain", c, "nv", cNV[c], "closed", g("cClosed")[c], "len", g("cLen")[c]);
let prev: number[] | null = null;
for (let i = cV0[c]; i < cV0[c] + cNV[c]; i++) {
  if (vs[i] < s0 || vs[i] > s1) continue;
  let ang = "";
  if (i + 1 < cV0[c] + cNV[c] && i > cV0[c]) { const ax = vx[i] - vx[i - 1], ay = vy[i] - vy[i - 1], bx = vx[i + 1] - vx[i], by = vy[i + 1] - vy[i]; ang = (Math.atan2(ax * by - ay * bx, ax * bx + ay * by) * 180 / Math.PI).toFixed(1); }
  console.log(i - cV0[c], vs[i].toFixed(3), vx[i].toFixed(3), vy[i].toFixed(3), "turn", ang);
}
