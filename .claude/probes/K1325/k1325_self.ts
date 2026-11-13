// K1325 s1: which of the plateau-flagged crossings are self-crossings (one chain crossing itself).
//   node scripts/run_node.mjs .claude/probes/K1325/k1325_self.ts [scene,...]
import { buildModel, plateauOf } from "../K1314/k1314_census";
const ALL = "muse_hash,g41_def_tw42,g41_ring_tw64,user_tw42.lightpaper,def,fat,g41_def_tw64,g41_user_tw42,muse_default_tw,ring,g41_ring_tw42,g41_user_tw64";
for (const nm of (process.argv[2] ?? ALL).split(",")) {
  const m = buildModel(nm); const P = plateauOf(m);
  const xs = m.scene.crossings as { a: { chain: number; s: number }; b: { chain: number; s: number } }[];
  const self = xs.map((x, i) => [x, i] as const).filter(([x]) => x.a.chain === x.b.chain);
  const flagged = self.filter(([, i]) => P.xs.includes(i));
  console.log(`${nm}: crossings ${xs.length}, self ${self.length}, flagged ${P.xs.length}, flagged self ${flagged.length}: ${flagged.map(([x, i]) => `x${i} c${x.a.chain} (${m.xPts[i].x.toFixed(2)}, ${m.xPts[i].y.toFixed(2)})`).join("; ")}`);
}
