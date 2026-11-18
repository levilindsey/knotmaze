// K1451 s2: buildTables time per scene, master's tables.ts (a temporary copy at src/render/gpu_field/tables_k1451m.ts,
// `git show ae9362e3:src/render/gpu_field/tables.ts`) against this tree's, alternating, median of N runs each.
//   node scripts/run_node.mjs .claude/probes/K1451/k1451_buildtime.ts [N=7]
import { modelOf } from "../K1433/k1433_lib.ts";
import { buildTables } from "../../../src/render/gpu_field/tables.ts";
// @ts-ignore the temporary copy exists only while measuring
import { buildTables as buildM } from "../../../src/render/gpu_field/tables_k1451m.ts";
const N = +(process.argv[2] ?? 7);
const all = ["muse_hash", "g41_def_tw42", "g41_ring_tw64", "user_tw42.lightpaper", "def", "fat", "g41_def_tw64", "g41_user_tw42", "muse_default_tw", "ring", "g41_ring_tw42", "g41_user_tw64"];
const med = (a: number[]): number => { const s = [...a].sort((p, q) => p - q); return s[s.length >> 1]; };
let tm = 0, ts = 0;
for (const nm of all) {
  const sc = modelOf(nm).scene as any; const aa = 0.5 / (sc.camera.pxPerUnit * 2);
  for (let w = 0; w < 2; w++) { buildM(sc, { aa, home: true }); buildTables(sc, { aa, home: true }); }
  const am: number[] = [], as: number[] = [];
  for (let i = 0; i < N; i++) {
    let t = performance.now(); buildM(sc, { aa, home: true }); am.push(performance.now() - t);
    t = performance.now(); buildTables(sc, { aa, home: true }); as.push(performance.now() - t);
  }
  const m = med(am), s = med(as); tm += m; ts += s;
  console.log(`${nm.padEnd(22)} master ${m.toFixed(2)} ms  this ${s.toFixed(2)} ms  (+${(s - m).toFixed(2)}, ${((s / m - 1) * 100).toFixed(1)}%)`);
}
console.log(`total master ${tm.toFixed(1)} ms  this ${ts.toFixed(1)} ms  (+${(ts - tm).toFixed(1)}, ${((ts / tm - 1) * 100).toFixed(1)}%)`);
