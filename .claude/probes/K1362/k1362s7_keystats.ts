// K1362 s6: the keys' loop lengths per scene: pins and arms per chain (depth's binary search, member's arm loops),
// weighted by the segments that reference the chain (a piece's chain). Read-only on the site's scene copies.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s7_keystats.ts def muse_hash fat
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildTables } from "../../../src/render/gpu_field/tables";
import type { FieldScene } from "../../../src/render/field/scene";

const dir = join(".claude", "probes", "K1362", "out", "s6", "site", "scenes");
for (const name of process.argv.slice(2)) {
  const S = JSON.parse(readFileSync(join(dir, `${name}.json`), "utf8")) as FieldScene;
  const T = buildTables(S, { aa: 0.5 });
  let w = 0; let pins = 0; let arms = 0; let maxPin = 0; let maxArm = 0; let unsorted = 0;
  for (let c = 0; c < T.nC; c++) {
    const nseg = T.cNV[c] - 1;
    w += nseg; pins += nseg * T.cPinN[c]; arms += nseg * T.cArmN[c];
    maxPin = Math.max(maxPin, T.cPinN[c]); maxArm = Math.max(maxArm, T.cArmN[c]);
    for (let i = 1; i < T.cPinN[c]; i++) if (T.pinS[T.cPin0[c] + i] < T.pinS[T.cPin0[c] + i - 1]) unsorted++;
  }
  console.log(`${name}: chains ${T.nC}, segments ${w}, per segment's chain: pins ${(pins / w).toFixed(1)} (max ${maxPin}), arms ${(arms / w).toFixed(1)} (max ${maxArm}); unsorted pin pairs ${unsorted}`);
}
