// K1279: the crossing census against form B. For every crossing of the 12
// scenes, a window around the crossing point (half size h·min(7, 1.25 +
// 1/sin θ), θ the crossing angle, so a shallow crossing's long overlap and
// its tie fade fit) is sampled at <ppu> px/unit:
//   form B (cached per scene in out/k1279/fb/): ink, top surface, chain;
//   the redesign (outline.ts + draw.ts, or the f0c1111c snapshots with
//   --base): the faces filled in table order (even-odd per face, holes and
//   ownerless faces skipped, as draw.ts's stencil does) and the border
//   bands composited over them with their alpha (bandAlpha, 1 when absent).
// Per pixel, a difference that a 1 px shift or an antialiased edge explains is free:
//   err(p) = max(dist(R(p), range_q B(q)), dist(B(p), range_q R(q))), q in p's 3x3.
// Scored per crossing: ink (the ink values), fill (covered vs paper) and
// thread (both covered, the redesign's owner chain is not form B's top
// chain anywhere in the 3x3), each summed in px; total = ink + fill (thread is
// reported apart: near junctions it measures the face colouring, not the
// crossing). A crossing "differs" when total > --tol (default 12 px).
// Usage (from the worktree root):
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1279_census.ts <tag> [--base] [--ppu=80] [--scene=<filter>] [--top=25] [--tol=12]
// Writes out/k1279/census_<tag>.json (per crossing: scene, xi, x, y, R, θ, ink, fill, thread, total).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import * as curO from "./outline";
import * as curD from "./draw";
import * as baseO from "./k1279_base_outline";
import * as baseD from "./k1279_base_draw";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const flag = (k: string): boolean => args.includes(`--${k}`);
const tag = pos[0] ?? "cur";
const useBase = flag("base");
const ppu = Number(opt("ppu") ?? 80);
const filt = opt("scene");
const topN = Number(opt("top") ?? 25);
const tol = Number(opt("tol") ?? 12);
const O = (useBase ? baseO : curO) as typeof curO;
const D = (useBase ? baseD : curD) as unknown as typeof curD;
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
export const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const outDir = join(here, "..", "out", "k1279"); const fbDir = join(outDir, "fb"); mkdirSync(fbDir, { recursive: true });

export interface Win { xi: number; x: number; y: number; R: number; theta: number; c0: number; r0: number; N: number; mask: Uint8Array }

function chainPt(pts: number[], closed: boolean, s: number): { x: number; y: number; tx: number; ty: number } {
  const n = pts.length >> 1; const segs = closed ? n : n - 1;
  let L = 0; for (let i = 0; i < segs; i++) { const j = (i + 1) % n; L += Math.hypot(pts[2 * j] - pts[2 * i], pts[2 * j + 1] - pts[2 * i + 1]); }
  let u = s; if (closed && L > 0) u = ((u % L) + L) % L;
  let acc = 0;
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n; const l = Math.hypot(pts[2 * j] - pts[2 * i], pts[2 * j + 1] - pts[2 * i + 1]);
    if (acc + l >= u || i === segs - 1) {
      const t = l > 0 ? Math.min(1, Math.max(0, (u - acc) / l)) : 0;
      return { x: pts[2 * i] + (pts[2 * j] - pts[2 * i]) * t, y: pts[2 * i + 1] + (pts[2 * j + 1] - pts[2 * i + 1]) * t, tx: l > 0 ? (pts[2 * j] - pts[2 * i]) / l : 1, ty: l > 0 ? (pts[2 * j + 1] - pts[2 * i + 1]) / l : 0 };
    }
    acc += l;
  }
  return { x: pts[0], y: pts[1], tx: 1, ty: 0 };
}

export function loadScene(nm: string): curO.SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${nm}.json`), "utf8"));
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}

export function windowsOf(scene: curO.SceneIn, ppuW: number): Win[] {
  const h = scene.look.halfWidth;
  const idx = new Map<number, number>(); scene.chains.forEach((c, i) => idx.set(c.id, i));
  const res: Win[] = [];
  scene.crossings.forEach((x, xi) => {
    const ca = scene.chains[idx.get(x.a.chain)!]; const cb = scene.chains[idx.get(x.b.chain)!];
    if (!ca || !cb) return;
    const A = chainPt(ca.pts, ca.closed, x.a.s); const B = chainPt(cb.pts, cb.closed, x.b.s);
    const sin = Math.abs(A.tx * B.ty - A.ty * B.tx);
    const R = h * Math.min(7, 1.25 + 1 / Math.max(sin, 1e-3));
    const cx = (A.x + B.x) / 2; const cy = (A.y + B.y) / 2;
    const N = 2 * Math.round(R * ppuW);
    const c0 = Math.round(cx * ppuW) - N / 2; const r0 = Math.round(cy * ppuW) - N / 2;
    // The crossing's own pixels: within 1.25 h of either pass (its chain within
    // +-3R of the crossing's s), minus within 1.1 h of any other thread (another
    // chain, or the same chain farther along: junctions, neighbours).
    const own = new Uint8Array(N * N); const other = new Uint8Array(N * N);
    const keep = (ci: number, s: number): boolean => { const xa = x.a.chain === scene.chains[ci].id && Math.abs(s - x.a.s) <= 3 * R; const xb = x.b.chain === scene.chains[ci].id && Math.abs(s - x.b.s) <= 3 * R; return xa || xb; };
    scene.chains.forEach((ch, ci) => {
      const pts = ch.pts; const n = pts.length >> 1; const segs = ch.closed ? n : n - 1;
      let Lc = 0; for (let i = 0; i < segs; i++) { const j = (i + 1) % n; Lc += Math.hypot(pts[2 * j] - pts[2 * i], pts[2 * j + 1] - pts[2 * i + 1]); }
      let acc = 0;
      for (let i = 0; i < segs; i++) {
        const j = (i + 1) % n; const ax = pts[2 * i]; const ay = pts[2 * i + 1]; const bx = pts[2 * j]; const by = pts[2 * j + 1];
        const l = Math.hypot(bx - ax, by - ay); const sm = acc + l / 2; acc += l;
        let isOwn = keep(ci, sm); if (!isOwn && ch.closed) isOwn = keep(ci, sm - Lc) || keep(ci, sm + Lc);
        const rad = (isOwn ? 1.25 : 1.1) * h; const tgt = isOwn ? own : other;
        const pc0 = Math.max(0, Math.floor((Math.min(ax, bx) - rad) * ppuW) - c0); const pc1 = Math.min(N - 1, Math.ceil((Math.max(ax, bx) + rad) * ppuW) - c0);
        const pr0 = Math.max(0, Math.floor((Math.min(ay, by) - rad) * ppuW) - r0); const pr1 = Math.min(N - 1, Math.ceil((Math.max(ay, by) + rad) * ppuW) - r0);
        if (pc0 > pc1 || pr0 > pr1) continue;
        const ex = bx - ax; const ey = by - ay; const l2 = ex * ex + ey * ey || 1e-12;
        for (let r = pr0; r <= pr1; r++) for (let c = pc0; c <= pc1; c++) {
          const px = (c0 + c + 0.5) / ppuW; const py = (r0 + r + 0.5) / ppuW;
          const t = Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey) / l2));
          if (Math.hypot(px - ax - t * ex, py - ay - t * ey) <= rad) tgt[r * N + c] = 1;
        }
      }
    });
    const mask = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) mask[i] = own[i] && !other[i] ? 1 : 0;
    res.push({ xi, x: cx, y: cy, R, theta: (Math.asin(Math.min(1, sin)) * 180) / Math.PI, c0, r0, N, mask });
  });
  return res;
}

export interface FBWin { ink: Float32Array; top: Int32Array; chain: Int32Array }
export function formBWindows(nm: string, scene: curO.SceneIn, wins: Win[], ppuW: number): FBWin[] {
  const file = join(fbDir, `${nm}_${ppuW}.bin`);
  const total = wins.reduce((s, w) => s + w.N * w.N, 0);
  if (existsSync(file)) {
    const b = readFileSync(file);
    if (b.length === 12 * total) {
      const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
      const ink = new Float32Array(ab, 0, total); const top = new Int32Array(ab, 4 * total, total); const chain = new Int32Array(ab, 8 * total, total);
      let o = 0; return wins.map((w) => { const n = w.N * w.N; const r = { ink: ink.subarray(o, o + n), top: top.subarray(o, o + n), chain: chain.subarray(o, o + n) }; o += n; return r; });
    }
  }
  const t0 = Date.now();
  const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { ink: number; top: number; chain: number } };
  const ink = new Float32Array(total); const top = new Int32Array(total); const chain = new Int32Array(total);
  let o = 0;
  for (const w of wins) {
    for (let r = 0; r < w.N; r++) for (let c = 0; c < w.N; c++) {
      const ev = fb.evalPoint((w.c0 + c + 0.5) / ppuW, (w.r0 + r + 0.5) / ppuW);
      ink[o] = Math.min(1, Math.max(0, ev.ink)); top[o] = ev.top; chain[o] = ev.top < 0 ? -1 : ev.chain; o++;
    }
  }
  writeFileSync(file, Buffer.concat([Buffer.from(ink.buffer), Buffer.from(top.buffer), Buffer.from(chain.buffer)]));
  console.error(`${nm}: form B ${total} px in ${wins.length} windows, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  o = 0; return wins.map((w) => { const n = w.N * w.N; const r = { ink: ink.subarray(o, o + n), top: top.subarray(o, o + n), chain: chain.subarray(o, o + n) }; o += n; return r; });
}

// The redesign's raster: faces (owner chain, -1 paper) then bands (ink 0..1).
export interface RScene { faces: { owner: number; pts: number[]; x0: number; y0: number; x1: number; y1: number }[]; tri: Float64Array; triA: Float64Array; nTri: number; tb: Float64Array }
export function rScene(table: curO.OutlineTable, scene: curO.SceneIn, Dm: typeof curD): RScene {
  const faces = table.faces.filter((f) => !f.hole && f.ownerChain >= 0 && f.pts.length >= 6).map((f) => {
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (let i = 0; i < f.pts.length; i += 2) { x0 = Math.min(x0, f.pts[i]); x1 = Math.max(x1, f.pts[i]); y0 = Math.min(y0, f.pts[i + 1]); y1 = Math.max(y1, f.pts[i + 1]); }
    return { owner: f.ownerChain, pts: Array.from(f.pts), x0, y0, x1, y1 };
  });
  const dd = Dm.buildDrawData(table, scene) as curD.DrawData & { bandAlpha?: Float32Array };
  const nTri = dd.bandCount / 3;
  const tri = new Float64Array(nTri * 6); const triA = new Float64Array(nTri * 3); const tb = new Float64Array(nTri * 4);
  for (let t = 0; t < nTri; t++) {
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (let k = 0; k < 3; k++) {
      const x = dd.bandPos[6 * t + 2 * k]; const y = dd.bandPos[6 * t + 2 * k + 1];
      tri[6 * t + 2 * k] = x; tri[6 * t + 2 * k + 1] = y; triA[3 * t + k] = dd.bandAlpha ? dd.bandAlpha[3 * t + k] : 1;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    tb[4 * t] = x0; tb[4 * t + 1] = y0; tb[4 * t + 2] = x1; tb[4 * t + 3] = y1;
  }
  return { faces, tri, triA, nTri, tb };
}

export function rasterR(R: RScene, c0: number, r0: number, N: number, ppuW: number): { ink: Float32Array; own: Int32Array } {
  const own = new Int32Array(N * N).fill(-1); const ink = new Float32Array(N * N);
  const wx0 = c0 / ppuW; const wy0 = r0 / ppuW; const wx1 = (c0 + N) / ppuW; const wy1 = (r0 + N) / ppuW;
  const xs: number[] = [];
  for (const f of R.faces) {
    if (f.x1 < wx0 || f.x0 > wx1 || f.y1 < wy0 || f.y0 > wy1) continue;
    const n = f.pts.length / 2;
    const ra = Math.max(0, Math.floor(f.y0 * ppuW - r0 - 1)); const rb = Math.min(N - 1, Math.ceil(f.y1 * ppuW - r0 + 1));
    for (let r = ra; r <= rb; r++) {
      const y = (r0 + r + 0.5) / ppuW; xs.length = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n; const ay = f.pts[2 * i + 1]; const by = f.pts[2 * j + 1];
        if ((ay <= y) !== (by <= y)) { const ax = f.pts[2 * i]; const bx = f.pts[2 * j]; xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax)); }
      }
      xs.sort((u, v) => u - v);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const ca = Math.max(0, Math.ceil(xs[k] * ppuW - c0 - 0.5)); const cb = Math.min(N - 1, Math.floor(xs[k + 1] * ppuW - c0 - 0.5));
        for (let c = ca; c <= cb; c++) own[r * N + c] = f.owner;
      }
    }
  }
  const T = R.tri; const A = R.triA;
  for (let t = 0; t < R.nTri; t++) {
    if (R.tb[4 * t + 2] < wx0 || R.tb[4 * t] > wx1 || R.tb[4 * t + 3] < wy0 || R.tb[4 * t + 1] > wy1) continue;
    const ax = T[6 * t]; const ay = T[6 * t + 1]; const bx = T[6 * t + 2]; const by = T[6 * t + 3]; const cx = T[6 * t + 4]; const cy = T[6 * t + 5];
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (!(Math.abs(den) > 1e-18)) continue;
    const ca = Math.max(0, Math.floor(R.tb[4 * t] * ppuW - c0 - 0.5)); const cb = Math.min(N - 1, Math.ceil(R.tb[4 * t + 2] * ppuW - c0 - 0.5));
    const ra = Math.max(0, Math.floor(R.tb[4 * t + 1] * ppuW - r0 - 0.5)); const rb = Math.min(N - 1, Math.ceil(R.tb[4 * t + 3] * ppuW - r0 - 0.5));
    for (let r = ra; r <= rb; r++) {
      const y = (r0 + r + 0.5) / ppuW;
      for (let c = ca; c <= cb; c++) {
        const x = (c0 + c + 0.5) / ppuW;
        const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den; const l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den; const l3 = 1 - l1 - l2;
        if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
        const a = Math.min(1, Math.max(0, l1 * A[3 * t] + l2 * A[3 * t + 1] + l3 * A[3 * t + 2]));
        const i = r * N + c; ink[i] = 1 - (1 - ink[i]) * (1 - a);
      }
    }
  }
  return { ink, own };
}

function tolErr(N: number, Rv: (i: number) => number, Bv: (i: number) => number, mask: Uint8Array): number {
  let sum = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const i = r * N + c; if (!mask[i]) continue; const rp = Rv(i); const bp = Bv(i);
    let bLo = Infinity; let bHi = -Infinity; let rLo = Infinity; let rHi = -Infinity;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr; const cc = c + dc; if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
      const j = rr * N + cc; const bv = Bv(j); const rv = Rv(j);
      if (bv < bLo) bLo = bv; if (bv > bHi) bHi = bv; if (rv < rLo) rLo = rv; if (rv > rHi) rHi = rv;
    }
    // A value inside the other image's 3x3 range (an antialiased edge, a 1 px shift) is free.
    sum += Math.max(Math.max(0, bLo - rp, rp - bHi), Math.max(0, rLo - bp, bp - rHi));
  }
  return sum;
}

export interface Row { scene: string; xi: number; x: number; y: number; R: number; theta: number; ink: number; fill: number; thread: number; total: number }
export function scoreWin(w: Win, fbw: FBWin, rr: { ink: Float32Array; own: Int32Array }): { ink: number; fill: number; thread: number } {
  const N = w.N;
  const ink = tolErr(N, (i) => rr.ink[i], (i) => fbw.ink[i], w.mask);
  const fill = tolErr(N, (i) => (rr.own[i] >= 0 ? 1 : 0), (i) => (fbw.top[i] >= 0 ? 1 : 0), w.mask);
  let thread = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const i = r * N + c; if (!w.mask[i] || rr.own[i] < 0 || fbw.top[i] < 0) continue;
    let ok = false;
    for (let dr = -1; dr <= 1 && !ok; dr++) for (let dc = -1; dc <= 1; dc++) {
      const r2 = r + dr; const c2 = c + dc; if (r2 < 0 || r2 >= N || c2 < 0 || c2 >= N) continue;
      const j = r2 * N + c2; if (fbw.top[j] >= 0 && fbw.chain[j] === rr.own[i]) { ok = true; break; }
    }
    if (!ok) thread++;
  }
  return { ink, fill, thread };
}

async function main(): Promise<void> {
  const rows: Row[] = [];
  const t0 = Date.now();
  for (const nm of ALL) {
    if (filt && !nm.includes(filt)) continue;
    const scene = loadScene(nm);
    const wins = windowsOf(scene, ppu);
    const fbw = formBWindows(nm, scene, wins, ppu);
    const table = O.frame(O.structure(scene), scene);
    const R = rScene(table as curO.OutlineTable, scene, D);
    let sum = 0; let nDiff = 0;
    wins.forEach((w, k) => {
      const rr = rasterR(R, w.c0, w.r0, w.N, ppu);
      const s = scoreWin(w, fbw[k], rr);
      const total = s.ink + s.fill;
      sum += total; if (total > tol) nDiff++;
      rows.push({ scene: nm, xi: w.xi, x: +w.x.toFixed(3), y: +w.y.toFixed(3), R: +w.R.toFixed(3), theta: +w.theta.toFixed(1), ink: +s.ink.toFixed(1), fill: +s.fill.toFixed(1), thread: s.thread, total: +total.toFixed(1) });
    });
    console.log(`${nm}: ${wins.length} crossings, ${nDiff} differ (> ${tol} px), total ${sum.toFixed(0)} px`);
  }
  rows.sort((a, b) => b.total - a.total);
  const nDiff = rows.filter((r) => r.total > tol).length;
  console.log(`ALL: ${rows.length} crossings, ${nDiff} differ, total ${rows.reduce((s, r) => s + r.total, 0).toFixed(0)} px (ink ${rows.reduce((s, r) => s + r.ink, 0).toFixed(0)}, fill ${rows.reduce((s, r) => s + r.fill, 0).toFixed(0)}, thread ${rows.reduce((s, r) => s + r.thread, 0)}), ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  console.log(`worst ${topN}:`);
  for (const r of rows.slice(0, topN)) console.log(`  ${r.scene} x${r.xi} (${r.x}, ${r.y}) θ ${r.theta}° R ${r.R}: total ${r.total} = ink ${r.ink} + fill ${r.fill} (thread ${r.thread})`);
  const suffix = filt ? `_${filt}` : "";
  writeFileSync(join(outDir, `census_${tag}${suffix}.json`), JSON.stringify({ tag, base: useBase, ppu, tol, rows }));
  // --vs=<tag>: per crossing against another census (same filter); worse = total
  // over the other's by more than 1 px.
  const vs = opt("vs");
  if (vs) {
    const other = JSON.parse(readFileSync(join(outDir, `census_${vs}${suffix}.json`), "utf8")) as { rows: Row[] };
    const om = new Map(other.rows.map((r) => [`${r.scene}|${r.xi}`, r]));
    const d = rows.map((r) => ({ r, o: om.get(`${r.scene}|${r.xi}`)! })).filter((e) => e.o);
    const worse = d.filter((e) => e.r.total > e.o.total + 1).sort((a, b) => (b.r.total - b.o.total) - (a.r.total - a.o.total));
    const better = d.filter((e) => e.r.total < e.o.total - 1);
    console.log(`vs ${vs}: ${worse.length} worse (> +1 px), ${better.length} better, ${d.length - worse.length - better.length} same; total ${d.reduce((s, e) => s + e.r.total, 0).toFixed(0)} vs ${d.reduce((s, e) => s + e.o.total, 0).toFixed(0)}`);
    for (const e of worse.slice(0, topN)) console.log(`  worse ${e.r.scene} x${e.r.xi} (${e.r.x}, ${e.r.y}) θ ${e.r.theta}°: ${e.o.total} -> ${e.r.total} (ink ${e.o.ink} -> ${e.r.ink}, fill ${e.o.fill} -> ${e.r.fill})`);
  }
}
if (process.argv[1] && process.argv[1].includes("k1279_census")) await main();
