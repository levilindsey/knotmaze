// K1362 s15: write the default tier's two programs (cornerPlan's free and corner forms) and any extra form.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s15_dumpfs.ts <outDir> [extras as k=v,k=v (v: true|false|string)]
import { writeFileSync } from "node:fs";
import { gfFs, type GfTier } from "../../../src/render/gpu_field/gf_glsl";
import { GF_TIERS, cornerPlan } from "../../../src/render/gpu_field/gf_pass";

const out = process.argv[2];
const extra: Record<string, unknown> = {};
for (const kv of (process.argv[3] ?? "").split(",").filter(Boolean)) {
  const [k, v] = kv.split("=");
  extra[k] = v === "true" ? true : v === "false" ? false : /^\d+$/.test(v) ? Number(v) : v;
}
const base: GfTier = { ...GF_TIERS[0], ...extra } as GfTier;
for (const { tier } of cornerPlan(base)) {
  const src = gfFs(false, true, tier);
  const f = `${out}/${tier.kz ?? "all"}${tier.zc ? "_zc" : ""}.frag`;
  writeFileSync(f, src);
  console.log(`${f}: ${src.length} chars, ${src.split("\n").length} lines, pieceD calls ${(src.match(/pieceD\(/g) ?? []).length}`);
}
const full = gfFs(false, true);
writeFileSync(`${out}/full.frag`, full);
console.log(`${out}/full.glsl: ${full.split("\n").length} lines`);
