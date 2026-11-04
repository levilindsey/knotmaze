// K1040 S3d: S3c's tent sources unchanged by the split (HEAD's copy against the worktree's).
import { labelBTentSources as headSrc } from "./out/head_tent_glsl";
import { labelBTentSources, labelBTentVSources } from "../../../../src/render/field/label_b_tent_glsl";
let bad = 0;
for (const dbg of [false, true]) {
  const a = headSrc(dbg) as unknown as Record<string, string>;
  const b = labelBTentSources(dbg) as unknown as Record<string, string>;
  for (const k of Object.keys(a)) if (a[k] !== b[k]) { bad++; console.log(`DIFF dbg=${dbg} ${k}`); }
}
const v = labelBTentVSources(false);
console.log(`checked; differences ${bad}; V lengths seg ${v.segVs.length} cap ${v.capVs.length} fs ${v.fs.length}`);
process.exit(bad ? 1 : 0);