// K1247 s22: crop rows off | on | |difference| at the band's worst spots (k1247s22_rec.ts --out json): the band's
// triangles rasterized with their interpolated alpha (today's bandGpu = off, the fixed layout band_rec = on, the
// drag replayed from frame 0 so the layout is the one the drag keeps), coloured per chain on paper; the third
// panel is |alpha off - alpha on| (black = 1). One PNG, a row per spot (the n worst, at most one per chain and frame).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s22_crops.ts <dragDir> <worst.json> <out.png> [n=5] [half=0.4] [ppu=200]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { OB_DI, alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { zChains } from "../../../src/render/outline/draw";
import { bandGpu, type BandGpu } from "../../../src/render/outline/band_gpu";
import { BandRecState } from "../../../src/render/outline/band_rec";

const [dir, js, out] = process.argv.slice(2, 5); const NS = Number(process.argv[5] ?? 5); const half = Number(process.argv[6] ?? 0.4); const ppu = Number(process.argv[7] ?? 200);
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const load = (k: number): SceneIn => { const s = JSON.parse(readFileSync(join(dir, files[k]), "utf8")); s.look.ctrlArc ??= 0.47; return s; };
OB_DI.on = true;
const s0 = load(0); const st = structure(s0);
const all = JSON.parse(readFileSync(js, "utf8")) as { f: number; x: number; y: number; d: number; kind: string; chain: number; how: number }[];
// The n worst DISTINCT places: a spot within 1 world unit of one already chosen (any frame) is the same place.
const spots: typeof all = [];
for (const w of all) { if (spots.some((s) => Math.hypot(s.x - w.x, s.y - w.y) < 1)) continue; spots.push(w); if (spots.length >= NS) break; }
// Replay the drag through the layout so frame f's records are the ones the drag keeps.
const S = new BandRecState(); const onAt = new Map<number, { g: BandGpu; r: BandGpu }>(); const need = new Set(spots.map((s) => s.f));
const last = Math.max(...spots.map((s) => s.f));
for (let f = 0; f <= last; f++) {
  const sc = f === 0 ? s0 : alignJunctionArms(st, load(f)); const tb = frame(st, sc); const zz = zChains(sc);
  const r = S.band(st, tb, sc, zz);
  if (need.has(f)) {
    const g = bandGpu(tb, sc, zz);
    const cp = (b: BandGpu): BandGpu => ({ ...b, pos: b.pos.slice(0, 2 * b.count), attr: b.attr.slice(0, 4 * b.count), chain: b.chain.slice(0, b.count) });
    onAt.set(f, { g: cp(g), r: cp(r) });
  }
}
const N = Math.round(2 * half * ppu); const GAP = 6; const Wt = 3 * N + 2 * GAP; const Ht = spots.length * (N + GAP);
const img = new Uint8Array(Wt * Ht * 3).fill(255);
const hue = (c: number): [number, number, number] => { const h = ((c * 0.618034) % 1) * 6; const f = h - Math.floor(h); const q = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h) % 6]; return [40 + 160 * q[0], 40 + 160 * q[1], 40 + 160 * q[2]] as [number, number, number]; };
const put = (x: number, y: number, c: [number, number, number]): void => { const o = 3 * (y * Wt + x); img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; };
// Each pixel's alpha (max over the triangles covering its centre) and the chain that gave it.
const raster = (b: BandGpu, x0: number, y0: number): { a: Float32Array; c: Int32Array } => {
  const a = new Float32Array(N * N); const c = new Int32Array(N * N).fill(-1); const P = b.pos; const A = b.attr;
  for (let t = 0; t + 2 < b.count; t += 3) {
    const ax = (P[2 * t] - x0) * ppu; const ay = (P[2 * t + 1] - y0) * ppu; const bx = (P[2 * t + 2] - x0) * ppu; const by = (P[2 * t + 3] - y0) * ppu; const cx = (P[2 * t + 4] - x0) * ppu; const cy = (P[2 * t + 5] - y0) * ppu;
    const det = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay); if (Math.abs(det) < 1e-9) continue;
    const xa = Math.max(0, Math.floor(Math.min(ax, bx, cx))); const xb = Math.min(N - 1, Math.ceil(Math.max(ax, bx, cx))); const ya = Math.max(0, Math.floor(Math.min(ay, by, cy))); const yb = Math.min(N - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const px = x + 0.5; const py = y + 0.5;
      const w1 = ((px - ax) * (cy - ay) - (cx - ax) * (py - ay)) / det; const w2 = ((bx - ax) * (py - ay) - (px - ax) * (by - ay)) / det; const w0 = 1 - w1 - w2;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const al = w0 * A[4 * t + 3] + w1 * A[4 * t + 7] + w2 * A[4 * t + 11]; const i = y * N + x;
      if (al > a[i]) { a[i] = al; c[i] = b.chain[t]; }
    }
  }
  return { a, c };
};
spots.forEach((sp, r) => {
  const { g, r: rb } = onAt.get(sp.f)!; const x0 = sp.x - half; const y0 = sp.y - half;
  const off = raster(g, x0, y0); const on = raster(rb, x0, y0);
  let diff = 0; let mx = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x; const Y = r * (N + GAP) + y;
    const shade = (al: number, ch: number): [number, number, number] => { const h = hue(Math.max(0, ch)); return [255 - al * (255 - h[0]), 255 - al * (255 - h[1]), 255 - al * (255 - h[2])] as [number, number, number]; };
    put(x, Y, shade(Math.min(1, off.a[i]), off.c[i])); put(N + GAP + x, Y, shade(Math.min(1, on.a[i]), on.c[i]));
    const d = Math.abs(Math.min(1, off.a[i]) - Math.min(1, on.a[i])); if (d > 0.5) diff++; if (d > mx) mx = d;
    const v = Math.round(255 * (1 - d)); put(2 * (N + GAP) + x, Y, [v, v, v]);
  }
  console.log(`row ${r}: f${sp.f} ${sp.kind} c${sp.chain} (${sp.x.toFixed(2)}, ${sp.y.toFixed(2)}) worst vertex ${sp.d.toFixed(2)} px at ppu 40 (placement ${["absent", "records", "padded", "decimated"][sp.how]}): ${diff} of ${N * N} px differ in coverage (alpha > 0.5) at ${ppu} px/unit, max |alpha diff| ${mx.toFixed(3)}`);
});
const crcT = new Int32Array(256).map((_, m) => { let c = m; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b: Buffer): number => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t: string, d: Buffer): Buffer => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cb = Buffer.alloc(4); cb.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cb]); };
const raw = Buffer.alloc((Wt * 3 + 1) * Ht); for (let r = 0; r < Ht; r++) { raw[r * (Wt * 3 + 1)] = 0; Buffer.from(img.buffer, r * Wt * 3, Wt * 3).copy(raw, r * (Wt * 3 + 1) + 1); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(Wt, 0); ih.writeUInt32BE(Ht, 4); ih[8] = 8; ih[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
