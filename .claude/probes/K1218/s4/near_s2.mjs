// K1218 S2: where two shots differ, by junction.
//   node near_s2.mjs <dirA> <dirB> <png> [radiusPx=70] [top=25]
// Each differing pixel goes to the nearest junction record of dirB's meta.json
// (sx, sy times dsf) within radiusPx, else to "far". Prints per junction the
// differing pixels, the largest channel delta and the pixel box, most first.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, toRGB } from "./png.mjs";

const [, , A, B, PNG, RAD = "70", TOP = "25"] = process.argv;
const R = Number(RAD);
const ia = toRGB(decodePNG(readFileSync(join(A, PNG))));
const ib = toRGB(decodePNG(readFileSync(join(B, PNG))));
const m = JSON.parse(readFileSync(join(B, "meta.json"), "utf8"));
const dsf = m.dsf || 1.5;
const recs = m.recs.map((r) => ({ ji: r.ji, x: r.sx * dsf, y: r.sy * dsf, n: 0, max: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 }));
const far = { ji: "far", n: 0, max: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
for (let y = 0; y < ia.H; y++) {
  for (let x = 0; x < ia.W; x++) {
    const o = (y * ia.W + x) * 3;
    const d = Math.max(
      Math.abs(ia.data[o] - ib.data[o]),
      Math.abs(ia.data[o + 1] - ib.data[o + 1]),
      Math.abs(ia.data[o + 2] - ib.data[o + 2]),
    );
    if (d === 0) continue;
    let best = far, bd = R * R;
    for (const r of recs) {
      const dd = (r.x - x) ** 2 + (r.y - y) ** 2;
      if (dd < bd) { bd = dd; best = r; }
    }
    best.n++;
    if (d > best.max) best.max = d;
    if (x < best.x0) best.x0 = x;
    if (y < best.y0) best.y0 = y;
    if (x > best.x1) best.x1 = x;
    if (y > best.y1) best.y1 = y;
  }
}
const list = [...recs.filter((r) => r.n), ...(far.n ? [far] : [])].sort((a, b) => b.n - a.n);
console.log(`${PNG}: ${list.reduce((s, r) => s + r.n, 0)} px in ${list.length} groups`);
for (const r of list.slice(0, Number(TOP))) {
  console.log(`  ji ${r.ji}: ${r.n} px, max ${r.max}, box ${r.x0},${r.y0}-${r.x1},${r.y1}`);
}
