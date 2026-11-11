// K1283 s7: the colour census against form B. Per junction of the 12 census scenes, a window of
// half size 3h about the junction's centre (k1278s2_seam.ts's windows; form B's chain / s / ink per
// pixel come from its cache, out/k1278/fb/<scene>_j<ppu>.bin), painted three ways with the app's
// section colours (paint.ts, "app" mode):
//   form B: its top chain's run colour at its s (paintFB, as the seam test);
//   before: src's outline.ts + fill_tri.ts at master 7c5cab34 (k1283s7_before_*), the fill's
//           triangles with their paint slots (rasterFill + vertexPaint + paintAt);
//   after:  src/render/outline/ (run through k1283_vite.config.mjs, or "./outline" etc. are the
//           prototype's).
// Per pixel covered in both (coverage is the census's job): the colour error, max channel |R - B|,
// with the census's 1 px tolerance err(p) = max(min_q |R(p) - B(q)|, min_q |B(p) - R(q)|), q in p's
// 3x3, weighed by how much of it shows, v = 1 - max(ink form B, ink outline) (the outline's ink from
// its border bands, rasterR). Scored per junction: sum of err * v (px) and the px whose err * v
// exceeds 10/255 ("visible"). A round end is a junction with an end arm.
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283s7_colour.ts <tag> [--scene=a,b] [--top=10] [--ppu=80]
// Writes out/k1283s7/colour_<tag>.json (per junction: scene, ji, x, y, end, before, after, visB, visA).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { FormB } from "../../../../src/render/field/form_b";
import * as O from "./outline";
import * as D from "./draw";
import * as F from "./fill_tri";
import * as BO from "./k1283s7_before_outline";
import * as BF from "./k1283s7_before_fill";
import { ALL, loadScene, rScene, rasterR } from "./k1279_census";
import { sectionPaint, runAt, runColour, paintAt, type SectionPaint, type RGB } from "./paint";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "k1283s7"); const fbDir = join(here, "..", "out", "k1278", "fb");
mkdirSync(outDir, { recursive: true });
const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const tag = pos[0] ?? "cur";
const scenes = opt("scene")?.split(",") ?? ALL;
const ppu = Number(opt("ppu") ?? 80);
const topN = Number(opt("top") ?? 10);
const pmode = (opt("mode") ?? "app") as "app" | "step" | "kink";
const VIS = 10 / 255;

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
    const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { ink: number; top: number; chain: number; s: number } };
    s = new Float64Array(total); top = new Int32Array(total); chain = new Int32Array(total); ink = new Float32Array(total);
    let o = 0;
    for (const w of wins) for (let r = 0; r < w.N; r++) for (let c = 0; c < w.N; c++) {
      const ev = fb.evalPoint((w.c0 + c + 0.5) / ppu, (w.r0 + r + 0.5) / ppu);
      top[o] = ev.top; chain[o] = ev.top < 0 ? -1 : ev.chain; s[o] = ev.s; ink[o] = Math.min(1, Math.max(0, ev.ink)); o++;
    }
    writeFileSync(file, Buffer.concat([Buffer.from(s.buffer), Buffer.from(top.buffer), Buffer.from(chain.buffer), Buffer.from(ink.buffer)]));
  }
  let o = 0;
  return wins.map((w) => { const n = w.N * w.N; const r = { top: top.subarray(o, o + n), chain: chain.subarray(o, o + n), ink: ink.subarray(o, o + n), s: s.subarray(o, o + n) }; o += n; return r; });
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

/** One candidate (before or after): its table, fill and paint, rastered per window. */
interface Cand { paintWin(w: JWin, pp?: number): Float32Array; inkWin(w: JWin, pp?: number): Float32Array; disk: Uint8Array }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cand(Om: any, Fm: any, scene: O.SceneIn, sp: SectionPaint): Cand {
  const st = Om.structure(scene); const t = Om.frame(st, scene);
  const fs = Fm.fillStructure(st, Fm.fillResolution(st, t)); const fr = Fm.fillFrame(fs, st, t, scene);
  const runs = Fm.fillRuns(fs, st, fr, sp) as Int32Array;
  const R = rScene(t, scene, D);
  const r4 = new Int32Array(4); const w4 = new Float64Array(4); const s4 = new Float64Array(4); const c: RGB = [0, 0, 0];
  const dV = new Uint8Array(fs.nV); for (const it of fs.items) if (it.kind === "disk") for (let v = it.base; v < it.base + 1 + F.DISK_R * F.DISK_M; v++) dV[v] = 1;
  const self = {
    disk: new Uint8Array(0),
    paintWin(w, pp = ppu) {
      const n = w.N * w.N; const win = { tri: new Int32Array(n).fill(-1), bary: new Float32Array(3 * n) };
      const own = Fm.rasterFill(fs, fr, w.c0 / pp, w.r0 / pp, w.N, w.N, pp, win) as Int32Array;
      const rgb = new Float32Array(3 * n).fill(-1); const I = fs.idx as Uint32Array; self.disk = new Uint8Array(n);
      for (let o = 0; o < n; o++) {
        const tr = win.tri[o]; if (own[o] === 0 || tr < 0) continue;
        if (dV[I[tr]]) self.disk[o] = 1;
        Fm.vertexPaint(fs, fr, runs, [I[tr], I[tr + 1], I[tr + 2]], [win.bary[3 * o], win.bary[3 * o + 1], win.bary[3 * o + 2]], r4, w4, s4);
        paintAt(sp, r4, w4, s4, c); rgb[3 * o] = c[0]; rgb[3 * o + 1] = c[1]; rgb[3 * o + 2] = c[2];
      }
      return rgb;
    },
    inkWin(w, pp = ppu) { return rasterR(R, w.c0, w.r0, w.N, pp).ink; },
  };
  return self;
}

const dist = (a: Float32Array, i: number, b: Float32Array, j: number): number => Math.max(Math.abs(a[3 * i] - b[3 * j]), Math.abs(a[3 * i + 1] - b[3 * j + 1]), Math.abs(a[3 * i + 2] - b[3 * j + 2]));
/** err * v summed (px) and the visible px count; also returns the per-pixel map when asked. */
function score(R: Float32Array, inkR: Float32Array, B: Float32Array, inkB: Float32Array, N: number, map?: Float32Array): [number, number] {
  let sum = 0; let vis = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const p = r * N + c; if (R[3 * p] < 0 || B[3 * p] < 0) continue;
    let eRB = Infinity; let eBR = Infinity;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr; const cc = c + dc; if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
      const q = rr * N + cc;
      if (B[3 * q] >= 0) eRB = Math.min(eRB, dist(R, p, B, q));
      if (R[3 * q] >= 0) eBR = Math.min(eBR, dist(B, p, R, q));
    }
    const e = Math.max(eRB, eBR) * (1 - Math.max(inkR[p], inkB[p]));
    if (map) map[p] = e;
    sum += e; if (e > VIS) vis++;
  }
  return [sum, vis];
}

function writePng(out: string, img: Uint8Array, Wt: number, Ht: number): void {
  const crcT = new Int32Array(256).map((_, m) => { let c = m; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b: Buffer): number => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t: string, d: Buffer): Buffer => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cb = Buffer.alloc(4); cb.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cb]); };
  const raw = Buffer.alloc((Wt * 3 + 1) * Ht); for (let r = 0; r < Ht; r++) { raw[r * (Wt * 3 + 1)] = 0; Buffer.from(img.buffer, img.byteOffset + r * Wt * 3, Wt * 3).copy(raw, r * (Wt * 3 + 1) + 1); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(Wt, 0); ih.writeUInt32BE(Ht, 4); ih[8] = 8; ih[9] = 2;
  writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}
// --crop=<out.png> --at=<scene>:<ji>[:label],... [--cppu=240] [--amp=8]: rows form B | before | after
// (painted, darkened by the ink) | after's colour error x amp (grey = 0) | where after is worse than before
// (red) or better (blue). Form B is evaluated fresh at cppu.
const cropOut = opt("crop");
if (cropOut) {
  const cppu = Number(opt("cppu") ?? 240); const amp = Number(opt("amp") ?? 8);
  const ats = (opt("at") ?? "").split(",").filter(Boolean).map((s) => { const [scene, ji, label] = s.split(":"); return { scene, ji: +ji, label }; });
  const cache = new Map<string, { scene: O.SceneIn; sp: SectionPaint; A: Cand; B: Cand; fb: { evalPoint(x: number, y: number): { ink: number; top: number; chain: number; s: number } } }>();
  const half = (sc: O.SceneIn): number => 3 * sc.look.halfWidth;
  let P = 0; for (const a of ats) { const sc = loadScene(a.scene); P = Math.max(P, Math.round(2 * half(sc) * cppu)); }
  const GAP = 6; const nPan = 5; const Wt = nPan * P + (nPan - 1) * GAP; const Ht = ats.length * P + (ats.length - 1) * GAP;
  const img = new Uint8Array(Wt * Ht * 3).fill(128);
  const put = (row: number, pan: number, o: number, N: number, col: [number, number, number]): void => { const r = Math.floor(o / N); const c = o % N; const q = ((row * (P + GAP) + r) * Wt + pan * (P + GAP) + c) * 3; img[q] = col[0]; img[q + 1] = col[1]; img[q + 2] = col[2]; };
  const sh = (rgb: Float32Array, o: number, ink: number): [number, number, number] => { const a = 1 - Math.min(1, Math.max(0, ink)); return rgb[3 * o] < 0 ? [Math.round(255 * a), Math.round(255 * a), Math.round(255 * a)] : [Math.round(255 * rgb[3 * o] * a), Math.round(255 * rgb[3 * o + 1] * a), Math.round(255 * rgb[3 * o + 2] * a)]; };
  ats.forEach((at, row) => {
    let e = cache.get(at.scene);
    if (!e) {
      const scene = loadScene(at.scene); const sp = sectionPaint(scene, pmode, D.baseHueFor(at.scene));
      e = { scene, sp, A: cand(O, F, scene, sp), B: cand(BO, BF, scene, sp), fb: new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as never };
      cache.set(at.scene, e);
    }
    const J = e.scene.junctions[at.ji]; const N = Math.round(2 * half(e.scene) * cppu);
    const w: JWin = { ji: at.ji, c0: Math.round((J.c[0] - half(e.scene)) * cppu), r0: Math.round((J.c[1] - half(e.scene)) * cppu), N, x: J.c[0], y: J.c[1] };
    const n = N * N; const fbw: FBW = { top: new Int32Array(n), chain: new Int32Array(n), ink: new Float32Array(n), s: new Float64Array(n) };
    for (let o = 0; o < n; o++) { const ev = e.fb.evalPoint((w.c0 + (o % N) + 0.5) / cppu, (w.r0 + Math.floor(o / N) + 0.5) / cppu); fbw.top[o] = ev.top; fbw.chain[o] = ev.top < 0 ? -1 : ev.chain; fbw.s[o] = ev.s; fbw.ink[o] = Math.min(1, Math.max(0, ev.ink)); }
    const ref = paintFB(fbw, e.sp, n);
    const pa = e.A.paintWin(w, cppu); const ia = e.A.inkWin(w, cppu); const pb = e.B.paintWin(w, cppu); const ib = e.B.inkWin(w, cppu);
    const ma = new Float32Array(n); const mb = new Float32Array(n);
    const [sa] = score(pa, ia, ref, fbw.ink, N, ma); const [sb] = score(pb, ib, ref, fbw.ink, N, mb);
    for (let o = 0; o < n; o++) {
      put(row, 0, o, N, sh(ref, o, fbw.ink[o])); put(row, 1, o, N, sh(pb, o, ib[o])); put(row, 2, o, N, sh(pa, o, ia[o]));
      const g = Math.min(1, ma[o] * amp); put(row, 3, o, N, [Math.round(255 * (1 - g)), Math.round(255 * (1 - g)), Math.round(255 * (1 - g))]);
      const d = (ma[o] - mb[o]) * amp; const wv = Math.min(1, Math.max(0, d)); const bv = Math.min(1, Math.max(0, -d));
      put(row, 4, o, N, [Math.round(255 * (1 - bv)), Math.round(255 * (1 - wv - bv)), Math.round(255 * (1 - wv))]);
    }
    const k = (cppu / ppu) ** 2;
    console.log(`${at.label ?? ""} ${at.scene} j${at.ji} (${J.c[0].toFixed(3)}, ${J.c[1].toFixed(3)}): colour err*v before ${(sb / k).toFixed(1)} after ${(sa / k).toFixed(1)} (px at ${ppu} ppu)`);
  });
  writePng(cropOut, img, Wt, Ht);
  console.log(`wrote ${cropOut} (${Wt}x${Ht})`);
  process.exit(0);
}

interface Row { scene: string; ji: number; x: number; y: number; end: boolean; before: number; after: number; visB: number; visA: number; dB: number; dA: number; nB: number; nA: number; eB: number; eA: number; eN: number; hN: number }
const rows: Row[] = [];
for (const nm of scenes) {
  const t0 = Date.now();
  const scene = loadScene(nm);
  const sp = sectionPaint(scene, pmode, D.baseHueFor(nm));
  const st = O.structure(scene);
  const endJ = new Set<number>(); st.arms.forEach((a) => { if (a.kind === "end") endJ.add(a.ji); });
  const wins = jWindows(scene); const fbw = formBJ(nm, scene, wins);
  const A = cand(O, F, scene, sp); const Bc = cand(BO, BF, scene, sp);
  let sB = 0; let sA = 0; let vB = 0; let vA = 0;
  wins.forEach((w, k) => {
    const n = w.N * w.N; const ref = paintFB(fbw[k], sp, n); const inkF = fbw[k].ink;
    const mB = new Float32Array(n); const mA = new Float32Array(n);
    const [b, vb] = score(Bc.paintWin(w), Bc.inkWin(w), ref, inkF, w.N, mB);
    const [a, va] = score(A.paintWin(w), A.inkWin(w), ref, inkF, w.N, mA);
    let dB = 0; let dA = 0; for (let o = 0; o < n; o++) if (Bc.disk[o] || A.disk[o]) { dB += mB[o]; dA += mA[o]; }
    let nB = 0; let nA = 0; const hh = scene.look.halfWidth; let eB = 0; let eA = 0; let eN = 0; let hN = 0;
    const ec = new Set<number>(); for (const ar of scene.junctions[w.ji].arms) if (ar.kind === "end") ec.add(ar.chain);
    for (let r = 0; r < w.N; r++) for (let cc = 0; cc < w.N; cc++) {
      const px = (w.c0 + cc + 0.5) / ppu - w.x; const py = (w.r0 + r + 0.5) / ppu - w.y; if (px * px + py * py >= hh * hh) continue;
      const o = r * w.N + cc; nB += mB[o]; nA += mA[o];
      if (fbw[k].top[o] < 0) continue; hN++;
      if (ec.has(fbw[k].chain[o])) { eN++; eB += mB[o]; eA += mA[o]; }
    }
    rows.push({ scene: nm, ji: w.ji, x: w.x, y: w.y, end: endJ.has(w.ji), before: b, after: a, visB: vb, visA: va, dB, dA, nB, nA, eB, eA, eN, hN });
    sB += b; sA += a; vB += vb; vA += va;
  });
  console.log(`${nm}: ${wins.length} junctions (${endJ.size} round ends): colour err*v before ${sB.toFixed(0)} after ${sA.toFixed(0)} px; visible px before ${vB} after ${vA} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
const tot = (f: (r: Row) => boolean): string => { const R = rows.filter(f); return `${R.length} junctions: err*v before ${R.reduce((s, r) => s + r.before, 0).toFixed(0)} after ${R.reduce((s, r) => s + r.after, 0).toFixed(0)} px; visible px before ${R.reduce((s, r) => s + r.visB, 0)} after ${R.reduce((s, r) => s + r.visA, 0)}`; };
console.log(`ALL ${tot(() => true)}`);
console.log(`ROUND ENDS ${tot((r) => r.end)}`);
console.log(`DISK PIXELS (top triangle a round end's, before or after): err*v before ${rows.reduce((s, r) => s + r.dB, 0).toFixed(0)} after ${rows.reduce((s, r) => s + r.dA, 0).toFixed(0)} px; within h of a round end's centre: before ${rows.filter((r) => r.end).reduce((s, r) => s + r.nB, 0).toFixed(0)} after ${rows.filter((r) => r.end).reduce((s, r) => s + r.nA, 0).toFixed(0)} px`);
const ends0 = rows.filter((r) => r.end);
console.log(`within h of a round end: ${ends0.reduce((s, r) => s + r.hN, 0)} form B px, ${ends0.reduce((s, r) => s + r.eN, 0)} show the end chain; err*v there before ${ends0.reduce((s, r) => s + r.eB, 0).toFixed(0)} after ${ends0.reduce((s, r) => s + r.eA, 0).toFixed(0)} px; end chain px better ${ends0.filter((r) => r.eA < r.eB - 0.5).length}, worse ${ends0.filter((r) => r.eA > r.eB + 0.5).length}`); console.log(`within h: round ends better ${ends0.filter((r) => r.nA < r.nB - 0.5).length}, worse ${ends0.filter((r) => r.nA > r.nB + 0.5).length} (by > 0.5 px)`);
console.log(`OTHER ${tot((r) => !r.end)}`);
const ends = rows.filter((r) => r.end);
const better = ends.filter((r) => r.after < r.before - 1).length; const worse = ends.filter((r) => r.after > r.before + 1);
console.log(`round ends: ${better} better, ${worse.length} worse by > 1 px (visible px worse: ${ends.filter((r) => r.visA > r.visB).length})`);
const fmt = (r: Row): string => `${r.scene} j${r.ji} (${r.x.toFixed(3)}, ${r.y.toFixed(3)})${r.end ? " end" : ""} ${r.before.toFixed(1)} -> ${r.after.toFixed(1)} (vis ${r.visB} -> ${r.visA}; disk ${r.dB.toFixed(1)} -> ${r.dA.toFixed(1)}; in h ${r.nB.toFixed(1)} -> ${r.nA.toFixed(1)}; end px ${r.eN}/${r.hN} ${r.eB.toFixed(1)} -> ${r.eA.toFixed(1)})`;
console.log(`worst ${topN} round ends on the end chain's px after:`); for (const r of [...rows].filter((r) => r.end).sort((a, b) => b.eA - a.eA).slice(0, topN)) console.log(`  ${fmt(r)}`);
console.log(`worst ${topN} round ends within h after:`); for (const r of [...rows].filter((r) => r.end).sort((a, b) => b.nA - a.nA).slice(0, topN)) console.log(`  ${fmt(r)}`);
console.log(`worst ${topN} round ends by disk err after:`); for (const r of [...rows].filter((r) => r.end).sort((a, b) => b.dA - a.dA).slice(0, topN)) console.log(`  ${fmt(r)}`);
console.log(`worst ${topN} round ends after:`); for (const r of [...ends].sort((a, b) => b.after - a.after).slice(0, topN)) console.log(`  ${fmt(r)}`);
console.log(`worst ${topN} junctions after:`); for (const r of [...rows].sort((a, b) => b.after - a.after).slice(0, topN)) console.log(`  ${fmt(r)}`);
console.log(`most worse (after - before):`); for (const r of [...rows].sort((a, b) => b.after - b.before - (a.after - a.before)).slice(0, topN)) console.log(`  ${fmt(r)}`);
writeFileSync(join(outDir, `colour_${tag}.json`), JSON.stringify(rows));
