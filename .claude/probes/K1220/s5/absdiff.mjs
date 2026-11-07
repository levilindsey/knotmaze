// K1220 S5 (after K1218 S4's absdiff_s4.mjs): a whole-frame difference of two
// shots, and where it lies.
//   node absdiff.mjs <a.png> <b.png> <out.png> [gain=4] [meta.json] [radiusFh=3]
// Each pixel of out.png is the largest channel |a - b| times gain (clamped),
// grey; 0 stays black. Prints the changed pixels (d > 0 and d > 8 levels) and
// their bounding box; with a meta.json (shoot.mjs's), also how many lie within
// radiusFh fill half-widths of a TEXT fork (a record whose arms are glyph
// chains) and how many lie beyond every one (what "only text forks change"
// must read 0).
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const [, , A, B, OUT, GAIN = "4", META, RAD = "3"] = process.argv;
const g = Number(GAIN);
const ia = toRGB(decodePNG(readFileSync(A)));
const ib = toRGB(decodePNG(readFileSync(B)));
if (ia.W !== ib.W || ia.H !== ib.H) throw new Error(`size ${ia.W}x${ia.H} vs ${ib.W}x${ib.H}`);
let forks = [], rpx = 0;
if (META) {
  const m = JSON.parse(readFileSync(META, "utf8"));
  const dsf = m.dsf || 1.5;
  rpx = Number(RAD) * m.fh * m.view.s * dsf;
  forks = m.recs.filter((r) => r.glyph).map((r) => [r.sx * dsf, r.sy * dsf]);
}
const out = Buffer.alloc(ia.W * ia.H * 3);
let n0 = 0, n8 = 0, near = 0, far = 0, far8 = 0;
let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
for (let i = 0; i < ia.W * ia.H; i++) {
  const o = i * 3;
  const d = Math.max(
    Math.abs(ia.data[o] - ib.data[o]),
    Math.abs(ia.data[o + 1] - ib.data[o + 1]),
    Math.abs(ia.data[o + 2] - ib.data[o + 2]),
  );
  const v = Math.min(255, d * g);
  out[o] = v; out[o + 1] = v; out[o + 2] = v;
  if (!d) continue;
  n0++; if (d > 8) n8++;
  const x = i % ia.W, y = (i / ia.W) | 0;
  if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  if (META) {
    let inside = false;
    for (const [fx, fy] of forks) if (Math.hypot(x - fx, y - fy) <= rpx) { inside = true; break; }
    if (inside) near++; else { far++; if (d > 8) far8++; }
  }
}
writeFileSync(OUT, encodePNG({ W: ia.W, H: ia.H, data: out }));
const box = n0 ? `box ${x0},${y0}-${x1},${y1}` : "box none";
console.log(`${OUT}: changed ${n0} px (>8: ${n8}) ${box}` + (META ? ` | near text forks (${RAD} fh = ${rpx.toFixed(1)} px, ${forks.length} forks) ${near}, beyond ${far} (>8: ${far8})` : ""));
