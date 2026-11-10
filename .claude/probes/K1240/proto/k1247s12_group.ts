// K1247 s12: region groups at rest, today's (cap ramp at cMid, cut-limited L)
// vs a structural rule: the group of the arm whose root slot bounds the
// interval on the arm's own side (dir +1 at A, dir -1 at B), else -1.
// Usage: node scripts/run_node.mjs <this> [scene...]
import { structure, frame, debugCache } from "./outline";
import { load, ALL } from "./k1247s5_scenes";
const names = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
for (const nm of names) {
  const sc = load(nm); const st = structure(sc); const fr = frame(st, sc) as any; const C = debugCache(st) as any;
  const nX = (st as any).crossings.length;
  const armOf = (s: number): number => (C.slotKind[s] === 2 ? C.slotRank[s] - nX * 4 : -1);
  let n = 0; let same = 0; const diffs: string[] = [];
  for (let i = 0; i < C.nIv; i++) {
    const rid = C.ivRegion[i]; if (rid < 0) continue;
    n++;
    const cur = fr.regions[rid].group;
    const a = armOf(C.ivA[i]); const b = armOf(C.ivB[i]);
    let g = -1;
    if (a >= 0 && (st as any).arms[a].dir > 0) g = (st as any).groupOfJ[(st as any).arms[a].ji];
    else if (b >= 0 && (st as any).arms[b].dir < 0) g = (st as any).groupOfJ[(st as any).arms[b].ji];
    if (g === cur) same++; else if (diffs.length < 6) diffs.push(`r${rid} chain ${C.ivPi[i]} len ${C.ivLen[i].toFixed(3)} cur ${cur} rule ${g} (A ${a >= 0 ? "arm" : C.slotKind[C.ivA[i]]} B ${b >= 0 ? "arm" : C.slotKind[C.ivB[i]]})`);
  }
  console.log(`${nm}: regions ${n}, same ${same}, differ ${n - same}${diffs.length ? "; " + diffs.join("; ") : ""}`);
}
