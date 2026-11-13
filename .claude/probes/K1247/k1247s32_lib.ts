// K1247 s32: shared pieces for the s32 probes. Drags (s18 captures, interpolated sub=N), and an exact,
// grid-accelerated drawn-border distance between two tables (s31's check (b) metric, k1247s31_inc.ts hd():
// every piece point's distance to the other table's pieces of the same chain and side, both ways), with
// where the largest one lies.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { SceneIn, OutlineTable } from "../../../src/render/outline/outline";

export function loadDrag(dir: string, sub: number): { cap: SceneIn[]; raw: SceneIn[] } {
  const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
  const cap = files.map((f) => {
    const S = JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn;
    const look = S.look as SceneIn["look"] & Record<string, number>;
    look.ctrlArc ??= 0.47; look.fillRec = 2; look.bandRec = 1; look.bandRecGpu = 1;
    return S;
  });
  const lerp = (a: SceneIn, b: SceneIn, t: number): SceneIn => {
    const s = structuredClone(b);
    s.chains.forEach((c, i) => { const p = a.chains[i].pts; if (p.length === c.pts.length) for (let k = 0; k < p.length; k++) c.pts[k] = p[k] + (c.pts[k] - p[k]) * t; });
    s.crossings.forEach((x, i) => { const y = a.crossings[i]; if (y) { x.a.s = y.a.s + (x.a.s - y.a.s) * t; x.b.s = y.b.s + (x.b.s - y.b.s) * t; } });
    s.junctions.forEach((j, i) => { const k = a.junctions[i]; if (k) { j.c = [k.c[0] + (j.c[0] - k.c[0]) * t, k.c[1] + (j.c[1] - k.c[1]) * t]; j.arms.forEach((r, q) => { if (k.arms[q]) r.s = k.arms[q].s + (r.s - k.arms[q].s) * t; }); } });
    return s;
  };
  const raw: SceneIn[] = [cap[0]];
  for (let i = 1; i < cap.length; i++) { for (let k = 1; k < sub; k++) raw.push(lerp(cap[i - 1], cap[i], k / sub)); raw.push(cap[i]); }
  return { cap, raw };
}

type Seg = Float64Array; // ax ay bx by per segment (a point piece: a = b)
interface Grid { cell: number; m: Map<number, number[]>; segs: Seg; n: number }
const key = (i: number, j: number): number => (i + 32768) * 65536 + (j + 32768);
function gridOf(P: number[][], cell: number): Grid {
  const S: number[] = [];
  for (const p of P) {
    if (p.length === 2) { S.push(p[0], p[1], p[0], p[1]); continue; }
    for (let k = 0; k + 3 < p.length; k += 2) S.push(p[k], p[k + 1], p[k + 2], p[k + 3]);
  }
  const segs = Float64Array.from(S); const n = S.length / 4; const m = new Map<number, number[]>();
  for (let s = 0; s < n; s++) {
    const x0 = Math.floor(Math.min(segs[4 * s], segs[4 * s + 2]) / cell); const x1 = Math.floor(Math.max(segs[4 * s], segs[4 * s + 2]) / cell);
    const y0 = Math.floor(Math.min(segs[4 * s + 1], segs[4 * s + 3]) / cell); const y1 = Math.floor(Math.max(segs[4 * s + 1], segs[4 * s + 3]) / cell);
    for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) { const k = key(i, j); let a = m.get(k); if (!a) m.set(k, a = []); a.push(s); }
  }
  return { cell, m, segs, n };
}
function nearest(g: Grid, x: number, y: number): number {
  if (g.n === 0) return Infinity;
  const ci = Math.floor(x / g.cell); const cj = Math.floor(y / g.cell); let b = Infinity;
  for (let r = 0; r < 4096; r++) {
    for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) {
      if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
      const a = g.m.get(key(i, j)); if (!a) continue;
      for (const s of a) {
        const ax = g.segs[4 * s], ay = g.segs[4 * s + 1], ex = g.segs[4 * s + 2] - ax, ey = g.segs[4 * s + 3] - ay; const L = ex * ex + ey * ey;
        const u = L > 0 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L)) : 0;
        const d = Math.hypot(x - ax - u * ex, y - ay - u * ey); if (d < b) b = d;
      }
    }
    if (b <= r * g.cell) break;
  }
  return b;
}
// Only DRAWN pieces: draw.ts bandData skips a piece of fewer than 2 points (np < 2: no band, no ink).
// union: every drawn piece in one group (the drawn image: ink does not know which chain or side drew it).
const groups = (t: OutlineTable, union = false): Map<string, number[][]> => { const m = new Map<string, number[][]>(); for (const p of t.pieces) { if (p.pts.length < 4) continue; const k = union ? "*" : `${p.chain}|${p.side}`; let g = m.get(k); if (!g) m.set(k, g = []); g.push(p.pts); } return m; };
/** The drawn-border distance (world units) and the point where it is largest. */
export function borderDist(a: OutlineTable, b: OutlineTable, cell = 0.05, union = false): { d: number; x: number; y: number; key: string } {
  const A = groups(a, union), B = groups(b, union); let m = 0; let mx = NaN; let my = NaN; let mk = "";
  const one = (P: Map<string, number[][]>, Q: Map<string, number[][]>): void => {
    for (const [k, ps] of P) {
      const qs = Q.get(k); if (!qs) { m = Infinity; mk = k; continue; }
      const g = gridOf(qs, cell);
      for (const p of ps) for (let i = 0; i < p.length; i += 2) { const d = nearest(g, p[i], p[i + 1]); if (d > m) { m = d; mx = p[i]; my = p[i + 1]; mk = k; } }
    }
  };
  one(A, B); one(B, A);
  return { d: m, x: mx, y: my, key: mk };
}
/** The nearest junction to (x, y): its id and distance. */
export function nearJ(s: SceneIn, x: number, y: number): { id: number; d: number } {
  let b = { id: -1, d: Infinity };
  for (const j of s.junctions) { const d = Math.hypot(j.c[0] - x, j.c[1] - y); if (d < b.d) b = { id: j.id as unknown as number, d }; }
  return b;
}

/** Per point of either table, its distance to the other (same chain and side), binned to the nearest junction
 *  of scene s: the largest per junction id (world units). Points farther than far from every junction go to -1. */
export function borderDistByJ(a: OutlineTable, b: OutlineTable, s: SceneIn, far = Infinity, cell = 0.05): Map<number, { d: number; x: number; y: number; key: string }> {
  const A = groups(a), B = groups(b); const out = new Map<number, { d: number; x: number; y: number; key: string }>();
  const one = (P: Map<string, number[][]>, Q: Map<string, number[][]>): void => {
    for (const [k, ps] of P) {
      const qs = Q.get(k); if (!qs) continue;
      const g = gridOf(qs, cell);
      for (const p of ps) for (let i = 0; i < p.length; i += 2) {
        const d = nearest(g, p[i], p[i + 1]); if (!(d > 1e-6)) continue;
        const nj = nearJ(s, p[i], p[i + 1]); const id = nj.d <= far ? nj.id : -1;
        const o = out.get(id); if (!o || d > o.d) out.set(id, { d, x: p[i], y: p[i + 1], key: k });
      }
    }
  };
  one(A, B); one(B, A);
  return out;
}