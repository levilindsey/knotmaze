// K1247 s12: the filled look at rest, before vs after, from two k1247c_dump
// table sets. Faces are painted as draw.ts paints them (table order, even-odd
// per face, one colour per owner chain, holes and ownerless faces skipped) on
// a CPU grid of <ppu> px per world unit; prints the differing pixels per case
// and writes a before/after crop pair (cropH world units square) at the
// largest differing cluster of each case to out/s12/crops/.
// Usage (from the worktree root): node scripts/run_node.mjs <this> <a> <b> [ppu=40] [cropH=3] [file filter]
import * as fs from "fs";
import * as path from "path";
import { deflateSync } from "zlib";
const [aSub, bSub, ppuS, cropS, filt] = process.argv.slice(2);
const ppu = Number(ppuS ?? 40); const cropH = Number(cropS ?? 3);
const out = path.resolve(".claude/probes/K1240/out");
const cropDir = path.join(out, "s12", "crops"); fs.mkdirSync(cropDir, { recursive: true });
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc(b: Uint8Array): number { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function png(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = new Uint8Array((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1); }
  const chunk = (t: string, d: Uint8Array): Buffer => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4, "ascii"); Buffer.from(d).copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array())]);
}
// Paint faces into an Int32 grid of owner chain + 1 (0 = background).
function paint(faces: any[], x0: number, y0: number, W: number, H: number, s: number): Int32Array {
  const g = new Int32Array(W * H);
  const xs: number[] = [];
  for (const f of faces) {
    if (f.hole || f.ownerChain < 0) continue;
    const n = f.pts.length / 2; if (n < 3) continue;
    let fy0 = Infinity; let fy1 = -Infinity;
    for (let i = 0; i < n; i++) { fy0 = Math.min(fy0, f.pts[2 * i + 1]); fy1 = Math.max(fy1, f.pts[2 * i + 1]); }
    const r0 = Math.max(0, Math.floor((fy0 - y0) * s)); const r1 = Math.min(H - 1, Math.ceil((fy1 - y0) * s));
    for (let r = r0; r <= r1; r++) {
      const y = y0 + (r + 0.5) / s; xs.length = 0;
      for (let i = 0; i < n; i++) {
        const ax = f.pts[2 * i]; const ay = f.pts[2 * i + 1]; const j = (i + 1) % n; const bx = f.pts[2 * j]; const by = f.pts[2 * j + 1];
        if ((ay <= y) !== (by <= y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((u, v) => u - v);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = Math.max(0, Math.ceil((xs[k] - x0) * s - 0.5)); const c1 = Math.min(W - 1, Math.floor((xs[k + 1] - x0) * s - 0.5));
        for (let c = c0; c <= c1; c++) g[r * W + c] = f.ownerChain + 1;
      }
    }
  }
  return g;
}
const col = (v: number): [number, number, number] => { if (!v) return [255, 255, 255]; const h = ((v * 137.508) % 360) / 60; const C = 150; const X = C * (1 - Math.abs((h % 2) - 1)); const t = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][Math.floor(h) % 6]; return [90 + t[0], 90 + t[1], 90 + t[2]] as [number, number, number]; };
const files = fs.readdirSync(path.join(out, aSub)).filter((f) => f.startsWith("table_") && f.endsWith(".json") && (!filt || f.includes(filt)));
for (const f of files) {
  const tA = JSON.parse(fs.readFileSync(path.join(out, aSub, f), "utf8")); const tB = JSON.parse(fs.readFileSync(path.join(out, bSub, f), "utf8"));
  const FA = (tA.table ?? tA).faces; const FB = (tB.table ?? tB).faces;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const F of [FA, FB]) for (const q of F) for (let i = 0; i + 1 < q.pts.length; i += 2) { x0 = Math.min(x0, q.pts[i]); x1 = Math.max(x1, q.pts[i]); y0 = Math.min(y0, q.pts[i + 1]); y1 = Math.max(y1, q.pts[i + 1]); }
  const W = Math.ceil((x1 - x0) * ppu) + 1; const H = Math.ceil((y1 - y0) * ppu) + 1;
  const gA = paint(FA, x0, y0, W, H, ppu); const gB = paint(FB, x0, y0, W, H, ppu);
  let d = 0; let dCov = 0; let bx = 0; let by = 0; let best = -1;
  const bin = Math.max(1, Math.round(cropH * ppu / 2)); const bins = new Map<number, number>();
  for (let i = 0; i < W * H; i++) if (gA[i] !== gB[i]) { d++; if (!gA[i] !== !gB[i]) dCov++; const k = Math.floor((i % W) / bin) + 100000 * Math.floor(Math.floor(i / W) / bin); bins.set(k, (bins.get(k) ?? 0) + 1); }
  for (const [k, v] of bins) if (v > best) { best = v; bx = (k % 100000) * bin + bin / 2; by = Math.floor(k / 100000) * bin + bin / 2; }
  let msg = `${f}: ${W}x${H} px at ${ppu}/unit; pixels differ ${d} (coverage ${dCov}, colour only ${d - dCov})`;
  if (d) {
    const cx = x0 + bx / ppu; const cy = y0 + by / ppu; const cw = Math.round(cropH * ppu);
    for (const [g, tag] of [[gA, "before"], [gB, "after"]] as const) {
      const rgb = new Uint8Array(cw * cw * 3);
      for (let r = 0; r < cw; r++) for (let c = 0; c < cw; c++) {
        const gx = Math.round(bx - cw / 2 + c); const gy = Math.round(by - cw / 2 + r);
        const v = gx >= 0 && gx < W && gy >= 0 && gy < H ? g[gy * W + gx] : 0;
        const diff = gx >= 0 && gx < W && gy >= 0 && gy < H && gA[gy * W + gx] !== gB[gy * W + gx];
        const cc = col(v); const o = (r * cw + c) * 3;
        rgb[o] = diff && (r + c) % 4 === 0 ? 255 : cc[0]; rgb[o + 1] = diff && (r + c) % 4 === 0 ? 0 : cc[1]; rgb[o + 2] = diff && (r + c) % 4 === 0 ? 0 : cc[2];
      }
      fs.writeFileSync(path.join(cropDir, `${f.replace(/^table_|\.json$/g, "")}_${tag}.png`), png(cw, cw, rgb));
    }
    msg += `; worst cluster at ${cx.toFixed(2)},${cy.toFixed(2)} (${best} px)`;
  }
  console.log(msg);
}
