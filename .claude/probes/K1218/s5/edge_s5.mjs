// K1218 S5: where a colour edge sits, per shot, to a tenth of a device px.
// Along each device column x0..x1 (step), scans rows y0..y1 for the first
// crossing of channel ch (0 r, 1 g, 2 b) through the level lv, interpolated
// between the two pixels, and prints one row per shot.
//   node edge_s5.mjs <x0,x1,step> <y0,y1> <ch> <lv> <label=in.png>...
import { readFileSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";

const [xs, ys, chS, lvS, ...ins] = process.argv.slice(2);
const [x0, x1, st] = xs.split(",").map(Number);
const [y0, y1] = ys.split(",").map(Number);
const ch = Number(chS), lv = Number(lvS);
const cols = [];
for (let x = x0; x <= x1; x += st) cols.push(x);
console.log("shot".padEnd(14) + cols.map((x) => String(x).padStart(8)).join(""));
for (const arg of ins) {
  const i = arg.indexOf("=");
  const label = arg.slice(0, i), file = arg.slice(i + 1);
  const im = toRGB(decodePNG(readFileSync(file)));
  const at = (x, y) => im.data[(y * im.W + x) * 3 + ch];
  const row = cols.map((x) => {
    for (let y = y0; y < y1; y++) {
      const a = at(x, y), b = at(x, y + 1);
      if ((a - lv) * (b - lv) <= 0 && a !== b) return (y + (lv - a) / (b - a)).toFixed(2);
    }
    return "-";
  });
  console.log(label.padEnd(14) + row.map((s) => s.padStart(8)).join(""));
}
