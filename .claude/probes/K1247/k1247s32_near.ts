import { OutlineModel } from "./src/render/outline/outline_model";
import { frame, alignJunctionArms } from "./src/render/outline/outline";
import type { DiagramStructure } from "./src/render/outline/outline";
import { loadDrag } from "./.claude/probes/K1247/k1247s32_lib";
const [x, y] = process.argv[3].split(",").map(Number); const fr = process.argv[4].split(",").map(Number); const R = +(process.argv[5] ?? "0.06");
const { cap, raw } = loadDrag(process.argv[2], 10);
const st = (new OutlineModel(cap[0]) as unknown as { st: DiagramStructure }).st;
for (const f of fr) {
  const t = frame(st, alignJunctionArms(st, raw[f]));
  const ks = Object.keys(t.pieces[0]).join(",");
  console.log(`f${f}: pieces ${t.pieces.length} keys ${ks}`);
  t.pieces.forEach((p, i) => {
    let d = Infinity; for (let k = 0; k < p.pts.length; k += 2) d = Math.min(d, Math.hypot(p.pts[k] - x, p.pts[k + 1] - y));
    if (d < R) { const o = p as unknown as Record<string, unknown>; console.log(`  #${i} ch ${p.chain} side ${p.side} n ${p.pts.length / 2} d ${d.toFixed(3)} ${["kind", "z", "role", "from", "to", "corner"].filter((k) => k in o).map((k) => `${k}=${JSON.stringify(o[k])}`).join(" ")} first (${p.pts[0].toFixed(3)},${p.pts[1].toFixed(3)}) last (${p.pts[p.pts.length - 2].toFixed(3)},${p.pts[p.pts.length - 1].toFixed(3)})`); }
  });
}
