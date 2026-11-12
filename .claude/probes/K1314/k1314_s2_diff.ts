// K1314 s2: which crops differ between two k1314_crops.ts directories rendered at the same spots.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s2_diff.ts <dirA> <dirB>
// Per crop, the rp=outline panel's pixels whose largest channel difference passes 24, and the label.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readPng } from "./k1314_crops";

const [dA, dB] = process.argv.slice(2);
type M = { file: string; label: string };
const ma = JSON.parse(readFileSync(join(dA, "manifest.json"), "utf8")) as M[];
for (const m of ma) {
  const A = readPng(join(dA, m.file)); const B = readPng(join(dB, m.file));
  const P = (A.W - 8) / 3; const bpA = A.px.length / (A.W * A.H); const bpB = B.px.length / (B.W * B.H);
  let n = 0;
  for (let r = 0; r < A.H; r++) for (let c = 0; c < P; c++) {
    const x = 2 * (P + 4) + c; const ia = bpA * (r * A.W + x); const ib = bpB * (r * B.W + x);
    let d = 0; for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(A.px[ia + k] - B.px[ib + k]));
    if (d > 24) n++;
  }
  console.log(`${String(n).padStart(6)} ${m.label}`);
}
