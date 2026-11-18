// K1451 s4: the windows of the src tables (or, with GF_NOCLIP=1, of a probe rule) for the 12 scenes, as JSON.
//   node scripts/run_node.mjs .claude/probes/K1451/k1451_s4_wdump.ts <out.json> [rule]
import { writeFileSync } from "node:fs";
import { buildModel } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { buildTables } from "../../../src/render/gpu_field/tables.ts";
import { rule, type Rule } from "./k1451_s4_rules.ts";
const [out, r] = process.argv.slice(2);
const all = ["muse_hash", "g41_def_tw42", "g41_ring_tw64", "user_tw42.lightpaper", "def", "fat", "g41_def_tw64", "g41_user_tw42", "muse_default_tw", "ring", "g41_ring_tw42", "g41_user_tw64"];
const o: Record<string, { wL: number[]; wR: number[]; z: number[] }> = {};
for (const nm of all) { const sc = buildModel(nm).scene as any; const aa = 0.5 / (sc.camera.pxPerUnit * 2); const T: any = buildTables(sc, { aa, home: true });
  const [a, b] = r ? rule(T, r as Rule) : [T.pinWL, T.pinWR]; o[nm] = { wL: [...a], wR: [...b], z: [...T.pinZ] }; }
writeFileSync(out, JSON.stringify(o));
