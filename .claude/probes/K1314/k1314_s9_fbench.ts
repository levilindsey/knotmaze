// K1314 s9: outline frame() on a motion cycle, three outline.ts versions in one process, interleaved
// A B B A per rep, so load drifts hit all three alike. Relative numbers for attribution; the official
// worker frame comes from k1314_s8_bench.ps1 (the app, ABBA under the perf lock).
//   git show ee53408f:src/render/outline/outline.ts > .claude/probes/K1314/out/s9/v_pre.ts   (pre-s8)
//   git show 337d785d:src/render/outline/outline.ts > .claude/probes/K1314/out/s9/v_mst.ts   (master at the s8 merge)
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s9_fbench.ts [scene=def] [reps=160] [only=pre,mst,cur]
// Prints per version the median / p95 frame ms and frame()'s own phase split (profMark).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as CUR from "../../../src/render/outline/outline";
import * as PRE from "./out/s9/v_pre";
import * as MST from "./out/s9/v_mst";
type Mod = typeof CUR;
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const name = arg("scene", "def"); const reps = +arg("reps", "160");
const only = arg("only", "pre,mst,cur").split(",");
const S = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as CUR.SceneIn;
(S.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
function perturb(scene: CUR.SceneIn, A: number): CUR.SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as CUR.SceneIn;
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) {
    const x = c.pts[i]; const y = c.pts[i + 1];
    c.pts[i] = x + A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4));
    c.pts[i + 1] = y + A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3));
  }
  return sc;
}
const h = S.look.halfWidth;
const cyc: CUR.SceneIn[] = [];
for (let k = 0; k <= 20; k++) cyc.push(perturb(S, (k / 20) * 0.5 * h));
for (let k = 19; k >= 1; k--) cyc.push(perturb(S, (k / 20) * 0.5 * h));
const all: Record<string, Mod> = { pre: PRE as unknown as Mod, mst: MST as unknown as Mod, cur: CUR };
const V = only.map((k) => ({ k, m: all[k], st: all[k].structure(S), t: [] as number[], prof: {} as Record<string, number> }));
for (const v of V) for (let i = 0; i < 30; i++) v.m.frame(v.st, cyc[i % cyc.length]);
for (let i = 0; i < reps; i++) {
  const order = i % 2 === 0 ? V : [...V].reverse();
  for (const v of order) {
    const t0 = performance.now();
    v.m.frame(v.st, cyc[i % cyc.length], v.prof);
    v.t.push(performance.now() - t0);
  }
}
for (const v of V) {
  const t = [...v.t].sort((a, b) => a - b);
  const ph = Object.entries(v.prof).map(([k, x]) => `${k} ${(x / reps).toFixed(2)}`).join(", ");
  console.log(`${name} ${v.k}: median ${t[t.length >> 1].toFixed(2)} p95 ${t[Math.ceil(0.95 * t.length) - 1].toFixed(2)} | ${ph}`);
}
