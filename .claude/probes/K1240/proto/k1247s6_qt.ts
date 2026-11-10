// K1247 s6: a quick (unlocked, rough) look at def's frame and phases in
// motion with the closed-form growth on and off, alternating. Not a
// measurement: k1247c_time.ts under the lock is.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s6_qt.ts [--rounds=3] [--only=on|off] [--E=1e-3]
import { readFileSync } from "node:fs";
import * as O from "./outline";
import type { SceneIn } from "./outline";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const rounds = +(process.argv.find((a) => a.startsWith("--rounds="))?.slice(9) ?? 3);
const eArg = process.argv.find((a) => a.startsWith("--E="))?.slice(4); // the growth's error budget in h (default 1e-3)
if (eArg !== undefined) O.setGrowKnobs(+eArg, 0.25);
const scene = JSON.parse(readFileSync(`${SCENE_DIR}/def.json`, "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
function perturb(sc0: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(sc0)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return sc;
}
const h = scene.look.halfWidth;
const st = O.structure(scene);
const STEPS = 20;
const fwd = Array.from({ length: STEPS + 1 }, (_, k) => (k === 0 ? scene : perturb(scene, (k / STEPS) * 0.5 * h)));
const cycle = [...fwd, ...fwd.slice(1, STEPS).reverse()];
const q = (xs: number[], p: number): number => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const res: Record<string, { ms: number[]; cor: number[] }> = { off: { ms: [], cor: [] }, on: { ms: [], cor: [] } };
for (let r = 0; r < rounds; r++) {
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
  for (const mode of (r % 2 ? ["on", "off"] : ["off", "on"]).filter((m) => !only || m === only)) {
    O.setClosedForm(mode === "on");
    for (const sc of cycle) O.frame(st, sc);
    for (const sc of cycle) {
      const prof: Record<string, number> = {};
      const t0 = performance.now(); O.frame(st, sc, prof); res[mode].ms.push(performance.now() - t0);
      res[mode].cor.push(prof.corners ?? NaN);
    }
  }
}
for (const m of ["off", "on"]) if (res[m].ms.length) console.log(`${m}: frame median ${q(res[m].ms, 0.5).toFixed(3)} p95 ${q(res[m].ms, 0.95).toFixed(3)}; corners median ${q(res[m].cor, 0.5).toFixed(3)} p95 ${q(res[m].cor, 0.95).toFixed(3)}`);
console.log(JSON.stringify(O.cfStats));
