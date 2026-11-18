// K1482 s4: rebuild link A's gf tables in Node from a page's scene export (cap.mjs SCENE=1) and compare corners with
// the page's tables (TABLES=1).   npx tsx scene_tables.ts <scene.json> <tables.json>
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../..");
const { buildTables } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
export const dec = (v: any): any => {
  if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN;
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v;
};
const [, , sp, tp, op] = process.argv;
const scene = dec(JSON.parse(readFileSync(sp, "utf8"))); const P = dec(JSON.parse(readFileSync(tp, "utf8")));
scene.look.ctrlArc ??= CTRL_ARC; (globalThis as any).__WDBG = !!process.env.WDBG;
// HOME1=1: built with home (K1451 clip on); HOME1=2: the page exactly (built home off, then homeOn set, as gf_pass.ts:782)
const T0 = buildTables(scene, { aa: P.aa, home: process.env.HOME1 === "1" || !!P.homeOn });
const T = process.env.HOME1 === "2" ? { ...T0, homeOn: true } : T0;
console.log("nK node", T.nK, "page", P.nK, "nC", T.nC, P.nC, "h", T.h, P.h);
let bad = 0;
for (const k of ["kCx", "kCy", "kR", "kCa", "kCb", "kJ", "vx", "vy"]) {
  const a = T[k], b = P[k]; let m = 0; const n = Math.max(a?.length ?? 0, b?.length ?? 0);
  for (let i = 0; i < n; i++) m = Math.max(m, Math.abs((a[i] ?? 1e9) - (b[i] ?? -1e9)));
  console.log(k, a?.length, b?.length, "maxdiff", m); if (m > 1e-9) bad++;
}
console.log(bad ? "MISMATCH" : "MATCH");
if (op) {
  const o: any = {};
  for (const [k, v] of Object.entries<any>(T)) { if (ArrayBuffer.isView(v)) o[k] = { __t: v.constructor.name, v: Array.from(v as any, (x: number) => (x === Infinity ? "Inf" : x === -Infinity ? "-Inf" : x !== x ? "NaN" : x)) }; else o[k] = v; }
  (await import("node:fs")).writeFileSync(op, JSON.stringify(o)); console.log("wrote", op);
}