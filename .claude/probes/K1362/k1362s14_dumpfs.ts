// K1362 s14: write a corner tier's fragment source (the program cornerPlan draws on a frame with corners).
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s14_dumpfs.ts <out.glsl> [extras json, e.g. {"ki":true}]
import { writeFileSync } from "node:fs";
import { gfFs, type GfTier } from "../../../src/render/gpu_field/gf_glsl";

const out = process.argv[2];
const extra = JSON.parse(process.argv[3] ?? "{}") as Partial<GfTier>;
const tier: GfTier = { p: 3, k: 2, ramps: true, s: 3, lab: true, grp: true, ks: true, fs: "c", ...extra };
const src = gfFs(false, true, tier);
writeFileSync(out, src);
console.log(`${out}: ${src.length} chars, ${src.split("\n").length} lines, pieceD calls ${(src.match(/pieceD\(/g) ?? []).length}`);
