// K1283 s11: band_gpu.ts's pass slots per scene: the quads whose pass list overflowed
// BAND_SLOTS (dropped), so contact passes can be checked against the GPU path's slot budget.
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283s11_slots.ts def fat muse_hash g41_user_tw64
import * as O from "./outline";
import * as D from "./draw";
import { bandGpu, BAND_SLOTS } from "../../../../src/render/outline/band_gpu";
import { loadScene } from "./k1279_census";

for (const nm of process.argv.slice(2).filter((a) => !a.startsWith("--"))) {
  const scene = loadScene(nm);
  const t = O.frame(O.structure(scene), scene);
  const zz = D.zChains(scene as never);
  const b = bandGpu(t as never, scene as never, zz as never) as unknown as { dropped: number };
  console.log(`${nm}: BAND_SLOTS ${BAND_SLOTS} dropped ${b.dropped}`);
}
