// K1247 Done 4: frame() time in motion (def cycled through the 20
// sweep steps from S to the 0.5h S' and back, s3f_sweep's perturb),
// at least 100 timed frames after warm-up, with def's phases. Also
// ring/fat structure()+first cold frame, and the repeated-scene number.
// Run under the perf lock:
//   run_locked_k1247.ps1 -Script k1247_bench.ts -RunArgs @('bench1')
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame, frameRef, type SceneIn } from "./outline";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "k1247");
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const outName = process.argv[2] ?? "bench";

function load(name: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) {
    const x = c.pts[i]; const y = c.pts[i + 1];
    c.pts[i] = x + A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4));
    c.pts[i + 1] = y + A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3));
  }
  return sc;
}
function stats(times: number[]): { median: number; p95: number } {
  const s = times.slice().sort((a, b) => a - b);
  return { median: s[Math.floor(s.length / 2)], p95: s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)] };
}

const rows: Record<string, unknown>[] = [];
// Cold: structure() + first cold frame, per scene.
for (const name of ["def", "ring", "fat"]) {
  const scene = load(name);
  const sTimes: number[] = [];
  let st = structure(scene);
  for (let i = 0; i < 3; i++) { const t0 = performance.now(); st = structure(scene); sTimes.push(performance.now() - t0); }
  sTimes.sort((a, b) => a - b);
  const t0 = performance.now();
  const tbl = frame(st, scene);
  const coldMs = performance.now() - t0;
  const row: Record<string, unknown> = { scene: name, structureMedianMs: +sTimes[1].toFixed(2), coldFrameMs: +coldMs.toFixed(2), pieces: tbl.pieces.length };
  rows.push(row);
  console.log(`${name}: structure med ${sTimes[1].toFixed(2)} ms, first cold frame ${coldMs.toFixed(2)} ms, pieces=${tbl.pieces.length}`);
}
// Motion bench on def (+ ring/fat reported too).
for (const name of ["def", "ring", "fat"]) {
  const scene = load(name);
  const h = scene.look.halfWidth;
  const st = structure(scene);
  const cyc: SceneIn[] = [];
  for (let k = 0; k <= 20; k++) cyc.push(perturb(scene, (k / 20) * 0.5 * h));
  for (let k = 19; k >= 1; k--) cyc.push(perturb(scene, (k / 20) * 0.5 * h));
  for (let i = 0; i < 20; i++) frame(st, cyc[i % cyc.length]);
  const prof: Record<string, number> = {};
  const times: number[] = [];
  const reps = 120;
  for (let i = 0; i < reps; i++) {
    const t0 = performance.now();
    frame(st, cyc[i % cyc.length], prof);
    times.push(performance.now() - t0);
  }
  const { median, p95 } = stats(times);
  const profAvg = Object.fromEntries(Object.entries(prof).map(([k, v]) => [k, +(v / reps).toFixed(3)]));
  rows.push({ scene: name, motionMedianMs: +median.toFixed(3), motionP95Ms: +p95.toFixed(3), timedFrames: reps, phases: profAvg });
  console.log(`${name} motion: median ${median.toFixed(3)} ms p95 ${p95.toFixed(3)} ms phases ${JSON.stringify(profAvg)}`);
}
// Repeated-scene numbers (what s3f_bench measures; a warm start flatters it).
for (const name of ["def", "ring", "fat"]) {
  const scene = load(name);
  const st = structure(scene);
  for (let i = 0; i < 10; i++) frame(st, scene);
  const times: number[] = [];
  for (let i = 0; i < 120; i++) { const t0 = performance.now(); frame(st, scene); times.push(performance.now() - t0); }
  const { median, p95 } = stats(times);
  // Oracle comparison for the log line.
  const rTimes: number[] = [];
  for (let i = 0; i < 5; i++) { const t0 = performance.now(); frameRef(st, scene); rTimes.push(performance.now() - t0); }
  rTimes.sort((a, b) => a - b);
  rows.push({ scene: name, repeatedMedianMs: +median.toFixed(3), repeatedP95Ms: +p95.toFixed(3), refMedianMs: +rTimes[2].toFixed(1) });
  console.log(`${name} repeated: median ${median.toFixed(3)} ms p95 ${p95.toFixed(3)} ms (frameRef med ${rTimes[2].toFixed(1)} ms)`);
}
writeFileSync(join(outDir, `${outName}.json`), JSON.stringify(rows, null, 1));
console.log(`wrote ${outName}.json`);
