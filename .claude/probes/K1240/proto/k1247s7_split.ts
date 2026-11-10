// K1247 s7: where def's corners phase goes, by call: the V solve (trySolve),
// the growth (growCFC), the fallbacks (cornerFallbackC) and the rest
// (arm setup, addPointAtC, warm state). Needs outline.ts instrumented with
// cpStat (k1247s7_split.ps1 patches a copy in place and restores it).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s7_split.ts [--rounds=8]
import { readFileSync } from "node:fs";
import * as O from "./outline";
import type { SceneIn } from "./outline";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const rounds = +(process.argv.find((a) => a.startsWith("--rounds="))?.slice(9) ?? 8);
const cp = (O as unknown as { cpStat: Record<string, number> }).cpStat;
if (!cp) throw new Error("outline.ts has no cpStat: run through k1247s7_split.ps1");
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
const fwd = Array.from({ length: 21 }, (_, k) => (k === 0 ? scene : perturb(scene, (k / 20) * 0.5 * h)));
const cycle = [...fwd, ...fwd.slice(1, 20).reverse()];
for (let w = 0; w < 2; w++) for (const sc of cycle) O.frame(st, sc);
const keys = ["all", "solve", "grow", "fb", "nGrow", "nSolve", "nFb"];
// Per frame, the fastest round of each part (other load only adds time).
const mins: Record<string, number[]> = {};
for (const k of keys) mins[k] = new Array<number>(cycle.length).fill(Infinity);
// Per (frame, corner), the fastest round of that corner's growth.
const cc = (O as unknown as { cpCorner: Float64Array }).cpCorner;
const nC = st.corners.length;
const cMin = new Float64Array(cycle.length * nC).fill(Infinity);
for (let r = 0; r < rounds; r++) {
  cycle.forEach((sc, i) => {
    for (const k of keys) cp[k] = 0;
    cc.fill(-1);
    O.frame(st, sc);
    for (const k of keys) if (cp[k] < mins[k][i]) mins[k][i] = cp[k];
    for (let ci = 0; ci < nC; ci++) if (cc[ci] >= 0 && cc[ci] < cMin[i * nC + ci]) cMin[i * nC + ci] = cc[ci];
  });
}
{
  const all = Array.from(cMin).filter(Number.isFinite).sort((a, b) => b - a);
  const tot = all.reduce((a, b) => a + b, 0);
  const share = (f: number): string => (100 * all.slice(0, Math.ceil(all.length * f)).reduce((a, b) => a + b, 0) / tot).toFixed(1);
  const us = (q: number): string => (1000 * all[Math.min(all.length - 1, Math.floor(all.length * q))]).toFixed(1);
  console.log(`grown corners: ${all.length} over the cycle; per call (us): max ${us(0)}, p1 ${us(0.01)}, p10 ${us(0.1)}, p50 ${us(0.5)}, p90 ${us(0.9)}; share of the time in the top 1% ${share(0.01)}%, 10% ${share(0.1)}%, 25% ${share(0.25)}%, 50% ${share(0.5)}%`);
  const perC: { ci: number; t: number }[] = [];
  for (let ci = 0; ci < nC; ci++) { let t = 0; for (let i = 0; i < cycle.length; i++) { const v = cMin[i * nC + ci]; if (Number.isFinite(v)) t += v; } perC.push({ ci, t }); }
  perC.sort((a, b) => b.t - a.t);
  console.log(`heaviest corners (share of the cycle's growth): ${perC.slice(0, 8).map((x) => `${x.ci} ${(100 * x.t / tot).toFixed(1)}%`).join(", ")}`);
}
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const m: Record<string, number> = {};
for (const k of keys) m[k] = mean(mins[k]);
const rest = m.all - m.solve - m.grow - m.fb;
console.log(`corners phase, per frame (fastest round per frame, mean over the cycle): all ${m.all.toFixed(3)} ms; solve ${m.solve.toFixed(3)} (${m.nSolve.toFixed(0)} calls); grow ${m.grow.toFixed(3)} (${m.nGrow.toFixed(0)}); fallback ${m.fb.toFixed(3)} (${m.nFb.toFixed(0)}); rest ${rest.toFixed(3)}`);
