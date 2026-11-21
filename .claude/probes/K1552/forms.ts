// K1552 (27M): gfFs form sizes in Node (no browser): base, +homeForm, +retryForm, +loneFold, per tier.
//   npx tsx .claude/probes/K1552/forms.ts
import { gfFs, homeForm, retryForm, loneFold } from "../../../src/render/gpu_field/gf_glsl.ts";
import { GF_TIERS } from "../../../src/render/gpu_field/gf_pass.ts";

const base = gfFs(false, true);
const home = homeForm(base);
const retry = retryForm(home);
const lone = loneFold(retry);
console.log(`full gfFs(false,true): base ${base.length} +home ${home.length - base.length} +retry ${retry.length - home.length} (retry total ${retry.length}) +lone ${lone.length - retry.length} (lone total ${lone.length})`);
const tiers: any[] = [];
for (const t of GF_TIERS) for (const kz of ["free", "corner"]) tiers.push({ ...t, kz });
for (const tier of tiers) {
  const b = gfFs(false, true, tier);
  const h = homeForm(b);
  const r = retryForm(h);
  console.log(`tier p${tier.p} k${tier.k} kz=${tier.kz}: base ${b.length} +home ${h.length - b.length} +retry ${r.length - h.length}`);
}
const probe = gfFs(true, true);
console.log(`probe gfFs(true,true): base ${probe.length} +retry ${retryForm(homeForm(probe)).length - homeForm(probe).length}`);
