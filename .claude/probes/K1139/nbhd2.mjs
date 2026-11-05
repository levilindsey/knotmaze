import { readFileSync } from "fs";
import { join } from "path";
import { decodePNG, toRGB } from "./png.mjs";
const [DIR, JI, K, X0, Y0, R] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const rc = meta.recs.find((r) => r.ji === Number(JI));
const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
const NB = 4, PB = 9, PX = NB * PB + 10, BW = rc.box.w;
const u8 = new Uint8Array(readFileSync(join(DIR, `r${JI}_t${K}.u8`)));
const ims = Object.fromEntries(["d", "dw", "n", "w"].map((v) => [v, toRGB(decodePNG(readFileSync(join(DIR, `t${K}_${v}.png`))))]));
const px = (im, X, Y, c) => im.data[((Y + oy) * im.W + X + ox) * 3 + c];
const r = Number(R);
// One band's twin values (env NB_BAND, default 0): v, cov, mode (c32: 0 nearest,
// 1 ray hit, 2 no hit), tau x 100 (f32), c x 100.
const B = Number(process.env.NB_BAND ?? 0);
const f32 = new Float32Array(new Uint8Array(readFileSync(join(DIR, `r${JI}_t${K}.f32`))).buffer);
let c32 = null;
try { c32 = new Float32Array(new Uint8Array(readFileSync(join(DIR, `r${JI}_t${K}.c32`))).buffer); } catch {}
const bandGrids = [
  [`b${B}.v`, (X, Y) => u8[(Y * BW + X) * PX + B * PB]],
  [`b${B}.cov`, (X, Y) => u8[(Y * BW + X) * PX + B * PB + 1]],
  [`b${B}.tau100`, (X, Y) => Math.round(f32[((Y * BW + X) * NB + B) * 2 + 1] * 100)],
  ...(c32 ? [[`b${B}.mode`, (X, Y) => c32[((Y * BW + X) * NB + B) * 2 + 1]], [`b${B}.c100`, (X, Y) => Math.round(c32[((Y * BW + X) * NB + B) * 2] * 100)]] : []),
];
for (const [name, f] of [["d.G", (X, Y) => px(ims.d, X, Y, 1)], ["dw.G", (X, Y) => px(ims.dw, X, Y, 1)], ["d.R", (X, Y) => px(ims.d, X, Y, 0)], ["dw.R", (X, Y) => px(ims.dw, X, Y, 0)], ["d.B", (X, Y) => px(ims.d, X, Y, 2)], ["cpuG", (X, Y) => { const o = (Y * BW + X) * PX; let g = 0; for (let b = 0; b < rc.bands.length; b++) g = Math.max(g, u8[o + b * PB] * u8[o + b * PB + 1] / 255); return Math.round(g); }], ...bandGrids]) {
  console.log(name);
  for (let Y = Number(Y0) - r; Y <= Number(Y0) + r; Y++) {
    const a = [];
    for (let X = Number(X0) - r; X <= Number(X0) + r; X++) a.push(String(f(X, Y)).padStart(4));
    console.log(`  Y${Y}: ${a.join("")}`);
  }
}