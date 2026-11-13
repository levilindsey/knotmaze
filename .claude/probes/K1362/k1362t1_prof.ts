// K1362 t1: profiling loop - buildTables only, scene loaded directly (no outline model).
//   node --cpu-prof scripts/run_node.mjs .claude/probes/K1362/k1362t1_prof.ts [scene] [n]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTables } from "../../../src/render/gpu_field/tables";
import type { FieldScene } from "../../../src/render/field/scene";

const here = dirname(fileURLToPath(import.meta.url));
const nm = process.argv[2] ?? "def";
const N = +(process.argv[3] ?? 200);
const scene = JSON.parse(readFileSync(join(here, "..", "K868", "scenes", `${nm}.json`), "utf8")) as FieldScene;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const aa = 0.5 / (scene.camera.pxPerUnit * 2);
for (let i = 0; i < 10; i++) buildTables(scene, { aa });
const t0 = performance.now();
let T = buildTables(scene, { aa });
for (let i = 0; i < N; i++) T = buildTables(scene, { aa });
console.log(nm, "wall/build ms", ((performance.now() - t0) / (N + 1)).toFixed(3), "ms parts", T.ms, "nV", T.nV, "nA", T.nA, "nK", T.nK, "nCh", T.nCh, "cells", T.gW * T.gH, "chList", T.cellChList.length, "kList", T.cellKList.length);
