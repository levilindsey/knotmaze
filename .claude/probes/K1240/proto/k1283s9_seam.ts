// K1283 s9: k1283s8_seam.ts plus --dbgat=x,y,r: --dbg prints only seams within r of (x, y) (up to --dbgn, default 12).
// K1283 s8: k1278s2_seam.ts plus --dump=<kind,kind> (e.g. strip|strip,strip|tail): per mode, the over-1/255 seams of
// those kinds clustered on a 0.5 grid (count, max step), to place a seam change. Same usage otherwise.
// K1278 stage 2: k1278_seam.ts reading src/render/outline/ (paint.ts, fill_tri.ts, draw.ts, outline.ts).
// K1278 seam test: is the fill's paint continuous across every triangle
// edge, face edge and junction ring, and are junctions no steppier than
// form B's?
//
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1278_seam.ts [--scene=a,b] [--ppu=80] [--modes=app,step,kink] [--crops=<dir>] [--edges-only]
//
// 1. EDGE SEAMS. Every triangle edge is keyed by its endpoints (quantized
//    1e-6 world); two triangles on one geometric edge whose vertices are
//    different vertices (strip end row vs junction ring, cap or tail vs
//    strip, strip vs ghost strip, ...) are a seam. Both sides' paint is
//    sampled at t = 0, .25, .5, .75, 1 along the edge (each side with its
//    own triangle's slots, as the raster paints it) and the largest channel
//    difference (x255) is the seam's step. Bar: no seam over 1/255.
//    Painted three ways: mine (fill_tri.ts paint fields, paint.ts), master's
//    fill (k1278_base_fill.ts = 9849a26e) painting its own fields (vertex
//    owner chain + Gouraud s: the run at that s), and master's flat chain
//    colours (what master's draw.ts paints).
// 2. JUNCTION WINDOWS (ppu, half-size 3h about each junction's centre).
//    Form B (src/render/field/form_b.ts evalPoint: top chain, s) painted
//    with the same section colours; mine (rasterPaint) and master's fields.
//    Per junction: the largest per-pixel step between 4-neighbours that are
//    ink in form B and in the candidate (the bar: no larger than form B's
//    + 1/255), and the mean colour difference against form B over those
//    pixels (x255; the crops pick the 6 worst junctions by it, app mode).
//    Form B's chain/s/ink per pixel are cached in out/k1278/fb/.
// 3. --crops=<dir>: crops form B | master | mine at the 6 worst junctions
//    (app mode), the outline band (draw.ts) darkening the fill as drawn.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { FormB } from "../../../../src/render/field/form_b";
import * as O from "../../../../src/render/outline/outline";
import * as D from "../../../../src/render/outline/draw";
import * as F from "../../../../src/render/outline/fill_tri";
import * as B from "./k1278_base_fill";
import * as F0 from "./k1278s2_before_fill";
import { ALL, loadScene, rScene, rasterR } from "./k1279_census";
import { sectionPaint, runAt, runColour, paintAt, type PaintMode, type SectionPaint, type RGB } from "../../../../src/render/outline/paint";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "k1278s2"); const fbDir = join(here, "..", "out", "k1278", "fb"); mkdirSync(outDir, { recursive: true });
mkdirSync(fbDir, { recursive: true });
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const flag = (k: string): boolean => args.includes(`--${k}`);
const scenes = opt("scene")?.split(",") ?? ALL;
const ppu = Number(opt("ppu") ?? 80);
const modes = (opt("modes")?.split(",") ?? ["app", "step", "kink"]) as PaintMode[];
const cropDir = opt("crops");
const abutOnly = args.includes("--abut-only");

interface Fill { fs: F.FillStructure; fr: F.FillFrame }
type Painter = (t: number, b: number[], out: RGB) => RGB | null;

/** Mine: the triangle's slots, interpolated, painted. */
function minePainter(f: Fill, runs: Int32Array, sp: SectionPaint): Painter {
  const r4 = new Int32Array(4); const w4 = new Float64Array(4); const s4 = new Float64Array(4);
  return (t, b, out) => {
    const I = f.fs.idx;
    F.vertexPaint(f.fs, f.fr, runs, [I[t], I[t + 1], I[t + 2]], b, r4, w4, s4);
    return paintAt(sp, r4, w4, s4, out);
  };
}
/** Master's fill painting its own fields: owner chain + Gouraud s (unwrapped
 *  about the triangle's first vertex on a closed chain). */
function basePainter(f: Fill, sp: SectionPaint, lens: number[]): Painter {
  return (t, b, out) => {
    const I = f.fs.idx; const a = I[t]; const ch = f.fs.vChain[a]; const L = lens[ch];
    const sa = f.fr.s[a]; let s = 0;
    for (let q = 0; q < 3; q++) { let v = f.fr.s[I[t + q]]; if (L > 0) v += L * Math.round((sa - v) / L); s += b[q] * v; }
    const r = runAt(sp, ch, s); if (r < 0) return null;
    return runColour(sp.runs[r], s, out);
  };
}
function flatPainter(f: Fill, nCh: number, hue: number): Painter {
  return (t, _b, out) => { const c = D.chainColor(f.fs.vChain[f.fs.idx[t]], nCh, hue); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return out; };
}

/** Visible seams: every edge of every non-degenerate triangle, sampled at
 *  t = .1 .. .9; at each sample the top triangle (highest key, ties to the
 *  later one, as the raster) just to either side (1e-5 world). Where the two
 *  differ and neither covers the other side's point, two triangles abut
 *  there: a seam, whatever their vertices (T-junctions included), unless
 *  their keys there differ by more than 3 zt (an over / under edge). */
interface Sample { tA: number; bA: number[]; tB: number; bB: number[]; x: number; y: number }
function seamSamples(f: Fill, h: number, zt: number): Sample[] {
  const P = f.fr.pos; const K = f.fr.key; const I = f.fs.idx;
  const tris: number[] = []; let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t]; const b = I[t + 1]; const c = I[t + 2];
    if (!(K[a] > -999 && K[b] > -999 && K[c] > -999)) continue;
    const ar = (P[2 * b] - P[2 * a]) * (P[2 * c + 1] - P[2 * a + 1]) - (P[2 * c] - P[2 * a]) * (P[2 * b + 1] - P[2 * a + 1]);
    if (!(Math.abs(ar) > 1e-12)) continue;
    tris.push(t);
    for (const v of [a, b, c]) { x0 = Math.min(x0, P[2 * v]); x1 = Math.max(x1, P[2 * v]); y0 = Math.min(y0, P[2 * v + 1]); y1 = Math.max(y1, P[2 * v + 1]); }
  }
  const cs = h; const nx = Math.max(1, Math.ceil((x1 - x0) / cs) + 1); const ny = Math.max(1, Math.ceil((y1 - y0) / cs) + 1);
  const cells = new Map<number, number[]>();
  for (const t of tris) {
    let bx0 = Infinity; let by0 = Infinity; let bx1 = -Infinity; let by1 = -Infinity;
    for (let q = 0; q < 3; q++) { const v = I[t + q]; bx0 = Math.min(bx0, P[2 * v]); bx1 = Math.max(bx1, P[2 * v]); by0 = Math.min(by0, P[2 * v + 1]); by1 = Math.max(by1, P[2 * v + 1]); }
    for (let cy = Math.floor((by0 - y0) / cs); cy <= Math.floor((by1 - y0) / cs); cy++) for (let cx = Math.floor((bx0 - x0) / cs); cx <= Math.floor((bx1 - x0) / cs); cx++) {
      const k = cy * nx + cx; const l = cells.get(k); if (l) l.push(t); else cells.set(k, [t]);
    }
  }
  void ny;
  const bary = (t: number, px: number, py: number, out: number[]): boolean => {
    const a = I[t]; const b = I[t + 1]; const c = I[t + 2];
    const ax = P[2 * a]; const ay = P[2 * a + 1]; const bx = P[2 * b]; const by = P[2 * b + 1]; const cx = P[2 * c]; const cy = P[2 * c + 1];
    const d = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    const w1 = ((px - ax) * (cy - ay) - (cx - ax) * (py - ay)) / d; const w2 = ((bx - ax) * (py - ay) - (px - ax) * (by - ay)) / d;
    out[0] = 1 - w1 - w2; out[1] = w1; out[2] = w2;
    return out[0] >= -1e-9 && w1 >= -1e-9 && w2 >= -1e-9;
  };
  const tmp = [0, 0, 0];
  const top = (px: number, py: number): number => {
    const l = cells.get(Math.floor((py - y0) / cs) * nx + Math.floor((px - x0) / cs)); if (!l) return -1;
    let best = -1; let bk = -Infinity;
    for (const t of l) { if (!bary(t, px, py, tmp)) continue; const k = tmp[0] * K[I[t]] + tmp[1] * K[I[t + 1]] + tmp[2] * K[I[t + 2]]; if (k > bk || (k === bk && t > best)) { bk = k; best = t; } }
    return best;
  };
  const res: Sample[] = []; const eps = 1e-5;
  for (const t of tris) for (let e = 0; e < 3; e++) {
    const a = I[t + e]; const b = I[t + ((e + 1) % 3)];
    const dx = P[2 * b] - P[2 * a]; const dy = P[2 * b + 1] - P[2 * a + 1]; const L = Math.hypot(dx, dy);
    if (L < 1e-6) continue;
    const nxv = -dy / L; const nyv = dx / L;
    for (const u of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const px = P[2 * a] + u * dx; const py = P[2 * a + 1] + u * dy;
      const tA = top(px + eps * nxv, py + eps * nyv); const tB = top(px - eps * nxv, py - eps * nyv);
      if (tA < 0 || tB < 0 || tA === tB) continue;
      // Stage 1 kept only abutting edges (neither top triangle reaches across),
      // which skipped every overlap boundary (an item drawn over another that
      // runs on beneath it). Stage 2 counts any edge of the two top triangles
      // themselves; --abut-only restores stage 1's rule.
      if (abutOnly ? bary(tA, px - eps * nxv, py - eps * nyv, tmp) || bary(tB, px + eps * nxv, py + eps * nyv, tmp) : t !== tA && t !== tB) continue;
      const bA = [0, 0, 0]; const bB = [0, 0, 0]; bary(tA, px, py, bA); bary(tB, px, py, bB);
      const kA = bA[0] * K[I[tA]] + bA[1] * K[I[tA + 1]] + bA[2] * K[I[tA + 2]]; const kB = bB[0] * K[I[tB]] + bB[1] * K[I[tB + 1]] + bB[2] * K[I[tB + 2]];
      if (Math.abs(kA - kB) > 3 * Math.abs(zt)) continue; // a depth edge (over / under), not a seam
      res.push({ tA, bA, tB, bB, x: px, y: py });
    }
  }
  return res;
}
interface SeamStat { n: number; over: number; max: number; at: string; kinds: Map<string, number>; fold: number; thread: number; foldMax: number; threadMax: number; hist: number[]; cells: Map<string, { w: number; x: number; y: number; k: string }>; bad: { x: number; y: number; w: number; k: string }[] }
let dbgN = 0;
const dbgAtA = process.argv.find((a) => a.startsWith("--dbgat="))?.slice(8).split(",").map(Number);
const dbgAt = (x: number, y: number): boolean => !dbgAtA || Math.hypot(x - dbgAtA[0], y - dbgAtA[1]) <= dbgAtA[2];
const itemIdxCache = new WeakMap<object, Int32Array>();
function itemIdx(f: Fill, v: number): number {
  let a = itemIdxCache.get(f.fs);
  if (!a) { a = new Int32Array(f.fs.nV).fill(-1); f.fs.items.forEach((it, k) => { const n = it.kind === "junc" ? 1 + it.R : F.itemVerts(it as F.FillItem); for (let q = 0; q < n; q++) a![it.base + q] = k; }); itemIdxCache.set(f.fs, a); }
  return a[v];
}
let curLens: number[] = []; let curHW = 0;
let fbE: { evalPoint(x: number, y: number): { ink: number; top: number; chain: number; s: number } } | undefined;
const fbT = { same: 0, paper: 0, ex: [0, 0, 0, 0, 0] };
function seamStat(f: Fill, samples: Sample[], paint: Painter, itemOf: (v: number) => string, dbg?: Int32Array): SeamStat {
  dbgN = 0;
  const st: SeamStat = { n: 0, over: 0, max: 0, at: "", kinds: new Map(), fold: 0, thread: 0, foldMax: 0, threadMax: 0, hist: [0, 0, 0, 0], cells: new Map(), bad: [] };
  const ca: RGB = [0, 0, 0]; const cb: RGB = [0, 0, 0];
  for (const p of samples) {
    if (!paint(p.tA, p.bA, ca) || !paint(p.tB, p.bB, cb)) continue;
    const w = 255 * Math.max(Math.abs(ca[0] - cb[0]), Math.abs(ca[1] - cb[1]), Math.abs(ca[2] - cb[2]));
    const I0 = f.fs.idx; const iA = itemIdx(f, I0[p.tA]); const iB = itemIdx(f, I0[p.tB]);
    if (iA === iB) { if (w > 1) st.fold++; st.foldMax = Math.max(st.foldMax, w); continue; }
    const kA = itemOf(I0[p.tA]); const kB = itemOf(I0[p.tB]);
    // A chain crossing itself: the two passes are a thread edge too (s apart by more than 3 hW).
    const chA = f.fs.vChain[I0[p.tA]]; const sa0 = f.fr.s4 ? f.fr.s4[4 * I0[p.tA]] : 0; const sb0 = f.fr.s4 ? f.fr.s4[4 * I0[p.tB]] : 0;
    const Lc = curLens[chA] ?? 0; const dS = Lc > 0 ? Math.min(((sa0 - sb0) % Lc + Lc) % Lc, ((sb0 - sa0) % Lc + Lc) % Lc) : Math.abs(sa0 - sb0);
    const selfX = chA === f.fs.vChain[I0[p.tB]] && kA !== "junc" && kB !== "junc" && f.fr.s4 !== undefined && dS > 3 * curHW;
    if (selfX || (f.fs.vChain[I0[p.tA]] !== f.fs.vChain[I0[p.tB]] && kA !== "junc" && kB !== "junc")) { if (w > 1) st.thread++; st.threadMax = Math.max(st.threadMax, w); continue; }
    st.n++;
    if (w > 1 && dbg && dbgAt(p.x, p.y)) { const r4 = new Int32Array(4); const w4 = new Float64Array(4); const s4 = new Float64Array(4); const I = f.fs.idx; const sh = (t: number, b: number[]): string => { F.vertexPaint(f.fs as F.FillStructure, f.fr as F.FillFrame, dbg, [I[t], I[t + 1], I[t + 2]], b, r4, w4, s4); return `ch${f.fs.vChain[I[t]]} r[${[...r4]}] w[${[...w4].map((x) => x.toFixed(3))}] s[${[...s4].map((x) => x.toFixed(3))}] verts ${I[t]},${I[t + 1]},${I[t + 2]}`; }; if (dbgN++ < Number(process.argv.find((a) => a.startsWith("--dbgn="))?.slice(7) ?? 12)) console.log(`    ${w.toFixed(1)} at (${p.x.toFixed(3)}, ${p.y.toFixed(3)}) ${itemOf(I[p.tA])}: ${sh(p.tA, p.bA)} | ${itemOf(I[p.tB])}: ${sh(p.tB, p.bB)}`); }
    if (w > 1) { for (const [q, lim] of [2, 4, 8, 16].entries()) if (w > lim) st.hist[q]++; const ck = `${Math.round(p.x * 4) / 4},${Math.round(p.y * 4) / 4}`; const o = st.cells.get(ck); if (!o || o.w < w) st.cells.set(ck, { w, x: p.x, y: p.y, k: [itemOf(f.fs.idx[p.tA]), itemOf(f.fs.idx[p.tB])].join("|") }); }
    if (w > 1) { st.over++; const kp = [itemOf(f.fs.idx[p.tA]), itemOf(f.fs.idx[p.tB])].sort().join("|"); st.kinds.set(kp, (st.kinds.get(kp) ?? 0) + 1); st.bad.push({ x: p.x, y: p.y, w, k: kp }); }
    if (w > st.max) { st.max = w; st.at = `(${p.x.toFixed(3)}, ${p.y.toFixed(3)}) ${itemOf(f.fs.idx[p.tA])}|${itemOf(f.fs.idx[p.tB])}`; }
  }
  return st;
}
interface JWin { ji: number; c0: number; r0: number; N: number; x: number; y: number }
function jWindows(scene: O.SceneIn): JWin[] {
  const h = scene.look.halfWidth; const half = 3 * h;
  return scene.junctions.map((J, ji) => {
    const c0 = Math.round((J.c[0] - half) * ppu); const r0 = Math.round((J.c[1] - half) * ppu);
    return { ji, c0, r0, N: Math.round(2 * half * ppu), x: J.c[0], y: J.c[1] };
  });
}
interface FBW { top: Int32Array; chain: Int32Array; ink: Float32Array; s: Float64Array }
function formBJ(nm: string, scene: O.SceneIn, wins: JWin[]): FBW[] {
  const file = join(fbDir, `${nm}_j${ppu}.bin`);
  const total = wins.reduce((a, w) => a + w.N * w.N, 0);
  let top: Int32Array; let chain: Int32Array; let ink: Float32Array; let s: Float64Array;
  if (existsSync(file) && readFileSync(file).length === 20 * total) {
    const b = readFileSync(file); const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
    s = new Float64Array(ab, 0, total); top = new Int32Array(ab, 8 * total, total); chain = new Int32Array(ab, 12 * total, total); ink = new Float32Array(ab, 16 * total, total);
  } else {
    const t0 = Date.now();
    const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { ink: number; top: number; chain: number; s: number } };
    s = new Float64Array(total); top = new Int32Array(total); chain = new Int32Array(total); ink = new Float32Array(total);
    let o = 0;
    for (const w of wins) for (let r = 0; r < w.N; r++) for (let c = 0; c < w.N; c++) {
      const ev = fb.evalPoint((w.c0 + c + 0.5) / ppu, (w.r0 + r + 0.5) / ppu);
      top[o] = ev.top; chain[o] = ev.top < 0 ? -1 : ev.chain; s[o] = ev.s; ink[o] = Math.min(1, Math.max(0, ev.ink)); o++;
    }
    writeFileSync(file, Buffer.concat([Buffer.from(s.buffer), Buffer.from(top.buffer), Buffer.from(chain.buffer), Buffer.from(ink.buffer)]));
    console.error(`${nm}: form B ${total} px in ${wins.length} junction windows, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  let o = 0;
  return wins.map((w) => { const n = w.N * w.N; const r = { top: top.subarray(o, o + n), chain: chain.subarray(o, o + n), ink: ink.subarray(o, o + n), s: s.subarray(o, o + n) }; o += n; return r; });
}
/** Paint one window: rgb (-1 = paper) from a fill's raster + a painter. */
function paintWin(f: Fill, paint: Painter, w: JWin): Float32Array {
  const n = w.N * w.N;
  const win = { tri: new Int32Array(n).fill(-1), bary: new Float32Array(3 * n) };
  const own = F.rasterFill(f.fs as F.FillStructure, f.fr as F.FillFrame, w.c0 / ppu, w.r0 / ppu, w.N, w.N, ppu, win);
  const rgb = new Float32Array(3 * n).fill(-1); const c: RGB = [0, 0, 0];
  for (let o = 0; o < n; o++) {
    if (own[o] === 0 || win.tri[o] < 0) continue;
    if (!paint(win.tri[o], [win.bary[3 * o], win.bary[3 * o + 1], win.bary[3 * o + 2]], c)) continue;
    rgb[3 * o] = c[0]; rgb[3 * o + 1] = c[1]; rgb[3 * o + 2] = c[2];
  }
  return rgb;
}
function paintFB(fb: FBW, sp: SectionPaint, n: number): Float32Array {
  const rgb = new Float32Array(3 * n).fill(-1); const c: RGB = [0, 0, 0];
  for (let o = 0; o < n; o++) {
    if (fb.top[o] < 0 || fb.chain[o] < 0) continue;
    const r = runAt(sp, fb.chain[o], fb.s[o]); if (r < 0) continue;
    runColour(sp.runs[r], fb.s[o], c); rgb[3 * o] = c[0]; rgb[3 * o + 1] = c[1]; rgb[3 * o + 2] = c[2];
  }
  return rgb;
}
const cd = (a: Float32Array, i: number, j: number): number => Math.max(Math.abs(a[3 * i] - a[3 * j]), Math.abs(a[3 * i + 1] - a[3 * j + 1]), Math.abs(a[3 * i + 2] - a[3 * j + 2]));
/** Largest 4-neighbour step over pairs inked in both rasters. */
function maxStep(a: Float32Array, ref: Float32Array, N: number): number {
  let m = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const i = r * N + c; if (a[3 * i] < 0 || ref[3 * i] < 0) continue;
    if (c + 1 < N) { const j = i + 1; if (a[3 * j] >= 0 && ref[3 * j] >= 0) m = Math.max(m, cd(a, i, j)); }
    if (r + 1 < N) { const j = i + N; if (a[3 * j] >= 0 && ref[3 * j] >= 0) m = Math.max(m, cd(a, i, j)); }
  }
  return m * 255;
}
function meanDiff(a: Float32Array, ref: Float32Array, n: number): number {
  let s = 0; let k = 0;
  for (let i = 0; i < n; i++) { if (a[3 * i] < 0 || ref[3 * i] < 0) continue; s += Math.max(Math.abs(a[3 * i] - ref[3 * i]), Math.abs(a[3 * i + 1] - ref[3 * i + 1]), Math.abs(a[3 * i + 2] - ref[3 * i + 2])); k++; }
  return k ? (255 * s) / k : 0;
}

interface Worst { nm: string; ji: number; x: number; y: number; mine: number; base: number }
const worst: Worst[] = [];
const fmt = (s: SeamStat): string => `paint seams ${s.n} samples, ${s.over} over 1/255 [${[...s.kinds].map(([k, v]) => `${k} ${v}`).join(", ")}], max ${s.max.toFixed(1)} (folds ${s.fold} over, max ${s.foldMax.toFixed(1)}; thread edges ${s.thread} over, max ${s.threadMax.toFixed(1)})`;
const tot: Record<string, { over: number; max: number; jOver: number; jWorse: number; jMaxExcess: number }> = {};
// --at=<scene>:<x>:<y>,...: skip the test and crop these points (the sliver
// row); the mean diffs are taken at crop time. --cropname names the png.
const atPts: Worst[] | undefined = opt("at")?.split(",").map((p) => { const [nm, x, y] = p.split(":"); return { nm, ji: -1, x: Number(x), y: Number(y), mine: NaN, base: NaN }; });
for (const nm of atPts ? [] : scenes) {
  const scene = loadScene(nm); const st = O.structure(scene); const table = O.frame(st, scene); fbE = undefined;
  const fs = F.fillStructure(st, F.fillResolution(st, table)); const fr = flag("fill0") ? (F0.fillFrame(fs as never, st, table, scene) as unknown as F.FillFrame) : F.fillFrame(fs, st, table, scene); // --fill0: src before stage 2 (only s4 differs, k1278s2_ident)
  const bfs = B.fillStructure(st, B.fillResolution(st, table)); const bfr = B.fillFrame(bfs, st, table, scene);
  const mine: Fill = { fs, fr }; const base: Fill = { fs: bfs as never, fr: bfr as never };
  const lens = scene.chains.map((c) => { if (!c.closed) return 0; let L = 0; const n = c.pts.length >> 1; for (let i = 0; i < n; i++) { const j = (i + 1) % n; L += Math.hypot(c.pts[2 * j] - c.pts[2 * i], c.pts[2 * j + 1] - c.pts[2 * i + 1]); } return L; });
  const kindOf = (f: Fill): ((v: number) => string) => { const k = new Array<string>(f.fs.nV).fill("?"); for (const it of f.fs.items) { const n = (it.kind === "junc" ? 1 + it.R : F.itemVerts(it as F.FillItem)); for (let q = 0; q < n; q++) k[it.base + q] = it.kind === "strip" && (it as F.StripItem).ghost ? "ghost" : it.kind; } return (v) => k[v]; };
  const zt = 0.1 * scene.look.depthAmp;
  curHW = scene.look.halfWidth; curLens = scene.chains.map((c) => { if (!c.closed) return 0; let L = 0; const n = c.pts.length >> 1; for (let i = 0; i < n; i++) { const j = (i + 1) % n; L += Math.hypot(c.pts[2 * j] - c.pts[2 * i], c.pts[2 * j + 1] - c.pts[2 * i + 1]); } return L; });
  let pM = seamSamples(mine, scene.look.halfWidth, zt); const pB = seamSamples(base, scene.look.halfWidth, zt);
  // --near=x:y:r: only the samples within r of (x, y) (with --dbg, the first 12 over 1/255 printed).
  const nearO = opt("near")?.split(":").map(Number); if (nearO) pM = pM.filter((p) => Math.hypot(p.x - nearO[0], p.y - nearO[1]) < nearO[2]);
  const flat = seamStat(base, pB, flatPainter(base, scene.chains.length, D.baseHueFor(nm)), kindOf(base));
  console.log(`${nm}: master flat chain colours: ${fmt(flat)} ${flat.at}`);
  const wins = flag("edges-only") ? [] : jWindows(scene);
  const fbw = wins.length ? formBJ(nm, scene, wins) : [];
  for (const mode of modes) {
    const sp = sectionPaint(scene, mode, D.baseHueFor(nm));
    const runs = F.fillRuns(fs, st, fr, sp);
    const pm = minePainter(mine, runs, sp); const pb = basePainter(base, sp, lens);
    const sm = seamStat(mine, pM, pm, kindOf(mine), flag("dbg") ? runs : undefined); const sb = seamStat(base, pB, pb, kindOf(base));
    let jOver = 0; let jWorse = 0; let jMaxExcess = 0; let jbWorse = 0; let dM = 0; let dB = 0;
    wins.forEach((w, k) => {
      const n = w.N * w.N; const ref = paintFB(fbw[k], sp, n);
      const am = paintWin(mine, pm, w); const ab = paintWin(base, pb, w);
      const sF = maxStep(ref, am, w.N); const sMi = maxStep(am, ref, w.N); const sBa = maxStep(ab, ref, w.N);
      if (sMi > sF + 1) { jWorse++; jMaxExcess = Math.max(jMaxExcess, sMi - sF); }
      if (sBa > sF + 1) jbWorse++;
      const mdM = meanDiff(am, ref, n); const mdB = meanDiff(ab, ref, n); dM += mdM; dB += mdB;
      if (mode === "app") worst.push({ nm, ji: w.ji, x: w.x, y: w.y, mine: mdM, base: mdB });
      if (sMi > sF + 1 && flag("v")) console.log(`  ${mode} j${w.ji} (${w.x.toFixed(2)}, ${w.y.toFixed(2)}) step mine ${sMi.toFixed(1)} formB ${sF.toFixed(1)} master ${sBa.toFixed(1)}`);
    });
    jOver = jWorse;
    const T = (tot[mode] ??= { over: 0, max: 0, jOver: 0, jWorse: 0, jMaxExcess: 0 }); T.over += sm.over; T.max = Math.max(T.max, sm.max); T.jWorse += jWorse; T.jMaxExcess = Math.max(T.jMaxExcess, jMaxExcess); T.jOver += jbWorse;
    console.log(`  ${mode}: edges mine ${fmt(sm)} ${sm.at} | master fields ${fmt(sb)} ${sb.at}`);
    { const dk = opt("dump")?.split(","); if (dk) { const cl = new Map<string, { n: number; w: number; k: string }>(); for (const b of sm.bad) { if (!dk.includes(b.k)) continue; const ck = `${(Math.round(b.x * 2) / 2).toFixed(1)},${(Math.round(b.y * 2) / 2).toFixed(1)}`; const e = cl.get(ck) ?? { n: 0, w: 0, k: b.k }; e.n++; e.w = Math.max(e.w, b.w); cl.set(ck, e); } console.log(`  ${mode} dump ${dk.join(",")}: ` + [...cl].sort((a, b) => b[1].n - a[1].n).slice(0, 30).map(([c, e]) => `(${c}) ${e.n}x max ${e.w.toFixed(0)} ${e.k}`).join("; ")); } }
    if (flag("hist")) console.log(`  ${mode}: mine over 2/4/8/16: ${sm.hist.join("/")}; worst spots: ${[...sm.cells.values()].sort((a, b) => b.w - a.w).slice(0, 10).map((c) => `(${c.x.toFixed(2)}, ${c.y.toFixed(2)}) ${c.w.toFixed(0)} ${c.k}`).join("; ")}`);
    // --fbstep: is form B just as steppy there? Form B's colour at p +-d in x and y (d = --fbd, 0.03
    // world); its step = the largest pairwise difference among the four (x255). A seam is "form B too"
    // when form B steps at least w - 1 (a hard edge in form B as well: a round end, an under-pass
    // ink line); the rest are counted by their excess over form B's step.
    if (flag("fbstep") && mode === "app" && sm.bad.length) {
      fbE ??= new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as unknown as typeof fbE;
      const d = Number(opt("fbd") ?? 0.03); const cs: RGB[] = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
      let same = 0; let paper = 0; const ex = [0, 0, 0, 0, 0]; const exK = new Map<string, number>(); const exCells = new Map<string, { w: number; x: number; y: number; k: string; fb: number }>();
      for (const b of sm.bad) {
        let ok = true;
        [[d, 0], [-d, 0], [0, d], [0, -d]].forEach(([dx, dy], q) => {
          const ev = fbE!.evalPoint(b.x + dx, b.y + dy); if (ev.top < 0 || ev.chain < 0 || ev.ink > 0.5) { ok = false; return; }
          const r = runAt(sp, ev.chain, ev.s); if (r < 0) { ok = false; return; } runColour(sp.runs[r], ev.s, cs[q]);
        });
        if (!ok) { paper++; continue; }
        let fbs = 0; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) fbs = Math.max(fbs, 255 * Math.max(Math.abs(cs[i][0] - cs[j][0]), Math.abs(cs[i][1] - cs[j][1]), Math.abs(cs[i][2] - cs[j][2])));
        const e = b.w - fbs; if (e <= 1) { same++; continue; }
        ex[0]++; for (const [q, lim] of [2, 4, 8, 16].entries()) if (e > lim) ex[q + 1]++;
        exK.set(b.k, (exK.get(b.k) ?? 0) + 1);
        const ck = `${Math.round(b.x * 4) / 4},${Math.round(b.y * 4) / 4}`; const o = exCells.get(ck); if (!o || o.w - o.fb < e) exCells.set(ck, { ...b, fb: fbs });
      }
      fbT.same += same; fbT.paper += paper; for (let q = 0; q < 5; q++) fbT.ex[q] += ex[q];
      console.log(`  ${mode}: fbstep: of ${sm.bad.length} over 1/255, form B steps as much ${same}, ink/paper beside ${paper}; steppier than form B by over 1/2/4/8/16: ${ex.join("/")} [${[...exK].map(([k, v]) => `${k} ${v}`).join(", ")}]; worst: ${[...exCells.values()].sort((a, b) => b.w - b.fb - (a.w - a.fb)).slice(0, 6).map((c) => `(${c.x.toFixed(2)}, ${c.y.toFixed(2)}) ${c.w.toFixed(0)} vs ${c.fb.toFixed(0)} ${c.k}`).join("; ")}`);
    }
    if (wins.length) console.log(`  ${mode}: junctions ${wins.length}: step over form B's +1: mine ${jOver} (max excess ${jMaxExcess.toFixed(1)}), master ${jbWorse}; mean colour diff vs form B: mine ${(dM / wins.length).toFixed(2)}, master ${(dB / wins.length).toFixed(2)}`);
  }
}
console.log("TOTAL (mine):", Object.entries(tot).map(([m, t]) => `${m}: edge seams over 1/255 ${t.over} (max ${t.max.toFixed(1)}), junctions steppier than form B ${t.jWorse} (max excess ${t.jMaxExcess.toFixed(1)}) [master ${t.jOver}]`).join("; "));
if (flag("fbstep")) console.log(`fbstep TOTAL (app): form B steps as much ${fbT.same}, ink/paper beside ${fbT.paper}; steppier than form B by over 1/2/4/8/16: ${fbT.ex.join("/")}`);
worst.sort((a, b) => b.mine - a.mine);
console.log("worst junctions (app, mean colour diff vs form B x255):", worst.slice(0, 8).map((w) => `${w.nm} j${w.ji} (${w.x.toFixed(2)}, ${w.y.toFixed(2)}) mine ${w.mine.toFixed(1)} master ${w.base.toFixed(1)}`).join("; "));

if (cropDir) {
  mkdirSync(cropDir, { recursive: true });
  const six = atPts ?? worst.slice(0, 6);
  const P = 280; const cppu = 200; const GAP = 6; const nPan = 3;
  const Wt = nPan * P + (nPan - 1) * GAP; const Ht = six.length * P + (six.length - 1) * GAP;
  const img = new Uint8Array(Wt * Ht * 3).fill(128);
  const put = (row: number, pan: number, o: number, c: number[]): void => { const r = Math.floor(o / P); const q = o % P; const k = ((row * (P + GAP) + r) * Wt + pan * (P + GAP) + q) * 3; img[k] = c[0]; img[k + 1] = c[1]; img[k + 2] = c[2]; };
  const shade = (rgb: Float32Array, o: number, ink: number): number[] => { const a = Math.min(1, Math.max(0, ink)); if (rgb[3 * o] < 0) return [255, 255, 255].map((v) => Math.round(v * (1 - a))); return [0, 1, 2].map((q) => Math.round(255 * rgb[3 * o + q] * (1 - a))); };
  six.forEach((w, row) => {
    const scene = loadScene(w.nm); const st = O.structure(scene); const table = O.frame(st, scene);
    const fs = F.fillStructure(st, F.fillResolution(st, table)); const fr = F.fillFrame(fs, st, table, scene);
    const bfs = B.fillStructure(st, B.fillResolution(st, table)); const bfr = B.fillFrame(bfs, st, table, scene);
    const sp = sectionPaint(scene, "app", D.baseHueFor(w.nm)); const runs = F.fillRuns(fs, st, fr, sp);
    const lens = scene.chains.map((c) => { if (!c.closed) return 0; let L = 0; const n = c.pts.length >> 1; for (let i = 0; i < n; i++) { const j = (i + 1) % n; L += Math.hypot(c.pts[2 * j] - c.pts[2 * i], c.pts[2 * j + 1] - c.pts[2 * i + 1]); } return L; });
    const cw: JWin = { ji: w.ji, c0: Math.round(w.x * cppu - P / 2), r0: Math.round(w.y * cppu - P / 2), N: P, x: w.x, y: w.y };
    const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { ink: number; top: number; chain: number; s: number } };
    const n = P * P; const fw: FBW = { top: new Int32Array(n), chain: new Int32Array(n), ink: new Float32Array(n), s: new Float64Array(n) };
    for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) { const ev = fb.evalPoint((cw.c0 + c + 0.5) / cppu, (cw.r0 + r + 0.5) / cppu); const o = r * P + c; fw.top[o] = ev.top; fw.chain[o] = ev.top < 0 ? -1 : ev.chain; fw.s[o] = ev.s; fw.ink[o] = ev.ink; }
    const savedPpu = ppu; void savedPpu;
    const paintAtPpu = (f: Fill, p: Painter): Float32Array => {
      const win = { tri: new Int32Array(n).fill(-1), bary: new Float32Array(3 * n) };
      const own = F.rasterFill(f.fs, f.fr, cw.c0 / cppu, cw.r0 / cppu, P, P, cppu, win);
      const rgb = new Float32Array(3 * n).fill(-1); const c: RGB = [0, 0, 0];
      for (let o = 0; o < n; o++) { if (own[o] === 0 || win.tri[o] < 0) continue; if (!p(win.tri[o], [win.bary[3 * o], win.bary[3 * o + 1], win.bary[3 * o + 2]], c)) continue; rgb[3 * o] = c[0]; rgb[3 * o + 1] = c[1]; rgb[3 * o + 2] = c[2]; }
      return rgb;
    };
    const ref = paintFB(fw, sp, n);
    const am = paintAtPpu({ fs, fr }, minePainter({ fs, fr }, runs, sp));
    // --before: the middle column is src before stage 2 (8f7004bf), not master's old fill.
    let ab: Float32Array;
    if (flag("before")) { const fs0 = F0.fillStructure(st, F0.fillResolution(st, table)); const fr0 = F0.fillFrame(fs0, st, table, scene); const f0 = { fs: fs0, fr: fr0 } as unknown as Fill; ab = paintAtPpu(f0, minePainter(f0, F0.fillRuns(fs0, st, fr0, sp), sp)); }
    else ab = paintAtPpu({ fs: bfs as never, fr: bfr as never }, basePainter({ fs: bfs as never, fr: bfr as never }, sp, lens));
    const y = rScene(table, scene, D); y.faces = []; const band = rasterR(y, cw.c0, cw.r0, P, cppu);
    for (let o = 0; o < n; o++) { put(row, 0, o, shade(ref, o, fw.ink[o])); put(row, 1, o, shade(ab, o, band.ink[o])); put(row, 2, o, shade(am, o, band.ink[o])); }
    if (Number.isNaN(w.mine)) { w.mine = meanDiff(am, ref, n); w.base = meanDiff(ab, ref, n); }
    console.log(`crop row ${row}: ${w.nm} j${w.ji} (${w.x.toFixed(3)}, ${w.y.toFixed(3)}) mean diff vs form B: ${flag("before") ? "before" : "master"} ${(flag("before") ? meanDiff(ab, ref, n) : w.base).toFixed(1)}, mine ${meanDiff(am, ref, n).toFixed(1)}`);
  });
  writePng(join(cropDir, opt("cropname") ?? "k1278_worst_junctions.png"), img, Wt, Ht);
}

export function writePng(out: string, img: Uint8Array, Wt: number, Ht: number): void {
  const crcT = new Int32Array(256).map((_, m) => { let c = m; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b: Buffer): number => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t: string, d: Buffer): Buffer => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cb = Buffer.alloc(4); cb.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cb]); };
  const raw = Buffer.alloc((Wt * 3 + 1) * Ht); for (let r = 0; r < Ht; r++) { raw[r * (Wt * 3 + 1)] = 0; Buffer.from(img.buffer, img.byteOffset + r * Wt * 3, Wt * 3).copy(raw, r * (Wt * 3 + 1) + 1); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(Wt, 0); ih.writeUInt32BE(Ht, 4); ih[8] = 8; ih[9] = 2;
  writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
  console.log(`wrote ${out} (${Wt}x${Ht})`);
}
