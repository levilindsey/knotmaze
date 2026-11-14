import { readFileSync } from "node:fs";
import { buildTables } from "../../../src/render/gpu_field/tables";
for (const nm of ["def", "muse_hash", "fat"]) {
  const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${nm}.json`, "utf8"));
  const aa = 0.5 / (scene.camera.pxPerUnit * 2);
  const T = buildTables(scene, { aa }) as any;
  let full = 0, fullK = 0, runsK = 0, runsF = 0;
  for (let cy = 0; cy < T.gH; cy++) { let prev = -1; for (let cx = 0; cx < T.gW; cx++) { const i = cy * T.gW + cx; const k = T.cellKN[i] > 0 ? 1 : 0; if (k !== prev) { if (k) runsK++; else runsF++; prev = k; } if (T.cellChN[i] > 0) { full++; if (k) fullK++; } } }
  console.log(`${nm}: grid ${T.gW}x${T.gH} nonempty ${full} with corners ${fullK} (${(100*fullK/full).toFixed(1)}%); row runs: corner ${runsK} free ${runsF}; nK ${T.nK}`);
}
