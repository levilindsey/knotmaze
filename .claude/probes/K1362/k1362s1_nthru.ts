// K1362 s1: corner counts per scene (all, through-pass K1049 corners, the rest), against form B's live corners.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s1_nthru.ts [scene,...]
import { buildModel } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { gfTablesOf } from "./k1362s1_census";

const ALL = "muse_hash,g41_def_tw42,g41_ring_tw64,user_tw42.lightpaper,def,fat,g41_def_tw64,g41_user_tw42,muse_default_tw,ring,g41_ring_tw42,g41_user_tw64";
for (const nm of (process.argv[2] ?? ALL).split(",")) {
  const m = buildModel(nm); const T = gfTablesOf(m);
  let nT = 0; for (let k = 0; k < T.nK; k++) if (T.kThru[k]) nT++;
  const fb = (m as never as { fb?: { corners?: { ok?: boolean; r?: number }[] } }).fb;
  const live = fb?.corners ? fb.corners.filter((c) => c && c.r !== undefined && c.r > 0).length : -1;
  console.log(`${nm.padEnd(24)} mine ${T.nK} (thru ${nT}, other ${T.nK - nT}) | form B live ${live}`);
}
