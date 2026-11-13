import { readFileSync } from "node:fs";
import { frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import * as D from "../../../src/render/outline/draw";
for (const nm of ["muse_hash", "def", "fat", "g41_user_tw64"]) {
  const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${nm}.json`, "utf8")) as SceneIn;
  (sc.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  const table = D && frame(structure(sc), sc); const zz = D.zChains(sc);
  const t0 = performance.now(); const bd = D.bandData(table, sc, zz); const t1 = performance.now();
  let sa = 0; for (const a of bd.bandAlpha) sa += a;
  console.log(`${nm}: ${(t1 - t0).toFixed(0)} ms, ${bd.bandCount / 3} tris, alpha sum ${sa.toFixed(1)}`);
}
