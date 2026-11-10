// K1247 s14: the underlays per scene at rest (mult 0): structural discard pairs (nU), the
// frame's discarded intervals, those at no structural pair (underMiss), and the underlays
// with a band (>= 3 points). With a chain argument, lists that chain's discarded intervals
// (slots A, B, the pair's underlay or -1).
// Usage: node scripts/run_node.mjs <this> [scene filter] [chain]
import { structure, frame, frameRef, debugCache } from "./outline";
import { sceneOf, load } from "./k1247s5_scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const [filt, chS] = process.argv.slice(2);
for (const nm of ALL) {
  if (filt && !nm.includes(filt)) continue;
  const st = structure(load(nm)); const T = frame(st, sceneOf(nm, 0)) as any;
  const C = debugCache(st) as any; const R = C.sReg;
  let nD = 0; let banded = 0;
  for (let i = 0; i < C.nIv; i++) if (C.ivDiscard[i]) nD++;
  if (R) for (let u = 0; u < R.nU; u++) { const rg = T.regions[R.n + u]; if (rg && rg.pts.length >= 6) banded++; }
  // frameRef's underlays against the fast path's: count, id, owner, point count, max point gap.
  const TR = frameRef(structure(load(nm)), sceneOf(nm, 0)) as any;
  let refDiff = 0; let refMax = 0;
  if (R) for (let u = 0; u < R.nU; u++) {
    const a = T.regions[R.n + u]; const b = TR.regions[R.n + u];
    if (!b || a.ownerChain !== b.ownerChain || a.pts.length !== b.pts.length) { refDiff++; continue; }
    for (let k = 0; k < a.pts.length; k++) refMax = Math.max(refMax, Math.abs(a.pts[k] - b.pts[k]));
  }
  console.log(`${nm}: nU ${R?.nU} discarded ${nD} underMiss ${C.underMiss} banded ${banded} regions ${T.regions.length} (ref ${TR.regions.length}) sR.n ${R?.n} | ref underlays differing ${refDiff}, max pt gap ${refMax.toExponential(2)}`);
  const nX = (st as any).crossings?.length ?? 0; const kn = ["xU", "xO", "jn", "cap", "seam"];
  const sl = (s: number): string => { const k = C.slotKind[s]; const r = C.slotRank[s]; return `${kn[k]}:${k < 2 ? `x${r >> 2}.${r & 3}` : k === 2 ? `arm${r - nX * 4}` : `r${r}`} cS ${C.stCS[s].toFixed(4)}`; };
  if (chS !== undefined) for (let i = 0; i < C.nIv; i++) if (C.ivDiscard[i] && C.ivPi[i] === +chS) console.log(`  iv${i} A ${C.ivA[i]} (${sl(C.ivA[i])}) B ${C.ivB[i]} (${sl(C.ivB[i])}) eA ${C.ivEA[i]} len ${C.ivLen[i].toFixed(4)} u ${R.uOfPair.get(C.ivA[i] * R.nS + C.ivB[i]) ?? -1}`);
}
