// K1362 s9: the packed table's bytes per upload (gf_pack.ts packTables: texels used and the texture allocated).
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s9_bytes.ts [scene,...]
import { buildModel } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { buildTables } from "../../../src/render/gpu_field/tables";
import { packTables, GF_TW } from "../../../src/render/gpu_field/gf_pack";

const arg = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "def,muse_hash,fat";
for (const nm of arg.split(",")) {
  const m = buildModel(nm); const sc = m.scene as never as { camera: { pxPerUnit: number } };
  const T = buildTables(m.scene as never, { aa: 0.5 / (sc.camera.pxPerUnit * 2) });
  const P = packTables(T);
  console.log(`${nm.padEnd(12)} rows ${P.rows} x ${GF_TW} texels = ${(P.rows * GF_TW * 16 / 1024).toFixed(1)} KB per upload (RGBA32F)`);
}
