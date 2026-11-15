// K1362 t1: output digest of buildTables (src/render/gpu_field/tables.ts).
// Hashes every typed array buildTables returns, field by field (SHA-256 of the
// array's raw bytes, so float fields are bit-exact), plus the scalar fields,
// on the 12 census scenes (the list in k1362s1_time.ts) and on every frame of
// the s18 drags (def, muse_hash, fat; read as k1341s1_digest.ts reads them:
// dragRoot/<nm>/f*.json sorted). aa as in k1362s1_time: 0.5/(pxPerUnit*2).
// T.ms is timing, not output, and is the one field not hashed.
// Run on two builds and diff the outputs: equal output <=> equal tables.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362t1_digest.ts [dragRoot] [sceneDir]
// Defaults: dragRoot=.claude/probes/K1247/out/s18/drag, sceneDir=.claude/probes/K868/scenes
// (relative to this file). In a master export, pass the worktree's copies.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";
import type { FieldScene } from "../../../src/render/field/scene";

const here = dirname(fileURLToPath(import.meta.url));
const dragRoot = process.argv[2] ?? join(here, "..", "K1247", "out", "s18", "drag");
const sceneDir = process.argv[3] ?? join(here, "..", "K868", "scenes");
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
const out: string[] = [];
const emit = (scope: string, name: string, scene: FieldScene): void => {
  const T = buildTables(scene, { aa: 0.5 / (scene.camera.pxPerUnit * 2) });
  for (const f of FIELDS) {
    const a = T[f] as never as { length: number };
    out.push(`${scope} ${name} ${f} ${a.length} ${hashArr(T[f] as never)}`);
  }
  const fs2 = Float64Array.of(T.h, T.W, T.aa, T.sigma, T.zt, T.amp, T.win, T.rc, T.gx0, T.gy0, T.G);
  const is = Int32Array.of(T.nC, T.nV, T.nA, T.nK, T.nCh, T.gW, T.gH);
  out.push(`${scope} ${name} scalars f:${hashArr(fs2 as never)} i:${hashArr(is as never)}`);
};
for (const nm of CENSUS) emit("census", nm, load(join(sceneDir, `${nm}.json`)));
for (const nm of ["def", "muse_hash", "fat"]) {
  const dir = join(dragRoot, nm);
  const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
  for (const f of files) emit("drag", `${nm}/${f}`, load(join(dir, f)));
}
console.log(out.join("\n"));
console.log(`all ${createHash("sha256").update(out.join("\n")).digest("hex")} lines ${out.length}`);
