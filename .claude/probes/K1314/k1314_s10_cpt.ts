// K1314 s10: chain points by s, and their pixel in a k1314_s4_plot crop (--ox --oy --wpp: origin and world per px).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s10_cpt.ts <scene> <chain>:<s>:<s>... [--ox= --oy= --wpp=]
import { buildModel, chainPt } from "./k1314_census";
const a = process.argv.slice(2).filter((q) => !q.startsWith("--")); const m = buildModel(a[0]);
const opt = (k: string, d: number): number => Number(process.argv.find((q) => q.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const ox = opt("ox", 0); const oy = opt("oy", 0); const wpp = opt("wpp", 1);
for (const spec of a.slice(1)) { const [c, ...ss] = spec.split(":"); const ch = (m.scene as any).chains[+c]; for (const s of ss) { const p = chainPt(ch.pts, ch.closed, +s); console.log(`c${c} s ${s}: (${p.x.toFixed(3)}, ${p.y.toFixed(3)}) px (${Math.round((p.x - ox) / wpp)}, ${Math.round((p.y - oy) / wpp)}) t (${p.tx.toFixed(2)}, ${p.ty.toFixed(2)})`); } }
