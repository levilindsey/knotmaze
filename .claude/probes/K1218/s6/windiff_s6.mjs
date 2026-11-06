import { readFileSync } from "node:fs";
import { decodePNG } from "../s5/png.mjs";
const [win, a, b] = process.argv.slice(2);
const [x0, y0, x1, y1] = win.split(",").map(Number);
const A = decodePNG(readFileSync(a)), B = decodePNG(readFileSync(b));
let n = 0, mx = 0, at = "", bx = [1e9, 1e9, -1, -1];
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = (y * A.W + x) * A.ch, j = (y * B.W + x) * B.ch; let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i + c] - B.data[j + c])); if (d > (+process.env.TH || 2)) { n++; bx = [Math.min(bx[0], x), Math.min(bx[1], y), Math.max(bx[2], x), Math.max(bx[3], y)]; } if (d > mx) { mx = d; at = x + "," + y; } }
console.log(`${b.split(/[\\/]/).slice(-3).join("/")}: ${n} px > th, max ${mx} at ${at}, box ${bx.join(",")}`);

