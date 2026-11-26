// K1626 s2: why Levi's link does not re-sleep after the width jump (0.75 -> 0.5) on stage 2. Settles as widthjump.ts,
// jumps, then steps RUN sim-s printing each 2 s the frame's largest particle move and whether that particle sits in a
// joint-eye arm; MODE=off drops the eye pressure after the jump (the control).
//   node scripts/run_node.mjs .claude/probes/K1626/wj_diag.ts
import { ParticleSystem } from "../../../src/physics/particle_system";
import { SleepGate, physicsQuiet } from "../../../src/physics/sleep_gate";
import { buildSceneGraph } from "../../../src/core/scene_graph";
import { parseParams } from "../../../src/ui/url_state";
const RUN = +(process.env.RUN ?? 40);
const MODE = process.env.MODE ?? "on";
const p = parseParams(process.env.Q ?? "?3.FCBQ1H6L4-6NPbeg8HHN09w");
const tuning = { temperature: 0, slack: p.slack, drag: p.drag, repulsion: p.repulsion, bend: p.bend,
  smooth: p.smooth, stiffness: p.stiffness, gridAlign: p.gridAlign, threadWidth: 0.75 };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ps: any = new ParticleSystem(buildSceneGraph({ ...p, title: "", glyphs2: "" }).graph);
const g = new SleepGate();
while (ps.simTime < 40) { const s0 = ps.simTime; ps.step(0.1, tuning); if (g.frame(physicsQuiet(ps), ps.simTime - s0)) break; }
tuning.threadWidth = 0.5;
if (MODE === "off") ps.applyJointEyePressure = () => {};
// Variants of the pressure (MODE cap<k>: each pair's move capped at k world units a substep; soft<k>: stiffness x k).
const SKIP = MODE.startsWith("skip") ? +MODE.slice(4) : -1;
const CAP = MODE.startsWith("cap") ? +MODE.slice(3) : Infinity; const SOFT = MODE.startsWith("soft") ? +MODE.slice(4) : 1;
if (MODE.startsWith("cap") || MODE.startsWith("soft") || SKIP >= 0) ps.applyJointEyePressure = function (H: number, stiffness: number): void {
  const P = this.positions; const eyes = this.jointEyes; const half = H * 0.5; stiffness *= SOFT;
  for (let e = 0; e < eyes.length; e++) { if (e === SKIP) continue;
    const a0 = this.jeyeStart[e], b0 = this.jeyeSplit[e], b1 = this.jeyeEnd[e];
    for (let u = a0; u < b0; u++) { const i = this.jeyeParts[u]; const sA = Math.sin(Math.PI * this.jeyeT[u]);
      for (let v = b0; v < b1; v++) { const j = this.jeyeParts[v]; if (i === j) continue;
        const target = half * (sA + Math.sin(Math.PI * this.jeyeT[v]));
        const dx = P[j * 2] - P[i * 2], dy = P[j * 2 + 1] - P[i * 2 + 1]; const d2 = dx * dx + dy * dy;
        if (d2 >= target * target || d2 < 1e-9) continue; const dist = Math.sqrt(d2);
        let push = ((target - dist) / dist) * stiffness * 0.5; if (push * dist > CAP) push = CAP / dist;
        P[i * 2] -= dx * push; P[i * 2 + 1] -= dy * push; P[j * 2] += dx * push; P[j * 2 + 1] += dy * push; } } }
};
if (process.env.WHO) { const q = +process.env.WHO; ps.chains.forEach((ch: number[], c: number) => { const s = ch.indexOf(q); if (s >= 0) { const fg = ps.fusedGroupOf?.[q]; const passes = ps.passesByChain[c].map((x: { ctrl: number }) => x.ctrl).filter((v: number) => Math.abs(v - s) < 6); const fus = ch.map((m: number, k: number) => (ps.fusedGroupOf[m] >= 0 ? k : -1)).filter((k: number) => k >= 0 && Math.abs(k - s) < 10); console.log(`p${q}: chain ${c} len ${ch.length} slot ${s} fusedGroup ${fg} passes near ${passes.map((v: number) => v.toFixed(2))} fused slots near ${fus} pos ${ps.positions[2 * q].toFixed(2)},${ps.positions[2 * q + 1].toFixed(2)}`); } }); }
if (process.env.EYEN) { const e = +process.env.EYEN; const E = ps.jointEyes[e]; const x = ps.crossings.findIndex((X: { over: unknown; under: unknown }) => X.over === E.pa || X.under === E.pa || X.over === E.pb || X.under === E.pb); const pa = ps.chains[E.ca][E.sa]; const j = ps.fusedJunctions.findIndex((g: ArrayLike<number>) => Array.from(g).includes(pa)); console.log(`eye ${e} = J${j}xX${x}: A c${E.ca} s${E.sa} pass ${E.pa.ctrl.toFixed(2)} | B c${E.cb} s${E.sb} pass ${E.pb.ctrl.toFixed(2)}`); }
if (process.env.EYES82) { (ps.jointEyes ?? []).forEach((E: { ca: number; sa: number; da: number; pa: { ctrl: number }; cb: number; sb: number; db: number; pb: { ctrl: number } }, e: number) => { if (E.ca === 82 || E.cb === 82) console.log(`eye ${e}: A c${E.ca} s${E.sa} d${E.da} pass ${E.pa.ctrl.toFixed(2)} | B c${E.cb} s${E.sb} d${E.db} pass ${E.pb.ctrl.toFixed(2)} parts ${ps.jeyeEnd[e] - ps.jeyeStart[e]}`); }); }
console.log(`${MODE} eyes ${ps.jointEyes.length}`);
const g2 = new SleepGate(); const t1 = ps.simTime; let last = -1;
const prev = Float32Array.from(ps.positions);
const inArm = (q: number): number => { for (let k = 0; k < ps.jeyeEnd?.[ps.jeyeEnd.length - 1]; k++) if (ps.jeyeParts[k] === q) return 1; return 0; };
while (ps.simTime < t1 + RUN) {
  const s0 = ps.simTime; ps.step(0.1, tuning);
  const slept = g2.frame(physicsQuiet(ps), ps.simTime - s0);
  const P = ps.positions; let mx = 0, mi = -1;
  for (let i = 0; i < P.length / 2; i++) { const d = Math.hypot(P[2 * i] - prev[2 * i], P[2 * i + 1] - prev[2 * i + 1]); if (d > mx) { mx = d; mi = i; } }
  prev.set(P);
  const t = ps.simTime - t1;
  if (slept) { console.log(`${MODE} slept at +${t.toFixed(2)}`); break; }
  if (Math.floor(t / 2) !== last) { last = Math.floor(t / 2);
    console.log(`${MODE} +${t.toFixed(1)} maxMove ${ps.maxMove.toExponential(2)} frameMax ${mx.toExponential(2)} at p${mi} inEyeArm ${inArm(mi)} still ${g2.stillTime.toFixed(2)} settle ${ps.settleComplete}`); }
}
