// K1247 s3: per-function times inside frame() from an instrumented copy
// (outline_ab.ts with performance.now wrappers; relative numbers only).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s3_inst.ts [scene] [--reps=N]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SceneIn } from "./outline";
const { structure, frame } = (await import("./outline_ab")) as typeof import("./outline");
const name = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "def";
const reps = +(process.argv.find((a) => a.startsWith("--reps="))?.slice(7) ?? 2);
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
const st = structure(scene);
const fwd = Array.from({ length: 21 }, (_, k) => (k === 0 ? scene : perturb(scene, (k / 20) * 0.5 * h)));
const cycle = [...fwd, ...fwd.slice(1, 20).reverse()];
for (const sc of cycle) frame(st, sc);
const G = (globalThis as unknown as { __k1247acc: { __acc: Record<string, number>; __cnt: Record<string, number> } }).__k1247acc;
for (const k of Object.keys(G.__acc)) { G.__acc[k] = 0; G.__cnt[k] = 0; }
let tot = 0;
for (let r = 0; r < reps; r++) for (const sc of cycle) { const t0 = performance.now(); frame(st, sc); tot += performance.now() - t0; }
const n = reps * cycle.length;
console.log(`frame ${(tot / n).toFixed(3)} ms (instrumented)`);
for (const k of Object.keys(G.__acc).sort((a, b) => G.__acc[b] - G.__acc[a])) console.log(`  ${k.padEnd(18)} ${(G.__acc[k] / n).toFixed(3)} ms  ${(G.__cnt[k] / n).toFixed(0)} calls`);