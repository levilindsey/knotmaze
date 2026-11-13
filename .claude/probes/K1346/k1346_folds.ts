// K1346 s1: the fold detector. Finds every place where one piece's band triangles (bandData's, as the census
// rasters them; all three band builders share the quad rule) or one fill item's triangles (fs.idx over fr.pos)
// overlap each other: a fold back (opposite winding), a retrace, or any spot one piece inks twice. The overlap is
// exact (convex clipping of every bbox-meeting triangle pair inside the piece or item), clustered into folds by
// union-find, and reported in px at --ppu (default 960): raw area, and area weighted by the smaller of the two
// triangles' mean band alpha (aw, a visibility hint only; the bar is raw px).
//   node scripts/run_node.mjs .claude/probes/K1346/k1346_folds.ts [scene,scene...] [--ppu=960] [--min=0]
//        [--top=12] [--out=<json>] [--spots=<file>] [--nofill] [--noband]
//        Folds = opposite-winding overlap inside one band piece (the app's quads) or one fill TAIL item; --raw counts
//        every overlap, --allfill adds the fill's junc/strip items (opaque, depth-keyed: they overlap by design).
// Prints per scene: band folds and fill folds (count over 1 px, total px), then the largest; --out writes every
// fold; --spots writes the top folds as crop spots (scene:x:y:label,...) for k1344_crops.ts.
import { writeFileSync } from "node:fs";
import { buildModel, ALL, type Model } from "../K1314/k1314_census";
import * as F from "../../../src/render/outline/fill_tri";

const a = process.argv.slice(2);
const opt = (k: string): string | undefined => a.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
const names = a[0] && !a[0].startsWith("--") ? a[0].split(",") : ALL;
const PPU = Number(opt("ppu") ?? 960); const PX = PPU * PPU; const MIN = Number(opt("min") ?? 0); const TOP = Number(opt("top") ?? 12);
const DBG = opt("piece") === undefined ? -2 : Number(opt("piece")); const BD = a.includes("--bd"); const SRC = opt("src"); const KINDS = opt("kinds")?.split(","); const OPP = !a.includes("--raw"); const ALLFILL = a.includes("--allfill");
const EPS = 1e-13; // world^2 per pair (about 1e-7 px at 960 ppu): shared edges clip to ~0

export interface Fold { scene: string; src: "band" | "fill"; owner: number; kind: string; chain: number; corner: number; side: number; px: number; opp: number; aw: number; x: number; y: number; bbox: number[]; tris: number }

/** Area and centroid of triangle A (6 numbers) clipped by triangle B. */
function clip(A: ArrayLike<number>, ao: number, B: ArrayLike<number>, bo: number): { ar: number; cx: number; cy: number } {
  let P: number[] = [A[ao], A[ao + 1], A[ao + 2], A[ao + 3], A[ao + 4], A[ao + 5]];
  const sA = (P[2] - P[0]) * (P[5] - P[1]) - (P[3] - P[1]) * (P[4] - P[0]);
  if (sA < 0) P = [P[0], P[1], P[4], P[5], P[2], P[3]];
  let C = [B[bo], B[bo + 1], B[bo + 2], B[bo + 3], B[bo + 4], B[bo + 5]];
  const sB = (C[2] - C[0]) * (C[5] - C[1]) - (C[3] - C[1]) * (C[4] - C[0]);
  if (sB < 0) C = [C[0], C[1], C[4], C[5], C[2], C[3]];
  if (sA === 0 || sB === 0) return { ar: 0, cx: 0, cy: 0 };
  for (let e = 0; e < 3 && P.length >= 6; e++) {
    const ex = C[2 * e]; const ey = C[2 * e + 1]; const fx = C[(2 * e + 2) % 6]; const fy = C[(2 * e + 3) % 6];
    const side = (x: number, y: number): number => (fx - ex) * (y - ey) - (fy - ey) * (x - ex);
    const Q: number[] = []; const n = P.length / 2;
    for (let i = 0; i < n; i++) {
      const x0 = P[2 * i]; const y0 = P[2 * i + 1]; const j = (i + 1) % n; const x1 = P[2 * j]; const y1 = P[2 * j + 1];
      const d0 = side(x0, y0); const d1 = side(x1, y1);
      if (d0 >= 0) Q.push(x0, y0);
      if ((d0 >= 0) !== (d1 >= 0)) { const t = d0 / (d0 - d1); Q.push(x0 + t * (x1 - x0), y0 + t * (y1 - y0)); }
    }
    P = Q;
  }
  const n = P.length / 2; if (n < 3) return { ar: 0, cx: 0, cy: 0 };
  let ar = 0; let cx = 0; let cy = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; const c = P[2 * i] * P[2 * j + 1] - P[2 * j] * P[2 * i + 1]; ar += c; cx += (P[2 * i] + P[2 * j]) * c; cy += (P[2 * i + 1] + P[2 * j + 1]) * c; }
  ar /= 2; if (Math.abs(ar) < 1e-30) return { ar: 0, cx: 0, cy: 0 };
  return { ar: Math.abs(ar), cx: cx / (6 * ar), cy: cy / (6 * ar) };
}

/** Folds among triangles grouped by owner: T (6 per tri), owner per tri, weight per tri (mean alpha). */
type Raw = { owner: number; px: number; opp: number; aw: number; x: number; y: number; bbox: number[]; tris: number };
function foldsOf(T: Float64Array, own: Int32Array, wt: Float32Array, nT: number): Raw[] {
  const by = new Map<number, number[]>();
  for (let t = 0; t < nT; t++) { if (own[t] < 0) continue; let l = by.get(own[t]); if (!l) by.set(own[t], (l = [])); l.push(t); }
  const out: Raw[] = [];
  const sg = (t: number): number => Math.sign((T[6 * t + 2] - T[6 * t]) * (T[6 * t + 5] - T[6 * t + 1]) - (T[6 * t + 3] - T[6 * t + 1]) * (T[6 * t + 4] - T[6 * t]));
  const bx = (t: number, k: number): number => k === 0 ? Math.min(T[6 * t], T[6 * t + 2], T[6 * t + 4]) : k === 1 ? Math.min(T[6 * t + 1], T[6 * t + 3], T[6 * t + 5]) : k === 2 ? Math.max(T[6 * t], T[6 * t + 2], T[6 * t + 4]) : Math.max(T[6 * t + 1], T[6 * t + 3], T[6 * t + 5]);
  for (const [ow, l] of by) {
    const bb = l.map((t) => [bx(t, 0), bx(t, 1), bx(t, 2), bx(t, 3)]);
    const ord = l.map((_, i) => i).sort((p, q) => bb[p][0] - bb[q][0]);
    const par = l.map((_, i) => i); const find = (i: number): number => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    const pairs: { i: number; j: number; ar: number; cx: number; cy: number }[] = [];
    for (let oi = 0; oi < ord.length; oi++) {
      const i = ord[oi];
      for (let oj = oi + 1; oj < ord.length && bb[ord[oj]][0] <= bb[i][2]; oj++) {
        const j = ord[oj];
        if (bb[j][1] > bb[i][3] || bb[j][3] < bb[i][1]) continue;
        const c = clip(T, 6 * l[i], T, 6 * l[j]);
        if (c.ar <= EPS) continue;
        pairs.push({ i, j, ...c }); par[find(i)] = find(j);
        if (DBG === ow) console.log(`  pair t${l[i] - l[0]} t${l[j] - l[0]} ${(c.ar * PX).toFixed(1)} px signs ${sg(l[i])} ${sg(l[j])} at (${c.cx.toFixed(4)}, ${c.cy.toFixed(4)})`);
      }
    }
    const cl = new Map<number, { ar: number; op: number; aw: number; cx: number; cy: number; b: number[]; ts: Set<number> }>();
    for (const p of pairs) {
      const r = find(p.i); let c = cl.get(r); if (!c) cl.set(r, (c = { ar: 0, op: 0, aw: 0, cx: 0, cy: 0, b: [Infinity, Infinity, -Infinity, -Infinity], ts: new Set() }));
      c.ar += p.ar; if (sg(l[p.i]) !== sg(l[p.j])) c.op += p.ar; c.aw += p.ar * Math.min(wt[l[p.i]], wt[l[p.j]]); c.cx += p.cx * p.ar; c.cy += p.cy * p.ar; c.ts.add(p.i); c.ts.add(p.j);
      for (const k of [p.i, p.j]) { c.b[0] = Math.min(c.b[0], bb[k][0]); c.b[1] = Math.min(c.b[1], bb[k][1]); c.b[2] = Math.max(c.b[2], bb[k][2]); c.b[3] = Math.max(c.b[3], bb[k][3]); }
    }
    for (const c of cl.values()) out.push({ owner: ow, px: c.ar * PX, opp: c.op * PX, aw: c.aw * PX, x: c.cx / c.ar, y: c.cy / c.ar, bbox: c.b, tris: c.ts.size });
  }
  return out;
}

/** The app band's triangles (band_gpu's quads: pO_i, pO_i+1, pI_i and pO_i+1, pI_i+1, pI_i; inner = pt + W unit(cpt - pt)),
 *  weighted by the piece's own alpha (tails, arcs; tied runs carry their tie per pixel: 1 here). */
export function appQuads(m: Model): { T: Float64Array; own: Int32Array; wt: Float32Array; nT: number } {
  const W = m.table.W; const T: number[] = []; const own: number[] = []; const wt: number[] = [];
  m.table.pieces.forEach((p, pi) => {
    const np = p.pts.length / 2; if (np < 2) return;
    const inner = (i: number): [number, number] => {
      const x = p.pts[2 * i]; const y = p.pts[2 * i + 1]; let dx = p.cpts[2 * i] - x; let dy = p.cpts[2 * i + 1] - y; const l = Math.sqrt(dx * dx + dy * dy);
      if (l < 1e-12) { const j = Math.min(i + 1, np - 1); const ex = p.pts[2 * j] - x; const ey = p.pts[2 * j + 1] - y; const el = Math.sqrt(ex * ex + ey * ey) || 1; dx = -ey / el; dy = ex / el; } else { dx /= l; dy /= l; }
      return [x + dx * W, y + dy * W];
    };
    const pa = p.alpha && p.alpha.length === 2 * np ? p.alpha : null;
    let ia = inner(0);
    for (let i = 0; i + 1 < np; i++) {
      const ib = inner(i + 1);
      const ax = p.pts[2 * i]; const ay = p.pts[2 * i + 1]; const bx = p.pts[2 * i + 2]; const by = p.pts[2 * i + 3];
      const w1 = pa ? (pa[2 * i] + pa[2 * i + 2] + pa[2 * i + 1]) / 3 : 1; const w2 = pa ? (pa[2 * i + 2] + pa[2 * i + 3] + pa[2 * i + 1]) / 3 : 1;
      T.push(ax, ay, bx, by, ia[0], ia[1]); own.push(pi); wt.push(w1);
      T.push(bx, by, ib[0], ib[1], ia[0], ia[1]); own.push(pi); wt.push(w2);
      ia = ib;
    }
  });
  return { T: Float64Array.from(T), own: Int32Array.from(own), wt: Float32Array.from(wt), nT: own.length };
}

export function sceneFolds(nm: string, m: Model = buildModel(nm), band = true, fill = true): Fold[] {
  const res: Fold[] = []; const tb = m.table;
  if (band) {
    let T = m.tri; let own = m.triP; let nT = m.nTri; let wt = new Float32Array(m.nTri);
    if (BD) for (let t = 0; t < m.nTri; t++) wt[t] = (m.triA[3 * t] + m.triA[3 * t + 1] + m.triA[3 * t + 2]) / 3;
    else ({ T, own, wt, nT } = appQuads(m));
    for (const f of foldsOf(T, own, wt, nT)) {
      const p = tb.pieces[f.owner];
      res.push({ scene: nm, src: "band", kind: p.kind, chain: p.chain, corner: p.corner, side: p.side, ...f });
    }
  }
  if (fill) {
    const nT = m.fs.idx.length / 3; const T = new Float64Array(6 * nT); const own = new Int32Array(nT); const wt = new Float32Array(nT).fill(1);
    for (let t = 0; t < nT; t++) {
      for (let k = 0; k < 3; k++) { const v = m.fs.idx[3 * t + k]; T[6 * t + 2 * k] = m.fr.pos[2 * v]; T[6 * t + 2 * k + 1] = m.fr.pos[2 * v + 1]; }
      // a degenerate item vertex (an empty tail, placed at -1e3 depth) never inks
      const v0 = m.fs.idx[3 * t]; own[t] = m.fr.key[v0] < -100 ? -1 : m.vItem[v0];
    }
    for (const f of foldsOf(T, own, wt, nT)) {
      const it = m.fs.items[f.owner] as F.FillItem;
      const piece = "piece" in it ? it.piece : -1; const p = piece >= 0 ? tb.pieces[piece] : undefined;
      res.push({ scene: nm, src: "fill", kind: it.kind, chain: "pi" in it ? it.pi : "owner" in it ? it.owner : -1, corner: p ? p.corner : -1, side: p ? p.side : -1, ...f, owner: f.owner });
    }
  }
  if (OPP) for (const f of res) f.px = f.opp;
  return res.filter((f) => f.px > 0 && f.px >= MIN && (!SRC || f.src === SRC) && (!KINDS || KINDS.includes(f.kind)) && (ALLFILL || f.src === "band" || f.kind === "tail")).sort((p, q) => q.px - p.px);
}

if (process.argv[1]?.endsWith("k1346_folds.ts")) {
  const all: Fold[] = [];
  const noF = a.includes("--nofill"); const noB = a.includes("--noband");
  console.log(`scene                  band>1px  band_px   fill>1px  fill_px   (folds at ${PPU} ppu)`);
  for (const nm of names) {
    const fs = sceneFolds(nm, undefined, !noB, !noF); all.push(...fs);
    const b = fs.filter((f) => f.src === "band"); const fl = fs.filter((f) => f.src === "fill");
    const n1 = (l: Fold[]): number => l.filter((f) => f.px > 1).length; const sm = (l: Fold[]): string => l.reduce((s, f) => s + f.px, 0).toFixed(0);
    console.log(`${nm.padEnd(22)} ${String(n1(b)).padStart(8)} ${sm(b).padStart(8)}   ${String(n1(fl)).padStart(8)} ${sm(fl).padStart(8)}`);
  }
  all.sort((p, q) => q.px - p.px);
  console.log(`largest:`);
  for (const f of all.slice(0, TOP)) console.log(`  ${f.scene} ${f.src} ${f.kind} #${f.owner} c${f.chain} corner ${f.corner} side ${f.side}: ${f.px.toFixed(1)} px (opp ${f.opp.toFixed(1)}, aw ${f.aw.toFixed(1)}) at (${f.x.toFixed(3)}, ${f.y.toFixed(3)}) tris ${f.tris}`);
  const OUT = opt("out"); if (OUT) writeFileSync(OUT, JSON.stringify(all));
  const SP = opt("spots"); if (SP) writeFileSync(SP, all.slice(0, TOP).map((f, i) => `${f.scene}:${f.x.toFixed(3)}:${f.y.toFixed(3)}:f${String(i + 1).padStart(2, "0")}_${f.src}_${f.kind}`).join(","));
}
