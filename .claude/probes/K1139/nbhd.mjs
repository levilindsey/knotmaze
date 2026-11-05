// K1139 Stage 2: a box of pixels around (X, Y) of one record and phase:
// GPU dbg-5 G, the CPU winner, and each band's v*cov, tau and distance.
//   node nbhd.mjs <dumpDir> <ji> <phase> <X> <Y> [r=3]
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { decodePNG, toRGB } from "./png.mjs";

const [DIR, JI, K, X0, Y0, R = "3"] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const rc = meta.recs.find((r) => r.ji === Number(JI));
const NB = 4, PB = 9, PX = NB * PB + 10;
const { w: BW } = rc.box;
const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
const u8 = new Uint8Array(readFileSync(join(DIR, `r${JI}_t${K}.u8`)));
const f32 = new Float32Array(new Uint8Array(readFileSync(join(DIR, `r${JI}_t${K}.f32`))).buffer);
const p = join(DIR, `t${K}_d.png`);
const gD = existsSync(p) ? toRGB(decodePNG(readFileSync(p))) : null;
const G = (X, Y) => gD.data[((Y + oy) * gD.W + X + ox) * 3 + 1];
const r = Number(R);
const nb = rc.bands.length;
const rows = { G: [], win: [] };
for (let b = 0; b < nb; b++) { rows[`vc${b}`] = []; rows[`tau${b}`] = []; rows[`d${b}`] = []; }
for (let Y = Number(Y0) - r; Y <= Number(Y0) + r; Y++) {
  const l = { G: [], win: [] };
  for (let b = 0; b < nb; b++) { l[`vc${b}`] = []; l[`tau${b}`] = []; l[`d${b}`] = []; }
  for (let X = Number(X0) - r; X <= Number(X0) + r; X++) {
    const i = Y * BW + X;
    l.G.push(String(G(X, Y)).padStart(4));
    l.win.push(String(u8[i * PX + 45] - 1).padStart(4));
    for (let b = 0; b < nb; b++) {
      const v = u8[i * PX + b * PB], c = u8[i * PX + b * PB + 1];
      l[`vc${b}`].push(String(Math.round((v * c) / 255)).padStart(4));
      l[`tau${b}`].push(f32[(i * NB + b) * 2 + 1].toFixed(3).padStart(7));
      l[`d${b}`].push(f32[(i * NB + b) * 2].toFixed(3).padStart(6));
    }
  }
  for (const key of Object.keys(l)) rows[key].push(`Y${Y}: ` + l[key].join(""));
}
for (const key of Object.keys(rows)) console.log(`${key}\n  ` + rows[key].join("\n  "));
