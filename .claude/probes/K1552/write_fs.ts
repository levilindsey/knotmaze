// K1552 (27M): write the Node gfFs field program (retry form) and its loneFold form to
// out/27M/variants/fs_retry.frag / fs_lone.frag. loneFold does not compile on the dumped tier
// text (PGRP packs pg into pc, so pg[j] in its inserted block is undeclared); this pair measures
// its added compile cost on the form it was written for. Timed as time_group group "lonefs".
//   npx tsx .claude/probes/K1552/write_fs.ts
import { writeFileSync } from "node:fs";
import { gfFs, homeForm, retryForm, loneFold } from "../../../src/render/gpu_field/gf_glsl.ts";
const retry = retryForm(homeForm(gfFs(false, true)));
const lone = loneFold(retry);
writeFileSync(".claude/probes/K1552/out/27M/variants/fs_retry.frag", retry);
writeFileSync(".claude/probes/K1552/out/27M/variants/fs_lone.frag", lone);
console.log(`fs_retry ${retry.length} fs_lone ${lone.length} added ${lone.length - retry.length}`);
