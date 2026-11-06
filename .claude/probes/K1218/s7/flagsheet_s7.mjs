// K1218 S7: a contact sheet of the rough check's flagged spots (item 3).
// One row per spot, four cells at zoom Z: master, S6's branch, this branch,
// and this branch again with every pixel whose excess roughness over master
// is >= T tinted red (the excess of rough_s7.mjs: the build's luma second
// difference less master's largest within 1 px).
//   node flagsheet_s7.mjs <out.png> <S> <Z> <stand|png|cx,cy>... [T via env FT=2]
// The rows print in order, so the sheet can be read against them.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { decodePNG, encodePNG, toRGB } from "../s4/png.mjs";

const [, , OUT, SS, ZS, ...specs] = process.argv;
const S = Number(SS), Z = Number(ZS), T = Number(process.env.FT || "2"), G = 6;
const here = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const DIRS = {
  m: "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1218/s4/out/b2",
  s6: "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-ae639b326ea18b921/.claude/probes/K1218/s6/out/c",
  b: process.env.FB || join(here, "out/b2"),
};
const cache = new Map();
const load = (p) => { if (!cache.has(p)) cache.set(p, toRGB(decodePNG(readFileSync(p)))); return cache.get(p); };
const lumaAt = (im, x, y) => { const s = (y * im.W + x) * 3; return 0.2126 * im.data[s] + 0.7152 * im.data[s + 1] + 0.0722 * im.data[s + 2]; };
const d2At = (im, x, y) => {
  if (x < 1 || y < 1 || x >= im.W - 1 || y >= im.H - 1) return 0;
  const c = lumaAt(im, x, y);
  return Math.max(Math.abs(lumaAt(im, x + 1, y) - 2 * c + lumaAt(im, x - 1, y)), Math.abs(lumaAt(im, x, y + 1) - 2 * c + lumaAt(im, x, y - 1)));
};
const CW = S * Z, cols = 4;
const SW = cols * CW + (cols + 1) * G, SH = specs.length * CW + (specs.length + 1) * G;
const data = Buffer.alloc(SW * SH * 3, 40);
specs.forEach((spec, ri) => {
  const [stand, png, c] = spec.split("|");
  const [cx, cy] = c.split(",").map(Number);
  const ims = ["m", "s6", "b"].map((k) => load(join(DIRS[k], stand, png)));
  const x0 = Math.round(cx - S / 2), y0 = Math.round(cy - S / 2);
  let nEx = 0, maxEx = 0;
  const ex = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const sx = x0 + x, sy = y0 + y;
    let ma = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) ma = Math.max(ma, d2At(ims[0], sx + dx, sy + dy));
    const e = d2At(ims[2], sx, sy) - ma;
    ex[y * S + x] = e;
    if (e >= T) { nEx++; if (e > maxEx) maxEx = e; }
  }
  for (let ci = 0; ci < cols; ci++) {
    const im = ims[Math.min(ci, 2)];
    const ox = G + ci * (CW + G), oy = G + ri * (CW + G);
    for (let y = 0; y < CW; y++) {
      const sy = y0 + Math.floor(y / Z);
      for (let x = 0; x < CW; x++) {
        const sx = x0 + Math.floor(x / Z);
        const o = ((oy + y) * SW + ox + x) * 3;
        if (sx < 0 || sy < 0 || sx >= im.W || sy >= im.H) { data[o] = 255; data[o + 1] = 0; data[o + 2] = 255; continue; }
        const s = (sy * im.W + sx) * 3;
        let r = im.data[s], g = im.data[s + 1], b = im.data[s + 2];
        if (ci === 3 && ex[Math.floor(y / Z) * S + Math.floor(x / Z)] >= T) { r = 255; g = Math.round(g * 0.3); b = Math.round(b * 0.3); }
        data[o] = r; data[o + 1] = g; data[o + 2] = b;
      }
    }
  }
  console.log(`row ${ri + 1}: ${stand} ${png} @${cx},${cy}: ${nEx} px excess >= ${T}, max ${maxEx.toFixed(1)}`);
});
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, encodePNG({ W: SW, H: SH, data }));
console.log(`${OUT}: ${SW}x${SH}`);
