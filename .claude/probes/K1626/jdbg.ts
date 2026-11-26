// K1626 s2 debug: after the settle, turn on ps.jointEyeFlags (FLAGS, 2),
// step one frame and print each src joint eye's arms (parts, t range) and
// its worst lens deficit (target - 3D distance, widths), plus the 2D gap.
//   node scripts/run_node.mjs .claude/probes/K1626/jdbg.ts <root> [query]
import { resolve } from "node:path";
const [, , root, q] = process.argv;
const query = q ?? "?3.FCBQ1H6L4-6NPbeg8HHN09w";
const fsUrl = (p: string): string => "/@fs/" + resolve(root, p).replace(/\\/g, "/");
const { ParticleSystem } = await import(/* @vite-ignore */ fsUrl("src/physics/particle_system.ts"));
const { SleepGate, physicsQuiet } = await import(/* @vite-ignore */ fsUrl("src/physics/sleep_gate.ts"));
const { buildSceneGraph } = await import(/* @vite-ignore */ fsUrl("src/core/scene_graph.ts"));
const { parseParams } = await import(/* @vite-ignore */ fsUrl("src/ui/url_state.ts"));
const p = parseParams(query);
const tuning = {
  temperature: 0, slack: p.slack, drag: p.drag, repulsion: p.repulsion, bend: p.bend,
  smooth: p.smooth, stiffness: p.stiffness, gridAlign: p.gridAlign, threadWidth: p.threadWidth,
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ps: any = new ParticleSystem(buildSceneGraph({ ...p, title: "", glyphs2: "" }).graph);
const gate = new SleepGate();
while (ps.simTime < 40) { const s0 = ps.simTime; ps.step(0.1, tuning); if (gate.frame(physicsQuiet(ps), ps.simTime - s0)) break; }
ps.jointEyeFlags = +(process.env.FLAGS ?? 2);
ps.step(0.1, tuning);
const tw = p.threadWidth;
const P = ps.positions; const Z = ps.zPos;
const H = tw * 2.6;
for (let e = 0; e < ps.jointEyes.length; e++) {
  const E = ps.jointEyes[e];
  const a0 = ps.jeyeStart[e], b0 = ps.jeyeSplit[e], b1 = ps.jeyeEnd[e];
  let worst = -Infinity; let w2 = 0; let wz = 0; let wt = "";
  for (let u = a0; u < b0; u++) for (let v = b0; v < b1; v++) {
    const i = ps.jeyeParts[u], j = ps.jeyeParts[v];
    const t = 0.5 * H * (Math.sin(Math.PI * ps.jeyeT[u]) + Math.sin(Math.PI * ps.jeyeT[v]));
    const dx = P[j * 2] - P[i * 2], dy = P[j * 2 + 1] - P[i * 2 + 1], dz = Z[j] - Z[i];
    const d = Math.hypot(dx, dy, dz);
    if (t - d > worst) { worst = t - d; w2 = Math.hypot(dx, dy); wz = dz; wt = `${ps.jeyeT[u].toFixed(2)}/${ps.jeyeT[v].toFixed(2)} tgt ${(t / tw).toFixed(2)}`; }
  }
  const j = ps.fusedGroupOf[ps.chains[E.ca][E.sa]];
  console.log(`eye ${e} J${j} chains ${E.ca}/${E.cb} slots ${E.sa}${E.da > 0 ? "+" : "-"} ${E.sb}${E.db > 0 ? "+" : "-"} passes ${E.pa.ctrl.toFixed(2)} ${E.pb.ctrl.toFixed(2)} partsA ${b0 - a0} partsB ${b1 - b0} worst deficit ${(worst / tw).toFixed(2)} w (2D ${(w2 / tw).toFixed(2)}, dz ${(wz / tw).toFixed(2)}, t ${wt})`);
}
