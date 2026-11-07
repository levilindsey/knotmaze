// K1239: connected components of field-only / old-only pixels (junction-masked).
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
const [fa, fb, diagFile, minArg] = process.argv.slice(2);
const MIN = Number(minArg ?? 300);
const A = decode(fa), B = decode(fb);
const W = A.w, H = A.h, XMAX = 1580;
const mask = (I, x, y) => { const o = (y * I.w + x) * I.bpp; const dr = I.px[o] - 20, dg = I.px[o + 1] - 25, db = I.px[o + 2] - 37; return dr * dr + dg * dg + db * db > 144; };
const d = JSON.parse(readFileSync(diagFile, "utf8"));
const ab = JSON.parse(readFileSync(diagFile.replace("diag_def.json", "app_before/app_ab.json"), "utf8"));
const v = ab[0].off.view, dsf = W / 1600, hPx = d.scene.look.halfWidth * v.s * dsf;
const discs = d.scene.junctions.map((j) => [(v.s * j.c[0] + v.x) * dsf, (v.s * j.c[1] + v.y) * dsf]);
const R = 1.5 * 2 * hPx;
// diff: 1 field-only, 2 old-only, 0 else/masked
const diff = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < XMAX; x++) {
  let m = false;
  for (const [cx, cy] of discs) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy < R * R) { m = true; break; } }
  if (m) continue;
  const ia = mask(A, x, y), ib = mask(B, x, y);
  if (ib && !ia) diff[y * W + x] = 1;
  else if (ia && !ib) diff[y * W + x] = 2;
}
const seen = new Uint8Array(W * H);
const comps = [];
for (let i = 0; i < W * H; i++) {
  if (!diff[i] || seen[i]) continue;
  const kind = diff[i], stack = [i];
  seen[i] = 1;
  let n = 0, sx = 0, sy = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
  while (stack.length) {
    const p = stack.pop(), x = p % W, y = (p / W) | 0;
    n++; sx += x; sy += y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    for (const q of [p - 1, p + 1, p - W, p + W]) {
      if (q < 0 || q >= W * H || seen[q] || diff[q] !== kind) continue;
      if (Math.abs((q % W) - x) > 1) continue;
      seen[q] = 1; stack.push(q);
    }
  }
  if (n >= MIN) comps.push({ kind, n, cx: sx / n, cy: sy / n, x0, x1, y0, y1 });
}
comps.sort((a, b) => b.n - a.n);
for (const c of comps.slice(0, 30)) {
  const wx = ((c.cx / dsf) - v.x) / v.s, wy = ((c.cy / dsf) - v.y) / v.s;
  console.log(`${c.kind === 1 ? "FIELD-ONLY" : "OLD-ONLY  "} n=${c.n} dev=(${c.cx.toFixed(0)},${c.cy.toFixed(0)}) bbox=[${c.x0}..${c.x1}]x[${c.y0}..${c.y1}] world=(${wx.toFixed(2)},${wy.toFixed(2)})`);
}
console.log(`components>=${MIN}: ${comps.length} (field-only ${comps.filter((c) => c.kind === 1).length}, old-only ${comps.filter((c) => c.kind === 2).length})`);
