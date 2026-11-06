// K1210 (batch 22 Run H): one sheet per stand and effect - 10 frames of
// the crop at nearest-neighbour 2x with their clock labels, the route
// kymographs beside them, and the pulse's frames + kymographs at the
// same junction under them. Pulse kymographs read debug view 5's G (the
// pulse field; the fronts in analyse.mjs come from the same samples).
//   node sheet.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const FR = join(import.meta.dirname, "out", "frames");
const KY = join(import.meta.dirname, "out", "kymo");
const OUT = join(import.meta.dirname, "out");
const PICK = [0, 3, 7, 10, 13, 16, 20, 23, 26, 29];
const FONT = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "101111111111101", O: "010101101101010",
  P: "110101110100100", Q: "010101101010001", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101011", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
  Z: "111001010100111", "0": "111101101101111", "1": "010010010010111", "2": "110001010100111", "3": "110001011001110",
  "4": "101101111001001", "5": "111100110001110", "6": "011100111101010", "7": "111001001010010", "8": "010101010101010",
  "9": "010101011001110", ".": "000000000000010", "-": "000000111000000", "=": "000111000111000", ">": "100010001010100",
  ":": "000010000010000", "/": "001001010100100", " ": "000000000000000", "+": "000010111010000", "(": "001010010010001",
  ")": "100010001010100", "_": "000000000000111",
};
function text(img, x, y, str, scale = 2) {
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const g = FONT[ch] ?? FONT[" "];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === "1") {
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const px = cx + c * scale + dx, py = y + r * scale + dy;
        if (px < 0 || py < 0 || px >= img.W || py >= img.H) continue;
        const o = (py * img.W + px) * 3;
        img.data[o] = 255; img.data[o + 1] = 240; img.data[o + 2] = 120;
      }
    }
    cx += 4 * scale;
  }
}
function box(img, x, y, w, h, v = 24) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const px = x + i, py = y + j;
    if (px < 0 || py < 0 || px >= img.W || py >= img.H) continue;
    const o = (py * img.W + px) * 3;
    img.data[o] = v; img.data[o + 1] = v; img.data[o + 2] = v + 8;
  }
}
function blit(dst, src, ox, oy, scale = 1) {
  for (let y = 0; y < src.H * scale; y++) for (let x = 0; x < src.W * scale; x++) {
    const sx = Math.floor(x / scale), sy = Math.floor(y / scale);
    const so = (sy * src.W + sx) * 3, dxx = ox + x, dyy = oy + y;
    if (dxx < 0 || dyy < 0 || dxx >= dst.W || dyy >= dst.H) continue;
    src.data.copy(dst.data, (dyy * dst.W + dxx) * 3, so, so + 3);
  }
}
const load = (f) => toRGB(decodePNG(readFileSync(f)));
const labelOf = (effect, f) => effect === "fire" ? `L${f.L.toFixed(1)}` : effect === "collapse" ? `D${f.clock >= 0 ? "+" : ""}${f.clock.toFixed(2)}` : `T${f.t.toFixed(2)}`;

function block(stand, effect, caption) {
  const meta = JSON.parse(readFileSync(join(FR, `${stand}_${effect}.json`), "utf8"));
  const frames = PICK.map((i) => ({ img: load(join(FR, meta.frames[i].file)), label: labelOf(effect, meta.frames[i]) }));
  const fw = frames[0].img.W * 2, fh = frames[0].img.H * 2, labH = 16, cols = 5;
  const rows = Math.ceil(frames.length / cols);
  const W = cols * fw + (cols + 1) * 6, H = 22 + rows * (fh + labH + 6) + 6;
  const img = { W, H, data: Buffer.alloc(W * H * 3, 40) };
  text(img, 8, 6, caption, 2);
  frames.forEach((f, i) => {
    const ox = 6 + (i % cols) * (fw + 6), oy = 22 + Math.floor(i / cols) * (fh + labH + 6);
    blit(img, f.img, ox, oy, 2);
    box(img, ox, oy + fh, fw, labH);
    text(img, ox + 4, oy + fh + 3, f.label, 2);
  });
  return img;
}
function kymoBlock(stand, effect, routes, caption) {
  const imgs = routes.map(([i, o]) => load(join(KY, `${stand}_${effect}_e${i}-e${o}.png`)));
  const W = Math.max(...imgs.map((i) => i.W)) + 16, H = 22 + imgs.reduce((s, i) => s + i.H + 18, 0);
  const img = { W, H, data: Buffer.alloc(W * H * 3, 40) };
  text(img, 8, 6, caption, 2);
  let y = 22;
  imgs.forEach((im, k) => {
    text(img, 8, y, `E${routes[k][0]}-E${routes[k][1]}`, 2);
    blit(img, im, 8, y + 14, 1);
    y += im.H + 18;
  });
  return img;
}
function stack(a, b, gap = 8) {
  const W = Math.max(a.W, b.W), H = a.H + gap + b.H;
  const img = { W, H, data: Buffer.alloc(W * H * 3, 40) };
  blit(img, a, 0, 0); blit(img, b, 0, a.H + gap);
  return img;
}
function side(a, b, gap = 8) {
  const W = a.W + gap + b.W, H = Math.max(a.H, b.H);
  const img = { W, H, data: Buffer.alloc(W * H * 3, 40) };
  blit(img, a, 0, 0); blit(img, b, a.W + gap, 0);
  return img;
}

const ROUTES = { S3: { fire: [[39, 210], [39, 209]], collapse: [[210, 209]], pulse: [[210, 209], [39, 209]] }, S4: { fire: [[176, 135], [176, 134], [176, 175]], collapse: [[176, 135]], pulse: [[176, 135], [176, 134], [176, 175]] } };
const JN = { S3: "NODE_218 3 ARM", S4: "NODE_378 4 ARM" };
for (const stand of ["S3", "S4"]) {
  for (const effect of ["fire", "collapse"]) {
    const top = side(block(stand, effect, `${stand} ${effect.toUpperCase()} ${JN[stand]}`), kymoBlock(stand, effect, ROUTES[stand][effect], "KYMO LUMA RED=FRONT"));
    const bot = side(block(stand, "pulse", `${stand} PULSE SAME JUNCTION`), kymoBlock(stand, "pulse", ROUTES[stand].pulse, "KYMO DEBUG5 G"));
    const sheet = stack(top, bot);
    const file = join(OUT, `sheet_${stand}_${effect}.png`);
    writeFileSync(file, encodePNG(sheet));
    console.log(`${file}: ${sheet.W}x${sheet.H}`);
  }
}
