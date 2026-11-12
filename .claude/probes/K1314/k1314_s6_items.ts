// K1314 s6: fill items of one chain near a point (nearest vertex distance), with their mirror flags.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s6_items.ts <scene> <chain> <x> <y> [--d=0.3]
import { buildModel } from "./k1314_census";
const [nm, cs, xs, ys] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const dmax = Number(process.argv.find((a) => a.startsWith("--d="))?.split("=")[1] ?? 0.3);
const m = buildModel(nm); const fs = m.fs; const P = m.fr.pos; const c = Number(cs); const x = Number(xs); const y = Number(ys);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
fs.items.forEach((it: any, ii: number) => {
  if (it.pi !== c) return;
  const rows = it.kind === "strip" ? 3 : 1; const W = (it.N ?? 0) + 1; let bd = Infinity; let bi = -1;
  const nv = it.kind === "strip" ? 3 * W : (it.nv ?? 0);
  for (let k = 0; k < nv; k++) { const v = it.base + k; const d = Math.hypot(P[2 * v] - x, P[2 * v + 1] - y); if (d < bd) { bd = d; bi = k % W; } }
  if (bd <= dmax) console.log(`item ${ii} ${it.kind} N ${it.N} pL ${it.pL} pR ${it.pR} nearest ${bd.toFixed(3)} col ${bi} rows ${rows}`);
});
