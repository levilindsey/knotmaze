// K1202 (batch 20 Run C): copied verbatim from .claude/probes/K1139/kymo_rows_cyc.mjs (stand links and moves unchanged); only the folder changed.
// K1139 S4: luminance along kymograph rows (sheets_cyc.mjs's layout:
// gutter 6, base on top, S4 below, each row 2 px), to find steps along the
// arc (a joint between a fan and the ribbon, the ridge).
//   node kymo_rows_cyc.mjs <kymo.png> <i0> <i1> <rows,...>
import { readFileSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";
const [, , IN, I0, I1, ROWS] = process.argv;
const img = toRGB(decodePNG(readFileSync(IN)));
const G = 6, KR = (img.H - 3 * G) / 4; // rows per half
const lum = (x, y) => { const k = (y * img.W + x) * 3; return Math.round(0.2126 * img.data[k] + 0.7152 * img.data[k + 1] + 0.0722 * img.data[k + 2]); };
for (const half of ["base", "s4"]) {
  const y0 = half === "base" ? G : 2 * G + 2 * KR;
  for (const r of ROWS.split(",").map(Number)) {
    const vals = [];
    for (let i = Number(I0); i <= Number(I1); i++) vals.push(lum(G + i, y0 + 2 * r));
    console.log(`${half} row ${String(r).padStart(2)}: i ${I0}..${I1}: ${vals.join(" ")}`);
  }
}
