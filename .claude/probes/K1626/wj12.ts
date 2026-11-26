// K1626 s3: joint eye 12 (J149xX305) on Levi's link after the width jump 0.75 -> 0.5. Settles as widthjump.ts,
// jumps, steps RUN sim-s; every 0.5 s prints eye 12's state (its passes' ctrl, the joint-to-crossing chord, the
// arms' world arc, the lens pairs under target: count, largest and summed deficit) and chain 82's passes near
// slots 40..72 plus the frame's largest mover.
//   EYE=12 RUN=15 node scripts/run_node.mjs .claude/probes/K1626/wj12.ts
import { ParticleSystem } from "../../../src/physics/particle_system";
import { SleepGate, physicsQuiet } from "../../../src/physics/sleep_gate";
import { buildSceneGraph } from "../../../src/core/scene_graph";
import { parseParams } from "../../../src/ui/url_state";
const RUN = +(process.env.RUN ?? 15);
const EYE = +(process.env.EYE ?? 12);
const W1 = +(process.env.W1 ?? 0.5);
const p = parseParams(process.env.Q ?? "?3.FCBQ1H6L4-6NPbeg8HHN09w");
const tuning = { temperature: 0, slack: p.slack, drag: p.drag, repulsion: p.repulsion, bend: p.bend,
  smooth: p.smooth, stiffness: p.stiffness, gridAlign: p.gridAlign, threadWidth: 0.75 };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ps: any = new ParticleSystem(buildSceneGraph({ ...p, title: "", glyphs2: "" }).graph);
if (process.env.MATMODE) ps.jeyeMatMode = +process.env.MATMODE;
if (process.env.MATFRAC) ps.jeyeMatFrac = +process.env.MATFRAC;
const g = new SleepGate();
while (ps.simTime < 40) { const s0 = ps.simTime; ps.step(0.1, tuning); if (g.frame(physicsQuiet(ps), ps.simTime - s0)) break; }
console.log(`settled ${ps.simTime.toFixed(2)}`);
const E = ps.jointEyes[EYE];
const P: Float32Array = ps.positions;
const at = (c: number, f: number): [number, number] => {
  const ch: number[] = ps.chains[c]; const n = ch.length; const i0 = Math.floor(f); const t = f - i0;
  const a = ch[((i0 % n) + n) % n]; const b = ch[(((i0 + 1) % n) + n) % n];
  return [P[a * 2] * (1 - t) + P[b * 2] * t, P[a * 2 + 1] * (1 - t) + P[b * 2 + 1] * t];
};
function report(tag: string, tw: number): void {
  const H = tw * 3.0; const half = H / 2;
  const a0 = ps.jeyeStart[EYE], b0 = ps.jeyeSplit[EYE], b1 = ps.jeyeEnd[EYE];
  let nAct = 0, maxDef = 0, sumDef = 0, worst = "", nCap = 0, capMin = Infinity;
  for (let u = a0; u < b0; u++) for (let v = b0; v < b1; v++) {
    const i = ps.jeyeParts[u], j = ps.jeyeParts[v];
    let target = half * (Math.sin(Math.PI * ps.jeyeT[u]) + Math.sin(Math.PI * ps.jeyeT[v]));
    // s3: the material bound (filled when jeyeMatMode > 0), at fraction 1.
    if (ps.jeyeMatMode > 0) {
      const bound = Math.hypot(ps.jeyeH[u] + ps.jeyeH[v], ps.jeyeX[u] - ps.jeyeX[v]);
      if (bound < target) { nCap++; capMin = Math.min(capMin, bound / target); }
      if (process.env.CAPPED) target = Math.min(target, ps.jeyeMatFrac * bound);
    }
    const d = Math.hypot(P[j * 2] - P[i * 2], P[j * 2 + 1] - P[i * 2 + 1]);
    if (d < target) { nAct++; sumDef += target - d; if (target - d > maxDef) { maxDef = target - d; worst = `tA ${ps.jeyeT[u].toFixed(2)} tB ${ps.jeyeT[v].toFixed(2)} d ${(d / tw).toFixed(2)}w tgt ${(target / tw).toFixed(2)}w`; } }
  }
  const J = at(E.ca, E.sa); const X = at(E.pa.chain, E.pa.ctrl);
  const arc = (lo: number, hi: number): number => { let s = 0; for (let u = lo; u < hi - 1; u++) { const i = ps.jeyeParts[u], j = ps.jeyeParts[u + 1]; s += Math.hypot(P[j * 2] - P[i * 2], P[j * 2 + 1] - P[i * 2 + 1]); } return s; };
  const pass82 = ps.passesByChain[82].map((x: { ctrl: number }) => x.ctrl).filter((v: number) => v > 40 && v < 75).sort((x: number, y: number) => x - y).map((v: number) => v.toFixed(2)).join(" ");
  console.log(`${tag} eye ${EYE}: pa ${E.pa.ctrl.toFixed(3)} pb ${E.pb.ctrl.toFixed(3)} chord ${(Math.hypot(J[0] - X[0], J[1] - X[1]) / tw).toFixed(2)}w arcA ${arc(a0, b0).toFixed(2)} arcB ${arc(b0, b1).toFixed(2)} parts ${b0 - a0}+${b1 - b0} active ${nAct} maxDef ${(maxDef / tw).toFixed(3)}w sumDef ${(sumDef / tw).toFixed(3)}w ${worst} capped ${nCap} (bound/target min ${capMin.toFixed(2)}) | c82 passes ${pass82}`);
}
report("pre", 0.75);
tuning.threadWidth = W1;
const g2 = new SleepGate(); const t1 = ps.simTime; let last = -1;
const prev = Float32Array.from(P);
const slotOf = (q: number): string => { for (let c = 0; c < ps.chains.length; c++) { const s = ps.chains[c].indexOf(q); if (s >= 0) return `c${c}s${s}`; } return "?"; };
while (ps.simTime < t1 + RUN) {
  const s0 = ps.simTime; ps.step(0.1, tuning);
  const slept = g2.frame(physicsQuiet(ps), ps.simTime - s0);
  let mx = 0, mi = -1;
  for (let i = 0; i < P.length / 2; i++) { const d = Math.hypot(P[2 * i] - prev[2 * i], P[2 * i + 1] - prev[2 * i + 1]); if (d > mx) { mx = d; mi = i; } }
  prev.set(P);
  const t = ps.simTime - t1;
  if (slept) { console.log(`slept at +${t.toFixed(2)}`); report("end", W1); break; }
  if (Math.floor(t * 2) !== last) { last = Math.floor(t * 2); report(`+${t.toFixed(1)} mm ${ps.maxMove.toExponential(1)} fmax ${mx.toExponential(1)} ${slotOf(mi)}`, W1); }
}
