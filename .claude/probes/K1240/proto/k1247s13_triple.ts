// K1247 s13: one spot, three panels: form B's top surface (pastel per
// surface, white = paper), then the filled faces of two k1247c_dump table
// sets (one colour per owner chain, painted as k1247s12_facecrops paints
// them). In the table panels, a pixel whose coverage disagrees with form B
// is hatched red (filled where form B shows paper) or black (paper where
// form B covers). Prints each table's disagreement count in the window.
// Usage: node scripts/run_node.mjs <this> <scene> <x> <y> <width> <subA> <subB> [ppu=40] [out tag]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { FormB } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const [nm, xS, yS, wS, subA, subB, ppuS, tagS] = process.argv.slice(2);
const cx = +xS; const cy = +yS; const wid = +wS; const ppu = Number(ppuS ?? 40);
const tag = tagS ?? `${nm}_${cx}_${cy}`;
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${nm}.json`), "utf8"));
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const fb = new FormB(scene as never, { dpr: 2 }) as any;
const out = join(here, "..", "out", "s13", "triple"); mkdirSync(out, { recursive: true });
const N = Math.round(wid * ppu); const x0 = cx - wid / 2; const y0 = cy - wid / 2;
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc(b: Uint8Array): number { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function png(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = new Uint8Array((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1); }
  const chunk = (t: string, d: Uint8Array): Buffer => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4, "ascii"); Buffer.from(d).copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array())]);
}
function paint(faces: any[]): Int32Array {
  const g = new Int32Array(N * N); const xs: number[] = [];
  for (const f of faces) {
    if (f.hole || f.ownerChain < 0) continue;
    const n = f.pts.length / 2; if (n < 3) continue;
    for (let r = 0; r < N; r++) {
      const y = y0 + (r + 0.5) / ppu; xs.length = 0;
      for (let i = 0; i < n; i++) {
        const ax = f.pts[2 * i]; const ay = f.pts[2 * i + 1]; const j = (i + 1) % n; const bx = f.pts[2 * j]; const by = f.pts[2 * j + 1];
        if ((ay <= y) !== (by <= y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((u, v) => u - v);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = Math.max(0, Math.ceil((xs[k] - x0) * ppu - 0.5)); const c1 = Math.min(N - 1, Math.floor((xs[k + 1] - x0) * ppu - 0.5));
        for (let c = c0; c <= c1; c++) g[r * N + c] = f.ownerChain + 1;
      }
    }
  }
  return g;
}
const col = (v: number): [number, number, number] => { if (!v) return [255, 255, 255]; const h = ((v * 137.508) % 360) / 60; const C = 150; const X = C * (1 - Math.abs((h % 2) - 1)); const t = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][Math.floor(h) % 6]; return [90 + t[0], 90 + t[1], 90 + t[2]] as [number, number, number]; };
const fbTop = new Int32Array(N * N);
for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) fbTop[r * N + c] = fb.evalPoint(x0 + (c + 0.5) / ppu, y0 + (r + 0.5) / ppu).top;
const tables = [subA, subB].map((s) => { const t = JSON.parse(readFileSync(join(here, "..", "out", s, `table_${nm}_0.json`), "utf8")); return paint((t.table ?? t).faces); });
const GAP = 6; const W = 3 * N + 2 * GAP;
const img = new Uint8Array(W * N * 3).fill(128);
const put = (px: number, py: number, rgb: number[]): void => { const i = (py * W + px) * 3; img[i] = rgb[0]; img[i + 1] = rgb[1]; img[i + 2] = rgb[2]; };
for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
  const t = fbTop[r * N + c];
  if (t >= 0) { const hue = ((t % 997) * 0.618) % 1; put(c, r, [200 + 55 * Math.cos(6.283 * hue), 200 + 55 * Math.cos(6.283 * (hue - 0.333)), 200 + 55 * Math.cos(6.283 * (hue - 0.667))]); } else put(c, r, [255, 255, 255]);
}
const counts: string[] = [];
tables.forEach((g, k) => {
  const ox = (k + 1) * (N + GAP); let red = 0; let blk = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const v = g[r * N + c]; const fbCov = fbTop[r * N + c] >= 0; const hatch = (r + c) % 4 === 0;
    let rgb = col(v);
    if (v && !fbCov) { red++; if (hatch) rgb = [220, 0, 0]; }
    if (!v && fbCov) { blk++; if (hatch) rgb = [0, 0, 0]; }
    put(ox + c, r, rgb);
  }
  counts.push(`${[subA, subB][k]}: filled where form B is paper ${red} px, paper where form B covers ${blk} px`);
});
const file = join(out, `${tag}.png`);
writeFileSync(file, png(W, N, img));
console.log(`${nm} at ${cx},${cy} width ${wid} (${N} px at ${ppu}/unit): ` + counts.join("; ") + ` -> ${file}`);
