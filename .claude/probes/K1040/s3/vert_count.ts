// K1040 S3f step 3's first count: the vertices tentv issues per frame, per
// scene, by draw (label_b_pass.ts drawTent: segments TENT_SEG_VERTS each,
// the free ends TENT_CAP_VERTS each, the fills TENT_FILL_VERTS each, all
// instanced triangle strips; the vertex shader runs on every one, and the
// facets a tent does not need collapse to degenerate triangles). The caps are
// counted as the pass counts them (two per open chain with a segment).
// Node, no GPU. Usage: node scripts/run_node.mjs .claude/probes/K1040/s3/vert_count.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";
import { buildLabelB } from "../../../../src/render/field/label_b";
import { TENT_CAP_VERTS, TENT_FILL_VERTS, TENT_SEG_VERTS } from "../../../../src/render/field/label_b_tent_glsl";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const SCENES = [
  "muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper",
  "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64",
];
const rows: string[] = [
  `# vert_count: tentv's vertices per frame (segments x ${TENT_SEG_VERTS}, caps x ${TENT_CAP_VERTS}, fills x ${TENT_FILL_VERTS})`,
  "",
  "| scene | chains (open) | segments | caps | fills | seg verts | cap verts | fill verts | total | caps share |",
  "|---|---|---|---|---|---|---|---|---|---|",
];
for (const name of SCENES) {
  const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as FieldScene;
  scene.look.ctrlArc ??= 0.47;
  const T = buildLabelB(new FormB(scene, { dpr: 2 }));
  let open = 0, caps = 0;
  for (let ci = 0; ci < T.nChains; ci++) {
    if (T.chain[8 * ci + 3] <= 0.5) open++;
    if (T.chain[8 * ci + 3] <= 0.5 && T.chain[8 * ci + 2] > 0) caps += 2;
  }
  const sv = T.nInst * TENT_SEG_VERTS, cv = caps * TENT_CAP_VERTS, fv = T.nFills * TENT_FILL_VERTS;
  const tot = sv + cv + fv;
  rows.push(`| ${name} | ${T.nChains} (${open}) | ${T.nInst} | ${caps} | ${T.nFills} | ${sv} | ${cv} | ${fv} | ${tot} | ${(100 * cv / tot).toFixed(0)}% |`);
}
console.log(rows.join("\n"));
