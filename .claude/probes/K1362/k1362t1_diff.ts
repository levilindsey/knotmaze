// K1362 t1: per-field max |a-b| between this build's buildTables and a reference
// build's (argv[2] = its tables.ts path or module specifier), on one scene.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362t1_diff.ts <refTablesPath> [scene]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTables as buildNew } from "../../../src/render/gpu_field/tables";
import type { FieldScene } from "../../../src/render/field/scene";

const here = dirname(fileURLToPath(import.meta.url));
const refPath = process.argv[2];
const nm = process.argv[3] ?? "muse_hash";
const ref = (await import(/* @vite-ignore */ refPath)) as { buildTables: typeof buildNew };
const scene = JSON.parse(readFileSync(join(here, "..", "K868", "scenes", `${nm}.json`), "utf8")) as FieldScene;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const opts = { aa: 0.5 / (scene.camera.pxPerUnit * 2) };
const A = buildNew(scene, opts);
const B = ref.buildTables(scene, opts);
const FIELDS = Object.keys(A).filter((k) => k !== "ms");
for (const f of FIELDS) {
  const a = (A as unknown as Record<string, unknown>)[f];
  const b = (B as unknown as Record<string, unknown>)[f];
  if (typeof a === "number") { console.log(f, "scalar", a, b, a === b ? "EQ" : "DIFF"); continue; }
  const aa = a as ArrayLike<number>; const bb = b as ArrayLike<number>;
  let mx = 0; let mi = -1;
  const n = Math.min(aa.length, bb.length);
  for (let i = 0; i < n; i++) { const d = Math.abs(aa[i] - bb[i]); if (d > mx) { mx = d; mi = i; } }
  console.log(f, `len ${aa.length}/${bb.length}`, "maxdiff", mx, "at", mi, mx === 0 ? "EQ" : "DIFF");
}
