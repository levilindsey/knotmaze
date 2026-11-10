// K1247 s4: corner-solve statistics over the k1247c_time cycle, through
// outline_st.ts (k1247s4_mkstats.mjs writes it). Counts per frame, the
// corners' node counts and integrals, and the solve/grow split.
//   node .claude/probes/K1240/proto/k1247s4_mkstats.mjs
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s4_stats.ts [scene] [--reps=N]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SceneIn } from "./outline";
const { structure, frame } = (await import("./outline_st")) as typeof import("./outline");
const name = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "def";
const reps = +(process.argv.find((a) => a.startsWith("--reps="))?.slice(7) ?? 1);
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
const G = (globalThis as unknown as { __k4: { c: Record<string, number>; t: Record<string, number>; corners: { ci: number; r0: number; nNodes: number; integ: number; wEnd: number }[]; on: boolean } }).__k4;
G.on = true;
for (let r = 0; r < reps; r++) for (const sc of cycle) frame(st, sc);
const n = reps * cycle.length;
console.log(`${name}: per frame (${n} frames)`);
for (const k of Object.keys(G.c).sort()) console.log(`  ${k.padEnd(14)} ${(G.c[k] / n).toFixed(1)}`);
for (const k of Object.keys(G.t)) console.log(`  t.${k.padEnd(12)} ${(G.t[k] / n).toFixed(3)} ms`);
const cs = G.corners;
const per = cs.length / n;
const full = cs.filter((c) => c.nNodes === 33 && Math.abs(c.integ - 1) < 1e-12).length / n;
const fullNodes = cs.filter((c) => c.nNodes === 33).length / n;
const hist: Record<string, number> = {};
for (const c of cs) { const b = c.integ >= 1 - 1e-12 ? "1" : c.integ >= 0.99 ? ">.99" : c.integ >= 0.9 ? ">.9" : c.integ >= 0.5 ? ">.5" : c.integ > 0 ? ">0" : "0"; hist[b] = (hist[b] ?? 0) + 1 / n; }
console.log(`  grown corners ${per.toFixed(1)}, all 33 nodes ${fullNodes.toFixed(1)}, integ = r0 exactly ${full.toFixed(1)}`);
console.log(`  integ/r0: ${Object.entries(hist).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(", ")}`);
const r0s = cs.map((c) => c.r0).sort((a, b) => a - b);
{ // nodes a tail cut (s * remaining length < tol) would skip
  for (const tol of [1e-5, 1e-4, 3e-4]) {
    let skip = 0; let maxErr = 0;
    for (const c of cs as unknown as { r0: number; sq: number[]; nNodes: number }[]) {
      const dN = c.r0 / 32; const sq = c.sq;
      for (let k = 0; k < sq.length; k++) if (sq[k] * (32 - k) * dN < tol) { skip += c.nNodes - 1 - k; let e = 0; for (let j = k + 1; j < sq.length; j++) e += 0.5 * (sq[j - 1] + sq[j]) * dN; maxErr = Math.max(maxErr, e); break; }
    }
    console.log(`  tail cut tol ${tol} h: nodes skipped per frame ${(skip / n).toFixed(1)}, max integ error ${maxErr.toExponential(2)} h`);
  }
  let w1 = 0; let tot = 0;
  for (const c of cs as unknown as { sq: number[] }[]) { for (const s of c.sq) { tot++; if (s === 1) w1++; } }
  console.log(`  nodes with s = 1: ${(w1 / n).toFixed(1)} of ${(tot / n).toFixed(1)}`);
}
console.log(`  r0/h: min ${r0s[0]?.toFixed(3)} med ${r0s[r0s.length >> 1]?.toFixed(3)} max ${r0s[r0s.length - 1]?.toFixed(3)}`);
