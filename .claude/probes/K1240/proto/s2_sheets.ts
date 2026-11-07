// K1240 S2 sheets: per spot, three panels at zoom 4 (scene pxPerUnit*4
// px per world unit) — [S2 outline | form B ink | S2 fill + outline].
// Form B's paper is recoloured white so its black ink stands out;
// labels live in the file names and index.md, never over the picture.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s2_sheets.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { buildOutline, type SceneIn } from "./outline";
import { FormB } from "../../../../src/render/field/form_b";
import { chainColor, baseHueFor } from "./draw";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "s2", "sheets");
mkdirSync(outDir, { recursive: true });
const scene = JSON.parse(readFileSync("C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/def.json", "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const table = buildOutline(scene);
const fb = new FormB(scene as never, { dpr: 2 });

// Minimal PNG writer (RGB, zlib).
const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf: Buffer): number { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePng(path: string, w: number, h: number, rgb: Uint8Array): void {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.subarray(y * w * 3, (y + 1) * w * 3).forEach((v, i) => { raw[y * (w * 3 + 1) + 1 + i] = v; }); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]);
  writeFileSync(path, png);
}

// Chain point at s on raw scene points.
function chainPoint(chain: number, s: number): [number, number] {
  const pts = scene.chains[chain].pts;
  let acc = 0;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const l = Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]);
    if (acc + l >= s || i + 5 >= pts.length) { const t = l > 0 ? Math.min(1, Math.max(0, (s - acc) / l)) : 0; return [pts[i] + (pts[i + 2] - pts[i]) * t, pts[i + 1] + (pts[i + 3] - pts[i + 1]) * t]; }
    acc += l;
  }
  return [pts[pts.length - 2], pts[pts.length - 1]];
}

// Spots: S1's four, two named failures, and closed eyes (crossing pairs
// of one chain pair whose centres are close).
interface Spot { tag: string; cx: number; cy: number; note: string }
const spots: Spot[] = [];
for (const jid of ["j184", "j9", "j135", "j107", "j152", "j34"]) {
  const j = scene.junctions.find((jj) => jj.id === jid);
  if (j) spots.push({ tag: jid, cx: j.c[0], cy: j.c[1], note: `junction ${jid} at ${j.c.map((v) => v.toFixed(1)).join(",")}` });
}
{
  const pts = scene.crossings.map((x) => chainPoint(x.a.chain, x.a.s));
  const eyes: Spot[] = [];
  for (let i = 0; i < scene.crossings.length; i++) for (let j = i + 1; j < scene.crossings.length; j++) {
    const a = scene.crossings[i]; const b = scene.crossings[j];
    const pairA = [a.a.chain, a.b.chain].sort().join("-"); const pairB = [b.a.chain, b.b.chain].sort().join("-");
    if (pairA !== pairB) continue;
    const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
    if (d > 0.2 && d < 1.4) eyes.push({ tag: `eye${eyes.length + 1}`, cx: (pts[i][0] + pts[j][0]) / 2, cy: (pts[i][1] + pts[j][1]) / 2, note: `closed eye between crossings ${i} and ${j} (centre distance ${d.toFixed(2)})` });
    if (eyes.length >= 40) break;
  }
  // Keep well separated eyes.
  const picked: Spot[] = [];
  for (const e of eyes) if (picked.every((p) => Math.hypot(p.cx - e.cx, p.cy - e.cy) > 3)) picked.push(e);
  spots.push(...picked.slice(0, 3));
}

const PANEL = 512;
const GAP = 12;
const scale = scene.camera.pxPerUnit * 4;
const baseHue = baseHueFor(scene.name);
// Segment grid for outline distance.
const segs: [number, number, number, number][] = [];
for (const p of table.pieces) for (let i = 0; i + 3 < p.pts.length; i += 2) segs.push([p.pts[i], p.pts[i + 1], p.pts[i + 2], p.pts[i + 3]]);
const distToOutline = (x: number, y: number): number => {
  let best = Infinity;
  // Panel window is small; a linear scan over segments whose bbox is
  // near the spot is done by the caller culling segs per spot.
  return best;
};
void distToOutline;

const index: string[] = ["# K1240 S2 sheets (def, zoom 4)", "", "Each file: [S2 outline (centred stroke on white) | form B ink (black on white; form B's dark paper recoloured) | S2 fill + outline]. File names carry the spot; no text is drawn over the pictures.", ""];
for (const spot of spots) {
  const x0 = spot.cx - PANEL / 2 / scale; const y0 = spot.cy - PANEL / 2 / scale;
  // Cull outline segments to the window.
  const local = segs.filter(([ax, ay, bx, by]) => Math.max(ax, bx) >= x0 - 0.3 && Math.min(ax, bx) <= x0 + PANEL / scale + 0.3 && Math.max(ay, by) >= y0 - 0.3 && Math.min(ay, by) <= y0 + PANEL / scale + 0.3);
  const Wtot = PANEL * 3 + GAP * 2;
  const img = new Uint8Array(Wtot * PANEL * 3).fill(255);
  // Fill panel (third) by scanline over faces in table order.
  const fillBase = new Uint8Array(PANEL * PANEL * 3).fill(255);
  for (const f of table.faces) {
    if (f.hole) continue;
    const pts = f.pts;
    let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
    for (let i = 0; i < pts.length; i += 2) { mnx = Math.min(mnx, pts[i]); mxx = Math.max(mxx, pts[i]); mny = Math.min(mny, pts[i + 1]); mxy = Math.max(mxy, pts[i + 1]); }
    if (mxx < x0 || mnx > x0 + PANEL / scale || mxy < y0 || mny > y0 + PANEL / scale) continue;
    const col = chainColor(f.ownerChain, scene.chains.length, baseHue).map((v) => Math.round(v * 255));
    const n = pts.length / 2;
    const row0 = Math.max(0, Math.floor((mny - y0) * scale)); const row1 = Math.min(PANEL - 1, Math.ceil((mxy - y0) * scale));
    for (let row = row0; row <= row1; row++) {
      const wy = y0 + (row + 0.5) / scale;
      const xs: number[] = [];
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = pts[2 * i], yi = pts[2 * i + 1], xj = pts[2 * j], yj = pts[2 * j + 1];
        if (yi > wy !== yj > wy) xs.push(xi + ((wy - yi) * (xj - xi)) / (yj - yi));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = Math.max(0, Math.floor((xs[k] - x0) * scale)); const c1 = Math.min(PANEL - 1, Math.ceil((xs[k + 1] - x0) * scale));
        for (let c = c0; c <= c1; c++) { const o = (row * PANEL + c) * 3; fillBase[o] = col[0]; fillBase[o + 1] = col[1]; fillBase[o + 2] = col[2]; }
      }
    }
  }
  for (let row = 0; row < PANEL; row++) {
    const wy = y0 + (row + 0.5) / scale;
    for (let colI = 0; colI < PANEL; colI++) {
      const wx = x0 + (colI + 0.5) / scale;
      // Distance to S2 outline (local segments).
      let d = Infinity;
      for (const [ax, ay, bx, by] of local) {
        const ex = bx - ax, ey = by - ay; const l2 = ex * ex + ey * ey;
        let t = l2 > 0 ? ((wx - ax) * ex + (wy - ay) * ey) / l2 : 0; t = Math.min(1, Math.max(0, t));
        const dd = Math.hypot(ax + ex * t - wx, ay + ey * t - wy);
        if (dd < d) d = dd;
      }
      const ev = fb.evalPoint(wx, wy);
      const o1 = (row * Wtot + colI) * 3;
      if (d * scale <= 2.0) { img[o1] = 0; img[o1 + 1] = 0; img[o1 + 2] = 0; }
      const o2 = (row * Wtot + PANEL + GAP + colI) * 3;
      if (ev.ink > 0.5) { img[o2] = 0; img[o2 + 1] = 0; img[o2 + 2] = 0; }
      const o3 = (row * Wtot + 2 * (PANEL + GAP) + colI) * 3;
      const fo = (row * PANEL + colI) * 3;
      img[o3] = fillBase[fo]; img[o3 + 1] = fillBase[fo + 1]; img[o3 + 2] = fillBase[fo + 2];
      if (d * scale <= 1.6) { img[o3] = 0; img[o3 + 1] = 0; img[o3 + 2] = 0; }
    }
  }
  const file = `${spot.tag}_ours-formb-fill.png`;
  writePng(join(outDir, file), Wtot, PANEL, img);
  index.push(`- ${file} — ${spot.note}`);
  console.log(`${spot.tag}: ${local.length} local segs`);
}
writeFileSync(join(outDir, "index.md"), index.join("\n") + "\n");
console.log(`wrote ${spots.length} sheets to ${outDir}`);
