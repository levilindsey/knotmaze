// K1324 s2: draw.tieAlpha at a spot's band points with the burial rule off and on (outer row, dC = h).
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s2_tie.ts <scene> <x> <y> [--r=0.5] [--every=3]
import * as D from "../../../src/render/outline/draw";
import { buildModel } from "../K1314/k1314_census";
const [nm, xs, ys] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string, d: number): number => Number(process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const x0 = Number(xs); const y0 = Number(ys); const r = opt("r", 0.5); const every = opt("every", 3);
const m = buildModel(nm); const h = m.table.h; const W = m.table.W; const zt = 0.1 * m.scene.look.depthAmp;
D.buryOpts.on = false; const off = D.tieAlpha(m.zz, h, W, zt);
D.buryOpts.on = true; const on = D.tieAlpha(m.zz, h, W, zt);
let moved = 0;
m.table.pieces.forEach((p, pi) => {
  if (!(p.kind === "run" || p.kind === "ghost") || p.chain < 0) return;
  const C = m.zz.zc[p.chain]; const np = p.pts.length / 2;
  const cum = [0]; for (let i = 1; i < np; i++) cum.push(cum[i - 1] + Math.hypot(p.pts[2 * i] - p.pts[2 * i - 2], p.pts[2 * i + 1] - p.pts[2 * i - 1]));
  const L = cum[np - 1] || 1;
  for (let i = 0; i < np; i += every) {
    const x = p.pts[2 * i]; const y = p.pts[2 * i + 1]; if (Math.hypot(x - x0, y - y0) > r) continue;
    const s = D.footNear(C, p.cpts[2 * i], p.cpts[2 * i + 1], p.s0 + ((p.s1 - p.s0) * cum[i]) / L, 2 * h, 0, 0).s;
    D.buryOpts.on = false; const a0 = off(p.chain, x, y, s, h); D.buryOpts.on = true; const a1 = on(p.chain, x, y, s, h);
    if (Math.abs(a1 - a0) > 1e-6) moved++;
    if (a0 < 0.999 || a1 < 0.999) console.log(`p${pi} ${p.kind} side ${p.side} i${i} (${x.toFixed(2)},${y.toFixed(2)}) s ${s.toFixed(2)}: off ${a0.toFixed(3)} on ${a1.toFixed(3)}`);
  }
});
console.log(`moved ${moved}`);
