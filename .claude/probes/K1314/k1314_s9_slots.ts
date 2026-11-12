import { buildModel } from "./k1314_census";
import * as F from "../../../src/render/outline/fill_tri";
const m = buildModel("g41_user_tw64");
const y = +(process.argv[2] ?? 7.56);
for (let x = 5.10; x <= 5.32; x += 0.01) {
  const win = { tri: new Int32Array(1).fill(-1), bary: new Float32Array(3) };
  const ppu = 1000; const own = F.rasterFill(m.fs, m.fr, x, y, 1, 1, ppu, win);
  const t = win.tri[0]; if (t < 0 || own[0] === 0) { console.log(`${x.toFixed(2)} -`); continue; }
  const r4 = new Int32Array(8); const w4 = new Float64Array(8); const s4 = new Float64Array(8);
  F.vertexPaint(m.fs, m.fr, m.runs, [m.fs.idx[t], m.fs.idx[t + 1], m.fs.idx[t + 2]], [win.bary[0], win.bary[1], win.bary[2]], r4, w4, s4);
  const pr = F.rasterPaint(m.fs, m.fr, m.runs, m.sp, x, y, 1, 1, ppu);
  const sl = Array.from({ length: 8 }, (_, k) => (w4[k] > 1e-6 ? `r${r4[k]}:${w4[k].toFixed(2)}@${s4[k].toFixed(2)}` : "")).filter(Boolean).join(" ");
  console.log(`${x.toFixed(2)} item ${m.vItem[m.fs.idx[t]]} rgb ${[0, 1, 2].map((k) => Math.round(255 * pr.rgb[k])).join(",")} ${sl}`);
}
