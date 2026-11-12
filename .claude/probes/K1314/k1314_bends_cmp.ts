// K1314 s3 follow-up: the 5 declined through bends' outline panel, stage 2 (c51244ea) vs now (08f25f4b).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_bends_cmp.ts <bends dir>
// Reads <dir>/s2/spot_00N.png and <dir>/now/spot_00N.png (k1314_crops.ts --spots at each commit) and counts
// the differing channels in the third (rp=outline) panel.
import { readPng } from "./k1314_crops";
const b = process.argv[2]; const P = 240;
for (let n = 1; n <= 5; n++) {
  const f = `spot_00${n}.png`; const A = readPng(`${b}/s2/${f}`); const B = readPng(`${b}/now/${f}`);
  let d = 0; let mx = 0;
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) for (let k = 0; k < 3; k++) {
    const o = 3 * (r * A.W + 2 * (P + 4) + c) + k; const v = Math.abs(A.px[o] - B.px[o]); if (v) { d++; mx = Math.max(mx, v); }
  }
  console.log(f, "outline panel s2 vs now: differing channels", d, "max", mx);
}
