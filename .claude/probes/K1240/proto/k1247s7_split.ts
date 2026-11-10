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
const ccl = (O as unknown as { cpClass: Int8Array }).cpClass; const cls = new Int8Array(cycle.length * nC);
const OX = O as unknown as { cpEv: Int32Array; cpNode: Int32Array; cpPc: Int32Array };
const cev = OX.cpEv; const cnd = OX.cpNode; const cpc = OX.cpPc;
const evs = new Int32Array(cycle.length * nC); const nds = new Int32Array(cycle.length * nC); const pcs = new Int32Array(cycle.length * nC);
for (let r = 0; r < rounds; r++) {
  cycle.forEach((sc, i) => {
    for (const k of keys) cp[k] = 0;
    cc.fill(-1);
    O.frame(st, sc);
    for (const k of keys) if (cp[k] < mins[k][i]) mins[k][i] = cp[k];
    for (let ci = 0; ci < nC; ci++) if (cc[ci] >= 0) { if (cc[ci] < cMin[i * nC + ci]) cMin[i * nC + ci] = cc[ci]; cls[i * nC + ci] = ccl[ci]; evs[i * nC + ci] = cev[ci]; nds[i * nC + ci] = cnd[ci]; pcs[i * nC + ci] = cpc[ci]; }
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
  // By class (cfStats): free = w 1 at every node, zero = w reached 0, other.
  const names = ["", "free", "zero", "other"]; const ct = [0, 0, 0, 0]; const cn = [0, 0, 0, 0];
  for (let i = 0; i < cycle.length; i++) for (let ci = 0; ci < nC; ci++) { const v = cMin[i * nC + ci]; if (!Number.isFinite(v)) continue; const k = cls[i * nC + ci]; ct[k] += v; cn[k]++; }
  console.log(`by class: ${[1, 2, 3].map((k) => `${names[k]} ${cn[k]} calls, ${(100 * ct[k] / tot).toFixed(1)}% of the time, ${(1000 * ct[k] / Math.max(1, cn[k])).toFixed(1)} us each`).join("; ")}`);
  // Evaluations (cfAt calls: nodes, refinement, the final one) and pieces per call, by class (last round).
  const ev = [0, 0, 0, 0]; const nd = [0, 0, 0, 0]; const pc = [0, 0, 0, 0];
  for (let i = 0; i < cycle.length; i++) for (let ci = 0; ci < nC; ci++) { if (!Number.isFinite(cMin[i * nC + ci])) continue; const k = cls[i * nC + ci]; ev[k] += evs[i * nC + ci]; nd[k] += nds[i * nC + ci]; pc[k] += pcs[i * nC + ci]; }
  console.log(`per call by class: ${[1, 2, 3].map((k) => `${names[k]} evals ${(ev[k] / Math.max(1, cn[k])).toFixed(1)} (nodes ${(nd[k] / Math.max(1, cn[k])).toFixed(1)}), pieces ${(pc[k] / Math.max(1, cn[k])).toFixed(1)}`).join("; ")}`);
}
// --oracle: the free corners (by the rounds above) skip w (it returns 1),
// alternating with the plain run: what a free certificate that cost nothing
// would save. Free corners' outputs are unchanged (w was 1 at their nodes).
if (process.argv.includes("--oracle")) {
  const OM = O as unknown as { cpMask: Int8Array; cpMO: number[] };
  const tOff = new Float64Array(cycle.length * nC).fill(Infinity); const tOn = new Float64Array(cycle.length * nC).fill(Infinity);
  for (let r = 0; r < 2 * rounds; r++) {
    const on = r % 2 === 1; OM.cpMO[0] = on ? 1 : 0;
    cycle.forEach((sc, i) => {
      for (let ci = 0; ci < nC; ci++) OM.cpMask[ci] = cls[i * nC + ci] === 1 ? 1 : 0;
      cc.fill(-1); O.frame(st, sc);
      const T = on ? tOn : tOff;
      for (let ci = 0; ci < nC; ci++) if (cc[ci] >= 0 && cc[ci] < T[i * nC + ci]) T[i * nC + ci] = cc[ci];
    });
  }
  OM.cpMO[0] = 0;
  let fOff = 0; let fOn = 0; let aOff = 0; let aOn = 0; let nF = 0;
  for (let x = 0; x < tOff.length; x++) {
    if (Number.isFinite(tOff[x])) aOff += tOff[x];
    if (Number.isFinite(tOn[x])) aOn += tOn[x];
    if (cls[x] === 1 && Number.isFinite(tOff[x]) && Number.isFinite(tOn[x])) { fOff += tOff[x]; fOn += tOn[x]; nF++; }
  }
  const pf = (v: number): string => (v / cycle.length).toFixed(3);
  console.log(`oracle: free corners (${nF} calls) ${pf(fOff)} ms a frame with w, ${pf(fOn)} without (${(1000 * fOff / nF).toFixed(1)} / ${(1000 * fOn / nF).toFixed(1)} us each); all growth ${pf(aOff)} / ${pf(aOn)} ms a frame`);
}
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const m: Record<string, number> = {};
for (const k of keys) m[k] = mean(mins[k]);
const rest = m.all - m.solve - m.grow - m.fb;
console.log(`corners phase, per frame (fastest round per frame, mean over the cycle): all ${m.all.toFixed(3)} ms; solve ${m.solve.toFixed(3)} (${m.nSolve.toFixed(0)} calls); grow ${m.grow.toFixed(3)} (${m.nGrow.toFixed(0)}); fallback ${m.fb.toFixed(3)} (${m.nFb.toFixed(0)}); rest ${rest.toFixed(3)}`);
