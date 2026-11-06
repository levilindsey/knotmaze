import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, toRGB } from "./png.mjs";
const [, , A, B] = process.argv;
const ia = toRGB(decodePNG(readFileSync(join(A, "np.png")))), ib = toRGB(decodePNG(readFileSync(join(B, "np.png"))));
const lum = (im, o) => 0.299 * im.data[o] + 0.587 * im.data[o + 1] + 0.114 * im.data[o + 2];
const hist = { lighter: [0, 0, 0, 0], darker: [0, 0, 0, 0] }; // >2, >8, >32, >96
const top = [];
for (let o = 0, i = 0; i < ia.W * ia.H; i++, o += 3) {
  const d = lum(ib, o) - lum(ia, o);
  const a = Math.abs(d); if (a <= 2) continue;
  const h = d > 0 ? hist.lighter : hist.darker;
  h[0]++; if (a > 8) h[1]++; if (a > 32) h[2]++; if (a > 96) h[3]++;
  if (d > 32) top.push([Math.round(d), i % ia.W, Math.floor(i / ia.W)]);
}
top.sort((p, q) => q[0] - p[0]);
console.log(`lighter >2/>8/>32/>96: ${hist.lighter.join("/")}  darker: ${hist.darker.join("/")}`);
console.log(`top lighter: ${top.slice(0, 12).map((t) => `${t[0]}@${t[1]},${t[2]}`).join(" ")}`);
