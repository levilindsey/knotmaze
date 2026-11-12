// K1314 s1: crops of census finds, form B | today | rp=outline, the find circled.
//
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_crops.ts <census tag> [--out=<dir>] [--kinds=a,b]
//        [--sample=20 --seed=1] [--spots=scene:x:y:label,...] [--px=240]
//
// Each crop is three panels (P x P px, 8 h world wide around the find): form B (evalPoint: top chain + ink,
// the app's section paint, white paper, black ink), today (the scene's <name>.master.png through its
// camera: what master draws by default, at the capture's resolution) and rp=outline (the census's own
// raster of fill_tri + bandData). A red ring marks the find. Writes <out>/<kind>_<nnn>.png and
// <out>/manifest.json (numbered in census order per kind) for k1314_sheet.ps1.
// K1314 s3: --before=<dir> makes the panels fillet | before | after: form_b_fillet (form B with the
// through pass's bend rounded, K1049; the census's s3 reference) | the third panel of <dir>/<same file>
// (this tool's crop at the base commit, same spots in the same order) | rp=outline now.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync, deflateSync } from "node:zlib";
import { FormB } from "../../../src/render/field/form_b";
import { runAt, runColour, type RGB } from "../../../src/render/outline/paint";
import { buildModel, filletHere, filletOf, rasterOutline, SCENE_DIR, type Art, type Model } from "./k1314_census";
let BEFORE: string | undefined; // K1314 s3: the base commit's crops (--before)

const here = dirname(fileURLToPath(import.meta.url));
let ZOOM = 8; // crop width in h

export function readPng(file: string): { W: number; H: number; px: Uint8Array } {
  const b = readFileSync(file); let o = 8; let W = 0; let H = 0; let ct = 0; const idat: Buffer[] = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o); const type = b.toString("ascii", o + 4, o + 8); const d = b.subarray(o + 8, o + 8 + len);
    if (type === "IHDR") { W = d.readUInt32BE(0); H = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12] !== 0) throw new Error("png: 8-bit non-interlaced only"); }
    else if (type === "IDAT") idat.push(d); else if (type === "IEND") break;
    o += 12 + len;
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : ct === 0 ? 1 : ct === 4 ? 2 : 0; if (!bpp) throw new Error("png: colour type " + ct);
  const raw = inflateSync(Buffer.concat(idat)); const stride = W * bpp; const cur = new Uint8Array(H * stride);
  for (let y = 0; y < H; y++) {
    const f = raw[y * (stride + 1)]; const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[y * stride + x - bpp] : 0; const up = y > 0 ? cur[(y - 1) * stride + x] : 0; const c = x >= bpp && y > 0 ? cur[(y - 1) * stride + x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const p = a + up - c; const pa = Math.abs(p - a); const pb = Math.abs(p - up); const pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      cur[y * stride + x] = v & 255;
    }
  }
  const px = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i++) { if (bpp >= 3) { px[3 * i] = cur[bpp * i]; px[3 * i + 1] = cur[bpp * i + 1]; px[3 * i + 2] = cur[bpp * i + 2]; } else { px[3 * i] = px[3 * i + 1] = px[3 * i + 2] = cur[bpp * i]; } }
  return { W, H, px };
}
export function writePng(file: string, px: Uint8Array, W: number, H: number): void {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; Buffer.from(px.buffer, px.byteOffset + y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1); }
  const crc = (buf: Buffer): number => { let c = ~0; for (const v of buf) { c ^= v; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (t: string, d: Buffer): Buffer => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "ascii"), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}

interface SceneCtx { m: Model; fb: { evalPoint(x: number, y: number): { ink: number; top: number; chain: number; s: number } }; master?: { W: number; H: number; px: Uint8Array }; cam?: number[]; dpr: number }
const ctx = new Map<string, SceneCtx>();
function sceneCtx(nm: string): SceneCtx {
  let e = ctx.get(nm); if (e) return e;
  const m = buildModel(nm);
  const fb = new FormB(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as never;
  const mf = join(SCENE_DIR, `${nm}.master.png`);
  const cam = (m.scene as unknown as { camera?: { worldToCss: number[]; dpr: number } }).camera;
  e = { m, fb, master: existsSync(mf) ? readPng(mf) : undefined, cam: cam?.worldToCss, dpr: cam?.dpr ?? 1 };
  ctx.set(nm, e); return e;
}

/** One crop row: three P x P panels with 4 px gaps, the ring at (x, y) radius rr (world). */
export function cropRow(nm: string, x: number, y: number, rr: number, P: number, file?: string, zoom?: number): Uint8Array {
  const e = sceneCtx(nm); const h = e.m.scene.look.halfWidth; const S = (zoom ?? ZOOM) * h; const ppu = P / S;
  const c0 = Math.round(x * ppu - P / 2); const r0 = Math.round(y * ppu - P / 2);
  const Wt = 3 * P + 8; const out = new Uint8Array(Wt * P * 3).fill(255);
  const put = (col: number, c: number, r: number, rgb: [number, number, number]): void => { const o = 3 * (r * Wt + col * (P + 4) + c); out[o] = rgb[0]; out[o + 1] = rgb[1]; out[o + 2] = rgb[2]; };
  const comp = (fill: number[] | null, ink: number): [number, number, number] => { const a = Math.min(1, Math.max(0, ink)); const f = fill ?? [1, 1, 1]; return [Math.round(255 * f[0] * (1 - a)), Math.round(255 * f[1] * (1 - a)), Math.round(255 * f[2] * (1 - a))]; };
  const col: RGB = [0, 0, 0];
  // form B
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    // s5: with --before, the census's own reference (the fillet only at its bend, filletHere)
    const px = (c0 + c + 0.5) / ppu; const py = (r0 + r + 0.5) / ppu;
    const ev = (BEFORE && filletHere(filletOf(e.m), px, py) ? filletOf(e.m) : e.fb).evalPoint(px, py);
    let fill: number[] | null = null;
    if (ev.top >= 0 && ev.chain >= 0) { const k = runAt(e.m.sp, ev.chain, ev.s); if (k >= 0) { runColour(e.m.sp.runs[k], ev.s, col); fill = [col[0], col[1], col[2]]; } }
    put(0, c, r, comp(fill, ev.ink));
  }
  // today (master.png through the camera, bilinear)
  if (BEFORE && file) {
    const B = readPng(join(BEFORE, file)); if (B.W !== 3 * P + 8 || B.H !== P) throw new Error(`before crop ${file}: ${B.W}x${B.H}, not ${3 * P + 8}x${P}`);
    for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) { const o = 3 * (r * B.W + 2 * (P + 4) + c); put(1, c, r, [B.px[o], B.px[o + 1], B.px[o + 2]]); }
  } else if (e.master && e.cam) {
    const [a, , , d, tx, ty] = e.cam; const M = e.master;
    for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
      const wx = (c0 + c + 0.5) / ppu; const wy = (r0 + r + 0.5) / ppu;
      const px = (a * wx + tx) * e.dpr - 0.5; const py = (d * wy + ty) * e.dpr - 0.5;
      const ix = Math.floor(px); const iy = Math.floor(py); const fx = px - ix; const fy = py - iy;
      const v: [number, number, number] = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        const g = (xx: number, yy: number): number => M.px[3 * (Math.min(M.H - 1, Math.max(0, yy)) * M.W + Math.min(M.W - 1, Math.max(0, xx))) + k];
        v[k] = Math.round(g(ix, iy) * (1 - fx) * (1 - fy) + g(ix + 1, iy) * fx * (1 - fy) + g(ix, iy + 1) * (1 - fx) * fy + g(ix + 1, iy + 1) * fx * fy);
      }
      put(1, c, r, v);
    }
  }
  // rp=outline (fill_tri painted + bandData)
  const R = rasterOutline(e.m, c0, r0, P, P, ppu);
  for (let i = 0; i < P * P; i++) {
    const c = i % P; const r = (i - c) / P;
    put(2, c, r, comp(R.own[i] > 0 && R.rgb[3 * i] >= 0 ? [R.rgb[3 * i], R.rgb[3 * i + 1], R.rgb[3 * i + 2]] : null, R.ink[i]));
  }
  // the ring
  const rp = rr * ppu; const cx = x * ppu - c0 - 0.5; const cy = y * ppu - r0 - 0.5;
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const d = Math.hypot(c - cx, r - cy); if (Math.abs(d - rp) > 1.3) continue;
    for (let k = 0; k < 3; k++) put(k, c, r, [235, 20, 20]);
  }
  return out;
}

function main(): void {
  const args = process.argv.slice(2);
  const pos = args.filter((a) => !a.startsWith("--"));
  const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const P = Number(opt("px") ?? 240); ZOOM = Number(opt("zoom") ?? 5); BEFORE = opt("before");
  const outDir = opt("out") ?? join(here, "out", "s1", "crops"); mkdirSync(outDir, { recursive: true });
  const man: { n: number; file: string; kind: string; label: string }[] = [];
  const spots = opt("spots");
  if (spots) {
    spots.split(",").forEach((s, n) => {
      const parts = s.split(":"); const nm = parts[0]; const e = sceneCtx(nm); const h = e.m.scene.look.halfWidth;
      let xs = parts[1]; let ys = parts[2]; let label = parts[3];
      if (/^[xj]\d+$/.test(parts[1])) { // a crossing or junction id
        const k = +parts[1].slice(1); const p = parts[1][0] === "x" ? e.m.xPts[k] : { x: e.m.scene.junctions[k].c[0], y: e.m.scene.junctions[k].c[1] };
        xs = String(p.x); ys = String(p.y); label = parts[1]; console.log(`${nm} ${parts[1]} at ${p.x.toFixed(3)} ${p.y.toFixed(3)}`);
      }
      const file = `spot_${String(n + 1).padStart(3, "0")}.png`;
      writePng(join(outDir, file), cropRow(nm, +xs, +ys, 1.2 * h, P, file), 3 * P + 8, P);
      man.push({ n: n + 1, file, kind: "spot", label: `${label ?? ""} ${nm}` });
    });
  } else {
    const J = JSON.parse(readFileSync(join(here, "out", "s1", `census_${pos[0]}.json`), "utf8")) as { arts: Art[] };
    const kinds = opt("kinds")?.split(",");
    let arts = J.arts.filter((a) => !kinds || kinds.includes(a.kind));
    const sample = Number(opt("sample") ?? 0);
    if (sample) { let s = Number(opt("seed") ?? 1); const rnd = (): number => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; arts = arts.map((a) => ({ a, k: rnd() })).sort((p, q) => p.k - q.k).slice(0, sample).map((p) => p.a); }
    // --top=N: the N largest per kind (by pixels; K1049 by its screen deviation), census order kept within a kind
    const top = Number(opt("top") ?? 0);
    if (top) {
      const keep = new Set<Art>();
      for (const k of new Set(arts.map((a) => a.kind))) arts.filter((a) => a.kind === k).sort((p, q) => (q.kind === "k1049" ? q.sizePx - p.sizePx : q.px - p.px)).slice(0, top).forEach((a) => keep.add(a));
      arts = arts.filter((a) => keep.has(a));
    }
    const per = new Map<string, number>();
    // never render under someone else's perf lock (a lock older than 30 min is stale)
    const lock = join(process.env.TEMP ?? "", "claude-perf.lock"); const sab = new Int32Array(new SharedArrayBuffer(4));
    for (const a of arts) {
      while (existsSync(lock) && Date.now() - statSync(lock).mtimeMs < 30 * 60e3) Atomics.wait(sab, 0, 0, 5e3);
      const n = (per.get(a.kind) ?? 0) + 1; per.set(a.kind, n);
      const h = sceneCtx(a.scene).m.scene.look.halfWidth;
      const rr = a.kind === "k1049" ? 0.8 * h : Math.max(0.6 * h, 0.5 * Math.hypot(a.bbox[2] - a.bbox[0], a.bbox[3] - a.bbox[1]) + 0.25 * h);
      const file = `${sample ? "fp_" : ""}${a.kind}_${String(n).padStart(3, "0")}.png`;
      writePng(join(outDir, file), cropRow(a.scene, a.x, a.y, Math.min(rr, 3.6 * h), P, file), 3 * P + 8, P);
      man.push({ n, file, kind: a.kind, label: `${a.kind} ${n}: ${a.scene} ${a.near} ${a.sub} ${a.kind === "k1049" ? a.sizePx + " screen px" : a.px + "px"} ${a.part}${a.detail ? " (" + a.detail + ")" : ""} [${a.id}]` });
    }
  }
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(man, null, 1));
  console.log(`${man.length} crops -> ${outDir}`);
}
if (process.argv[1] && /k1314_crops/.test(process.argv[1])) main();
