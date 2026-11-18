// K1482 s5: the page's tables (cap.mjs TABLES=1) against the Node build of its scene (cap.mjs SCENE=1) with
// home on or off, EVERY typed array and scalar, exact.   npx tsx tables_eq.ts <scene.json> <tables.json> [home=1]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../..");
const { buildTables } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const dec = (v: any): any => {
  if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN;
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v;
};
const [, , sp, tp, hm = "1", tolS = "0"] = process.argv; const TOL = +tolS; // TOL: the full export vs the page's lean scene differ by ULPs (1e-15)
const scene = dec(JSON.parse(readFileSync(sp, "utf8"))); const P = dec(JSON.parse(readFileSync(tp, "utf8")));
scene.look.ctrlArc ??= CTRL_ARC;
const T = buildTables(scene, { aa: P.aa, home: hm === "1" });
const keys = new Set([...Object.keys(T), ...Object.keys(P)]); keys.delete("ms");
const bad: string[] = []; let nArr = 0;
for (const k of keys) {
  const a = T[k], b = P[k];
  if (ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) {
    nArr++;
    const A = a as any, B = b as any;
    if (!A || !B || A.length !== B.length) { bad.push(`${k}(len ${A?.length} ${B?.length})`); continue; }
    let n = 0, m = 0; for (let i = 0; i < A.length; i++) { const x = A[i], y = B[i]; if (!(x === y || (x !== x && y !== y) || Math.abs(x - y) <= TOL)) { n++; m = Math.max(m, Math.abs(x - y)); } }
    if (n) bad.push(`${k}(${n} differ, max ${m})`);
  } else if (typeof a !== "object" && a !== b && !(a !== a && b !== b)) bad.push(`${k}(${a} vs ${b})`);
}
console.log(`home ${hm} tol ${TOL}: ${nArr} arrays, homeOn node ${T.homeOn} page ${P.homeOn}, nK ${T.nK}/${P.nK}: ${bad.length ? "MISMATCH " + bad.join(" ") : "EQUAL"}`);
