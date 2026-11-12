// K1314 s6: one fill strip's rows near a point: per column i, the L / C / R vertices (position, key, s, the
// paint s), and the cone key form B would give there (z at the vertex's foot on the chain - d zt / h).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s6_strip.ts <scene> <item> [<x> <y> [--n=6]]
import { buildModel } from "./k1314_census";
import { S6KEY } from "../../../src/render/outline/fill_tri";
S6KEY.mode = Number(process.argv.find((a) => a.startsWith("--mode="))?.split("=")[1] ?? 0);
import * as F from "../../../src/render/outline/fill_tri";
import { FormB } from "../../../src/render/field/form_b";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string, d: number): number => Number(process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const [nm, its, xs, ys] = args; const ii = Number(its);
const m = buildModel(nm); const fs = m.fs; const fr = m.fr; const P = fr.pos; const K = fr.key;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const it = fs.items[ii] as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fb = new FormB(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as any;
const W = it.N + 1;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tab = (m as any).table ?? (m as any).tb;
const pl = it.pL >= 0 && tab ? tab.pieces[it.pL] : null; const pr = it.pR >= 0 && tab ? tab.pieces[it.pR] : null;
console.log(`item ${ii} ${it.kind} c${it.pi} N ${it.N} base ${it.base} iv ${it.iv} pL ${it.pL} ${pl ? `s ${pl.s0.toFixed(3)}..${pl.s1.toFixed(3)} n${pl.pts.length >> 1}` : ""} pR ${it.pR} ${pr ? `s ${pr.s0.toFixed(3)}..${pr.s1.toFixed(3)} n${pr.pts.length >> 1}` : ""}`);
const cone = (v: number): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ps: any[] = []; fb.pieces(P[2 * v], P[2 * v + 1], ps);
  const A = ps.filter((p) => p.chain === it.pi).sort((a, b) => a.d - b.d)[0];
  return A ? `foot ${A.s.toFixed(3)} d ${A.d.toFixed(3)} cone ${A.key.toFixed(4)}` : "no piece";
};
let i0 = 0; let i1 = it.N;
if (process.argv.some((a) => a.startsWith("--i="))) { const c = opt("i", 0); const n = opt("n", 6); i0 = Math.max(0, c - n); i1 = Math.min(it.N, c + n); }
if (xs !== undefined && !process.argv.some((a) => a.startsWith("--i="))) {
  const x = Number(xs); const y = Number(ys); let best = 0; let bd = Infinity;
  for (let i = 0; i <= it.N; i++) for (let r = 0; r < 3; r++) { const v = it.base + r * W + i; const d = (P[2 * v] - x) ** 2 + (P[2 * v + 1] - y) ** 2; if (d < bd) { bd = d; best = i; } }
  const n = opt("n", 6); i0 = Math.max(0, best - n); i1 = Math.min(it.N, best + n);
}
for (let i = i0; i <= i1; i++) {
  const row = ["L", "C", "R"].map((nmR, r) => { const v = it.base + r * W + i; return `${nmR} (${P[2 * v].toFixed(3)},${P[2 * v + 1].toFixed(3)}) k ${K[v].toFixed(4)} s ${fr.s[v].toFixed(3)} | ${cone(v)}`; });
  console.log(`i ${i}\n  ${row.join("\n  ")}`);
}
void F;
