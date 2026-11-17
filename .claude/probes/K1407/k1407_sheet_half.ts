// K1407 c1: a half-resolution contact sheet for reading many spots at once: per spot the given
// columns (dir:suffix pairs), each 480 px panel box-filtered to 240 px.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407_sheet_half.ts <outPng> <dir:sfx,dir:sfx,...> <base1,base2,...>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { writePng } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_crops.ts";

const [outPng, colsArg, list] = process.argv.slice(2);
const cols = colsArg.split(",").map((s) => { const i = s.lastIndexOf(":"); return { dir: s.slice(0, i), sfx: s.slice(i + 1) }; });
const bases = list.split(",");
const P = 480, Q = 240, GAP = 4;
const W = cols.length * (Q + GAP), H = bases.length * (Q + GAP);
const sheet = new Uint8Array(W * H * 3).fill(128);
bases.forEach((b, row) => cols.forEach((cl, col) => {
  const img = readFileSync(join(cl.dir, `${b}_${cl.sfx}.bin`));
  for (let r = 0; r < Q; r++) for (let c = 0; c < Q; c++) for (let k = 0; k < 3; k++) {
    let v = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) v += img[3 * ((2 * r + dy) * P + 2 * c + dx) + k];
    sheet[3 * ((row * (Q + GAP) + r) * W + col * (Q + GAP) + c) + k] = Math.round(v / 4);
  }
}));
writePng(outPng, sheet, W, H);
console.log(`sheet ${W}x${H} -> ${outPng}`);
