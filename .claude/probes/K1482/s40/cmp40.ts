// K1482 s40: per listed place, the mirror's border-ink px changed (|d ink| > 0.02) by stage 37's rule (GfEval.S37 "37"),
// by the candidate (S37 = MODE, default "" = stage 40's rule) against the start (S37 "0"), and the candidate against
// stage 37; plus px the candidate GAINS over the start (ink the start does not draw). One line per place.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s40/cmp40.ts <scene.json> <sites.json> <name@x:y,...> [R=24]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, list, Rs] = process.argv; const R = +(Rs ?? 24);
const MODE = process.env.MODE ?? "";
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true);
const E: any = new GfEval(T);
for (const it of (list ?? "").split(",").filter(Boolean)) {
  const [nm, xy] = it.includes("@") ? it.split("@") : [it, it]; const [cx, cy] = xy.split(":").map(Number);
  let n37 = 0, nC = 0, nC37 = 0, gC = 0, l37 = 0, lC = 0;
  for (let Y = cy - R; Y <= cy + R; Y++) for (let X = cx - R; X <= cx + R; X++) {
    const fx = (X + 0.5 - e) / a, fy = (Y + 0.5 - f) / d;
    GfEval.S37 = "0"; const i0 = E.eval(fx, fy).ink;
    GfEval.S37 = "37"; const i1 = E.eval(fx, fy).ink;
    GfEval.S37 = MODE; const i2 = E.eval(fx, fy).ink;
    if (Math.abs(i1 - i0) > 0.02) { n37++; if (i1 < i0) l37++; }
    if (Math.abs(i2 - i0) > 0.02) { nC++; if (i2 < i0) lC++; else gC++; }
    if (Math.abs(i2 - i1) > 0.02) nC37++;
  }
  console.log(`${nm} @${cx},${cy}: s37 ${n37} (lost ${l37}) | ${MODE} ${nC} (lost ${lC}, gained ${gC}) | ${MODE} vs s37 ${nC37}`);
}
GfEval.S37 = "";
