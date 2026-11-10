// K1247 s12: where full and reduced frames disagree on structure: per chain,
// the active station slots and the interval/region counts, plus the first
// piece key that differs. def's cycle frame f uses k1247s8_acc's perturbT.
// Usage: node scripts/run_node.mjs <this> <scene> <eps> [--cyc=<f>] [--mult=<m>] [--jit=<px>: k1247s9_union's jitter instead of reduction]
import { structure, frame, debugCache, type SceneIn } from "./outline";
import { sceneOf, load } from "./k1247s5_scenes";
import { selectKeep, reduceScene } from "./k1247s8_reduce";
const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, ep] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const still = load(nm); const S = still.camera.pxPerUnit * 2; const h = still.look.halfWidth;
function perturbT(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return sc;
}
const K = selectKeep(still, { eps: +ep / S });
const cyc = arg("cyc"); const mult = arg("mult");
const sc = cyc !== undefined ? perturbT(still, ((+cyc <= 20 ? +cyc : 40 - +cyc) / 20) * 0.5 * h) : mult !== undefined ? sceneOf(nm, +mult) : still;
const jit = arg("jit");
let scB = reduceScene(sc, K); let stillB = reduceScene(still, K);
if (jit !== undefined) { // k1247s9_union's jitter of the (cycle) still, structure from the jittered scene
  let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  scB = JSON.parse(JSON.stringify(sc)) as SceneIn;
  for (const c of scB.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * +jit) / S / Math.SQRT2;
  stillB = scB;
}
const stA = structure(jit !== undefined ? sc : still); const stB = structure(stillB);
const A = frame(stA, sc) as any; const B = frame(stB, scB) as any;
const CA = debugCache(stA) as any; const CB = debugCache(stB) as any;
const nCh = CA.nCh;
const per = (C: any): { act: Set<number>[]; iv: number[]; reg: number[] } => {
  const act = Array.from({ length: nCh }, () => new Set<number>()); const iv = new Array(nCh).fill(0); const reg = new Array(nCh).fill(0);
  for (let s = 0; s < C.nSlots; s++) if (C.stActive[s]) act[C.slotPi[s]].add(s);
  for (let i = 0; i < C.nIv; i++) { iv[C.ivPi[i]]++; if (C.ivRegion[i] >= 0) reg[C.ivPi[i]]++; }
  return { act, iv, reg };
};
const pa = per(CA); const pb = per(CB);
for (let c = 0; c < nCh; c++) {
  const onlyA = [...pa.act[c]].filter((s) => !pb.act[c].has(s)); const onlyB = [...pb.act[c]].filter((s) => !pa.act[c].has(s));
  if (onlyA.length || onlyB.length || pa.iv[c] !== pb.iv[c] || pa.reg[c] !== pb.reg[c]) {
    const nm2 = (C: any, s: number): string => { const k = C.slotKind[s]; const r = C.slotRank[s]; return `slot${s}:${["xU", "xO", "jn", "cap", "seam"][k]}${k < 2 ? `x${r >> 2}.${r & 3}` : ""}`; };
    console.log(`chain ${c}: iv ${pa.iv[c]}/${pb.iv[c]} regions ${pa.reg[c]}/${pb.reg[c]}; active only full [${onlyA.map((s) => nm2(CA, s)).join(" ")}] only red [${onlyB.map((s) => nm2(CB, s)).join(" ")}]`);
  }
}
const dch = arg("chain");
if (dch !== undefined) for (const [C, tag] of [[CA, "full"], [CB, "red "]] as const) {
  const nmS = (s: number): string => { const k = C.slotKind[s]; const r = C.slotRank[s]; return `${s}:${["xU", "xO", "jn", "cap", "seam"][k]}${k < 2 ? `x${r >> 2}.${r & 3}` : ""}`; };
  const iv: string[] = [];
  for (let i = 0; i < C.nIv; i++) if (C.ivPi[i] === +dch) iv.push(`${nmS(C.ivA[i])}->${nmS(C.ivB[i])} d${C.ivDiscard[i]} r${C.ivRegion[i]} len${C.ivLen[i].toFixed(3)}`);
  console.log(`${tag} chain ${dch}: ` + iv.join(" | "));
}
const pA = A.pieces; const pB = B.pieces;
console.log(`pieces ${pA.length}/${pB.length} regions ${A.regions.length}/${B.regions.length}`);
for (let i = 0; i < Math.min(pA.length, pB.length); i++) {
  const p = pA[i]; const r = pB[i];
  if (p.kind !== r.kind || p.chain !== r.chain || p.side !== r.side || p.corner !== r.corner || p.region !== r.region) {
    console.log(`first key diff piece ${i}: ${p.kind}/${p.chain}/${p.side}/${p.corner}/${p.region} vs ${r.kind}/${r.chain}/${r.side}/${r.corner}/${r.region}`);
    for (const [st, tag] of [[stA, "full"], [stB, "red "]] as const) {
      const dp = (st as any).piecesD?.[i]; const iv = dp && dp.interval >= 0 ? (st as any).intervalsD[dp.interval] : null;
      const C = tag === "full" ? CA : CB;
      if (iv) {
        const a = C.dgSlot[iv.aSt]; const b = C.dgSlot[iv.bSt]; const fi: string[] = [];
        for (let k = 0; k < C.nIv; k++) if (C.ivA[k] === a || C.ivB[k] === b) fi.push(`${C.ivA[k]}->${C.ivB[k]} d${C.ivDiscard[k]} r${C.ivRegion[k]}`);
        console.log(`  ${tag} diagram interval ${dp.interval}: ${(st as any).stationsD[iv.aSt].key} -> ${(st as any).stationsD[iv.bSt].key} discard ${iv.discard}; slots ${a}(act ${C.stActive[a]}) -> ${b}(act ${C.stActive[b]}); frame ivs ${fi.join(", ")}`);
      }
    }
    break;
  }
}
