// K1314 s11: at world points, each listed chain's nearest centreline point (s, distance, side by cross product).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s11_dist.ts <scene> <chains: 23,43> <x,y> [<x,y>...]
import { buildModel } from "./k1314_census";
const [nm, chs, ...ps] = process.argv.slice(2);
const m = buildModel(nm);
const ids = chs.split(",").map(Number);
for (const p of ps) {
  const [x, y] = p.split(",").map(Number);
  const out: string[] = [];
  for (const id of ids) {
    const ch = m.scene.chains.find((c) => c.id === id)!; const P = ch.pts; const n = P.length / 2;
    let best = Infinity; let bs = 0; let bside = 0; let cum = 0;
    for (let i = 0; i + 1 < n; i++) {
      const ax = P[2 * i]; const ay = P[2 * i + 1]; const ex = P[2 * i + 2] - ax; const ey = P[2 * i + 3] - ay; const l2 = ex * ex + ey * ey; const l = Math.sqrt(l2);
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2)) : 0;
      const dx = x - ax - t * ex; const dy = y - ay - t * ey; const d = Math.sqrt(dx * dx + dy * dy);
      if (d < best) { best = d; bs = cum + t * l; bside = Math.sign(ex * (y - ay) - ey * (x - ax)); }
      cum += l;
    }
    out.push(`c${id}: s ${bs.toFixed(3)} d ${best.toFixed(3)} side ${bside}`);
  }
  console.log(`(${x},${y}) ${out.join(" | ")}`);
}
const h = m.scene.look.halfWidth; console.log("h", h, "junctions near:", m.scene.junctions.filter((j) => Math.hypot(j.c[0] - +ps[0].split(",")[0], j.c[1] - +ps[0].split(",")[1]) < 1.5).map((j) => `${j.id} (${j.c.map((v) => v.toFixed(3)).join(",")}) arms ${j.arms.map((a) => `c${a.chain}@${a.s.toFixed(2)}${a.dir > 0 ? "+" : "-"}${a.kind[0]}`).join(" ")}`).join(" ; "));
