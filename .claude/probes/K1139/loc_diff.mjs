// K1139 Stage 3 S3.2: where two dump dirs' n frames differ. Each changed
// pixel is placed in the record box that holds it (box coords), with its
// world distance from the record's centre, the nearest arm by angle (and
// whether that arm is unlit: no band uses it), the luma in A and B, and
// the dw frame's G there (0 = no pulse drawn: a rise there is whitening).
//
//   node loc_diff.mjs <dirA> <dirB> [view=n]
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { decodePNG, toRGB } from "./png.mjs";

const [DA, DB, VIEW] = process.argv.slice(2);
const V = VIEW ?? "n";
const meta = JSON.parse(readFileSync(join(DB, "meta.json"), "utf8"));
const A = meta.aff;
const L = (d, j) => 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
const img = (dir, k, v) => {
  const p = join(dir, `t${k}_${v}.png`);
  return existsSync(p) ? toRGB(decodePNG(readFileSync(p))) : null;
};
const rows = [];
for (let k = 0; k < 8; k++) {
  const a = img(DA, k, V), b = img(DB, k, V), dw = img(DB, k, "dw");
  if (!a || !b) continue;
  for (let y = 0; y < a.H; y++)
    for (let x = 0; x < a.W; x++) {
      const j = (y * a.W + x) * 3;
      const d = Math.max(Math.abs(a.data[j] - b.data[j]), Math.abs(a.data[j + 1] - b.data[j + 1]), Math.abs(a.data[j + 2] - b.data[j + 2]));
      if (!d) continue;
      let where = "outside every record box";
      for (const rc of meta.recs) {
        const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
        const X = x - ox, Y = y - oy;
        if (X < 0 || Y < 0 || X >= rc.box.w || Y >= rc.box.h) continue;
        const sx = (rc.box.x + X + 0.5) / meta.dsf, sy = (rc.box.y + Y + 0.5) / meta.dsf;
        const px = A.ax + A.bx * sx + A.cx * sy, py = A.ay + A.by * sx + A.cy * sy;
        const rx = px - rc.c[0], ry = py - rc.c[1], r = Math.hypot(rx, ry);
        const used = new Set();
        for (const bd of rc.bands || []) { used.add(bd.ia); used.add(bd.ib); }
        let best = -2, ai = -1;
        rc.arms.forEach((am, i) => { const c = (rx * am.dx + ry * am.dy) / (r || 1); if (c > best) { best = c; ai = i; } });
        const perp = Math.abs(rx * rc.arms[ai].dy - ry * rc.arms[ai].dx);
        where = `ji ${rc.ji} (${X},${Y}) r ${r.toFixed(3)} nearest arm ${ai}${used.has(ai) ? "" : " UNLIT"} perp ${perp.toFixed(3)}`;
        break;
      }
      rows.push(`t${k}_${V} (${x},${y}) d ${d} luma ${L(a.data, j).toFixed(1)} -> ${L(b.data, j).toFixed(1)} dwG ${dw ? dw.data[j + 1] : "?"}: ${where}`);
    }
}
console.log(`${DA} -> ${DB}, view ${V}: ${rows.length} px`);
for (const r of rows) console.log("  " + r);
