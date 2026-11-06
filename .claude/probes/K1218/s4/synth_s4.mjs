// K1218 S4: synthetic edges at zoom 4 - which ramp reads as smooth as a
// ribbon's edge against the background? A circle of radius 60 px (gold inside,
// teal outside), one cell per variant; the last cell is teal against the dark
// background with the same 1 px ramp (the reference).
import { writeFileSync } from "node:fs";
import { encodePNG } from "./png.mjs";
const S = 64, Z = 4, G = 6;
const GOLD = [236, 204, 65], TEAL = [122, 190, 186], DARK = [24, 28, 40];
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const enc = (v) => { v = Math.max(0, Math.min(1, v)); return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)); };
const toOk = (c) => {
  const [r, g, b] = c.map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const fromOk = ([L, a, b]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [enc(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), enc(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), enc(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
};
const mixS = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const mixL = (a, b, t) => a.map((v, i) => enc(lin(v) + (lin(b[i]) - lin(v)) * t));
const mixO = (a, b, t) => { const A = toOk(a), B = toOk(b); return fromOk(A.map((v, i) => v + (B[i] - v) * t)); };
const box = (d, w) => Math.max(0, Math.min(1, 0.5 - d / w));
const ss = (d, w) => { const t = Math.max(0, Math.min(1, 0.5 - d / w)); return t * t * (3 - 2 * t); };
// 4x rotated-grid MSAA of a hard edge (D3D pattern)
const MS = [[-2 / 16, -6 / 16], [6 / 16, -2 / 16], [-6 / 16, 2 / 16], [2 / 16, 6 / 16]];
const SET = process.argv[3] || "a";
const variantsB = [
  ["box1 srgb (now)", (x, y, sd) => mixS(TEAL, GOLD, box(sd(x, y), 1))],
  ["ss2", (x, y, sd) => mixS(TEAL, GOLD, ss(sd(x, y), 2))],
  ["ss2.5", (x, y, sd) => mixS(TEAL, GOLD, ss(sd(x, y), 2.5))],
  ["ss3", (x, y, sd) => mixS(TEAL, GOLD, ss(sd(x, y), 3))],
  ["box1.5", (x, y, sd) => mixS(TEAL, GOLD, box(sd(x, y), 1.5))],
  ["box2", (x, y, sd) => mixS(TEAL, GOLD, box(sd(x, y), 2))],
  ["ss2.5 oklab", (x, y, sd) => mixO(TEAL, GOLD, ss(sd(x, y), 2.5))],
  ["ref teal/dark msaa4", (x, y, sd) => mixS(DARK, TEAL, MS.reduce((s, [ox, oy]) => s + (sd(x + ox, y + oy) < 0 ? 0.25 : 0), 0))],
];
const variantsA = [
  ["box1 srgb", (x, y, sd) => mixS(TEAL, GOLD, box(sd(x, y), 1))],
  ["box1 linear", (x, y, sd) => mixL(TEAL, GOLD, box(sd(x, y), 1))],
  ["box1 oklab", (x, y, sd) => mixO(TEAL, GOLD, box(sd(x, y), 1))],
  ["box1.5 srgb", (x, y, sd) => mixS(TEAL, GOLD, box(sd(x, y), 1.5))],
  ["box2 srgb", (x, y, sd) => mixS(TEAL, GOLD, box(sd(x, y), 2))],
  ["msaa4 srgb", (x, y, sd) => mixS(TEAL, GOLD, MS.reduce((s, [ox, oy]) => s + (sd(x + ox, y + oy) < 0 ? 0.25 : 0), 0))],
  ["box1.5 oklab", (x, y, sd) => mixO(TEAL, GOLD, box(sd(x, y), 1.5))],
  ["ref teal/dark msaa4", (x, y, sd) => mixS(DARK, TEAL, MS.reduce((s, [ox, oy]) => s + (sd(x + ox, y + oy) < 0 ? 0.25 : 0), 0))],
];
const variants = SET === "b" ? variantsB : variantsA;
const cols = 4, rows = Math.ceil(variants.length / cols), CW = S * Z;
const W = cols * CW + (cols + 1) * G, H = rows * CW + (rows + 1) * G;
const data = Buffer.alloc(W * H * 3, 40);
const R = 70, cx = -10.3, cy = -20.7;
const sd = (x, y) => Math.hypot(x - cx, y - cy) - R;
variants.forEach(([name, f], k) => {
  const ox = G + (k % cols) * (CW + G), oy = G + Math.floor(k / cols) * (CW + G);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const c = f(x + 0.5, y + 0.5, sd);
    for (let j = 0; j < Z; j++) for (let i = 0; i < Z; i++) { const o = ((oy + y * Z + j) * W + ox + x * Z + i) * 3; data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; }
  }
  console.log(k, name);
});
writeFileSync(process.argv[2], encodePNG({ W, H, data }));

