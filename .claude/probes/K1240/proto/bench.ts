// K1240 S1 Done 4 (CPU half): builder time per frame on each scene,
// median/p95 over repeated builds in one process. Run under the perf
// lock (proto/run_locked.ps1 -Script bench.ts via scripts/run_node.mjs,
// or directly: node scripts/run_node.mjs .claude/probes/K1240/proto/bench.ts).
// Line counts are printed with `git ls-files` output in the Handoff.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOutline, type SceneIn } from "./outline";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out");
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const names = process.argv[2] ? process.argv[2].split(",") : ALL;

const rows: Record<string, unknown>[] = [];
for (const name of names) {
  const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  // Warm up (JIT), then time.
  buildOutline(scene);
  const times: number[] = [];
  const reps = 9;
  let last = buildOutline(scene);
  for (let i = 0; i < reps; i++) {
    const t0 = performance.now();
    last = buildOutline(scene);
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const med = times[Math.floor(times.length / 2)];
  const p95 = times[Math.min(times.length - 1, Math.floor(0.95 * times.length))];
  rows.push({ scene: name, medianMs: med, p95Ms: p95, pieces: last.pieces.length, faces: last.faces.length, regions: last.regions.length, cornersOk: last.corners.filter((c) => c.ok).length, corners: last.corners.length });
  console.log(`${name}: median ${med.toFixed(1)} ms p95 ${p95.toFixed(1)} ms pieces=${last.pieces.length}`);
}
writeFileSync(join(outDir, "bench.json"), JSON.stringify(rows, null, 1));
console.log("wrote bench.json");
