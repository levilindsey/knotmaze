// K1362 t1: swap-averaged A/B of buildTables, this build against a reference
// build (argv[2] = its tables.ts file URL), alternating order per pair so
// machine load cancels in the paired difference. Per scene (def, muse_hash,
// fat) and per part (T.ms): p50 of each build, median and mean paired
// difference (new - ref) with a 95% interval (mean +- 1.96 sd / sqrt(n)).
//   node scripts/run_node.mjs .claude/probes/K1362/k1362t1_ab.ts <refTablesUrl> [pairs=60] [warm=10]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTables as buildNew, type GfTables } from "../../../src/render/gpu_field/tables";
import type { FieldScene } from "../../../src/render/field/scene";

const here = dirname(fileURLToPath(import.meta.url));
const ref = (await import(/* @vite-ignore */ process.argv[2])) as { buildTables: typeof buildNew };
const PAIRS = +(process.argv[3] ?? 60);
const WARM = +(process.argv[4] ?? 10);
const PARTS = ["vtx", "pins", "arms", "corners", "bins", "total"] as const;
const med = (a: number[]): number => { const s = [...a].sort((u, v) => u - v); return s[Math.floor(s.length / 2)]; };
const load = (nm: string): FieldScene => {
  const s = JSON.parse(readFileSync(join(here, "..", "K868", "scenes", `${nm}.json`), "utf8")) as FieldScene;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
};
for (const nm of ["def", "muse_hash", "fat"]) {
  const scene = load(nm);
  const opts = { aa: 0.5 / (scene.camera.pxPerUnit * 2) };
  const oldMs: Record<string, number[]> = {}; const newMs: Record<string, number[]> = {}; const diff: Record<string, number[]> = {};
  for (const p of PARTS) { oldMs[p] = []; newMs[p] = []; diff[p] = []; }
  const run = (fn: (s: FieldScene, o: typeof opts) => GfTables, rec: Record<string, number[]>): void => {
    const T = fn(scene, opts);
    for (const p of PARTS) rec[p].push(T.ms[p]);
  };
  for (let i = 0; i < WARM; i++) { run(ref.buildTables, oldMs); run(buildNew, newMs); }
  for (const p of PARTS) { oldMs[p] = []; newMs[p] = []; }
  for (let i = 0; i < PAIRS; i++) {
    if (i % 2 === 0) { run(ref.buildTables, oldMs); run(buildNew, newMs); } else { run(buildNew, newMs); run(ref.buildTables, oldMs); }
    for (const p of PARTS) diff[p].push(newMs[p][newMs[p].length - 1] - oldMs[p][oldMs[p].length - 1]);
  }
  console.log(`scene ${nm} pairs ${PAIRS} (ms, T.ms)`);
  for (const p of PARTS) {
    const d = diff[p]; const mean = d.reduce((a, b) => a + b, 0) / d.length;
    const sd = Math.sqrt(d.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, d.length - 1));
    const hw = 1.96 * sd / Math.sqrt(d.length);
    console.log(`  ${p.padEnd(7)} ref p50 ${med(oldMs[p]).toFixed(3).padStart(7)}  new p50 ${med(newMs[p]).toFixed(3).padStart(7)}  diff med ${med(d).toFixed(3).padStart(7)}  mean ${mean.toFixed(3).padStart(7)} +- ${hw.toFixed(3)} (95%)`);
  }
}
