// K1218 S6: a ramp's kinks in a shot. Per row of a device window: the
// largest |second difference| of luma along x (a line in a smooth ramp)
// and where, then the window's max and median over rows.
//   node ramp_s6.mjs <x0,y0,x1,y1> <a.png> [b.png ...]   (axis env AX=y for columns)
import { readFileSync } from "node:fs";
import { decodePNG } from "../s5/png.mjs";
const [win, ...files] = process.argv.slice(2);
const [x0, y0, x1, y1] = win.split(",").map(Number);
const ax = process.env.AX || "x";
for (const f of files) {
  const img = decodePNG(readFileSync(f));
  const { W, ch, data } = img;
  const L = (x, y) => { const i = (y * W + x) * ch; return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; };
  const rows = [];
  if (ax === "x") for (let y = y0; y <= y1; y++) { let m = 0, at = 0; for (let x = x0 + 1; x < x1; x++) { const d = Math.abs(L(x + 1, y) - 2 * L(x, y) + L(x - 1, y)); if (d > m) { m = d; at = x; } } rows.push([m, at, y]); }
  else for (let x = x0; x <= x1; x++) { let m = 0, at = 0; for (let y = y0 + 1; y < y1; y++) { const d = Math.abs(L(x, y + 1) - 2 * L(x, y) + L(x, y - 1)); if (d > m) { m = d; at = y; } } rows.push([m, at, x]); }
  const s = rows.map(r => r[0]).sort((a, b) => a - b);
  const top = rows.slice().sort((a, b) => b[0] - a[0]).slice(0, 4).map(r => `${r[0].toFixed(1)}@${r[1]},${r[2]}`).join(" ");
  console.log(`${f.split(/[\\/]/).slice(-3).join("/")}: max ${s[s.length - 1].toFixed(1)} median ${s[s.length >> 1].toFixed(1)} top ${top}`);
}
