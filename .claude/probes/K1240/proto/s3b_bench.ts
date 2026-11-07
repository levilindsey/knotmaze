// K1240 S3 Done 3: frame() time per scene (median/p95), structure()
// time, and a per-phase profile of frame() on def. Run under the perf
// lock: run_locked.ps1 -Script s3_bench.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame, type SceneIn } from "./outline";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "s3b");
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const names = process.argv[2] ? process.argv[2].split(",") : ALL;

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
  frame(st, scene); // warm up (JIT)
  const times: number[] = [];
  const reps = 15;
  let pieces = 0;
  for (let i = 0; i < reps; i++) {
    const t0 = performance.now();
    const t = frame(st, scene);
    times.push(performance.now() - t0);
    pieces = t.pieces.length;
  }
  times.sort((a, b) => a - b);
  const med = times[Math.floor(times.length / 2)];
  const p95 = times[Math.min(times.length - 1, Math.floor(0.95 * times.length))];
  const row: Record<string, unknown> = { scene: name, structureMedianMs: +sTimes[1].toFixed(1), frameMedianMs: +med.toFixed(2), frameP95Ms: +p95.toFixed(2), pieces };
  if (name === "def") {
    const prof: Record<string, number> = {};
    const PN = 5;
    for (let i = 0; i < PN; i++) frame(st, scene, prof);
    row.defProfile = Object.fromEntries(Object.entries(prof).map(([k, v]) => [k, +(v / PN).toFixed(2)]));
  }
  rows.push(row);
  console.log(`${name}: structure med ${sTimes[1].toFixed(1)} ms frame med ${med.toFixed(2)} ms p95 ${p95.toFixed(2)} ms pieces=${pieces}${row.defProfile ? " profile " + JSON.stringify(row.defProfile) : ""}`);
}
writeFileSync(join(outDir, "s3_bench.json"), JSON.stringify(rows, null, 1));
console.log("wrote s3_bench.json");
