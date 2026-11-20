import { gfFs, homeForm, retryForm } from "../../../../src/render/gpu_field/gf_glsl";
import { GF_TIERS } from "../../../../src/render/gpu_field/gf_pass";
const tiers: any[] = [];
for (const t of GF_TIERS) for (const kz of ["free", "corner"]) tiers.push({ ...t, kz });
for (const tier of [...tiers, undefined]) {
  const s = retryForm(homeForm(gfFs(false, true, tier)));
  console.log(tier ? "tier kz " + tier.kz : "full", s.includes("K1482 s32: the lone fold"), s.split("sibling burial").length - 1, s.length);
}
const pr = retryForm(homeForm(gfFs(true, true))); console.log("probe", pr.includes("K1482 s32: the lone fold"));
