// K1324 s2: what draws near a spot. Every piece of the scene's outline table with a point within r of (x, y):
// its index, kind, chain, the points in range and, for runs and ghosts, the tie alpha there (burial on).
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s2_spot.ts <scene> <x> <y> [r] [all]
// <scene> is a name under .claude/probes/K868/scenes/ (no .json). With `all`, every point in range is printed.
import { readFileSync } from "node:fs";
import { frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import * as D from "../../../src/render/outline/draw";

const [nm, xs, ys, rs, allArg] = process.argv.slice(2);
const sc = JSON.parse(readFileSync(`.claude/probes/K868/scenes/${nm}.json`, "utf8")) as SceneIn;
(sc.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const table = frame(structure(sc), sc); const zz = D.zChains(sc);
const h = table.h; const W = table.W; const zt = 0.1 * sc.look.depthAmp;
const x0 = Number(xs); const y0 = Number(ys); const r = Number(rs ?? 0.4);
const tie = D.tieAlpha(zz, h, W, zt);
table.pieces.forEach((p, pi) => {
  const np = p.pts.length / 2; const hit: number[] = [];
  for (let i = 0; i < np; i++) if (Math.hypot(p.pts[2 * i] - x0, p.pts[2 * i + 1] - y0) <= r) hit.push(i);
  if (!hit.length) return;
  let line = `p${pi} ${p.kind} ch ${p.chain} n ${np} in ${hit[0]}..${hit[hit.length - 1]} (${hit.length})`;
  if ((p.kind === "run" || p.kind === "ghost") && p.chain >= 0) {
    const C = zz.zc[p.chain];
    const cum = [0]; for (let i = 1; i < np; i++) cum.push(cum[i - 1] + Math.hypot(p.pts[2 * i] - p.pts[2 * i - 2], p.pts[2 * i + 1] - p.pts[2 * i - 1]));
    const L = cum[np - 1] || 1; let mn = 1;
    for (const i of hit) {
      const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
      const s = D.footNear(C, p.cpts[2 * i], p.cpts[2 * i + 1], p.s0 + ((p.s1 - p.s0) * cum[i]) / L, 2 * h, 0, 0).s;
      const a = tie(p.chain, x, y, s, h); mn = Math.min(mn, a);
      if (allArg === "all" || a < 0.999) console.log(`   i${i} (${x.toFixed(3)},${y.toFixed(3)}) s ${s.toFixed(3)} a ${a.toFixed(3)}`);
    }
    line += ` s ${p.s0.toFixed(2)}-${p.s1.toFixed(2)} min a ${mn.toFixed(3)}`;
  } else {
    const i = hit[0]; line += ` first (${p.pts[2 * i].toFixed(3)},${p.pts[2 * i + 1].toFixed(3)})`;
    const pa = p.alpha && p.alpha.length === 2 * np ? p.alpha : null;
    if (pa) for (const k of hit) if (allArg === "all" || pa[2 * k] < 0.999 || pa[2 * k + 1] < 0.999)
      console.log(`   i${k} (${p.pts[2 * k].toFixed(3)},${p.pts[2 * k + 1].toFixed(3)}) c (${p.cpts[2 * k].toFixed(3)},${p.cpts[2 * k + 1].toFixed(3)}) a ${pa[2 * k].toFixed(3)}/${pa[2 * k + 1].toFixed(3)}`);
  }
  console.log(line);
});
console.log(`h ${h} W ${W} zt ${zt}`);
