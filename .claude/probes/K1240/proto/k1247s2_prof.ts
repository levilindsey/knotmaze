// K1247 s2: def's frame() phases over the k1247c_time cycle (not under the
// lock: relative numbers only), plus scene sizes.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s2_prof.ts [scene] [--reps=N]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { structure, frame, type SceneIn } from "./outline";

const name = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "def";
const reps = +(process.argv.find((a) => a.startsWith("--reps="))?.slice(7) ?? 3);
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
function perturb(sc0: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(sc0)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return sc;
}
const h = scene.look.halfWidth;
let nPts = 0; for (const c of scene.chains) nPts += c.pts.length / 2;
console.log(`${name}: chains ${scene.chains.length}, centreline pts ${nPts}, crossings ${scene.crossings.length}, junctions ${scene.junctions.length}, arms ${scene.junctions.reduce((a, j) => a + j.arms.length, 0)}, h ${h}`);
const st = structure(scene);
const fwd = Array.from({ length: 21 }, (_, k) => (k === 0 ? scene : perturb(scene, (k / 20) * 0.5 * h)));
const cycle = [...fwd, ...fwd.slice(1, 20).reverse()];
for (const sc of cycle) frame(st, sc);
const acc: Record<string, number> = {};
const ms: number[] = [];
for (let r = 0; r < reps; r++) for (const sc of cycle) {
  const prof: Record<string, number> = {};
  const t0 = performance.now();
  frame(st, sc, prof);
  ms.push(performance.now() - t0);
  for (const [k, v] of Object.entries(prof)) acc[k] = (acc[k] ?? 0) + v;
}
const n = reps * cycle.length;
const q = (xs: number[], p: number): number => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
console.log(`median ${q(ms, 0.5).toFixed(2)} ms, p95 ${q(ms, 0.95).toFixed(2)}`);
for (const [k, v] of Object.entries(acc)) console.log(`  ${k.padEnd(18)} ${(v / n).toFixed(3)}`);
const t = frame(st, scene) as unknown as { diagnostics: string[]; pieces: unknown[] };
console.log(t.diagnostics.slice(-4).join("\n"));
