// K1247 s30 (1): what changes per frame mid-drag. Replays the app's captured drag scenes (k1247s18_capture.mjs:
// every scene the app sent the worker over the bench's 5 s loop drag) through OutlineModel with the app's look
// (fillRec 2, bandRec 1 + bandRecGpu 1), and per consecutive pair of frames reports, in device px
// (camera.pxPerUnit * dpr):
//   - input motion: chain points (raw, and after removing the frame's mean translation), chains whose max point
//     motion exceeds T, junction centres, crossings (position at their s on chain a);
//   - output change: frame()'s pieces (pts, cpts, fpts, alpha), regions, faces, corners (V, q, r, theta), cuts;
//     a piece is matched by index when the two frames list the same (kind, chain, side, corner) sequence;
//   - each part's time in Node for the same frames (OutlineModel.parts), for the browser comparison (2).
// Thresholds T = 0.1, 0.5, 2 device px. A captured pair is one worker frame apart (~5 s / frames); a 60 Hz frame
// moves about (16.7 ms / that) as far, so "> 2 px per captured pair" ~ "> 0.2 px at 60 Hz".
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s30_moved.ts <dragDir> [out.json] [warm=2]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import type { SceneIn, OutlineTable, OutlinePiece } from "../../../src/render/outline/outline";

const dir = process.argv[2];
const outPath = process.argv[3] && !process.argv[3].includes("=") ? process.argv[3] : "";
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const warm = +arg("warm", "2");
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const frames = files.map((f) => {
  const S = JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn;
  const look = S.look as SceneIn["look"] & Record<string, number>;
  look.ctrlArc ??= 0.47; look.fillRec = 2; look.bandRec = 1; look.bandRecGpu = 1;
  return S;
});
const T = [0.1, 0.5, 2];
const px = frames[0].camera.pxPerUnit * frames[0].camera.dpr;

// Arc-length position on a chain at s.
function at(pts: number[], closed: boolean, s: number): [number, number] {
  const n = pts.length >> 1; let acc = 0;
  for (let i = 0; i < n - (closed ? 0 : 1); i++) {
    const j = (i + 1) % n; const l = Math.hypot(pts[2 * j] - pts[2 * i], pts[2 * j + 1] - pts[2 * i + 1]);
    if (acc + l >= s && l > 0) { const t = (s - acc) / l; return [pts[2 * i] + (pts[2 * j] - pts[2 * i]) * t, pts[2 * i + 1] + (pts[2 * j + 1] - pts[2 * i + 1]) * t]; }
    acc += l;
  }
  return [pts[2 * n - 2], pts[2 * n - 1]];
}
const maxd = (a: number[] | undefined, b: number[] | undefined): number => {
  if (!a || !b) return a === b ? 0 : Infinity;
  if (a.length !== b.length) return Infinity;
  let m = 0;
  for (let i = 0; i + 1 < a.length; i += 2) m = Math.max(m, Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1]));
  return m;
};
const maxa = (a: number[] | undefined, b: number[] | undefined): number => {
  if (!a || !b) return a === b ? 0 : Infinity;
  if (a.length !== b.length) return Infinity;
  let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m;
};
const pieceKey = (p: OutlinePiece): string => `${p.kind}:${p.chain}:${p.side}:${p.corner}`;
// Geometric change of a polyline (index-free): the symmetric max point-to-polyline distance, capped at CAP world
// (a grid of b's segments; a point with no segment within the 3x3 cells reads CAP). Pieces resample, faces may
// start at another vertex: index-wise distances count those as moves.
const CAP = 0.1; const CELL = 0.1;
function oneWay(a: number[], b: number[]): number {
  const nb = b.length >> 1; if (nb === 0) return a.length ? CAP : 0;
  const grid = new Map<number, number[]>();
  const key = (i: number, j: number): number => i * 100003 + j;
  for (let k = 0; k < nb; k++) {
    const l = Math.min(k + 1, nb - 1);
    const i0 = Math.floor(Math.min(b[2 * k], b[2 * l]) / CELL); const i1 = Math.floor(Math.max(b[2 * k], b[2 * l]) / CELL);
    const j0 = Math.floor(Math.min(b[2 * k + 1], b[2 * l + 1]) / CELL); const j1 = Math.floor(Math.max(b[2 * k + 1], b[2 * l + 1]) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const kk = key(i, j); let g = grid.get(kk); if (!g) grid.set(kk, g = []); g.push(k); }
  }
  let worst = 0;
  for (let p = 0; p + 1 < a.length; p += 2) {
    const x = a[p]; const y = a[p + 1]; const ci = Math.floor(x / CELL); const cj = Math.floor(y / CELL);
    let best = CAP;
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
      for (const k of grid.get(key(i, j)) ?? []) {
        const l = Math.min(k + 1, nb - 1);
        const ex = b[2 * l] - b[2 * k]; const ey = b[2 * l + 1] - b[2 * k + 1]; const l2 = ex * ex + ey * ey;
        let t = l2 > 0 ? ((x - b[2 * k]) * ex + (y - b[2 * k + 1]) * ey) / l2 : 0; t = Math.min(1, Math.max(0, t));
        best = Math.min(best, Math.hypot(b[2 * k] + ex * t - x, b[2 * k + 1] + ey * t - y));
      }
    }
    worst = Math.max(worst, best);
  }
  return worst;
}
const geo = (a: number[] | undefined, b: number[] | undefined): number => {
  if (!a || !b) return a === b ? 0 : CAP;
  if (a.length === b.length) { let same = true; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { same = false; break; } if (same) return 0; }
  return Math.max(oneWay(a, b), oneWay(b, a));
};

// Pass 1: timing (warm cycles, then one timed pass in capture order, as the worker sees them).
const m = new OutlineModel(frames[0]);
for (let w = 0; w < warm; w++) for (let i = 1; i < frames.length; i++) m.update(frames[i]);
const m2 = new OutlineModel(frames[0]);
for (let w = 0; w < warm; w++) for (let i = 1; i < frames.length; i++) m2.update(frames[i]);
const parts: Record<string, number[]> = {};
const tables: OutlineTable[] = [m2.table];
for (let i = 1; i < frames.length; i++) {
  m2.update(frames[i]);
  for (const [k, v] of Object.entries(m2.parts ?? {})) (parts[k] ??= []).push(v);
  (parts.total ??= []).push(m2.frameMs);
  tables.push(m2.table);
}
const q = (a: number[], p: number): number => { const t = [...a].sort((x, y) => x - y); return t[Math.min(t.length - 1, Math.floor(p * t.length))]; };
console.log(`${dir.split(/[\\/]/).pop()}: ${frames.length} frames, ${frames[0].chains.length} chains, ${frames[0].junctions.length} junctions, ${frames[0].crossings.length} crossings, px/unit ${px.toFixed(1)}`);
console.log(`node parts p50/p95: ` + Object.entries(parts).map(([k, a]) => `${k} ${q(a, 0.5).toFixed(1)}/${q(a, 0.95).toFixed(1)}`).join(", "));

// Pass 2: motion and output change per pair.
type Row = Record<string, number>;
const rows: Row[] = [];
for (let i = 1; i < frames.length; i++) {
  const A = frames[i - 1]; const B = frames[i]; const r: Row = { i };
  // Mean translation over every point.
  let sx = 0, sy = 0, n = 0, resampled = 0;
  for (let c = 0; c < A.chains.length; c++) {
    const a = A.chains[c].pts; const b = B.chains[c].pts;
    if (a.length !== b.length) { resampled++; continue; }
    for (let k = 0; k + 1 < a.length; k += 2) { sx += b[k] - a[k]; sy += b[k + 1] - a[k + 1]; n++; }
  }
  const tx = n ? sx / n : 0; const ty = n ? sy / n : 0;
  r.resampled = resampled; r.transPx = Math.hypot(tx, ty) * px; r.pts = n;
  const ptMax: number[] = []; const ptMaxRes: number[] = [];
  const allD: number[] = []; const allR: number[] = [];
  for (let c = 0; c < A.chains.length; c++) {
    const a = A.chains[c].pts; const b = B.chains[c].pts;
    if (a.length !== b.length) { ptMax.push(Infinity); ptMaxRes.push(Infinity); continue; }
    let mx = 0, mr = 0;
    for (let k = 0; k + 1 < a.length; k += 2) {
      const dx = b[k] - a[k]; const dy = b[k + 1] - a[k + 1];
      const d = Math.hypot(dx, dy) * px; const dr = Math.hypot(dx - tx, dy - ty) * px;
      allD.push(d); allR.push(dr); mx = Math.max(mx, d); mr = Math.max(mr, dr);
    }
    ptMax.push(mx); ptMaxRes.push(mr);
  }
  r.ptP50 = q(allD, 0.5); r.ptP95 = q(allD, 0.95); r.ptMax = q(allD, 1); r.resP50 = q(allR, 0.5);
  const jd = A.junctions.map((J, j) => Math.hypot(B.junctions[j].c[0] - J.c[0], B.junctions[j].c[1] - J.c[1]) * px);
  const xd = A.crossings.map((x, k) => {
    const y = B.crossings[k]; const pa = at(A.chains[x.a.chain].pts, A.chains[x.a.chain].closed, x.a.s);
    const pb = at(B.chains[y.a.chain].pts, B.chains[y.a.chain].closed, y.a.s);
    return Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) * px;
  });
  const tA = tables[i - 1]; const tB = tables[i];
  const sameP = tA.pieces.length === tB.pieces.length && tA.pieces.every((p, k) => pieceKey(p) === pieceKey(tB.pieces[k]));
  r.pieces = tB.pieces.length; r.pieceListSame = sameP ? 1 : 0;
  const pd = sameP ? tA.pieces.map((p, k) => {
    const o = tB.pieces[k];
    return Math.max(geo(p.pts, o.pts), geo(p.fpts, o.fpts)) * px;
  }) : [];
  const pAlpha = sameP ? tA.pieces.map((p, k) => maxa(p.alpha, tB.pieces[k].alpha)) : [];
  const pExact = sameP ? tA.pieces.filter((p, k) => JSON.stringify(p) !== JSON.stringify(tB.pieces[k])).length : -1;
  const sameR = tA.regions.length === tB.regions.length;
  const rd = sameR ? tA.regions.map((g, k) => geo(g.pts, tB.regions[k].pts) * px) : [];
  const sameF = tA.faces.length === tB.faces.length;
  const fd = sameF ? tA.faces.map((g, k) => geo(g.pts, tB.faces[k].pts) * px) : [];
  // Exactly unchanged inputs (a byte-identical cache can only carry what is bit-equal).
  let exactPts = 0; let exactCh = 0;
  for (let c = 0; c < A.chains.length; c++) {
    const a = A.chains[c].pts; const b = B.chains[c].pts; let all = a.length === b.length;
    for (let k = 0; k + 1 < Math.min(a.length, b.length); k += 2) { if (a[k] === b[k] && a[k + 1] === b[k + 1]) exactPts++; else all = false; }
    if (all) exactCh++;
  }
  r.exactPtsFrac = exactPts / Math.max(1, n); r.exactChains = exactCh;
  r.exactJunc = A.junctions.filter((J, j) => J.c[0] === B.junctions[j].c[0] && J.c[1] === B.junctions[j].c[1]).length;
  r.exactCross = A.crossings.filter((x, k) => x.a.s === B.crossings[k].a.s && x.b.s === B.crossings[k].b.s).length;
  const cd = tA.corners.map((c, k) => {
    const o = tB.corners[k]; if (c.ok !== o.ok) return Infinity;
    return Math.max(Math.hypot(o.Vx - c.Vx, o.Vy - c.Vy), Math.hypot(o.qx - c.qx, o.qy - c.qy), Math.abs(o.r - c.r)) * px;
  });
  const sameC = tA.cuts.length === tB.cuts.length;
  const kd = sameC ? tA.cuts.map((c, k) => Math.hypot(tB.cuts[k].x - c.x, tB.cuts[k].y - c.y) * px) : [];
  r.piecesExactChanged = pExact; r.regions = tB.regions.length; r.regionListSame = sameR ? 1 : 0;
  r.faces = tB.faces.length; r.cornersOk = tB.corners.filter((c) => c.ok).length; r.cuts = tB.cuts.length;
  for (const t of T) {
    r[`chains>${t}`] = ptMax.filter((x) => x > t).length;
    r[`chainsRes>${t}`] = ptMaxRes.filter((x) => x > t).length;
    r[`ptsFrac>${t}`] = allD.filter((x) => x > t).length / Math.max(1, allD.length);
    r[`junc>${t}`] = jd.filter((x) => x > t).length;
    r[`cross>${t}`] = xd.filter((x) => x > t).length;
    r[`pieces>${t}`] = sameP ? pd.filter((x) => x > t).length : -1;
    r[`regions>${t}`] = sameR ? rd.filter((x) => x > t).length : -1;
    r[`faces>${t}`] = sameF ? fd.filter((x) => x > t).length : -1;
    r[`corners>${t}`] = cd.filter((x) => x > t).length;
    r[`cuts>${t}`] = sameC ? kd.filter((x) => x > t).length : -1;
  }
  r.alphaChanged = pAlpha.filter((x) => x > 1e-3).length;
  rows.push(r);
}
const med = (k: string): number => q(rows.map((r) => r[k]), 0.5);
const nCh = frames[0].chains.length; const nJ = frames[0].junctions.length; const nX = frames[0].crossings.length;
console.log(`per captured pair, median: translation ${med("transPx").toFixed(2)} px, point motion p50 ${med("ptP50").toFixed(2)} / p95 ${med("ptP95").toFixed(2)} / max ${med("ptMax").toFixed(1)} px (residual p50 ${med("resP50").toFixed(2)}), resampled chains ${med("resampled")}, piece list same ${rows.filter((r) => r.pieceListSame).length}/${rows.length}, region list same ${rows.filter((r) => r.regionListSame).length}/${rows.length}`);
for (const t of T) {
  console.log(`> ${t} px: chains ${med(`chains>${t}`)}/${nCh} (residual ${med(`chainsRes>${t}`)}), points ${(100 * med(`ptsFrac>${t}`)).toFixed(0)}%, junctions ${med(`junc>${t}`)}/${nJ}, crossings ${med(`cross>${t}`)}/${nX} | pieces ${med(`pieces>${t}`)}/${med("pieces")}, regions ${med(`regions>${t}`)}/${med("regions")}, faces ${med(`faces>${t}`)}/${med("faces")}, corners ${med(`corners>${t}`)}/${tables[0].corners.length}, cuts ${med(`cuts>${t}`)}/${med("cuts")}`);
}
console.log(`pieces changed at all (exact): ${med("piecesExactChanged")}/${med("pieces")}; alpha changed ${med("alphaChanged")}`);
console.log(`bit-equal inputs, median: chains ${med("exactChains")}/${nCh}, points ${(100 * med("exactPtsFrac")).toFixed(1)}%, junction centres ${med("exactJunc")}/${nJ}, crossings (both s) ${med("exactCross")}/${nX}`);
if (outPath) writeFileSync(outPath, JSON.stringify({ dir, px, parts, rows }, null, 1));
