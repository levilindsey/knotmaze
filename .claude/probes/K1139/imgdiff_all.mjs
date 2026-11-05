import { readFileSync, existsSync } from "fs";
import { decodePNG, toRGB } from "./png.mjs";
const [a, b] = process.argv.slice(2);
let tot = 0;
for (let k = 0; k < 8; k++) for (const v of ["n", "w", "d", "dw"]) {
  const pa = `${a}/t${k}_${v}.png`, pb = `${b}/t${k}_${v}.png`;
  if (!existsSync(pa) || !existsSync(pb)) { console.log(`t${k}_${v} missing`); continue; }
  const A = toRGB(decodePNG(readFileSync(pa))), B = toRGB(decodePNG(readFileSync(pb)));
  let nd = 0, mx = 0;
  for (let i = 0; i < A.data.length; i++) { const e = Math.abs(A.data[i] - B.data[i]); if (e) { mx = Math.max(mx, e); } }
  for (let i = 0; i < A.W * A.H; i++) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i*3+c] - B.data[i*3+c])); if (d) nd++; }
  tot += nd;
  if (nd) console.log(`t${k}_${v} diff px ${nd} max ${mx}`);
}
console.log(`${a} vs ${b}: total diff px over 32 frames ${tot}`);
