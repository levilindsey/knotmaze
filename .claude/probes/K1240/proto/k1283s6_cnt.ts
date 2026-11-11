import * as O from "../../../../src/render/outline/outline";
import * as F from "../../../../src/render/outline/fill_tri";
import { loadScene } from "./k1279_census";
for (const nm of ["def", "muse_hash", "g41_user_tw64"]) {
  const scene = loadScene(nm); const st = O.structure(scene); const table = O.frame(st, scene);
  const fs = F.fillStructure(st, F.fillResolution(st, table));
  const nd = fs.items.filter((it) => it.kind === "disk").length;
  let t0 = performance.now(); for (let k = 0; k < 20; k++) F.fillFrame(fs, st, table, scene); const ms = (performance.now() - t0) / 20;
  console.log(`${nm}: disks ${nd}, nV ${fs.nV}, fillFrame ${ms.toFixed(2)} ms`);
}