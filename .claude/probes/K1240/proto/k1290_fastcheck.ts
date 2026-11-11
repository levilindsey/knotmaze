// K1290: the fast root search (K1290_FAST=1) against the first version's
// bisection (0), forward placement on in both, frame by frame on a recorded
// motion: the largest difference anywhere in the two tables, and the frames
// whose tables differ in shape. Run through the K1290 config:
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1290_vite.config.mjs .claude/probes/K1240/proto/k1290_fastcheck.ts [name=def]
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as O from "./outline";

const X = O as unknown as { fwdSetOn?: (on: boolean) => void; fwdSetFast?: (on: boolean) => void };
if (!X.fwdSetOn || !X.fwdSetFast) throw new Error("run through k1290_vite.config.mjs");
const name = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "def";
const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "out", "s15", `rec_${name}`);
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const scenes = files.map((f) => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as O.SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; });
X.fwdSetOn(true);
const stS = O.structure(scenes[0]); const stF = O.structure(scenes[0]);
let maxD = 0; let maxAt = ""; let shape = 0; let nDiff = 0;
const walk = (a: unknown, b: unknown, path: string, seen: Set<unknown>, f: number): void => {
  if (typeof a === "number" && typeof b === "number") {
    const d = Number.isNaN(a) && Number.isNaN(b) ? 0 : Math.abs(a - b);
    if (d > 1e-9) nDiff++;
    if (d > maxD || Number.isNaN(d)) { maxD = Number.isNaN(d) ? Infinity : d; maxAt = `f${f} ${path}`; }
    return;
  }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") { if (a !== b) { shape++; if (shape <= 5) console.log(`  shape f${f} ${path}: ${String(a)} vs ${String(b)}`); } return; }
  if (seen.has(a)) return; seen.add(a);
  if (ArrayBuffer.isView(a) || Array.isArray(a)) {
    const A = a as ArrayLike<unknown>; const B = b as ArrayLike<unknown>;
    if (A.length !== B.length) { shape++; if (shape <= 5) console.log(`  shape f${f} ${path}: length ${A.length} vs ${B.length}`); }
    const n = Math.min(A.length, B.length);
    for (let i = 0; i < n; i++) walk(A[i], B[i], `${path}[${i}]`, seen, f);
    return;
  }
  for (const k of Object.keys(a as object)) walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, seen, f);
};
scenes.forEach((sc, f) => {
  X.fwdSetFast!(false); const tS = O.frame(stS, sc);
  X.fwdSetFast!(true); const tF = O.frame(stF, sc);
  walk(tS, tF, "", new Set(), f);
});
console.log(`${name}: ${scenes.length} frames; max |slow - fast| ${maxD.toExponential(3)} at ${maxAt}; ${nDiff} numbers differ by > 1e-9; ${shape} shape differences`);
