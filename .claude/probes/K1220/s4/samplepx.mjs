// K1220 S4: sample pixel colours of a shot at fractions / points.
import { readFileSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";
const [, , F, ...pts] = process.argv;
const im = toRGB(decodePNG(readFileSync(F)));
console.log(`${F}: ${im.W}x${im.H}`);
for (const p of pts) {
  const [x, y] = p.split(",").map(Number);
  const o = (y * im.W + x) * 3;
  console.log(`${x},${y}: ${im.data[o]},${im.data[o + 1]},${im.data[o + 2]}`);
}
