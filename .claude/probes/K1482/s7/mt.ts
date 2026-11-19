// K1482 s7: the CPU mirror on the page's tables exactly (tables_gf.json + homeOn true, as gf_pass.ts uploads them).
//   npx tsx mt.ts <tables.json> <sites.json> <out.json> <site,site,...|all> [R=24]
//   env GFX=<module path> loads an alternative eval.ts (a candidate) instead of src's.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [, , tp, sp, op, names, Rs] = process.argv; const R = +(Rs ?? 24);
const SRC = resolve(import.meta.dirname, "../../../..");
export function loadTables(tp: string): any {
  const raw = JSON.parse(readFileSync(tp, "utf8")); const T: any = {};
  for (const [k, v] of Object.entries<any>(raw)) {
    if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; T[k] = C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); } else T[k] = v;
  }
  if (process.env.HOMEON !== "0") T.homeOn = true;
  return T;
}
const { GfEval } = await import(pathToFileURL(process.env.GFX || join(SRC, "src/render/gpu_field/eval.ts")).href);
const T = process.env.TABLES_TS ? (await import(pathToFileURL(resolve(process.env.TABLES_TS)).href)).default : loadTables(tp);
const SJ = JSON.parse(readFileSync(sp, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const E = new GfEval(T); const out: any = {};
const list = names === "all" ? SJ.sites.map((s: any) => s.site) : names.split(",");
for (const nm of list) {
  const s = SJ.sites.find((q: any) => q.site === nm); const cx = Math.round(s.x), cy = Math.round(s.y); const px: number[][] = [];
  for (let y = cy - R; y < cy + R; y++) for (let x = cx - R; x < cx + R; x++) {
    const P = E.eval((x + 0.5 - e) / a, (y + 0.5 - f) / d);
    px.push([+P.ink.toFixed(3), +P.cov.toFixed(3), P.chain, P.winKind, P.winA, P.winB]);
  }
  out[nm] = { cx, cy, R, px };
}
writeFileSync(op, JSON.stringify(out));
