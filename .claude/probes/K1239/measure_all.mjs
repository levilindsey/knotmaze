// K1239 Done 1: old ink (magenta border shot) vs field ink (ON screenshot),
// per family and look, whole-frame and junction-masked at 1.5h and 1.5*2h.
// Usage: node measure_all.mjs
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
const FAMS = ["def", "muse", "user"];
const LOOKS = [["fbb", ".claude/probes/K1239/out/app_magenta"], ["lbi", ".claude/probes/K1239/out/app_magenta_lbi"]];
const XMAX = 1580;
for (const fam of FAMS) {
  const diag = JSON.parse(readFileSync(`.claude/probes/K1239/out/diag_${fam}.json`, "utf8"));
  const cam = diag.scene.camera;
  const sCss = cam.pxPerUnit, cx = (800 - cam.worldToCss[4]) / sCss, cy = (450 - cam.worldToCss[5]) / sCss;
  const sZ = sCss * 8; // app_ab zoom (cap 8), same centre
  const vx = 800 - sZ * cx, vy = 450 - sZ * cy, dsf = 2400 / 1600;
  const hPx = diag.scene.look.halfWidth * sZ * dsf;
  const discs = diag.scene.junctions.map((j) => [(sZ * j.c[0] + vx) * dsf, (sZ * j.c[1] + vy) * dsf]);
  for (const [look, dir] of LOOKS) {
    const off = decode(`${dir}/app_${fam}_off.png`);
    const on = decode(`${dir}/app_${fam}_on.png`);
    const W = off.w, H = off.h;
    // marker discs: bright clusters in the OFF shot
    const marks = [];
    {
      const seen = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) {
        if (seen[i]) continue;
        seen[i] = 1;
        const x = i % W, y = (i / W) | 0;
        if (x >= XMAX) continue;
        const o = i * off.bpp;
        if (!(off.px[o] > 170 && off.px[o + 1] > 170 && off.px[o + 2] > 170)) continue;
        let n = 0, sx = 0, sy = 0; const st = [i];
        while (st.length) { const p = st.pop(), qx = p % W, qy = (p / W) | 0; n++; sx += qx; sy += qy; for (const q of [p - 1, p + 1, p - W, p + W]) { if (q < 0 || q >= W * H || seen[q]) continue; seen[q] = 1; const qo = q * off.bpp; if (off.px[qo] > 170 && off.px[qo + 1] > 170 && off.px[qo + 2] > 170) st.push(q); } }
        if (n > 200) marks.push([sx / n, sy / n]);
      }
    }
    const mag = (x, y) => { const o = (y * W + x) * off.bpp; const r = off.px[o], g = off.px[o + 1], b = off.px[o + 2]; return r > 110 && b > 110 && g < r - 50 && g < b - 50; };
    const fld = (x, y) => { const o = (y * W + x) * on.bpp; const r = on.px[o], g = on.px[o + 1], b = on.px[o + 2]; const lum = 0.299 * r + 0.587 * g + 0.114 * b; return (r - b) > -2 && lum < 60 && lum > 8; };
    const run = (rDisc) => {
      let a = 0, b = 0, both = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < XMAX; x++) {
        let m = false;
        for (const [mx, my] of marks) { const dx = x - mx, dy = y - my; if (dx * dx + dy * dy < 2025) { m = true; break; } }
        if (!m && rDisc > 0) for (const [jx, jy] of discs) { const dx = x - jx, dy = y - jy; if (dx * dx + dy * dy < rDisc * rDisc) { m = true; break; } }
        if (m) continue;
        const ia = mag(x, y), ib = fld(x, y);
        if (ia) a++; if (ib) b++; if (ia && ib) both++;
      }
      return { iou: a + b - both ? +(both / (a + b - both)).toFixed(4) : 1, oldOnly: a - both, fieldOnly: b - both };
    };
    console.log(`${fam} ${look}: whole=${JSON.stringify(run(0))} 1.5h(r=${(1.5 * hPx).toFixed(0)})=${JSON.stringify(run(1.5 * hPx))} 1.5fh2(r=${(3 * hPx).toFixed(0)})=${JSON.stringify(run(3 * hPx))} marks=${marks.length}`);
  }
}
