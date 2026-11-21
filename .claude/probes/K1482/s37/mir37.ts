// K1482 s37: the CPU mirror's border ink round named tangent points (or device px), the rule off and on.
// Per centre ONE png of four panels, an N x N device-px crop magnified Z times:
//   1 before (GfEval.S37 = "0")   2 after (S37 = env AFTER, default "")   3 diff (red = ink removed, green = added)
//   4 the before panel's winning term per px (side grey, arc blue, tangent red, vertex cap green, end cap orange,
//     through arc purple; covered and un-inked = pale yellow, paper white), with the centre lines of the corner's two
//     arms (A dark blue, B dark orange), its circle (thin grey), Ta (cyan cross) and Tb (magenta cross)
// and one line: px that lost and gained ink (|d ink| > 0.02), and the widest inked disc before and after, in strokes.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s37/mir37.ts <scene.json> <sites.json> <k.a|k.b|name@x:y,...> <outDir> [N=64] [Z=6]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { deflateSync } from "node:zlib";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const crcT = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
const crc = (b: Buffer): number => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function png(w: number, hh: number, rgb: Buffer): Buffer {
  const chunk = (t: string, d: Buffer): Buffer => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(hh, 4); ih[8] = 8; ih[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * hh); for (let y = 0; y < hh; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const [, , sceneP, sitesP, list, outDir, Ns, Zs] = process.argv; const N = +(Ns ?? 64), Z = +(Zs ?? 6);
const AFTER = process.env.AFTER ?? "";
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true); const h = T.h; const W = T.W;
const E: any = new GfEval(T); const Wpx = W * a; mkdirSync(outDir, { recursive: true });
console.log(`h ${(h * a).toFixed(2)} px, W ${Wpx.toFixed(2)} px, aa ${(T.aa * a).toFixed(2)} px, after = S37 "${AFTER}"`);
const KC: Record<number, [number, number, number]> = { 1: [120, 120, 120], 2: [40, 90, 230], 3: [240, 150, 30], 4: [230, 30, 30], 5: [150, 60, 200], 6: [30, 170, 60] };
function widest(ink: Float32Array): number {
  let best = 0; const c = N >> 1; const NEAR = 8;
  for (let j = c - NEAR; j <= c + NEAR; j++) for (let i = c - NEAR; i <= c + NEAR; i++) {
    if (!(ink[j * N + i] >= 0.5)) continue;
    let m = Math.min(i + 1, j + 1, N - i, N - j); m = m * m;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!(ink[y * N + x] >= 0.5)) { const q = (x - i) * (x - i) + (y - j) * (y - j); if (q < m) m = q; }
    if (m > best) best = m;
  }
  return (2 * Math.sqrt(best) - 1) / Wpx;
}
for (const it of (list ?? "").split(",").filter(Boolean)) {
  let cx: number, cy: number, name = it, kc = -1;
  if (it.includes("@")) { const [nm, xy] = it.split("@"); name = nm; [cx, cy] = xy.split(":").map(Number); const m = /^k(\d+)/.exec(nm); if (m) kc = +m[1]; }
  else { const [ks, ts] = it.replace(/^k/, "").split("."); kc = +ks; const t = ts === "b" ? 1 : 0; cx = Math.floor((t ? T.kTbx[kc] : T.kTax[kc]) * a + e); cy = Math.floor((t ? T.kTby[kc] : T.kTay[kc]) * d + f); name = `k${ks}.${ts}`; }
  const x0 = cx - (N >> 1), y0 = cy - (N >> 1); const Wd = (4 * N + 6) * Z, Hd = N * Z; const buf = Buffer.alloc(Wd * Hd * 3, 255);
  const i0a = new Float32Array(N * N), i1a = new Float32Array(N * N); let nd = 0, ng = 0;
  const put = (px: number, iy: number, c: number[]): void => { for (let zy = 0; zy < Z; zy++) for (let zx = 0; zx < Z; zx++) { const o = ((iy * Z + zy) * Wd + px * Z + zx) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; } };
  for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
    const fx = (x0 + ix + 0.5 - e) / a, fy = (y0 + iy + 0.5 - f) / d;
    GfEval.S37 = "0"; const q0 = E.eval(fx, fy); const i0 = q0.ink, wk = q0.winKind, cov = q0.cov;
    GfEval.S37 = AFTER; const i1 = E.eval(fx, fy).ink; i0a[iy * N + ix] = i0; i1a[iy * N + ix] = i1;
    const g0 = Math.round(255 * (1 - i0)), g1 = Math.round(255 * (1 - i1)); const dv = i1 - i0;
    const gm = Math.round(200 * (1 - Math.max(i0, i1)) + 40);
    if (dv < -0.02) nd++; else if (dv > 0.02) ng++;
    const kc3 = KC[wk] ?? [0, 0, 0]; const c3 = i0 >= 0.02 ? kc3.map((v) => Math.round(255 - (255 - v) * Math.min(1, i0 + 0.15))) : cov >= 0.5 ? [255, 250, 215] : [255, 255, 255];
    put(ix, iy, [g0, g0, g0]); put(N + 2 + ix, iy, [g1, g1, g1]); put(2 * N + 4 + ix, iy, dv < -0.02 ? [230, 30, 30] : dv > 0.02 ? [30, 200, 30] : [gm, gm, gm]); put(3 * N + 6 + ix, iy, c3);
  }
  GfEval.S37 = "";
  const dot = (wx: number, wy: number, col: number[], sz = 2): void => { const px = wx * a + e - x0, py = wy * d + f - y0; if (px < 0 || py < 0 || px >= N || py >= N) return; const X = Math.floor(px * Z) + (3 * N + 6) * Z, Y = Math.floor(py * Z); for (let q = 0; q < sz; q++) for (let w = 0; w < sz; w++) { if (Y + q >= Hd || X + w >= Wd) continue; const o = ((Y + q) * Wd + X + w) * 3; buf[o] = col[0]; buf[o + 1] = col[1]; buf[o + 2] = col[2]; } };
  if (kc >= 0) {
    for (const [ch, col] of [[T.kCa[kc], [0, 0, 160]], [T.kCb[kc], [200, 80, 0]]] as [number, number[]][]) { const v0 = T.cV0[ch]; for (let k = 0; k + 1 < T.cNV[ch]; k++) { const ax = T.vx[v0 + k], ay = T.vy[v0 + k], bx = T.vx[v0 + k + 1], by = T.vy[v0 + k + 1]; for (let u = 0; u <= 1; u += 0.02) dot(ax + (bx - ax) * u, ay + (by - ay) * u, col); } }
    for (let an = 0; an < 2 * Math.PI; an += 0.01) dot(T.kCx[kc] + T.kR[kc] * Math.cos(an), T.kCy[kc] + T.kR[kc] * Math.sin(an), [90, 90, 90], 1);
    for (const [tx, ty, col] of [[T.kTax[kc], T.kTay[kc], [0, 200, 220]], [T.kTbx[kc], T.kTby[kc], [230, 0, 200]]] as [number, number, number[]][]) for (let q = -4; q <= 4; q++) { dot(tx + q / (a * Z), ty, col, 2); dot(tx, ty + q / (a * Z), col, 2); }
  }
  writeFileSync(join(outDir, `${name}.png`), png(Wd, Hd, buf));
  console.log(`${name} @${cx},${cy}${kc >= 0 ? ` j${T.kJ[kc]} arms ${T.kCa[kc]}/${T.kCb[kc]} R ${(T.kR[kc] / h).toFixed(3)} h` : ""}: lost ${nd} gained ${ng} px; widest disc ${widest(i0a).toFixed(2)} -> ${widest(i1a).toFixed(2)} strokes`);
}
