// K1247 s12: region groups from structure (st.regGroup) vs the per-frame cap
// ramp at cMid (K12_GROUPCMID=1). At rest they must agree (fast and ref);
// over k1247s8_acc's def cycle frames, count regions whose group moves off
// the rest group under the old rule (the new rule cannot move by construction).
// Usage: node scripts/run_node.mjs <this> [scene...]
import { structure, frame, frameRef, type SceneIn } from "./outline";
import { load, ALL } from "./k1247s5_scenes";
const names = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
function perturbT(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return sc;
}
const groups = (fr: any): number[] => fr.regions.map((r: any) => r.group);
for (const nm of names) {
  const still = load(nm); const h = still.look.halfWidth;
  process.env.K12_GROUPCMID = "1"; const stO = structure(still);
  delete process.env.K12_GROUPCMID; const stN = structure(still);
  const gO = groups(frame(stO, still)); const gN = groups(frame(stN, still)); const gR = groups(frameRef(stN, still));
  let restDiff = 0; let refDiff = 0;
  for (let i = 0; i < Math.max(gO.length, gN.length); i++) { if (gO[i] !== gN[i]) restDiff++; if (gR[i] !== gN[i]) refDiff++; }
  let oldMoves = 0; let oldFrames = 0;
  for (let f = 1; f <= 20; f++) {
    const sc = perturbT(still, (f / 20) * 0.5 * h);
    const g = groups(frame(stO, sc)); let m = 0;
    for (let i = 0; i < Math.min(g.length, gO.length); i++) if (g[i] !== gO[i]) m++;
    oldMoves += m; if (m) oldFrames++;
  }
  console.log(`${nm}: regions ${gN.length} (old ${gO.length}); rest groups differ ${restDiff}; ref vs fast ${refDiff}; old rule over cyc 1-20: ${oldMoves} region-frames off rest in ${oldFrames} frames`);
}
