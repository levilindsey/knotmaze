// K1324 s2: geometry around a crossing: the crossing, the chain's pins near it, and the z profile.
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s2_geo.ts <scene> <crossing index> [--from=s] [--to=s] [--step=0.25]
import * as D from "../../../src/render/outline/draw";
import { buildModel } from "../K1314/k1314_census";
const [nm, xi] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string, d: number): number => Number(process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const m = buildModel(nm); const sc = m.scene; const { zc, idx } = m.zz;
const X = sc.crossings[Number(xi)];
console.log(JSON.stringify(X), "at", m.xPts[Number(xi)], "amp", sc.look.depthAmp, "win", sc.look.depthWindow, "ctrlArc", sc.look.ctrlArc, "h", sc.look.halfWidth);
const ia = idx.get(X.a.chain)!; const C = zc[ia];
console.log(`chain ${X.a.chain} len ${C.len.toFixed(2)} closed ${C.closed} win ${C.win}`);
const lo = opt("from", X.a.s - 3); const hi = opt("to", X.a.s + 3);
const pins = (C.pins ?? []).filter((p: { s: number }) => p.s > Math.min(lo, X.b.s - 3) && p.s < Math.max(hi, X.b.s + 3));
console.log("pins:", pins.map((p: { s: number; z: number }) => `${p.s.toFixed(2)}:${p.z > 0 ? "+" : "-"}`).join(" "));
sc.crossings.forEach((x, k) => { for (const sd of ["a", "b"] as const) { const e = x[sd]; if (e.chain === X.a.chain && Math.abs(e.s - X.a.s) < 6 || e.chain === X.b.chain && Math.abs(e.s - X.b.s) < 6) console.log(`x${k} ${sd} c${e.chain}@${e.s.toFixed(2)} over ${x.over} other c${x[sd === "a" ? "b" : "a"].chain}@${x[sd === "a" ? "b" : "a"].s.toFixed(2)}`); } });
