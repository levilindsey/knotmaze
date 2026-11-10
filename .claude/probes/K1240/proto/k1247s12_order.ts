// K1247 s12: does each chain's frame station order (cS) agree with the
// diagram's structural order (the feature's scene s: crossing sUnder/sOver,
// arm root s, caps at the ends)? Per scene and mult, plus every scene's
// 40-frame cycle (acc's perturbT), full and reduced at --eps (device px).
// A disagreement lists the chain, the two slots and their cS and sKey.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s12_order.ts [--eps=0,0.1,0.2] [--scene=a,b] [--cyc] [--list=6]
import { structure, frame, debugCache, type SceneIn } from "./outline";
import { ALL, multsOf, sceneOf, load } from "./k1247s5_scenes";
import { selectKeep, reduceScene } from "./k1247s8_reduce";
const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const epsL = (arg("eps") ?? "0,0.1,0.2").split(",").map(Number);
const names = arg("scene") ? arg("scene")!.split(",") : ALL;
const doCyc = process.argv.includes("--cyc");
const nList = +(arg("list") ?? 6);
function perturbT(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return sc;
}
const kindName = ["xU", "xO", "jn", "cap", "seam"];
function check(st: any, sc: SceneIn, tag: string, out: string[]): number {
  frame(st, sc);
  const C = debugCache(st) as any;
  const nX = st.crossings.length; const nArms = st.arms.length;
  const key = (s: number): number => {
    const k = C.slotKind[s]; const r = C.slotRank[s];
    if (k === 0) return st.crossings[r >> 2].sUnder;
    if (k === 1) return st.crossings[r >> 2].sOver;
    if (k === 2) return st.arms[r - nX * 4].s;
    if (k === 3) return ((r - nX * 4 - nArms) & 1) ? 1e12 : -1e12;
    return 0;
  };
  const who = (s: number): string => { const k = C.slotKind[s]; const r = C.slotRank[s]; return k < 2 ? `x${r >> 2}.${r & 3}` : k === 2 ? `arm${r - nX * 4}` : `r${r}`; };
  let bad = 0;
  const per: number[][] = Array.from({ length: C.nCh }, () => []);
  for (let s = 0; s < C.nSlots; s++) if (C.stActive[s]) per[C.slotPi[s]].push(s);
  for (let pi = 0; pi < C.nCh; pi++) {
    const l = per[pi]; if (l.length < 2) continue;
    const closed = st.closed[pi];
    const byCS = [...l].sort((a, b) => (C.stCS[a] - C.stCS[b]) || (C.slotRank[a] - C.slotRank[b]));
    const byKey = [...l].sort((a, b) => (key(a) - key(b)) || (C.stCS[a] - C.stCS[b]) || (C.slotRank[a] - C.slotRank[b]));
    // Closed: compare cyclically (rotate byCS to start at byKey[0]).
    let A = byCS; if (closed) { const i0 = byCS.indexOf(byKey[0]); A = [...byCS.slice(i0), ...byCS.slice(0, i0)]; }
    for (let i = 0; i < A.length; i++) if (A[i] !== byKey[i]) {
      bad++;
      const u = byKey[i]; const v = A[i];
      if (out.length < nList) out.push(`${tag} chain ${pi}${closed ? " (closed)" : ""}: key order ${who(u)}(${kindName[C.slotKind[u]]}, sKey ${key(u).toFixed(3)}, cS ${C.stCS[u].toFixed(4)}) but cS order ${who(v)}(${kindName[C.slotKind[v]]}, sKey ${key(v).toFixed(3)}, cS ${C.stCS[v].toFixed(4)})`);
      break;
    }
  }
  return bad;
}
for (const name of names) {
  const still = load(name); const S = still.camera.pxPerUnit * 2; const h = still.look.halfWidth;
  for (const eps of epsL) {
    const K = eps > 0 ? selectKeep(still, { eps: eps / S }) : null;
    const red = (s: SceneIn): SceneIn => (K ? reduceScene(s, K) : s);
    const st = structure(red(still));
    const out: string[] = []; let bad = 0; let n = 0;
    for (const m of multsOf(name)) { bad += check(structure(red(still)), red(sceneOf(name, m)), `${m}`, out); n++; }
    if (doCyc) {
      for (let k = 1; k <= 20; k++) { bad += check(st, red(perturbT(still, (k / 20) * 0.5 * h)), `cyc${k}`, out); n++; }
    }
    console.log(`${name} eps ${eps}: ${bad} chain(s) out of order over ${n} frames`);
    for (const o of out) console.log("   " + o);
  }
}
