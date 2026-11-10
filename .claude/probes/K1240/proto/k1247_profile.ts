// K1247: relative motion-cycle timing for iteration (official numbers
// come from k1247_bench.ts under the perf lock).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { structure, frame, type SceneIn } from "./outline";
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const name = process.argv[2] ?? "def";
const S = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
(S.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) {
    const x = c.pts[i]; const y = c.pts[i + 1];
    c.pts[i] = x + A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4));
    c.pts[i + 1] = y + A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3));
  }
  return sc;
}
const st = structure(S);
const h = S.look.halfWidth;
const cyc: SceneIn[] = [];
for (let k = 0; k <= 20; k++) cyc.push(perturb(S, (k / 20) * 0.5 * h));
for (let k = 19; k >= 1; k--) cyc.push(perturb(S, (k / 20) * 0.5 * h));
for (let i = 0; i < 20; i++) frame(st, cyc[i % cyc.length]);
const prof: Record<string, number> = {};
const times: number[] = [];
const reps = 120;
for (let i = 0; i < reps; i++) {
  const t0 = performance.now();
  frame(st, cyc[i % cyc.length], prof);
  times.push(performance.now() - t0);
}
times.sort((a, b) => a - b);
console.log(`${name} motion (relative): median ${times[Math.floor(times.length / 2)].toFixed(2)} ms p95 ${times[Math.ceil(0.95 * times.length) - 1].toFixed(2)} ms`);
console.log(`phases: ${JSON.stringify(Object.fromEntries(Object.entries(prof).map(([k, v]) => [k, +(v / reps).toFixed(2)])))}`);
