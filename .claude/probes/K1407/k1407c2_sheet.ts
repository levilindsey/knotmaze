// K1407 c2: the 4x contact sheet (k1407_crops' 480 px panels at full size): per spot (row) the given columns
// (dir:suffix pairs), a red ring of radius R world units (default 0.28, k1407c2_check's) at each panel's centre,
// and a sidecar <outPng>.txt naming the rows and columns.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c2_sheet.ts <outPng> <dir:sfx,dir:sfx,...> <base1,base2,...> [R]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writePng } from "../K1314/k1314_crops.ts";

const [outPng, colsArg, list, rArg] = process.argv.slice(2);
const cols = colsArg.split(",").map((s) => { const i = s.lastIndexOf(":"); return { dir: s.slice(0, i), sfx: s.slice(i + 1) }; });
const bases = list.split(",");
const P = 480, GAP = 6, h = 0.26, ppu = P / (2.5 * h), Rp = (rArg ? +rArg : 0.28) * ppu;
const W = cols.length * (P + GAP), H = bases.length * (P + GAP);
const sheet = new Uint8Array(W * H * 3).fill(128);
bases.forEach((b, row) => cols.forEach((cl, col) => {
  const img = readFileSync(join(cl.dir, `${b}_${cl.sfx}.bin`));
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const o = 3 * ((row * (P + GAP) + r) * W + col * (P + GAP) + c); const i = 3 * (r * P + c);
    const d = Math.hypot(c + 0.5 - P / 2, r + 0.5 - P / 2);
    if (Math.abs(d - Rp) < 0.7 && (Math.floor(Math.atan2(r - P / 2, c - P / 2) * 12) & 1)) { sheet[o] = 230; sheet[o + 1] = 40; sheet[o + 2] = 40; continue; }
    sheet[o] = img[i]; sheet[o + 1] = img[i + 1]; sheet[o + 2] = img[i + 2];
  }
}));
writePng(outPng, sheet, W, H);
writeFileSync(`${outPng}.txt`, `columns: ${cols.map((c) => `${c.dir}:${c.sfx}`).join(" | ")}\n` + bases.map((b, i) => `row ${i + 1}: ${b}`).join("\n") + "\n");
console.log(`sheet ${W}x${H} -> ${outPng}`);
