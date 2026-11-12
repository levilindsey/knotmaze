// K1247 s18: crop rows off | on | |difference| at the fill's worst spots (k1247s18_fill.ts's json): the
// triangle fill rasterized (rasterFill: each pixel's top chain, highest key winning) with records off
// and on (look.fillRec), coloured per chain (paper white); the third panel is black where the two
// differ in owner, grey where both are paper. One PNG per scene, a row per spot.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s18_crops.ts <dragDir> <fill.json> <out.png> [half=0.6] [ppu=200]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { fillFrame, fillResolution, fillStructure, rasterFill } from "../../../src/render/outline/fill_tri";
import { zChains } from "../../../src/render/outline/draw";

const [dir, js, out] = process.argv.slice(2, 5); const half = Number(process.argv[5] ?? 0.6); const ppu = Number(process.argv[6] ?? 200);
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const load = (k: number): SceneIn => { const s = JSON.parse(readFileSync(join(dir, files[k]), "utf8")); s.look.ctrlArc ??= 0.47; delete s.look.fillRec; return s; };
const s0 = load(0); const st = structure(s0); const fs = fillStructure(st, fillResolution(st, frame(st, s0)));
const spots = (JSON.parse(readFileSync(js, "utf8")) as { spots: { f: number; x: number; y: number; d: number }[] }).spots;
const N = Math.round(2 * half * ppu); const GAP = 6; const Wt = 3 * N + 2 * GAP; const Ht = spots.length * (N + GAP);
const img = new Uint8Array(Wt * Ht * 3).fill(255);
const hue = (c: number): [number, number, number] => { const h = ((c * 0.618034) % 1) * 6; const f = h - Math.floor(h); const q = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h) % 6]; return [150 + 90 * q[0], 150 + 90 * q[1], 150 + 90 * q[2]] as [number, number, number]; };
const put = (x: number, y: number, c: [number, number, number]): void => { const o = 3 * (y * Wt + x); img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; };
spots.forEach((sp, r) => {
  const sc = alignJunctionArms(st, load(sp.f)); const tb = frame(st, sc); const zz = zChains(sc);
  const x0 = sp.x - half; const y0 = sp.y - half;
  const gOff = rasterFill(fs, fillFrame(fs, st, tb, sc, zz), x0, y0, N, N, ppu);
  const gOn = rasterFill(fs, fillFrame(fs, st, tb, { ...sc, look: { ...sc.look, fillRec: 1 } } as SceneIn, zz), x0, y0, N, N, ppu);
  let diff = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x; const a = gOff[i]; const b = gOn[i]; const Y = r * (N + GAP) + y;
    if (a) put(x, Y, hue(a)); if (b) put(N + GAP + x, Y, hue(b));
    if (a !== b) { diff++; put(2 * (N + GAP) + x, Y, [0, 0, 0]); } else if (!a) put(2 * (N + GAP) + x, Y, [225, 225, 225]);
  }
  console.log(`row ${r}: f${sp.f} (${sp.x.toFixed(2)}, ${sp.y.toFixed(2)}) worst vertex ${sp.d.toFixed(1)} px: ${diff} px differ in owner of ${N * N} (${ppu} px/unit)`);
});
const crcT = new Int32Array(256).map((_, m) => { let c = m; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b: Buffer): number => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t: string, d: Buffer): Buffer => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cb = Buffer.alloc(4); cb.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cb]); };
const raw = Buffer.alloc((Wt * 3 + 1) * Ht); for (let r = 0; r < Ht; r++) { raw[r * (Wt * 3 + 1)] = 0; Buffer.from(img.buffer, r * Wt * 3, Wt * 3).copy(raw, r * (Wt * 3 + 1) + 1); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(Wt, 0); ih.writeUInt32BE(Ht, 4); ih[8] = 8; ih[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
