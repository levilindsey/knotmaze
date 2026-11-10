// K1247 s12: a chain's station slots and intervals, full frame vs reduced frame.
// Usage: node scripts/run_node.mjs <this> <scene> <mult> <eps> <chain>
import { structure, frame, debugCache } from "./outline";
import { sceneOf, load } from "./k1247s5_scenes";
import { selectKeep, reduceScene } from "./k1247s8_reduce";
const [nm, mu, ep, chS] = process.argv.slice(2); const ch = +chS;
const still = load(nm); const S = still.camera.pxPerUnit * 2;
const K = selectKeep(still, { eps: +ep / S }); const sc = sceneOf(nm, +mu);
const stA = structure(still); const stB = structure(reduceScene(still, K));
const A = frame(stA, sc) as any; const B = frame(stB, reduceScene(sc, K)) as any;
const kindName = ["xU", "xO", "jn", "cap", "seam"];
for (const [st, fr, tag] of [[stA, A, "full"], [stB, B, "red "]] as const) {
  const C = debugCache(st) as any;
  const nX = (st as any).crossings?.length ?? 0;
  const rows: string[] = [];
  for (let s = 0; s < C.nSlots; s++) {
    if (C.slotPi[s] !== ch) continue;
    const r = C.slotRank[s]; const k = C.slotKind[s];
    const who = k < 2 ? `x${r >> 2}.${r & 3}` : k === 2 ? `arm${r - nX * 4}` : `r${r}`;
    rows.push(`${C.stActive[s] ? "+" : "-"} slot${s} ${kindName[k]} ${who} cS=${C.stCS[s].toFixed(6)} L${C.stLeft[s]} R${C.stRight[s]}`);
  }
  rows.sort((a, b) => +(a.match(/cS=(\S+)/)![1]) - +(b.match(/cS=(\S+)/)![1]));
  console.log(`${tag} chain ${ch} slots (${rows.length}):`); rows.forEach((r) => console.log("  " + r));
  const iv: string[] = [];
  for (let i = 0; i < C.nIv; i++) if (C.ivPi[i] === ch) iv.push(`iv${i} ${C.ivA[i]}->${C.ivB[i]} len=${C.ivLen[i].toFixed(4)} mid=${C.ivCMid[i].toFixed(4)} d${C.ivDiscard[i]} reg${C.ivRegion[i]}`);
  console.log(`${tag} chain ${ch} intervals: ` + iv.join(" | "));
  void fr;
}
