// K1362 t1: Done 1 tolerance check of buildTables against a reference build
// (argv[2] = its tables.ts file URL) on the digest corpus (12 census scenes +
// every s18 drag frame). Integer fields must be exactly equal; float fields
// report their largest absolute difference (Done 1 allows <= 1e-9 where a
// solve's order changed). Exit code 1 on any violation.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362t1_tol.ts <refTablesUrl>
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTables as buildNew, type GfTables } from "../../../src/render/gpu_field/tables";
import type { FieldScene } from "../../../src/render/field/scene";

const here = dirname(fileURLToPath(import.meta.url));
const ref = (await import(/* @vite-ignore */ process.argv[2])) as { buildTables: typeof buildNew };
const INT_FIELDS = new Set(["cV0", "cNV", "cClosed", "cPin0", "cPinN", "cArm0", "cArmN", "aG", "kThru", "kG", "kJ", "kA", "kB", "kCa", "kCb", "chV0", "chN", "chC", "cellCh0", "cellChN", "cellChList", "cellK0", "cellKN", "cellKList", "nC", "nV", "nA", "nK", "nCh", "gW", "gH"]);
const CENSUS = ["muse_hash", "g41_def_tw42", "g41_ring_tw64", "user_tw42.lightpaper", "def", "fat", "g41_def_tw64", "g41_user_tw42", "muse_default_tw", "ring", "g41_ring_tw42", "g41_user_tw64"];
const maxDiff = new Map<string, number>();
const intBad: string[] = [];
let builds = 0;
const check = (name: string, scene: FieldScene): void => {
  builds++;
  const opts = { aa: 0.5 / (scene.camera.pxPerUnit * 2) };
  const A = buildNew(scene, opts) as unknown as Record<string, unknown>;
  const B = ref.buildTables(scene, opts) as unknown as Record<string, unknown>;
  for (const f of Object.keys(A)) {
    if (f === "ms") continue;
    const a = A[f]; const b = B[f];
    if (typeof a === "number") {
      if (INT_FIELDS.has(f)) { if (a !== b) intBad.push(`${name} ${f} ${a} != ${b}`); }
      else maxDiff.set(f, Math.max(maxDiff.get(f) ?? 0, Math.abs(a - (b as number))));
      continue;
    }
    const aa = a as ArrayLike<number>; const bb = b as ArrayLike<number>;
    if (aa.length !== bb.length) { intBad.push(`${name} ${f} length ${aa.length} != ${bb.length}`); continue; }
    if (INT_FIELDS.has(f)) {
      for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) { intBad.push(`${name} ${f}[${i}] ${aa[i]} != ${bb[i]}`); break; }
    } else {
      let mx = maxDiff.get(f) ?? 0;
      for (let i = 0; i < aa.length; i++) { const d = Math.abs(aa[i] - bb[i]); if (d > mx) mx = d; }
      maxDiff.set(f, mx);
    }
  }
};
const load = (p: string): FieldScene => {
  const s = JSON.parse(readFileSync(p, "utf8")) as FieldScene;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
};
for (const nm of CENSUS) check(`census ${nm}`, load(join(here, "..", "K868", "scenes", `${nm}.json`)));
for (const nm of ["def", "muse_hash", "fat"]) {
  const dir = join(here, "..", "K1247", "out", "s18", "drag", nm);
  for (const f of readdirSync(dir).filter((x) => /^f\d+\.json$/.test(x)).sort()) check(`drag ${nm}/${f}`, load(join(dir, f)));
}
console.log(`builds ${builds}`);
for (const [f, mx] of [...maxDiff.entries()].sort((x, y) => y[1] - x[1])) console.log(`float ${f} maxdiff ${mx}`);
console.log(`int violations ${intBad.length}`);
for (const s of intBad.slice(0, 20)) console.log(`  INT ${s}`);
const over = [...maxDiff.entries()].filter(([, mx]) => mx > 1e-9);
console.log(over.length === 0 && intBad.length === 0 ? "TOL PASS" : `TOL FAIL over=${over.map(([f, mx]) => `${f}:${mx}`).join(",")}`);
if (over.length > 0 || intBad.length > 0) process.exit(1);
