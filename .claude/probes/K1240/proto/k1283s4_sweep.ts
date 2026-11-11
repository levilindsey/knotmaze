// K1283 s4: the spot list for a stray-ink sweep: every junction of every scene with an end arm (where a
// tail and stage 4's round end live), as k1283s4_crops spec args <scene>:<x>:<y>:j<ji>, one per line.
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs \
//     .claude/probes/K1240/proto/k1283s4_sweep.ts <scene> [<scene> ...]
// then: k1283s4_crops.ts <out.png> <specs...> --err --noimg (scores each spot: after off form B by more
// than before on N px).
import { loadScene } from "./k1279_census";
import * as O from "./outline";

for (const name of process.argv.slice(2)) {
  const scene = loadScene(name) as unknown as O.SceneIn;
  const st = O.structure(scene);
  const seen = new Set<number>();
  for (const c of st.corners) {
    if (seen.has(c.ji)) continue;
    if (st.arms[c.aArm].kind !== "end" && st.arms[c.bArm].kind !== "end") continue;
    seen.add(c.ji);
    const j = scene.junctions[c.ji].c;
    console.log(`${name}:${j[0].toFixed(3)}:${j[1].toFixed(3)}:j${c.ji}`);
  }
}
