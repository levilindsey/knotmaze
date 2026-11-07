// K1228: Done 5's sheets - 96 device px windows at zoom 4, master over
// mine, from the stands' rest (np) shots, in out/sheets/.
//   node sheets.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const OUT = new URL("./out/sheets/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
mkdirSync(OUT, { recursive: true });
const SPOTS = [
  ["ji51", "cross", 1019, 1136],
  ["tight_loop_c79j178", "loop", 639, 1354],
  ["tight_cross_c23j42", "cross", 1228, 607],
  ["tight_x4_c13j41", "x4", 1454, 275],
  ["tight_loop_c5j528", "loop", 949, 304],
  ["tight_loop_c74j185", "loop", 1483, 865],
  ["loop_bg338", "loop", 459, 1335],
  ["un_cross_2306_17", "cross", 2306, 17],
  ["un_cross_588_1256", "cross", 588, 1256],
  ["un_cross_ji51b", "cross", 1019, 1138],
  ["un_cross_1942_137", "cross", 1942, 137],
  ["un_loop_1754_785", "loop", 1754, 785],
  ["un_loop_530_788", "loop", 530, 788],
  ["un_loop_479_1352", "loop", 479, 1352],
  ["un_x4_1019_988", "x4", 1019, 988],
  ["un_x4_655_1109", "x4", 655, 1109],
];
const W = 96, S = 4, G = 6;
for (const [name, stand, cx, cy] of SPOTS) {
  const imgs = ["master", "mine"].map((h) =>
    toRGB(decodePNG(readFileSync(join(new URL(`./out/${h}/${stand}/`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "np.png"))))
  );
  const H = 2 * W * S + 3 * G, Wd = W * S + 2 * G;
  const data = Buffer.alloc(Wd * H * 3, 60);
  imgs.forEach((im, row) => {
    const x0 = Math.max(0, Math.min(im.W - W, cx - W / 2));
    const y0 = Math.max(0, Math.min(im.H - W, cy - W / 2));
    for (let j = 0; j < W * S; j++) for (let i = 0; i < W * S; i++) {
      const sx = x0 + Math.floor(i / S), sy = y0 + Math.floor(j / S);
      const so = (sy * im.W + sx) * 3;
      const d_o = ((G + row * (W * S + G) + j) * Wd + G + i) * 3;
      data[d_o] = im.data[so];
      data[d_o + 1] = im.data[so + 1];
      data[d_o + 2] = im.data[so + 2];
    }
  });
  writeFileSync(join(OUT, `${name}.png`), encodePNG({ W: Wd, H, data }));
  console.log(`${name}: ${stand} @${cx},${cy}`);
}
