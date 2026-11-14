// K1362 s15: register-footprint attribution on the PowerVR offline compiler. Writes the default tier's corner and
// free programs plus inexact cut variants (footprint only, never drawn) as .frag files for k1362s15_pvr.ps1.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s15_cuts.ts <outDir> [extras k=v,...]
import { writeFileSync, mkdirSync } from "node:fs";
import { gfFs, type GfTier } from "../../../src/render/gpu_field/gf_glsl";
import { GF_TIERS, cornerPlan } from "../../../src/render/gpu_field/gf_pass";

const out = process.argv[2]; mkdirSync(out, { recursive: true });
const extra: Record<string, unknown> = {};
for (const kv of (process.argv[3] ?? "").split(",").filter(Boolean)) { const [k, v] = kv.split("="); extra[k] = v === "true" ? true : v === "false" ? false : /^\d+$/.test(v) ? Number(v) : v; }
const CUTS: Record<string, [string | RegExp, string][]> = {
  base: [],
  once: [["for (int cfg = 0; cfg <= nr; cfg++) {", "nr = 0; for (int cfg = 0; cfg <= 0; cfg++) {"]],
  nolay: [["      layers(p);\n", "      ns = 0; sOvf = false; labC = -1;\n"]],
  nobur: [[/for \(int m = 0; m < np && bur < 1\.0; m\+\+\)/g, "for (int m = 0; m < 0; m++)"], [/for \(int i = 0; i < nk && bur < 1\.0; i\+\+\)/g, "for (int i = 0; i < 0; i++)"]],
  nopbur: [[/for \(int m = 0; m < np && bur < 1\.0; m\+\+\)/g, "for (int m = 0; m < 0; m++)"]],
  nokbur: [[/for \(int i = 0; i < nk && bur < 1\.0; i\+\+\)/g, "for (int i = 0; i < 0; i++)"]],
  notang: [["int nkT = cD > 0.0 ? nk : 0;", "int nkT = 0;"]],
  noring: [["if (int(K1.z) != S || !kSec[i]) continue;", "continue;"]],
  nocomp: [["      float r = composite();\n", "      float r = ns > 0 ? sv[0] : 0.0; cCov = ns > 0 ? sa[0] : 0.0;\n"]],
  nokeys: [[/vec4 KB = keyBin\(PC\(j\), sj\);[\s\S]*?member\(PC\(j\), sj, KB\);/, "float pz = 0.0; mg = -1; mramp = 1.0;"]],
};
for (const { tier } of cornerPlan({ ...GF_TIERS[0], ...extra } as GfTier)) {
  const src = gfFs(false, true, tier);
  for (const [name, reps] of Object.entries(CUTS)) {
    let s = src; let miss = 0;
    for (const [a, b] of reps) { const t = s.replace(a as string, b); if (t === s) miss++; s = t; }
    if (tier.zc === undefined && extra.zc) continue; // zc: P0 only (P1 is the plain tier)
    writeFileSync(`${out}/${tier.kz ?? "corner"}${tier.zc ? "Z" : ""}_${name}.frag`, s);
    if (miss) console.log(`${tier.kz ?? "corner"}_${name}: ${miss} replacement(s) missed`);
  }
}
