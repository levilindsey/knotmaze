// K1247 s14: one chain's intervals at rest (mult 0) in the fast path: index, slots A and B
// (kind, crossing.pass or arm, cS, active), envelope start eA, length, discard, region, and
// the region's point count. For fat's 1 px crack at kink x136 (chain 2), where region 1028
// carries master's sliver region 1029.
// Usage: node scripts/run_node.mjs <this> <scene> <chain> [sMin] [sMax]
import { structure, frame, debugCache } from "./outline";
import { sceneOf, load } from "./k1247s5_scenes";
const [nm, chS, s0S, s1S] = process.argv.slice(2); const ch = +chS;
const sMin = s0S !== undefined ? +s0S : -Infinity; const sMax = s1S !== undefined ? +s1S : Infinity;
const st = structure(load(nm)); const T = frame(st, sceneOf(nm, 0)) as any;
const C = debugCache(st) as any;
const nX = (st as any).crossings?.length ?? 0; const kn = ["xU", "xO", "jn", "cap", "seam"];
const sl = (s: number): string => { const k = C.slotKind[s]; const r = C.slotRank[s]; return `${s}:${kn[k]}:${k < 2 ? `x${r >> 2}.${r & 3}` : k === 2 ? `arm${r - nX * 4}` : `r${r}`} cS ${C.stCS[s].toFixed(4)} L ${C.stLeft[s]} R ${C.stRight[s]}${C.stActive[s] ? "" : " OFF"}`; };
for (let i = 0; i < C.nIv; i++) {
  if (C.ivPi[i] !== ch) continue;
  const a = C.stCS[C.ivA[i]]; if (a < sMin || a > sMax) continue;
  const rid = C.ivRegion[i]; const rg = rid >= 0 ? T.regions.find((r: any) => r.id === rid) : undefined;
  console.log(`iv${i} A ${sl(C.ivA[i])} | B ${sl(C.ivB[i])} | eA ${C.ivEA[i]} len ${C.ivLen[i].toFixed(4)}${C.ivDiscard[i] ? " DISCARD" : ""} region ${rid} n ${rg ? rg.pts.length / 2 : "-"}`);
}
