// K1247 s33: the ceiling of any hold. Replays a captured drag (s18, sub=N) through frame() on the TRUE input and
// commits each OUTPUT unit (piece, corner, chain) at eps device px: a unit is released on a frame when it is new,
// changes its point count or flags, or any of its points drifts more than eps from its last commit (then it
// recommits). That is the least work any scheme can do while every drawn output stays within eps of the truth
// (check (b)), so it bounds what a local closure could hold. Against it, the input side: chains released by the
// snap's own test at T (no closure), by s32's transitive junction closure (KF_INC.jclose), and by a one-hop
// closure (a moved chain releases the chains it shares a junction with, not further).
// Frame time if only released units were rebuilt: each phase's p50 times its unit's released share (setupBorders,
// cutsEyesExposure and regions by output chains, corners by corners, piecesCapsEtc by piece points), plus the rest.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s33_ceiling.ts <dragDir> [sub=10] [eps=0.25,0.5] [T=0.25]
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { frame, alignJunctionArms, KF_INC, newSnapState, snapScene } from "../../../src/render/outline/outline";
import type { DiagramStructure, OutlineTable, SceneIn } from "../../../src/render/outline/outline";
import { loadDrag } from "./k1247s32_lib";

const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const dir = process.argv[2]; const sub = +arg("sub", "10"); const epsL = arg("eps", "0.25,0.5").split(",").map(Number); const T = +arg("T", "0.25");
const { cap, raw } = loadDrag(dir, sub);
const px = cap[0].camera.pxPerUnit * cap[0].camera.dpr;
const st = (new OutlineModel(cap[0]) as unknown as { st: DiagramStructure }).st;
const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * b.length))] : NaN; };
const pc = (a: number[]): string => `${(100 * q(a, 0.5)).toFixed(1)}% (${(100 * q(a, 0.95)).toFixed(1)}%)`;

// True frames, timed by phase (two warm passes first).
const tabs: OutlineTable[] = []; const scenes: SceneIn[] = [];
for (let w = 0; w < 2; w++) for (const s of raw.slice(0, 40)) frame(st, alignJunctionArms(st, s));
const ph: Record<string, number[]> = {}; const tot: number[] = [];
for (const s of raw) {
  const sc = alignJunctionArms(st, s); scenes.push(sc);
  const P: Record<string, number> = {}; const t0 = performance.now();
  tabs.push(frame(st, sc, P)); tot.push(performance.now() - t0);
  for (const k of Object.keys(P)) (ph[k] ??= []).push(P[k]);
}
const nC = scenes[0].chains.length;
const chainIdx = new Map(scenes[0].chains.map((c, i) => [c.id, i]));

// Input side: the snap at T, its own test, the transitive closure and a one-hop closure.
const inOwn: number[] = []; const inTrans: number[] = []; const inHop: number[] = [];
{
  KF_INC.jclose = false; const S0 = newSnapState(); snapScene(S0, scenes[0], T);
  const own0 = (sc: SceneIn, S: ReturnType<typeof newSnapState>): boolean[] => sc.chains.map((c, i) => {
    const o = S.chains[i]; if (!o || o.length !== c.pts.length) return false;
    const tw2 = (T / px) ** 2; for (let k = 0; k < o.length; k += 2) { const dx = c.pts[k] - o[k]; const dy = c.pts[k + 1] - o[k + 1]; if (dx * dx + dy * dy > tw2) return false; }
    return true;
  });
  const Sh = newSnapState(); KF_INC.jclose = false; snapScene(Sh, scenes[0], T); // the one-hop commit state
  KF_INC.jclose = true; const St = newSnapState(); snapScene(St, scenes[0], T);
  for (let f = 1; f < scenes.length; f++) {
    const sc = scenes[f];
    KF_INC.jclose = false; snapScene(S0, sc, T); inOwn.push(S0.dChains.reduce((a, b) => a + b, 0) / nC);
    KF_INC.jclose = true; snapScene(St, sc, T); inTrans.push(St.dChains.reduce((a, b) => a + b, 0) / nC);
    // one hop: own test on Sh's commits; a junction with a failing arm (or a moved centre) releases its arms once.
    const ok = own0(sc, Sh); const rel = ok.map((o) => !o);
    for (const [ji, j] of sc.junctions.entries()) {
      const old = Sh.junc[ji]; const moved = !old || Math.hypot(j.c[0] - old.c[0], j.c[1] - old.c[1]) > T / px || j.arms.some((a) => !ok[chainIdx.get(a.chain) ?? -1]);
      if (moved) for (const a of j.arms) rel[chainIdx.get(a.chain) ?? 0] = true;
    }
    inHop.push(rel.filter(Boolean).length / nC);
    for (let i = 0; i < nC; i++) if (rel[i]) Sh.chains[i] = Array.from(sc.chains[i].pts as ArrayLike<number>);
    for (const [ji, j] of sc.junctions.entries()) if (!Sh.junc[ji] || j.arms.some((a) => rel[chainIdx.get(a.chain) ?? 0])) Sh.junc[ji] = { ...j, c: [j.c[0], j.c[1]] as [number, number], arms: j.arms.map((a) => ({ ...a })) };
  }
  KF_INC.jclose = true;
}
console.log(`${dir}: ${raw.length} frames, ${nC} chains, ${tabs[0].pieces.length} pieces, ${tabs[0].corners.length} corners, px/unit ${px.toFixed(2)}`);
console.log(`input side, chains released per frame p50 (p95), T ${T}: own test ${pc(inOwn)}, one-hop junction closure ${pc(inHop)}, transitive (s32) ${pc(inTrans)}`);
const P50 = (k: string): number => q(ph[k] ?? [0], 0.5);
const phases = ["setupBorders", "corners", "cutsEyesExposure", "regions", "piecesCapsEtc"];
const sumPh = phases.reduce((a, k) => a + P50(k), 0);
console.log(`frame p50 ${q(tot, 0.5).toFixed(2)} ms; phases p50: ${phases.map((k) => `${k} ${P50(k).toFixed(2)}`).join(", ")}; rest ${(q(tot, 0.5) - sumPh).toFixed(2)}`);

for (const eps of epsL) {
  const e2 = (eps / px) ** 2;
  const cPc = new Map<string, number[]>(); const cCo: (number[] | null)[] = [];
  const shP: number[] = []; const shPP: number[] = []; const shC: number[] = []; const shCh: number[] = []; const shChIn: number[] = [];
  const drift = (a: number[], b: number[]): boolean => { if (a.length !== b.length) return true; for (let k = 0; k + 1 < a.length; k += 2) { const dx = a[k] - b[k]; const dy = a[k + 1] - b[k + 1]; if (dx * dx + dy * dy > e2) return true; } return false; };
  for (let f = 0; f < tabs.length; f++) {
    const t = tabs[f]; const occ = new Map<string, number>(); const chRel = new Uint8Array(nC);
    let nRel = 0; let ptsRel = 0; let ptsAll = 0;
    for (const p of t.pieces) {
      const k0 = `${p.kind}:${p.chain}:${p.side}:${p.corner}`; const o = occ.get(k0) ?? 0; occ.set(k0, o + 1); const k = `${k0}#${o}`;
      const cur = [...p.pts, ...(p.cpts ?? [])]; const old = cPc.get(k); ptsAll += p.pts.length >> 1;
      if (!old || drift(old, cur)) { cPc.set(k, cur); nRel++; ptsRel += p.pts.length >> 1; if (p.chain >= 0 && p.chain < nC) chRel[p.chain] = 1; }
    }
    let cRel = 0;
    t.corners.forEach((c, ci) => {
      const cur = [c.ok ? 1 : 0, 0, c.Vx, c.Vy, c.qx, c.qy, c.tax, c.tay, c.tbx, c.tby];
      const old = cCo[ci];
      if (!old || old[0] !== cur[0] || drift(old.slice(2), cur.slice(2))) { cCo[ci] = cur; cRel++; }
    });
    if (f === 0) continue;
    shP.push(nRel / t.pieces.length); shPP.push(ptsRel / ptsAll); shC.push(t.corners.length ? cRel / t.corners.length : 0);
    shCh.push(chRel.reduce((a, b) => a + b, 0) / nC); shChIn.push(inOwn[f - 1]);
  }
  const est = (k: string, s: number[]): number => P50(k) * q(s, 0.5);
  const fEst = est("setupBorders", shCh) + est("corners", shC) + est("cutsEyesExposure", shCh) + est("regions", shCh) + est("piecesCapsEtc", shPP) + (q(tot, 0.5) - sumPh);
  console.log(`eps ${eps} px, released per frame p50 (p95): pieces ${pc(shP)}, piece points ${pc(shPP)}, corners ${pc(shC)}, chains with a released piece ${pc(shCh)}`);
  console.log(`  frame if only those were rebuilt (p50 phases x p50 shares + the rest): ${fEst.toFixed(2)} ms against ${q(tot, 0.5).toFixed(2)}`);
}
