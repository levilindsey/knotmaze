// K1362 s1: form B's corners against the GPU field's at junctions (r/h, q, omega, ov, rV).
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s1_kj.ts <scene> <j,j,...|all> [--diff]
import { buildModel, plainOf } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { gfTablesOf } from "./k1362s1_census";

const [nm, js] = process.argv.slice(2); const DIFF = process.argv.includes("--diff");
const m = buildModel(nm); const T = gfTablesOf(m); const h = T.h;
const fb = plainOf(m) as unknown as { arms: { j: number }[]; corners: { j: number; a: number; b: number; ok: boolean; r: number; r0: number; omega: number; ov: number; qx: number; qy: number; rV: number; theta: number }[] };
const want = js === "all" ? null : new Set(js.split(",").map(Number));
const mine = new Map<string, number>(); for (let k = 0; k < T.kR.length; k++) mine.set(`${T.kJ[k]}:${T.kA[k]}:${T.kB[k]}`, k);
const base = new Map<number, number>(); fb.arms.forEach((a, i) => { if (!base.has(a.j)) base.set(a.j, i); });
let nB = 0; let nBoth = 0; let nOnlyB = 0; let nOnlyMe = 0; let sumDr = 0; const seen = new Set<string>();
for (const c of fb.corners) {
  const live = c.ok && c.r > 0 && c.omega > 0; const bj = base.get(c.j) ?? 0; const key = `${c.j}:${c.a - bj}:${c.b - bj}`; const k = mine.get(key); seen.add(key);
  if (live) nB++;
  if (live && k !== undefined) { nBoth++; sumDr += Math.abs(c.r - T.kR[k]); } else if (live) nOnlyB++; else if (k !== undefined) nOnlyMe++;
  if (want && !want.has(c.j)) continue;
  const dr = k !== undefined ? Math.abs((c.r * (live ? 1 : 0) - T.kR[k]) / h) : c.r / h;
  if (DIFF && dr < 0.1 && ((k !== undefined) === live)) continue;
  console.log(`j${c.j} ${c.a},${c.b} B: ok ${c.ok ? 1 : 0} r/h ${(c.r / h).toFixed(3)} r0/h ${(c.r0 / h).toFixed(3)} om ${c.omega.toFixed(2)} ov/h ${(c.ov / h).toFixed(2)} q (${c.qx.toFixed(3)},${c.qy.toFixed(3)}) rV/h ${(c.rV / h).toFixed(2)} th ${c.theta.toFixed(3)} | me: ${k === undefined ? "none" : `r/h ${(T.kR[k] / h).toFixed(3)} q (${T.kCx[k].toFixed(3)},${T.kCy[k].toFixed(3)}) Rmax/h ${(T.kRmax[k] / h).toFixed(2)}`}`);
}
for (const [key] of mine) if (!seen.has(key)) nOnlyMe++;
console.log(`form B live ${nB}; both ${nBoth} (mean |dr|/h ${(sumDr / Math.max(1, nBoth) / h).toFixed(3)}); only B ${nOnlyB}; only mine ${nOnlyMe}`);
