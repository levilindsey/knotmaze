// K1240 S3f Done 5: frame() time per scene (median/p95 over >=100 timed
// frames after warm-up), structure() time, and a per-phase profile of
// frame() on def. Run under the perf lock:
//   run_locked_s3f.ps1 -Script s3f_bench.ts -RunArgs @('bench_run1')
// An optional first arg names the output file (out/s3f/<name>.json).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame, type SceneIn } from "./outline";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "s3f");
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const outName = process.argv[2] && !process.argv[2].includes(",") ? process.argv[2] : "bench";
const names = process.argv[3] ? process.argv[3].split(",") : process.argv[2] && process.argv[2].includes(",") ? process.argv[2].split(",") : ALL;

function load(name: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
const rows: Record<string, unknown>[] = [];
for (const name of names) {
  const scene = load(name);
  const sTimes: number[] = [];
  let st = structure(scene);
  for (let i = 0; i < 3; i++) { const t0 = performance.now(); st = structure(scene); sTimes.push(performance.now() - t0); }
  sTimes.sort((a, b) => a - b);
  for (let i = 0; i < 10; i++) frame(st, scene); // warm-up (JIT + runtime build)
  const times: number[] = [];
  const reps = 120;
  let pieces = 0;
  for (let i = 0; i < reps; i++) {
    const t0 = performance.now();
    const t = frame(st, scene);
    times.push(performance.now() - t0);
    pieces = t.pieces.length;
  }
  times.sort((a, b) => a - b);
  const med = times[Math.floor(times.length / 2)];
  const p95 = times[Math.min(times.length - 1, Math.ceil(0.95 * times.length) - 1)];
  const row: Record<string, unknown> = { scene: name, structureMedianMs: +sTimes[1].toFixed(1), frameMedianMs: +med.toFixed(3), frameP95Ms: +p95.toFixed(3), timedFrames: reps, pieces };
  if (name === "def") {
    const prof: Record<string, number> = {};
    const PN = 10;
    for (let i = 0; i < PN; i++) frame(st, scene, prof);
    row.defProfile = Object.fromEntries(Object.entries(prof).map(([k, v]) => [k, +(v / PN).toFixed(3)]));
  }
  rows.push(row);
  console.log(`${name}: structure med ${sTimes[1].toFixed(1)} ms frame med ${med.toFixed(3)} ms p95 ${p95.toFixed(3)} ms pieces=${pieces}${row.defProfile ? " profile " + JSON.stringify(row.defProfile) : ""}`);
}
writeFileSync(join(outDir, `${outName}.json`), JSON.stringify(rows, null, 1));
console.log(`wrote ${outName}.json`);
