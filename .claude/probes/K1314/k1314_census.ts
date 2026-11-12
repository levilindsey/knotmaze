// K1314 s1: the artifact census of rp=outline (find, classify, count; no fixes).
//
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_census.ts [tag] [--scene=a,b] [--ppu=160] [--min=40]
//   ... <tag> --merge=tagA,tagB   (no rendering: joins census_tagA/B.json per scene into census_<tag>)
// s1's census: --ppu=160 --min=40, run in parallel groups and merged (scripts in k1314_run.ps1).
// Each scene is rendered in 1280 px tiles (24 px margins); it waits while another owner holds
// $env:TEMP\claude-perf.lock.
//
// Renders what the app draws for rp=outline at rest (outline_model's first
// frame: outline.structure + frame, fill_tri's triangles painted with the
// app's section paint (fill_tri.rasterPaint, the CPU twin of the fill
// shader), and the border band, draw.bandData (band_gpu's CPU twin) with its
// tie alpha), on white paper with black ink, over each whole scene at <ppu>
// px/unit, and form B (src/render/field/form_b.ts evalPoint, cached in
// out/fb/) on the same grid. Then per pixel (r = a shift tolerance in px):
//   stray ink   outline ink >= .5 where form B's ink is < .25 everywhere within 3 px,
//               or outline ink >= .6 where the 7x7 mean of (outline - form B) ink > DM,
//               or (sub 'cut') an outline ink step > .35 across 1 px where form B's ink
//               steps < .12 within 2 px but is present (x134's tail cut off over form B's fade);
//   paper       hole: outline paper (no fill, ink < .3) where form B is covered
//               everywhere within 2 px (a notch in a border included);
//               covered: outline fill where form B is paper everywhere within 2 px
//               (a covered eye, K1045);
//   broken ink  form B ink >= .5, outline covered there, outline ink < .25
//               everywhere within 3 px, or form B ink >= .6 where the 7x7 mean of
//               (form B - outline) ink > DM;
//   hard edge   a 4-neighbour colour step > STEP inside the outline's fill (both
//               pixels covered, ink < .25) where form B is smooth within 3 px
//               (no step > STEP/2, ink < .3);
//   k1049       per junction, a through pass's bend whose inner corner (the empty
//               side between its two arms) shows: rp=outline draws no corner
//               there (outline.ts skips the through pair), Levi chose rounded.
// Flagged pixels (dilated 2 px to join specks) form components; a component of
// at least MIN_PX pixels is one artifact. Each gets its place (world, nearest
// crossing x<i> / junction j<i>), size, sub-shape, and the part that draws it
// (the band piece with the most alpha there, or the fill item, with its file).
// Writes out/s1/census_<tag>.json and prints counts per kind per scene.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../src/render/field/form_b";
import { FormB as FormBFillet } from "./form_b_fillet";
import * as O from "../../../src/render/outline/outline";
import * as D from "../../../src/render/outline/draw";
import * as F from "../../../src/render/outline/fill_tri";
import { sectionPaint, runAt, runColour, type RGB } from "../../../src/render/outline/paint";

const here = dirname(fileURLToPath(import.meta.url));
export const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
export const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
export const KINDS = ["stray_ink", "hard_edge", "paper", "broken_ink", "k1049", "owner_only", "tail_look"] as const;
/** owner_only: a fill owned by another chain than form B's, invisible in the app's paint (junction colours converge);
 *  shown on the K1310 sheet's per-chain hues. Informational: not in the artifact total. */
/** tail_look: broken-ink finds at a junction's under-tail (band:tail faded, fill:junc unbordered) that end
 * without a hard cut: form B's tail runs longer and fades, rp=outline ends it sooner, rounded or faded.
 * Viewed in s1's random 20: they look right, so informational, not counted. The second sample (seed 2) put every
 * band:tail find and the fill:junc finds under 250 px there too (9 of 12 broken_ink were rounded or faded ends);
 * the cost is x134's square block, a band:tail end this pixel test can't tell from them (s2: an end-shape test). */
export const ARTIFACT_KINDS: readonly Kind[] = ["stray_ink", "hard_edge", "paper", "broken_ink", "k1049"];
/** s1's tuning from the viewed samples, applied to every find (and to merged JSON, so it re-tallies without a render).
 *  null drops the find. */
export function reclassS1(a: Art): Art | null {
  if (a.kind === "k1049" && a.sizePx < 5) return null; // seed 2: 3 and 3.2 px looked rounded, 5.3 px and up sharp
  if (a.kind === "broken_ink" && (a.part.startsWith("band:tail") || (a.part.startsWith("fill:junc") && a.px < 250))) return { ...a, kind: "tail_look" };
  // seed 3: band:run "faded" (4 of 4) and fill:strip "missing" (2 of 2; 1 of 2 in seed 2) were under-tail ends that
  // look right; only fill:junc cut short of 250 px or more (4 of 4 real) stays broken_ink
  if (a.kind === "broken_ink" && (a.part.startsWith("band:run") || a.part.startsWith("fill:strip"))) return { ...a, kind: "tail_look" };
  return a;
}
const COL = 0.06;
export type Kind = (typeof KINDS)[number];

export function loadScene(nm: string): O.SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${nm}.json`), "utf8"));
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
export function chainPt(pts: number[], closed: boolean, s: number): { x: number; y: number; tx: number; ty: number } {
  const n = pts.length >> 1; const segs = closed ? n : n - 1;
  let L = 0; for (let i = 0; i < segs; i++) { const j = (i + 1) % n; L += Math.hypot(pts[2 * j] - pts[2 * i], pts[2 * j + 1] - pts[2 * i + 1]); }
  let t = s; if (closed && L > 0) t = ((t % L) + L) % L; t = Math.max(0, Math.min(L, t));
  let acc = 0;
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n; const dx = pts[2 * j] - pts[2 * i]; const dy = pts[2 * j + 1] - pts[2 * i + 1]; const l = Math.hypot(dx, dy);
    if (acc + l >= t || i === segs - 1) { const u = l > 0 ? Math.min(1, Math.max(0, (t - acc) / l)) : 0; return { x: pts[2 * i] + dx * u, y: pts[2 * i + 1] + dy * u, tx: l > 0 ? dx / l : 1, ty: l > 0 ? dy / l : 0 }; }
    acc += l;
  }
  return { x: pts[0], y: pts[1], tx: 1, ty: 0 };
}

/** One scene's outline model, as outline_model's constructor builds it. */
export interface Model {
  scene: O.SceneIn; st: O.DiagramStructure; table: O.OutlineTable; zz: ReturnType<typeof D.zChains>;
  fs: F.FillStructure; fr: F.FillFrame; sp: ReturnType<typeof sectionPaint>; runs: Int32Array;
  vItem: Int32Array;
  /** band triangles: xy (6 per), alpha (3 per), piece index, bbox. */
  tri: Float64Array; triA: Float32Array; triP: Int32Array; tb: Float64Array; nTri: number;
  xPts: { x: number; y: number }[];
}
export function buildModel(nm: string): Model {
  const scene = loadScene(nm);
  const st = O.structure(scene); const table = O.frame(st, scene);
  const zz = D.zChains(scene);
  const fs = F.fillStructure(st, F.fillResolution(st, table));
  const fr = F.fillFrame(fs, st, table, scene, zz);
  const sp = sectionPaint(scene, "app", D.baseHueFor(scene.name));
  const runs = F.fillRuns(fs, st, fr, sp);
  const vItem = new Int32Array(fs.nV).fill(-1);
  fs.items.forEach((it, ii) => { const n = F.itemVerts(it); for (let v = it.base; v < it.base + n && v < fs.nV; v++) vItem[v] = ii; });
  const T: number[] = []; const A: number[] = []; const Pi: number[] = [];
  table.pieces.forEach((p, pi) => {
    const bd = D.bandData({ ...table, pieces: [p] }, scene, zz);
    for (let k = 0; k < bd.bandCount; k++) { T.push(bd.bandPos[2 * k], bd.bandPos[2 * k + 1]); A.push(bd.bandAlpha[k]); }
    for (let k = 0; k < bd.bandCount / 3; k++) Pi.push(pi);
  });
  const nTri = Pi.length; const tri = Float64Array.from(T); const tb = new Float64Array(4 * nTri);
  for (let t = 0; t < nTri; t++) {
    tb[4 * t] = Math.min(tri[6 * t], tri[6 * t + 2], tri[6 * t + 4]); tb[4 * t + 2] = Math.max(tri[6 * t], tri[6 * t + 2], tri[6 * t + 4]);
    tb[4 * t + 1] = Math.min(tri[6 * t + 1], tri[6 * t + 3], tri[6 * t + 5]); tb[4 * t + 3] = Math.max(tri[6 * t + 1], tri[6 * t + 3], tri[6 * t + 5]);
  }
  const idx = new Map<number, number>(); scene.chains.forEach((c, i) => idx.set(c.id, i));
  const xPts = scene.crossings.map((x) => {
    const ca = scene.chains[idx.get(x.a.chain) ?? -1]; const cb = scene.chains[idx.get(x.b.chain) ?? -1];
    if (!ca || !cb) return { x: NaN, y: NaN };
    const a = chainPt(ca.pts, ca.closed, x.a.s); const b = chainPt(cb.pts, cb.closed, x.b.s);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  });
  return { scene, st, table, zz, fs, fr, sp, runs, vItem, tri, triA: Float32Array.from(A), triP: Int32Array.from(Pi), tb, nTri, xPts };
}

/** A raster window: c0, r0 in px of the ppu grid (world = (c0 + c + .5) / ppu). */
export interface Ras {
  c0: number; r0: number; Wd: number; Hd: number; ppu: number;
  own: Int32Array; item: Int32Array; rgb: Float32Array;
  ink: Float32Array; pc: Int32Array; pa: Float32Array; geo: Uint8Array;
}
export function rasterOutline(m: Model, c0: number, r0: number, Wd: number, Hd: number, ppu: number): Ras {
  const n = Wd * Hd;
  const own = new Int32Array(n); const item = new Int32Array(n).fill(-1); const rgb = new Float32Array(3 * n).fill(-1);
  const TILE = 768;
  for (let ty = 0; ty < Hd; ty += TILE) for (let tx = 0; tx < Wd; tx += TILE) {
    const w = Math.min(TILE, Wd - tx); const h = Math.min(TILE, Hd - ty);
    const win = { tri: new Int32Array(w * h).fill(-1), bary: new Float32Array(3 * w * h) };
    const o2 = F.rasterFill(m.fs, m.fr, (c0 + tx) / ppu, (r0 + ty) / ppu, w, h, ppu, win);
    const pr = F.rasterPaint(m.fs, m.fr, m.runs, m.sp, (c0 + tx) / ppu, (r0 + ty) / ppu, w, h, ppu);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const s = j * w + i; const d = (ty + j) * Wd + tx + i;
      own[d] = o2[s]; const t = win.tri[s]; item[d] = t >= 0 && o2[s] > 0 ? m.vItem[m.fs.idx[t]] : -1;
      rgb[3 * d] = pr.rgb[3 * s]; rgb[3 * d + 1] = pr.rgb[3 * s + 1]; rgb[3 * d + 2] = pr.rgb[3 * s + 2];
    }
  }
  const ink = new Float32Array(n); const pc = new Int32Array(n).fill(-1); const pa = new Float32Array(n); const geo = new Uint8Array(n);
  const wx0 = c0 / ppu; const wy0 = r0 / ppu; const wx1 = (c0 + Wd) / ppu; const wy1 = (r0 + Hd) / ppu;
  const T = m.tri; const A = m.triA;
  for (let t = 0; t < m.nTri; t++) {
    if (m.tb[4 * t + 2] < wx0 || m.tb[4 * t] > wx1 || m.tb[4 * t + 3] < wy0 || m.tb[4 * t + 1] > wy1) continue;
    const ax = T[6 * t]; const ay = T[6 * t + 1]; const bx = T[6 * t + 2]; const by = T[6 * t + 3]; const cx = T[6 * t + 4]; const cy = T[6 * t + 5];
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (!(Math.abs(den) > 1e-18)) continue;
    const ca = Math.max(0, Math.floor(m.tb[4 * t] * ppu - c0 - 0.5)); const cb = Math.min(Wd - 1, Math.ceil(m.tb[4 * t + 2] * ppu - c0 - 0.5));
    const ra = Math.max(0, Math.floor(m.tb[4 * t + 1] * ppu - r0 - 0.5)); const rb = Math.min(Hd - 1, Math.ceil(m.tb[4 * t + 3] * ppu - r0 - 0.5));
    for (let r = ra; r <= rb; r++) {
      const y = (r0 + r + 0.5) / ppu;
      for (let c = ca; c <= cb; c++) {
        const x = (c0 + c + 0.5) / ppu;
        const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den; const l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den; const l3 = 1 - l1 - l2;
        if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
        const a = Math.min(1, Math.max(0, l1 * A[3 * t] + l2 * A[3 * t + 1] + l3 * A[3 * t + 2]));
        const i = r * Wd + c; ink[i] = 1 - (1 - ink[i]) * (1 - a); geo[i] = 1;
        if (a > pa[i] || pc[i] < 0) { pa[i] = a; pc[i] = m.triP[t]; }
      }
    }
  }
  return { c0, r0, Wd, Hd, ppu, own, item, rgb, ink, pc, pa, geo };
}

export interface FBRas { ink: Float32Array; chain: Int32Array; s: Float32Array; rgb: Float32Array }
// K1314 s3: at a through pass's bend the reference is the S1b/S1c fillet (K1049), not form B's
// sharp inner corner. form_b_fillet is form B with the corner loop's through-pair skip removed;
// it is evaluated at every pixel whose corner cell (cornersNear) holds a corner stock form B skips
// (thruCi), and replaces form B's value there. Everywhere else the two are the same field.
export interface FBF { thruCi: Set<number>; corners: { j: number; a: number; b: number; ok: boolean; r: number; theta: number; Vx: number; Vy: number }[]; arms: { ei: number }[]; cornersNear(x: number, y: number): number[]; inWedge(c: unknown, x: number, y: number): boolean; evalPoint(x: number, y: number): { ink: number; top: number; chain: number; s: number } }
// K1314 s5: the fillet replaces form B only at its own bend. A bend's circle can be large (muse_hash j78's
// r is 3.1 h) and form_b_fillet draws it with no end, so it ran on across the next junction (j77), a
// translucent band across that junction's thread (out/s5 crops, j77/j78/j20/j154). Inside another
// junction's own ok corner's wedge that corner rules, as the outline's s4 join at X has it: form B there.
export const FILLET_YIELD = { on: !process.argv.includes("--noyield") };
export function filletHere(f: FBF, x: number, y: number): boolean {
  const near = f.cornersNear(x, y); const tj: number[] = [];
  for (const ci of near) if (f.thruCi.has(ci)) tj.push(f.corners[ci].j);
  if (tj.length === 0) return false;
  if (!FILLET_YIELD.on) return true;
  for (const ci of near) {
    const c = f.corners[ci];
    if (f.thruCi.has(ci) || !c.ok || tj.includes(c.j)) continue;
    if (f.inWedge(c, x, y)) return false;
  }
  return true;
}
const FBF_CACHE = new WeakMap<object, FBF>();
export function filletOf(m: Model): FBF {
  let f = FBF_CACHE.get(m);
  if (!f) { f = new FormBFillet(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as unknown as FBF; FBF_CACHE.set(m, f); }
  return f;
}
/** --nofillet: s2's reference (form B everywhere, the s1/s2 k1049 detector). */
export const FILLET_REF = { on: !process.argv.includes("--nofillet") };
export function rasterFormB(m: Model, c0: number, r0: number, Wd: number, Hd: number, ppu: number, cacheFile?: string, filletFile?: string): FBRas {
  const n = Wd * Hd;
  let ink: Float32Array; let chain: Int32Array; let s: Float32Array;
  if (cacheFile && existsSync(cacheFile) && readFileSync(cacheFile).length === 12 * n) {
    const b = readFileSync(cacheFile); const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
    ink = new Float32Array(ab, 0, n); chain = new Int32Array(ab, 4 * n, n); s = new Float32Array(ab, 8 * n, n);
  } else {
    const fb = new FormB(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { ink: number; top: number; chain: number; s: number } };
    ink = new Float32Array(n); chain = new Int32Array(n); s = new Float32Array(n);
    for (let r = 0; r < Hd; r++) for (let c = 0; c < Wd; c++) {
      const ev = fb.evalPoint((c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu); const o = r * Wd + c;
      ink[o] = Math.min(1, Math.max(0, ev.ink)); chain[o] = ev.top < 0 ? -1 : ev.chain; s[o] = ev.s;
    }
    if (cacheFile) writeFileSync(cacheFile, Buffer.concat([Buffer.from(ink.buffer), Buffer.from(chain.buffer), Buffer.from(s.buffer)]));
  }
  if (FILLET_REF.on) {
    if (filletFile && existsSync(filletFile) && readFileSync(filletFile).length === 12 * n) {
      const b = readFileSync(filletFile); const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
      ink = new Float32Array(ab, 0, n); chain = new Int32Array(ab, 4 * n, n); s = new Float32Array(ab, 8 * n, n);
    } else {
      const fbf = filletOf(m);
      if (fbf.thruCi.size) {
        ink = ink.slice(); chain = chain.slice(); s = s.slice();
        for (let r = 0; r < Hd; r++) for (let c = 0; c < Wd; c++) {
          const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu;
          if (!filletHere(fbf, x, y)) continue;
          const ev = fbf.evalPoint(x, y); const o = r * Wd + c;
          ink[o] = Math.min(1, Math.max(0, ev.ink)); chain[o] = ev.top < 0 ? -1 : ev.chain; s[o] = ev.s;
        }
      }
      if (filletFile) writeFileSync(filletFile, Buffer.concat([Buffer.from(ink.buffer), Buffer.from(chain.buffer), Buffer.from(s.buffer)]));
    }
  }
  const rgb = new Float32Array(3 * n).fill(-1); const col: RGB = [0, 0, 0];
  for (let o = 0; o < n; o++) {
    if (chain[o] < 0) continue; const r = runAt(m.sp, chain[o], s[o]); if (r < 0) continue;
    runColour(m.sp.runs[r], s[o], col); rgb[3 * o] = col[0]; rgb[3 * o + 1] = col[1]; rgb[3 * o + 2] = col[2];
  }
  return { ink, chain, s, rgb };
}

/** Max (or min) of a field over the (2r+1)^2 square, separable. */
export function boxMax(a: Float32Array, W: number, H: number, r: number, useMin = false): Float32Array {
  const t = new Float32Array(W * H); const o = new Float32Array(W * H);
  const f = useMin ? Math.min : Math.max;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = a[y * W + x]; for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < W) v = f(v, a[y * W + xx]); } t[y * W + x] = v; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = t[y * W + x]; for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < H) v = f(v, t[yy * W + x]); } o[y * W + x] = v; }
  return o;
}

/** Mean over the (2r+1)^2 box (clipped at the edges), by an integral image. */
export function boxMean(a: Float32Array, W: number, H: number, r: number): Float32Array {
  const I = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += a[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } }
  const o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const xa = Math.max(0, x - r); const xb = Math.min(W, x + r + 1); const ya = Math.max(0, y - r); const yb = Math.min(H, y + r + 1);
    o[y * W + x] = (I[yb * (W + 1) + xb] - I[ya * (W + 1) + xb] - I[yb * (W + 1) + xa] + I[ya * (W + 1) + xa]) / ((xb - xa) * (yb - ya));
  }
  return o;
}

export interface Art {
  id: string; scene: string; kind: Kind; sub: string; x: number; y: number; px: number; sizePx: number;
  bbox: [number, number, number, number];
  near: string; dNear: number; part: string; file: string; detail?: string;
}

const PIECE_FILE: Record<string, string> = {
  run: "outline.ts (run pieces) + draw.ts bandData/tieAlpha, band_gpu.ts",
  ghost: "outline.ts (ghost pieces) + draw.ts tieAlpha, band_gpu.ts",
  arc: "outline.ts (corner arcs)",
  cap: "outline.ts (caps)",
  tail: "outline.ts (tails, runEndFade)",
};
const ITEM_FILE: Record<string, string> = { strip: "fill_tri.ts (strips)", cap: "fill_tri.ts (caps)", tail: "fill_tri.ts (tails)", disk: "fill_tri.ts (disks)", junc: "fill_tri.ts (junction fan)" };

export function census(nm: string, ppu: number, MIN_PX = 12): { arts: Art[]; m: Model } {
  const m = buildModel(nm); const sc = m.scene; const h = sc.look.halfWidth;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const c of sc.chains) for (let i = 0; i < c.pts.length; i += 2) { x0 = Math.min(x0, c.pts[i]); x1 = Math.max(x1, c.pts[i]); y0 = Math.min(y0, c.pts[i + 1]); y1 = Math.max(y1, c.pts[i + 1]); }
  const g0 = Math.floor((x0 - 3 * h) * ppu); const q0 = Math.floor((y0 - 3 * h) * ppu);
  const GW = Math.ceil((x1 + 3 * h) * ppu) - g0; const GH = Math.ceil((y1 + 3 * h) * ppu) - q0;
  // Tiles of T px with an M px margin: a component counts in the tile whose core holds its centroid.
  const T = 1280; const M = 24;
  const arts: Art[] = [];
  const fbDir = join(here, "out", "fb"); mkdirSync(fbDir, { recursive: true });
  const fbfDir = join(here, "out", "fbf"); mkdirSync(fbfDir, { recursive: true });
  const t0 = Date.now();
  for (let ty = 0; ty < GH; ty += T) for (let tx = 0; tx < GW; tx += T) {
  const kx0 = g0 + tx; const ky0 = q0 + ty; const kx1 = Math.min(g0 + GW, kx0 + T); const ky1 = Math.min(q0 + GH, ky0 + T);
  const c0 = kx0 - M; const r0 = ky0 - M; const Wd = kx1 - kx0 + 2 * M; const Hd = ky1 - ky0 + 2 * M; const n = Wd * Hd;
  const R = rasterOutline(m, c0, r0, Wd, Hd, ppu);
  if (!R.ink.some((v) => v > 0) && !R.own.some((v) => v > 0)) continue; // empty paper tile
  const B = rasterFormB(m, c0, r0, Wd, Hd, ppu, join(fbDir, `${nm}_${ppu}_${c0}_${r0}_${Wd}_${Hd}.bin`), join(fbfDir, `${nm}_${ppu}_${c0}_${r0}_${Wd}_${Hd}.bin`));
  // Fields for the tolerance tests.
  const bInkMax3 = boxMax(B.ink, Wd, Hd, 3);
  const bCov = new Float32Array(n); for (let i = 0; i < n; i++) bCov[i] = B.chain[i] >= 0 || B.ink[i] >= 0.5 ? 1 : 0;
  const bCovMin2 = boxMax(bCov, Wd, Hd, 2, true); const bCovMax2 = boxMax(bCov, Wd, Hd, 2);
  const oInkMax3 = boxMax(R.ink, Wd, Hd, 3);
  // Area ink difference (outline - form B) over 7x7: a 1-2 px border offset averages under DM,
  // a solid block over form B's fading tail does not.
  const dIn = new Float32Array(n); for (let i = 0; i < n; i++) dIn[i] = R.ink[i] - B.ink[i];
  const dMean3 = boxMean(dIn, Wd, Hd, 3); const DM = 0.35;
  // Colour steps (max channel over the 4-neighbours, both covered and clean).
  const STEP = 0.1;
  const step = (rgb: Float32Array, ok: (i: number) => boolean): Float32Array => {
    const st = new Float32Array(n);
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
      const i = y * Wd + x; if (!ok(i)) continue;
      let v = 0;
      for (const j of [x + 1 < Wd ? i + 1 : -1, y + 1 < Hd ? i + Wd : -1]) {
        if (j < 0 || !ok(j)) continue;
        v = Math.max(v, Math.abs(rgb[3 * i] - rgb[3 * j]), Math.abs(rgb[3 * i + 1] - rgb[3 * j + 1]), Math.abs(rgb[3 * i + 2] - rgb[3 * j + 2]));
      }
      st[i] = v;
    }
    return st;
  };
  const oStep = step(R.rgb, (i) => R.own[i] > 0 && R.rgb[3 * i] >= 0 && R.ink[i] < 0.25);
  const oStepMax2 = boxMax(oStep, Wd, Hd, 2); // a wedge counts only where the outline itself shows a step (s1 FP: form B's own wedge)
  const bStep = step(B.rgb, (i) => B.chain[i] >= 0 && B.rgb[3 * i] >= 0);
  const bStepMax3 = boxMax(bStep, Wd, Hd, 3);
  // Ink steps: a hard ink edge (x134's cut-off tail) where form B's ink changes gently within 2 px.
  const iStep = (ink: Float32Array): Float32Array => {
    const st = new Float32Array(n);
    for (let y = 0; y + 1 < Hd; y++) for (let x = 0; x + 1 < Wd; x++) { const i = y * Wd + x; st[i] = Math.max(Math.abs(ink[i] - ink[i + 1]), Math.abs(ink[i] - ink[i + Wd])); }
    return st;
  };
  const oIStep = iStep(R.ink); const bIStepMax2 = boxMax(iStep(B.ink), Wd, Hd, 2);
  const flags: Record<Kind, Uint8Array> = { stray_ink: new Uint8Array(n), hard_edge: new Uint8Array(n), paper: new Uint8Array(n), broken_ink: new Uint8Array(n), k1049: new Uint8Array(n), owner_only: new Uint8Array(n), tail_look: new Uint8Array(n) };
  const sub = new Uint8Array(n); // paper: 1 hole, 2 covered; hard_edge: 1 wedge (owner mismatch), 2 step; stray: 3 hard cut
  const bInkMax2 = boxMax(B.ink, Wd, Hd, 2); const oInkMax2 = boxMax(R.ink, Wd, Hd, 2);
  const has = (i: number, want: (q: number) => boolean): boolean => {
    const x = i % Wd; const y = (i - x) / Wd;
    for (let dy = -2; dy <= 2; dy++) { const yy = y + dy; if (yy < 0 || yy >= Hd) continue; for (let dx = -2; dx <= 2; dx++) { const xx = x + dx; if (xx >= 0 && xx < Wd && want(yy * Wd + xx)) return true; } }
    return false;
  };
  for (let i = 0; i < n; i++) {
    const oInk = R.ink[i]; const oCov = R.own[i] > 0;
    // stray: solid outline ink where form B has none, or only a faint fade (x134's block, j59's bars)
    if (oInk >= 0.5 && (oInk - bInkMax3[i] > 0.4 || (oInk >= 0.6 && dMean3[i] > DM))) flags.stray_ink[i] = 1;
    else if (oIStep[i] > 0.35 && bIStepMax2[i] < 0.12 && bInkMax2[i] > 0.1) { flags.stray_ink[i] = 1; sub[i] = 3; }
    if (!oCov && oInk < 0.3 && bCovMin2[i] === 1) { flags.paper[i] = 1; sub[i] = 1; }
    if (oCov && oInk < 0.3 && bCovMax2[i] === 0) { flags.paper[i] = 1; sub[i] = 2; }
    if (B.ink[i] >= 0.5 && oCov && (B.ink[i] - oInkMax3[i] > 0.4 || (B.ink[i] >= 0.6 && -dMean3[i] > DM))) flags.broken_ink[i] = 1;
    // hard edge, wedge: a fill of one chain where form B paints another (no pixel of it within 2 px), away from ink
    if (oCov && B.chain[i] >= 0 && oInkMax2[i] < 0.25 && bInkMax2[i] < 0.25) {
      const oc = R.own[i] - 1; const bc = B.chain[i];
      if (oc !== bc && (!has(i, (q) => B.chain[q] === oc) || !has(i, (q) => R.own[q] === bc + 1))) {
        // visible in the app's paint only where the colours differ (junction colours converge): the
        // outline's colour here against the nearest form B colour within 2 px
        let dMin = Infinity;
        if (R.rgb[3 * i] >= 0) has(i, (q) => { if (B.rgb[3 * q] < 0) return false; dMin = Math.min(dMin, Math.max(Math.abs(R.rgb[3 * i] - B.rgb[3 * q]), Math.abs(R.rgb[3 * i + 1] - B.rgb[3 * q + 1]), Math.abs(R.rgb[3 * i + 2] - B.rgb[3 * q + 2]))); return false; });
        if (dMin > COL && dMin < Infinity && oStepMax2[i] > STEP) { flags.hard_edge[i] = 1; sub[i] = 1; } else flags.owner_only[i] = 1;
      }
    }
    if (!flags.hard_edge[i] && oStep[i] > STEP && bStepMax3[i] < STEP / 2 && bInkMax3[i] < 0.3) { flags.hard_edge[i] = 1; sub[i] = 2; }
  }
  const near = (x: number, y: number): { id: string; d: number } => {
    let best = { id: "-", d: Infinity };
    m.xPts.forEach((p, xi) => { const d = Math.hypot(p.x - x, p.y - y); if (d < best.d) best = { id: `x${xi}`, d }; });
    sc.junctions.forEach((J, ji) => { const d = Math.hypot(J.c[0] - x, J.c[1] - y); if (d < best.d) best = { id: `j${ji}`, d }; });
    return best;
  };
  const lab = new Int32Array(n); const stack: number[] = [];
  for (const kind of KINDS) {
    if (kind === "k1049" || kind === "tail_look") continue;
    const f = flags[kind]; const dil = boxMax(Float32Array.from(f), Wd, Hd, 2);
    lab.fill(0); let nl = 0;
    for (let s0 = 0; s0 < n; s0++) {
      if (!dil[s0] || lab[s0]) continue;
      nl++; stack.length = 0; stack.push(s0); lab[s0] = nl;
      const pix: number[] = [];
      while (stack.length) {
        const i = stack.pop()!; if (f[i]) pix.push(i);
        const x = i % Wd; const y = (i - x) / Wd;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx; const yy = y + dy; if (xx < 0 || yy < 0 || xx >= Wd || yy >= Hd) continue;
          const j = yy * Wd + xx; if (dil[j] && !lab[j]) { lab[j] = nl; stack.push(j); }
        }
      }
      if (pix.length < (kind === "paper" ? Math.min(MIN_PX, 10) : MIN_PX)) continue; // paper: hairline cracks are short
      let sx = 0; let sy = 0; let bx0 = Infinity; let by0 = Infinity; let bx1 = -Infinity; let by1 = -Infinity;
      const votes = new Map<string, number>(); let nHole = 0; let nCut = 0; let geoOn = 0; let appD = 0; let inPaper = 0;
      for (const i of pix) {
        const x = i % Wd; const y = (i - x) / Wd; sx += x; sy += y; bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y);
        if (sub[i] === 1) nHole++; if (sub[i] === 3) nCut++;
        if (R.geo[i]) geoOn++;
        let key = "";
        if (kind === "stray_ink" && R.pc[i] >= 0) key = "band:" + m.table.pieces[R.pc[i]].kind;
        else if (kind === "broken_ink") key = R.geo[i] ? "band:" + m.table.pieces[R.pc[i]].kind + " faded" : "fill:" + (R.item[i] >= 0 ? m.fs.items[R.item[i]].kind : "none") + " unbordered";
        else if (kind === "paper") {
          // the fill item next to the hole (holes) or under it (covered)
          let it = R.item[i];
          if (it < 0) for (let d = 1; d <= 4 && it < 0; d++) for (const j of [i - d, i + d, i - d * Wd, i + d * Wd]) if (j >= 0 && j < n && R.item[j] >= 0) { it = R.item[j]; break; }
          key = "fill:" + (it >= 0 ? m.fs.items[it].kind : "none");
        } else if (kind === "hard_edge" || kind === "owner_only") {
          if (sub[i] === 1 || kind === "owner_only") key = "fill:" + (R.item[i] >= 0 ? m.fs.items[R.item[i]].kind : "none");
          else { const its = new Set<string>(); for (const j of [i, i + 1, i + Wd]) if (j < n && R.item[j] >= 0) its.add(m.fs.items[R.item[j]].kind); key = "fill:" + [...its].sort().join("|"); }
          if (R.rgb[3 * i] >= 0 && B.rgb[3 * i] >= 0) appD += Math.max(Math.abs(R.rgb[3 * i] - B.rgb[3 * i]), Math.abs(R.rgb[3 * i + 1] - B.rgb[3 * i + 1]), Math.abs(R.rgb[3 * i + 2] - B.rgb[3 * i + 2]));
        }
        if (bCovMax2[i] === 0) inPaper++;
        if (key) votes.set(key, (votes.get(key) ?? 0) + 1);
      }
      const cx = (c0 + sx / pix.length + 0.5) / ppu; const cy = (r0 + sy / pix.length + 0.5) / ppu;
      const gx = c0 + sx / pix.length; const gy = r0 + sy / pix.length;
      if (gx < kx0 || gx >= kx1 || gy < ky0 || gy >= ky1) continue; // another tile's
      const nb = near(cx, cy);
      const part = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "?";
      const bw = bx1 - bx0 + 1; const bh = by1 - by0 + 1;
      let shape = "";
      if (kind === "stray_ink" && nCut > pix.length / 2) shape = "cut";
      else if (kind === "stray_ink") shape = pix.length / (bw * bh) > 0.45 && Math.min(bw, bh) > 1.6 * m.table.W * ppu ? "block" : Math.max(bw, bh) > 3 * Math.min(bw, bh) ? "bar" : pix.length < 40 ? "fleck" : "spike";
      else if (kind === "paper") shape = nHole > pix.length / 2 ? (B.ink[pix[0]] >= 0.5 ? "notch" : "hole") : "covered";
      else if (kind === "broken_ink") shape = geoOn > pix.length / 2 ? "faded" : "missing";
      else shape = kind === "owner_only" || nHole > pix.length / 2 ? "wedge" : "step";
      // K1045: a covered eye, or ink inside form B's open paper, between two close junctions
      const jd = sc.junctions.map((J) => Math.hypot(J.c[0] - cx, J.c[1] - cy)).sort((a, b) => a - b);
      const eye = (shape === "covered" || (kind === "stray_ink" && inPaper > pix.length / 2)) && jd.length > 1 && jd[1] < 5 * h;
      let detail = eye ? "K1045 eye" : "";
      if (kind === "hard_edge" || kind === "owner_only") detail = `app colour diff ${(appD / pix.length).toFixed(3)}`;
      const pk = part.split(":")[1]?.split(" ")[0] ?? "";
      const file = part.startsWith("band") ? PIECE_FILE[pk] ?? "outline.ts" : part.startsWith("fill") ? (kind === "hard_edge" || kind === "owner_only" ? (shape === "wedge" ? "fill_tri.ts (fill ownership: " + pk + ")" : "fill_tri.ts (slots/vW) + paint.ts") : ITEM_FILE[pk.split("|")[0]] ?? "fill_tri.ts") : "?";
      // a junction under-tail without a hard cut: tail_look (see KINDS)
      let kOut: Kind = kind;
      if (kind === "broken_ink" && (part.startsWith("band:tail") || part.startsWith("fill:junc"))) {
        let cut = 0;
        for (let y = Math.max(0, by0 - 3); y <= Math.min(Hd - 1, by1 + 3); y++) for (let x = Math.max(0, bx0 - 3); x <= Math.min(Wd - 1, bx1 + 3); x++) { const q = y * Wd + x; if (oIStep[q] > 0.35 && bIStepMax2[q] < 0.12 && bInkMax2[q] > 0.1) cut++; }
        if (cut < 6) kOut = "tail_look"; else shape = "cut short";
      }
      arts.push({ id: "", scene: nm, kind: kOut, sub: shape, x: +cx.toFixed(3), y: +cy.toFixed(3), px: pix.length, sizePx: Math.max(bw, bh), bbox: [+((c0 + bx0) / ppu).toFixed(3), +((r0 + by0) / ppu).toFixed(3), +((c0 + bx1 + 1) / ppu).toFixed(3), +((r0 + by1 + 1) / ppu).toFixed(3)], near: nb.id, dNear: +nb.d.toFixed(3), part, file, detail });
    }
  }
  }
  console.error(`${nm}: ${GW}x${GH} px at ${ppu} px/unit, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  // K1049: through-pass bends with a visible inner corner (rp=outline skips the through pair's corner).
  const rC = m.table.corners.filter((c) => c.ok && c.r > 0).map((c) => c.r).sort((a, b) => a - b);
  const rMed = rC.length ? rC[rC.length >> 1] : 0.5 * h;
  const cam = Math.abs((sc as any).camera?.worldToCss?.[0] ?? 20) * ((sc as any).camera?.dpr ?? 1);
  const idx = new Map<number, number>(); sc.chains.forEach((c, i) => idx.set(c.id, i));
  sc.junctions.forEach((J, ji) => {
    const ang = J.arms.map((a) => { const ch = sc.chains[idx.get(a.chain) ?? -1]; if (!ch) return NaN; const p = chainPt(ch.pts, ch.closed, a.s + a.dir * 2 * h); return Math.atan2(p.y - J.c[1], p.x - J.c[0]); });
    J.arms.forEach((a, i) => J.arms.forEach((b, k) => {
      if (k <= i || a.kind !== "through" || b.kind !== "through" || a.chain !== b.chain || Math.abs(a.s - b.s) > 1e-6) return;
      if (!Number.isFinite(ang[i]) || !Number.isFinite(ang[k])) return;
      // the empty side between the two arms: the gap (ccw from a to b, or b to a) with no other arm in it
      const others = ang.filter((_, q) => q !== i && q !== k && Number.isFinite(ang[q]));
      const ccw = (u: number, v: number): number => { let d = v - u; while (d < 0) d += 2 * Math.PI; while (d >= 2 * Math.PI) d -= 2 * Math.PI; return d; };
      for (const [u, v] of [[ang[i], ang[k]], [ang[k], ang[i]]] as [number, number][]) {
        const g = ccw(u, v); if (others.some((o) => ccw(u, o) < g)) continue;
        if (g >= Math.PI) continue; // the outer side of the bend
        const mid = u + g / 2; const d = h / Math.sin(g / 2);
        const vx = J.c[0] + Math.cos(mid) * d; const vy = J.c[1] + Math.sin(mid) * d;
        // the outline's corner at this bend: an ok same-chain corner at the junction, V nearest the bend's
        const oc = m.table.corners.filter((c) => c.junction === J.id && c.aChain === a.chain && c.bChain === a.chain && c.ok && c.r > 0)
          .sort((p, q) => Math.hypot(p.Vx - vx, p.Vy - vy) - Math.hypot(q.Vx - vx, q.Vy - vy))[0];
        const reach = (r: number, th: number): number => r * (1 / Math.sin(th / 2) - 1) * cam; // how far a rounded corner moves the inner edge, screen px at the scene's camera
        let dev: number; let sub = "sharp"; let ref = "";
        if (FILLET_REF.on) {
          // s3: the reference is the fillet's own corner at this bend (form_b_fillet, K1049): a find
          // when the outline's reach (0 with no corner) differs from the fillet's by 2.5 px or more.
          const fbf = filletOf(m);
          const fc = [...fbf.thruCi].map((ci) => fbf.corners[ci]).find((c) => c.j === ji && ((fbf.arms[c.a].ei === i && fbf.arms[c.b].ei === k) || (fbf.arms[c.a].ei === k && fbf.arms[c.b].ei === i)));
          const devF = fc && fc.ok && fc.r > 0 ? reach(fc.r, fc.theta) : 0;
          // The outline's corner for this same arm pair (its diagram corner flagged thru; outline arm
          // indices are form B's). s3b's nearest same-chain corner also took a chain's end-to-through
          // corner where the chain ends at the junction it passes (g41_ring j13, j22: 5 false finds).
          const ot = m.table.corners.find((c, ci) => { const dc = m.st.corners[ci]; return dc.ji === ji && dc.thru === 1 && c.ok && c.r > 0 && ((fbf.arms[dc.aArm].ei === i && fbf.arms[dc.bArm].ei === k) || (fbf.arms[dc.aArm].ei === k && fbf.arms[dc.bArm].ei === i)); });
          const devO = ot ? reach(ot.r, ot.theta) : 0;
          dev = Math.abs(devO - devF);
          if (dev < 2.5) continue; // under 2.5 screen px the difference is not visible at the camera
          sub = ot ? (devF > 0 ? "radius" : "extra") : "sharp";
          ref = `, fillet r ${fc && fc.ok ? (fc.r / h).toFixed(3) : "none"} h (reach ${devF.toFixed(1)} px), outline r ${ot ? (ot.r / h).toFixed(3) : "none"} h (reach ${devO.toFixed(1)} px)`;
        } else {
          dev = rMed * (1 / Math.sin(g / 2) - 1) * cam;
          if (dev < 2.5) continue; // s1 FP: under 2.5 screen px a rounded corner is not visible at the camera
          if (oc) continue;
        }
        arts.push({ id: "", scene: nm, kind: "k1049", sub, x: +vx.toFixed(3), y: +vy.toFixed(3), px: Math.round(dev * dev), sizePx: +dev.toFixed(1), bbox: [+(vx - 2 * h).toFixed(3), +(vy - 2 * h).toFixed(3), +(vx + 2 * h).toFixed(3), +(vy + 2 * h).toFixed(3)], near: `j${ji}`, dNear: +d.toFixed(3), part: "corner: through pair's bend vs the fillet", file: "outline.ts (diagramOf's through-pair corners, cornersPhaseC) + fill_tri.ts (junction fan)", detail: `bend gap ${(g * 180 / Math.PI).toFixed(1)} deg, chain ${a.chain}${ref}` });
      }
    }));
  });
  arts.forEach((a, i) => { a.id = `${nm}#${i}`; });
  return { arts: arts.map(reclassS1).filter((a): a is Art => a !== null), m };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const pos = args.filter((a) => !a.startsWith("--"));
  const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const tag = pos[0] ?? "cur"; const ppu = Number(opt("ppu") ?? 80); const minPx = Number(opt("min") ?? 12);
  const scenes = (opt("scene") ?? ALL.join(",")).split(",").filter((s) => existsSync(join(SCENE_DIR, `${s}.json`)));
  const outDir = join(here, "out", "s1"); mkdirSync(outDir, { recursive: true });
  const all: Art[] = []; const lines: string[] = [];
  lines.push(["scene", ...ARTIFACT_KINDS, "total", "owner_only", "tail_look"].map((s, i) => (i ? s.padStart(11) : s.padEnd(22))).join(""));
  const merge = opt("merge")?.split(",");
  // Waits before each scene while a perf lock younger than 30 min exists, unless its owner line starts with
  // $env:K1314_LOCK_OWNER (the run's own lock: without this a run holding the lock waited on itself until it
  // went stale, K1314 s3's like-for-like census).
  const waitLock = (): void => {
    const lock = join(process.env.TEMP ?? "", "claude-perf.lock"); const sab = new Int32Array(new SharedArrayBuffer(4));
    const own = process.env.K1314_LOCK_OWNER;
    const mine = (): boolean => { try { return !!own && readFileSync(lock, "utf8").startsWith(own); } catch { return false; } };
    while (existsSync(lock) && Date.now() - statSync(lock).mtimeMs < 30 * 60e3 && !mine()) Atomics.wait(sab, 0, 0, 10e3);
  };
  for (const nm of scenes) {
    let arts: Art[];
    if (merge) arts = merge.flatMap((t) => (JSON.parse(readFileSync(join(outDir, `census_${t}.json`), "utf8")).arts as Art[]).filter((a) => a.scene === nm)).map(reclassS1).filter((a): a is Art => a !== null);
    else { waitLock(); arts = census(nm, ppu, minPx).arts; }
    all.push(...arts);
    const cnt = ARTIFACT_KINDS.map((k) => arts.filter((a) => a.kind === k).length);
    lines.push([nm.padEnd(22), ...[...cnt, cnt.reduce((a, b) => a + b, 0), arts.filter((a) => a.kind === "owner_only").length, arts.filter((a) => a.kind === "tail_look").length].map((v) => String(v).padStart(11))].join(""));
    writeFileSync(join(outDir, `census_${tag}.json`), JSON.stringify({ ppu, minPx, scenes, arts: all }, null, 1));
  }
  const tot = ARTIFACT_KINDS.map((k) => all.filter((a) => a.kind === k).length);
  lines.push(["TOTAL".padEnd(22), ...[...tot, tot.reduce((a, b) => a + b, 0), all.filter((a) => a.kind === "owner_only").length, all.filter((a) => a.kind === "tail_look").length].map((v) => String(v).padStart(11))].join(""));
  writeFileSync(join(outDir, `census_${tag}.txt`), lines.join("\n") + "\n");
  console.log(lines.join("\n"));
}
if (process.argv[1] && /k1314_census/.test(process.argv[1])) void main();
