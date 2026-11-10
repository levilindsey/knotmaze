// K1247 s13: the group question as a picture. For regions whose group the
// structural rule (grpMode.adj: the arm whose root bounds the interval)
// changes at rest, crops of three panels side by side:
//   form B (its top surface: a group in warm tones, a chain's own surface in
//   its chain colour) | the outline with today's groups | the outline with
//   the rule's groups.
// The outline panels paint faces in table order, keyed by surface: the
// group when >= 0, else the owner chain. A dark line marks every pixel whose
// right or lower neighbour is another surface (a group's members share one
// surface, so no line runs between them, as in form B). The changed region
// is outlined red in the rule panel. One row per crop.
// Usage: node scripts/run_node.mjs <this> <scene> [crops=4] [width=2.4] [ppu=60] [tag]
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { structure, frame, grpMode } from "./outline";
import { load } from "./k1247s5_scenes";
import { FormB, OWN } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const [nm, nS, wS, pS, tagS] = process.argv.slice(2);
const nCrop = Number(nS ?? 4); const wid = Number(wS ?? 2.4); const ppu = Number(pS ?? 60);
const tag = tagS ?? `${nm}`;
const sc = load(nm);
const st = structure(sc);
grpMode.adj = false; const fA = frame(st, sc) as any;
const gA = fA.regions.map((r: any) => r.group); const facesA = fA.faces.map((f: any) => ({ ...f, pts: Array.from(f.pts as ArrayLike<number>) }));
grpMode.adj = true; const fB = frame(st, sc) as any;
const gB = fB.regions.map((r: any) => r.group); const facesB = fB.faces.map((f: any) => ({ ...f, pts: Array.from(f.pts as ArrayLike<number>) }));
const regB = fB.regions.map((r: any) => ({ ...r, pts: Array.from(r.pts as ArrayLike<number>) }));
grpMode.adj = false;
const changed: number[] = [];
for (let i = 0; i < Math.min(gA.length, gB.length); i++) if (gA[i] !== gB[i] && regB[i].pts.length >= 6) changed.push(i);
const toNeg = changed.filter((i) => gB[i] < 0).length;
console.log(`${nm}: regions ${gA.length}, group changed ${changed.length} (to -1: ${toNeg}, from -1: ${changed.filter((i) => gA[i] < 0).length})`);
const pick: number[] = [];
for (let k = 0; k < nCrop && k < changed.length; k++) pick.push(changed[Math.floor(((k + 0.5) * changed.length) / Math.min(nCrop, changed.length))]);
const sc2 = load(nm); (sc2.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const fb = new FormB(sc2 as never, { dpr: 2 }) as any;
const N = Math.round(wid * ppu); const GAP = 6; const W = 3 * N + 2 * GAP; const H = pick.length * N + (pick.length - 1) * GAP;
const img = new Uint8Array(W * Math.max(1, H) * 3).fill(110);
const put = (px: number, py: number, rgb: number[]): void => { const i = (py * W + px) * 3; img[i] = rgb[0]; img[i + 1] = rgb[1]; img[i + 2] = rgb[2]; };
const hue = (v: number, base: number, amp: number, sat: number): number[] => { const h = ((v * 0.618034) % 1) * 6.2832; return [base + amp * Math.cos(h), base + amp * Math.cos(h - 2.0944), base + amp * Math.cos(h - 4.1888)].map((c) => Math.max(0, Math.min(255, c * sat + 255 * (1 - sat)))); };
const groupCol = (g: number): number[] => { const t = ((g * 0.618034) % 1); return [250, 200 + 40 * t, 90 + 60 * t]; };
const chainCol = (c: number): number[] => hue(c + 3, 150, 60, 0.75);
function paintFaces(faces: any[], x0: number, y0: number): Int32Array {
  const g = new Int32Array(N * N).fill(-1); const xs: number[] = [];
  for (const f of faces) {
    if (f.hole) continue;
    const key = f.group >= 0 ? f.group : f.ownerChain >= 0 ? OWN + f.ownerChain : -1; if (key < 0) continue;
    const n = f.pts.length / 2; if (n < 3) continue;
    for (let r = 0; r < N; r++) {
      const y = y0 + (r + 0.5) / ppu; xs.length = 0;
      for (let i = 0; i < n; i++) { const ax = f.pts[2 * i]; const ay = f.pts[2 * i + 1]; const j = (i + 1) % n; const bx = f.pts[2 * j]; const by = f.pts[2 * j + 1]; if ((ay <= y) !== (by <= y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax)); }
      xs.sort((u, v) => u - v);
      for (let k = 0; k + 1 < xs.length; k += 2) { const c0 = Math.max(0, Math.ceil((xs[k] - x0) * ppu - 0.5)); const c1 = Math.min(N - 1, Math.floor((xs[k + 1] - x0) * ppu - 0.5)); for (let c = c0; c <= c1; c++) g[r * N + c] = key; }
    }
  }
  return g;
}
function regionMask(pts: number[], x0: number, y0: number): Uint8Array {
  const m = new Uint8Array(N * N); const n = pts.length / 2; const xs: number[] = [];
  for (let r = 0; r < N; r++) {
    const y = y0 + (r + 0.5) / ppu; xs.length = 0;
    for (let i = 0; i < n; i++) { const ax = pts[2 * i]; const ay = pts[2 * i + 1]; const j = (i + 1) % n; const bx = pts[2 * j]; const by = pts[2 * j + 1]; if ((ay <= y) !== (by <= y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((u, v) => u - v);
    for (let k = 0; k + 1 < xs.length; k += 2) { const c0 = Math.max(0, Math.ceil((xs[k] - x0) * ppu - 0.5)); const c1 = Math.min(N - 1, Math.floor((xs[k + 1] - x0) * ppu - 0.5)); for (let c = c0; c <= c1; c++) m[r * N + c] = 1; }
  }
  return m;
}
const colOf = (key: number, chainOfOwn: (k: number) => number): number[] => (key < 0 ? [255, 255, 255] : key < OWN ? groupCol(key) : chainCol(chainOfOwn(key)));
function drawPanel(keys: Int32Array, chainOfOwn: (k: number) => number, ox: number, oy: number, mark?: Uint8Array): void {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const k = keys[r * N + c];
    let rgb = colOf(k, chainOfOwn);
    const kr = c + 1 < N ? keys[r * N + c + 1] : k; const kd = r + 1 < N ? keys[(r + 1) * N + c] : k;
    if (kr !== k || kd !== k) rgb = [40, 40, 40];
    if (mark) { const e = mark[r * N + c] && ((c + 1 < N && !mark[r * N + c + 1]) || (c > 0 && !mark[r * N + c - 1]) || (r + 1 < N && !mark[(r + 1) * N + c]) || (r > 0 && !mark[(r - 1) * N + c])); if (e) rgb = [220, 0, 0]; }
    put(ox + c, oy + r, rgb);
  }
}
const rows: string[] = [];
pick.forEach((ri, row) => {
  const R = regB[ri]; let cx = 0; let cy = 0; const n = R.pts.length / 2;
  for (let i = 0; i < n; i++) { cx += R.pts[2 * i]; cy += R.pts[2 * i + 1]; }
  cx /= n; cy /= n;
  const x0 = cx - wid / 2; const y0 = cy - wid / 2; const oy = row * (N + GAP);
  // form B: top surface per pixel (its chain for a chain's own surface)
  const kF = new Int32Array(N * N); const chF = new Map<number, number>();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const e = fb.evalPoint(x0 + (c + 0.5) / ppu, y0 + (r + 0.5) / ppu); kF[r * N + c] = e.top; if (e.top >= OWN) chF.set(e.top, e.chain); }
  drawPanel(kF, (k) => chF.get(k) ?? 0, 0, oy);
  drawPanel(paintFaces(facesA, x0, y0), (k) => k - OWN, N + GAP, oy);
  drawPanel(paintFaces(facesB, x0, y0), (k) => k - OWN, 2 * (N + GAP), oy, regionMask(R.pts, x0, y0));
  rows.push(`row ${row}: region ${ri} chain ${R.ownerChain} at ${cx.toFixed(2)},${cy.toFixed(2)}: group today ${gA[ri]}, rule ${gB[ri]}`);
});
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Uint8Array): number => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function png(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = new Uint8Array((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
  const chunk = (t: string, d: Uint8Array): Buffer => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4, "ascii"); Buffer.from(d).copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array())]);
}
const out = join(here, "..", "out", "s13", "group"); mkdirSync(out, { recursive: true });
const file = join(out, `${tag}.png`);
writeFileSync(file, png(W, Math.max(1, H), img));
for (const r of rows) console.log("  " + r);
console.log(`-> ${file} (panels: form B | today | rule; ${N} px each at ${ppu}/unit)`);
