// K1314 s9: a chain's outline pieces in s order (kind, side, s0..s1, corner, region, first/last point),
// optionally only those overlapping [lo, hi], plus the chain's arm roots and their junctions.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s9_chain.ts <scene> <chain> [--lo=] [--hi=]
import { buildModel } from "./k1314_census";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, cs] = args.filter((a) => !a.startsWith("--"));
const m = buildModel(nm); const c = +cs; const lo = Number(opt("lo") ?? -Infinity); const hi = Number(opt("hi") ?? Infinity);
const P = m.table.pieces as unknown as { kind: string; chain: number; side: number; s0: number; s1: number; corner: number; region: number; pts: number[] }[];
const rows = P.map((p, i) => ({ p, i })).filter(({ p }) => p.chain === c && Math.max(p.s0, p.s1) >= lo && Math.min(p.s0, p.s1) <= hi);
rows.sort((a, b) => a.p.side - b.p.side || a.p.s0 - b.p.s0);
const f = (p: { pts: number[] }, i: number): string => `(${p.pts[2 * i].toFixed(3)},${p.pts[2 * i + 1].toFixed(3)})`;
for (const { p, i } of rows) { const n = p.pts.length / 2; console.log(`piece ${i} ${p.kind} side ${p.side} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} corner ${p.corner} region ${p.region} n ${n} ${f(p, 0)}..${f(p, n - 1)}`); }
const C = (m as unknown as { C?: { chainRoots: number[][]; armsOfChain: number[][]; armObj: { ji: number; kind: string }[] } }).C;
if (C) console.log(`roots c${c}: ` + C.chainRoots[c].map((s, k) => `${s.toFixed(3)}@j${C.armObj[C.armsOfChain[c][k]].ji}`).join(" "));
