// K1239: field-only / old-only pixels by distance to nearest junction (world).
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
function decode(file) {
  const buf = readFileSync(file);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), ct = buf[25];
  const bpp = ct === 6 ? 4 : 3;
  const idat = [];
  for (let o = 8; o < buf.length;) { const len = buf.readUInt32BE(o), t = buf.toString("ascii", o + 4, o + 8); if (t === "IDAT") idat.push(buf.subarray(o + 8, o + 8 + len)); o += 12 + len; }
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i], a = i >= bpp ? px[dst + i - bpp] : 0, b = y > 0 ? px[dst - stride + i] : 0, c = i >= bpp && y > 0 ? px[dst - stride + i - bpp] : 0;
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      px[dst + i] = v & 255;
    }
  }
  return { w, h, bpp, px };
}
const A = decode(".claude/probes/K1239/out/app_before/app_def_off.png");
const C = decode(".claude/probes/K1239/out/cover_def_zoom.png");
const d = JSON.parse(readFileSync(".claude/probes/K1239/out/diag_def.json", "utf8"));
const ab = JSON.parse(readFileSync(".claude/probes/K1239/out/app_before/app_ab.json", "utf8"));
const v = ab[0].off.view, dsf = 2400 / 1600;
const W = A.w, H = A.h, XMAX = 1580;
const jn = d.scene.junctions.map((j) => [(v.s * j.c[0] + v.x) * dsf, (v.s * j.c[1] + v.y) * dsf]);
const body = (x, y) => { const o = (y * W + x) * A.bpp; const dr = A.px[o] - 20, dg = A.px[o + 1] - 25, db = A.px[o + 2] - 37; return dr * dr + dg * dg + db * db > 144; };
const pxPerWorld = v.s * dsf;
const bins = [0, 0.26, 0.52, 0.78, 1.04, 1.3, 1.6, 2.0, 2.6, 99];
const hf = new Array(bins.length - 1).fill(0), ho = new Array(bins.length - 1).fill(0);
for (let y = 0; y < H; y += 2) for (let x = 0; x < XMAX; x += 2) {
  const ia = body(x, y), ib = C.px[(y * W + x) * C.bpp] > 127;
  if (ia === ib) continue;
  let best = 1e9;
  for (const [cx, cy] of jn) { const dd = (x - cx) ** 2 + (y - cy) ** 2; if (dd < best) best = dd; }
  const dw = Math.sqrt(best) / pxPerWorld;
  let bi = bins.findIndex((b, i) => dw >= b && dw < bins[i + 1]);
  if (bi < 0) bi = bins.length - 2;
  if (ib) hf[bi] += 4; else ho[bi] += 4;
}
console.log("dist-to-junction (world): field-only / old-only");
bins.slice(0, -1).forEach((b, i) => console.log(`${b.toFixed(2)}-${bins[i + 1].toFixed(2)}: F=${hf[i]} O=${ho[i]}`));
