// K1247 s34: each drag's halfWidth and the jlocal release radii in device px (R = jR hw, R + M = (jR + jM) hw).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s34_hw.ts
import { KF_INC } from "../../../src/render/outline/outline";
import { loadDrag } from "./k1247s32_lib";
for (const g of ["def", "muse_hash", "fat"]) {
  const { cap } = loadDrag(`.claude/probes/K1247/out/s18/drag/${g}`, 10); const c = cap[0];
  const px = c.camera.pxPerUnit * c.camera.dpr; const hw = c.look.halfWidth;
  console.log(`${g}: hw ${hw} world = ${(hw * px).toFixed(2)} px; R ${(KF_INC.jR * hw * px).toFixed(1)} px, R + M ${((KF_INC.jR + KF_INC.jM) * hw * px).toFixed(1)} px`);
}
