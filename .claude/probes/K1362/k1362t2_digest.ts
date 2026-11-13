// K1362 t2: output digest of the pool path. Like k1362t1_digest.ts, but
// every scene/frame is built with buildTablesPooled (the worker pool's
// partitions and merges, run in-process) at several slice counts, and each
// pooled line is compared with the cold buildTables line for the same
// scene. Prints the pooled digest (must equal the cold
// `all ae1d2392...a85a27`) and the mismatch count.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362t2_digest.ts [dragRoot] [sceneDir] [slicesCsv]
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTables, buildTablesPooled, type GfTables } from "../../../src/render/gpu_field/tables";
import type { FieldScene } from "../../../src/render/field/scene";

const here = dirname(fileURLToPath(import.meta.url));
const dragRoot = process.argv[2] ?? join(here, "..", "K1247", "out", "s18", "drag");
const sceneDir = process.argv[3] ?? join(here, "..", "K868", "scenes");
const sliceCounts = (process.argv[4] ?? "1,3,6").split(",").map((x) => parseInt(x, 10));
const CENSUS = ["muse_hash", "g41_def_tw42", "g41_ring_tw64", "user_tw42.lightpaper", "def", "fat", "g41_def_tw64", "g41_user_tw42", "muse_default_tw", "ring", "g41_ring_tw42", "g41_user_tw64"];
const FIELDS: (keyof GfTables)[] = [
  "cV0", "cNV", "cClosed", "cLen", "cS0", "cPin0", "cPinN", "cArm0", "cArmN",
  "vx", "vy", "vs", "pinS", "pinZ",
  "aSR", "aDir", "aL", "aLcut", "aG",
  "kCx", "kCy", "kR", "kRmax", "kThru", "kRV", "kEax", "kEay", "kEbx", "kEby", "kG", "kJ", "kA", "kB", "kTheta", "kCa", "kCb", "kSa", "kSb", "kZa", "kZb", "kTax", "kTay", "kTbx", "kTby",
  "chV0", "chN", "chC", "chBox", "cellCh0", "cellChN", "cellChList", "cellK0", "cellKN", "cellKList",
];
const hashArr = (a: ArrayLike<number> & { buffer: ArrayBufferLike; byteOffset: number; byteLength: number }): string =>
  createHash("sha256").update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest("hex");
const load = (p: string): FieldScene => {
  const s = JSON.parse(readFileSync(p, "utf8")) as FieldScene;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
};
const linesOf = (scope: string, name: string, T: GfTables): string[] => {
  const out: string[] = [];
  for (const f of FIELDS) {
    const a = T[f] as never as { length: number };
    out.push(`${scope} ${name} ${f} ${a.length} ${hashArr(T[f] as never)}`);
  }
  const fs2 = Float64Array.of(T.h, T.W, T.aa, T.sigma, T.zt, T.amp, T.win, T.rc, T.gx0, T.gy0, T.G);
  const is = Int32Array.of(T.nC, T.nV, T.nA, T.nK, T.nCh, T.gW, T.gH);
  out.push(`${scope} ${name} scalars f:${hashArr(fs2 as never)} i:${hashArr(is as never)}`);
  return out;
};

let mismatches = 0;
let builds = 0;
const pooledAll: string[] = [];
const check = (scope: string, name: string, scene: FieldScene): void => {
  const aa = 0.5 / (scene.camera.pxPerUnit * 2);
  const cold = linesOf(scope, name, buildTables(scene, { aa }));
  for (const n of sliceCounts) {
    const pooled = linesOf(scope, name, buildTablesPooled(scene, { aa }, n));
    builds++;
    if (pooled.length !== cold.length) { mismatches++; console.log(`LEN MISMATCH ${scope} ${name} slices=${n}`); continue; }
    for (let i = 0; i < cold.length; i++) {
      if (pooled[i] !== cold[i]) { mismatches++; if (mismatches < 10) console.log(`MISMATCH slices=${n} ${pooled[i]} != ${cold[i]}`); }
    }
    if (n === sliceCounts[sliceCounts.length - 1]) pooledAll.push(...pooled);
  }
};
for (const nm of CENSUS) check("census", nm, load(join(sceneDir, `${nm}.json`)));
for (const nm of ["def", "muse_hash", "fat"]) {
  const dir = join(dragRoot, nm);
  const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
  for (const f of files) check("drag", `${nm}/${f}`, load(join(dir, f)));
}
console.log(`all ${createHash("sha256").update(pooledAll.join("\n")).digest("hex")} lines ${pooledAll.length} pooledBuilds ${builds} sliceCounts ${sliceCounts.join("/")} mismatches ${mismatches}`);
