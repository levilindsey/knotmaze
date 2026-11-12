// K1314 s2: does runEndFade's alpha (a run's p.alpha) match form B where nothing else inks?
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s2_fades.ts <scene> [<scene> ...]
// For each run piece with p.alpha, at each point whose alpha is below 1, samples the band's middle
// (W/2 in from the border toward the foot), drops samples another piece's band covers (alpha sum > 1.5),
// and compares the run's alpha there with form B's ink: "wrong" = alpha < 0.5 where form B inks,
// "weak" = alpha > 0.5 where form B does not. One line per run with any, then totals per scene, with how many
// samples alpha 1 (a tied run before K1314 s2) gets wrong.
import { FormB } from "../../../src/render/field/form_b";
import { buildModel } from "./k1314_census";

const args = process.argv.slice(2);
for (const nm of args.filter((a) => !a.startsWith("--"))) {
  const m = buildModel(nm); const W = m.table.W;
  const fb = new FormB(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { ink: number } };
  const inTri = (t: number, x: number, y: number): boolean => {
    const T = m.tri; const ax = T[6 * t]; const ay = T[6 * t + 1]; const bx = T[6 * t + 2]; const by = T[6 * t + 3]; const cx = T[6 * t + 4]; const cy = T[6 * t + 5];
    const d1 = (x - bx) * (ay - by) - (ax - bx) * (y - by); const d2 = (x - cx) * (by - cy) - (bx - cx) * (y - cy); const d3 = (x - ax) * (cy - ay) - (cx - ax) * (y - ay);
    return !(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0)));
  };
  let tw = 0; let tk = 0; let tn = 0; let tb = 0;
  m.table.pieces.forEach((p, pi) => {
    if (p.kind !== "run" || !p.alpha) return;
    const tied = p.chain >= 0 && m.zz.passes[p.chain]?.length > 0;
    let n = 0; let wrong = 0; let weak = 0; let nb = 0; let wx = 0; let wy = 0;
    for (let i = 0; i < p.pts.length / 2; i++) {
      const a = 0.5 * (p.alpha[2 * i] + p.alpha[2 * i + 1]); if (a > 0.99) continue;
      const px = p.pts[2 * i]; const py = p.pts[2 * i + 1]; const dx = p.cpts[2 * i] - px; const dy = p.cpts[2 * i + 1] - py; const l = Math.hypot(dx, dy); if (!(l > 1e-12)) continue;
      const x = px + (dx / l) * W * 0.5; const y = py + (dy / l) * W * 0.5;
      let cov = false;
      for (let t = 0; t < m.nTri && !cov; t++) {
        if (m.triP[t] === pi || m.tb[4 * t] > x || m.tb[4 * t + 2] < x || m.tb[4 * t + 1] > y || m.tb[4 * t + 3] < y) continue;
        if (inTri(t, x, y) && m.triA[3 * t] + m.triA[3 * t + 1] + m.triA[3 * t + 2] > 1.5) cov = true;
      }
      if (cov) continue;
      n++; const e = fb.evalPoint(x, y).ink;
      if (e < 0.5) { tb++; nb++; }
      if (a < 0.5 && e > 0.5) { wrong++; wx = x; wy = y; } else if (a > 0.5 && e < 0.5) weak++;
    }
    tn += n; tw += wrong; tk += weak;
    if (wrong || weak) {
      let best = -1; let bd = Infinity; m.table.corners.forEach((c, ci) => { const d = Math.hypot(c.Vx - p.pts[0], c.Vy - p.pts[1]); const d2 = Math.hypot(c.Vx - p.pts[p.pts.length - 2], c.Vy - p.pts[p.pts.length - 1]); if (Math.min(d, d2) < bd) { bd = Math.min(d, d2); best = ci; } });
      const c = m.table.corners[best];
      console.log(`${nm} run ${pi} chain ${p.chain}${tied ? " TIED" : ""} faded ${n} wrong ${wrong} weak ${weak} (at 1: ${nb}) at (${wx.toFixed(3)},${wy.toFixed(3)}) corner ${c.junction} a${c.aChain} b${c.bChain} ${c.ok ? "ok" : "failed"} th ${c.theta.toFixed(2)} r ${c.r.toFixed(3)}`);
    }
  });
  console.log(`${nm}: faded samples ${tn}, wrong ${tw}, weak ${tk} (at alpha 1: wrong ${tb})`);
}
