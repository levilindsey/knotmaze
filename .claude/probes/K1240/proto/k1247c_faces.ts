// K1247 (Claude's own check): where the fast frame's faces and regions
// differ from k1247c_dump.ts's baseline (the full rebuild), how far apart
// the polygons are (closed-ring Hausdorff) and their areas; and which
// pieces' s0/s1 differ. Cold frames, the verify script's cases.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247c_faces.ts [baseSubdir] [--impl=./outline_<sha>.ts]
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SceneIn } from "./outline";

const impl = process.argv.slice(2).find((a) => a.startsWith("--impl="))?.slice(7) ?? "./outline.ts";
const mod = (await import(/* @vite-ignore */ new URL(impl, import.meta.url).href)) as typeof import("./outline");
const here = dirname(fileURLToPath(import.meta.url));
const sub = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "k1247c_base";
const baseDir = join(here, "..", "out", sub);
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];

function load(name: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
// s3f_exact.ts's perturb, --consistent on (as k1247c_dump.ts).
function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const cumOf = (c: { closed: boolean; pts: number[] }): number[] => {
    const p = c.pts; const n = p.length / 2; const segs = c.closed ? n : n - 1; const cum = [0];
    for (let i = 0; i < segs; i++) { const j = (i + 1) % n; cum.push(cum[i] + Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1])); }
    return cum;
  };
  const before = new Map(sc.chains.map((c) => [c.id, cumOf(c)]));
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) {
    for (let i = 0; i + 1 < c.pts.length; i += 2) {
      const x = c.pts[i]; const y = c.pts[i + 1]; const d = dxy(x, y);
      c.pts[i] = x + d[0];
      c.pts[i + 1] = y + d[1];
    }
  }
  const after = new Map(sc.chains.map((c) => [c.id, cumOf(c)]));
  const closedOf = new Map(sc.chains.map((c) => [c.id, c.closed]));
  const remap = (chain: number, s: number): number => {
    const o = before.get(chain); const p = after.get(chain);
    if (!o || !p || o.length < 2) return s;
    const L = o[o.length - 1]; let u = s;
    if (closedOf.get(chain) && L > 0) u = ((u % L) + L) % L;
    let i = 0; while (i + 2 < o.length && o[i + 1] < u) i++;
    const t = o[i + 1] > o[i] ? (u - o[i]) / (o[i + 1] - o[i]) : 0;
    return p[i] + (p[i + 1] - p[i]) * t;
  };
  const any = sc as unknown as { crossings?: { a: { chain: number; s: number }; b: { chain: number; s: number } }[]; junctions?: { c: number[]; arms: { chain: number; s: number }[] }[]; deadEnds?: { chain: number; s: number }[] };
  for (const x of any.crossings ?? []) { x.a.s = remap(x.a.chain, x.a.s); x.b.s = remap(x.b.chain, x.b.s); }
  for (const j of any.junctions ?? []) { const d = dxy(j.c[0], j.c[1]); j.c[0] += d[0]; j.c[1] += d[1]; for (const a of j.arms) a.s = remap(a.chain, a.s); }
  for (const e of any.deadEnds ?? []) e.s = remap(e.chain, e.s);
  return sc;
}
function ptSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const ex = bx - ax; const ey = by - ay;
  const l2 = ex * ex + ey * ey;
  let t = l2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
  t = Math.min(1, Math.max(0, t));
  return Math.hypot(ax + ex * t - px, ay + ey * t - py);
}
// Distance from a point to a CLOSED ring.
function ptRing(px: number, py: number, p: ArrayLike<number>): number {
  const n = p.length / 2;
  if (n === 0) return Infinity;
  let best = Infinity;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; best = Math.min(best, ptSeg(px, py, p[2 * i], p[2 * i + 1], p[2 * j], p[2 * j + 1])); }
  return best;
}
function hausRing(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i + 1 < a.length; i += 2) m = Math.max(m, ptRing(a[i], a[i + 1], b));
  for (let i = 0; i + 1 < b.length; i += 2) m = Math.max(m, ptRing(b[i], b[i + 1], a));
  return m;
}
// Symmetric Hausdorff between two OPEN polylines.
function hausOpen(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const d = (px: number, py: number, p: ArrayLike<number>): number => {
    if (p.length < 4) return p.length < 2 ? Infinity : Math.hypot(px - p[0], py - p[1]);
    let best = Infinity;
    for (let i = 0; i + 3 < p.length; i += 2) best = Math.min(best, ptSeg(px, py, p[i], p[i + 1], p[i + 2], p[i + 3]));
    return best;
  };
  let m = 0;
  for (let i = 0; i + 1 < a.length; i += 2) m = Math.max(m, d(a[i], a[i + 1], b));
  for (let i = 0; i + 1 < b.length; i += 2) m = Math.max(m, d(b[i], b[i + 1], a));
  return m;
}
function area(p: ArrayLike<number>): number {
  const n = p.length / 2; let s = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; s += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; }
  return s / 2;
}
// Consecutive (and wrap-around) points closer than 1e-9: duplicates.
function dups(p: ArrayLike<number>): number {
  const n = p.length / 2; let k = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; if (Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1]) < 1e-9) k++; }
  return k;
}
const plain = (_k: string, v: unknown): unknown => (ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v);
interface Poly { pts: number[]; ownerChain: number; group: number; hole: boolean; pieces?: number[] }
interface BP { kind: string; chain: number; side: number; corner: number; s0: number; s1: number; pts: number[] }
for (const name of ALL) {
  const orig = load(name);
  const h = orig.look.halfWidth;
  const mults = ["def", "ring", "fat"].includes(name) ? [0, 0.1, 0.5] : [0, 0.1];
  for (const mult of mults) {
    const f = join(baseDir, `table_${name}_${mult}.json`);
    if (!existsSync(f)) continue;
    const base = JSON.parse(readFileSync(f, "utf8")) as { table: { faces: Poly[]; regions: Poly[]; pieces: BP[] } };
    const sc = mult ? perturb(orig, mult * h) : orig;
    const t = JSON.parse(JSON.stringify(mod.frame(mod.structure(orig), sc), plain)) as { faces: Poly[]; regions: Poly[]; pieces: BP[] };
    const out: string[] = [];
    for (const key of ["faces", "regions"] as const) {
      const A = base.table[key]; const B = t[key];
      if (A.length !== B.length) out.push(`${key} count ${A.length} vs ${B.length}`);
      for (let i = 0; i < Math.min(A.length, B.length); i++) {
        const a = A[i]; const b = B[i];
        if (a.pts.length === b.pts.length && hausRing(a.pts, b.pts) < 1e-6) continue;
        const pc = key === "regions" ? ` pieces ${JSON.stringify(a.pieces)} vs ${JSON.stringify(b.pieces)}` : "";
        out.push(`${key}[${i}] ch${a.ownerChain} g${a.group}${a.hole ? " hole" : ""}: n ${a.pts.length / 2} vs ${b.pts.length / 2}, dups ${dups(a.pts)} vs ${dups(b.pts)}, Hausdorff ${hausRing(a.pts, b.pts).toExponential(2)} (${(hausRing(a.pts, b.pts) / h).toFixed(4)} h), area ${area(a.pts).toFixed(6)} vs ${area(b.pts).toFixed(6)}${pc}`);
      }
    }
    const P = base.table.pieces; const Q = t.pieces;
    for (let i = 0; i < Math.min(P.length, Q.length); i++) {
      const ds = Math.max(Math.abs(P[i].s0 - Q[i].s0), Math.abs(P[i].s1 - Q[i].s1));
      if (ds > 1e-6) out.push(`piece ${i} ${P[i].kind} ch${P[i].chain} side${P[i].side} corner${P[i].corner}: s0 ${P[i].s0.toFixed(5)} vs ${Q[i].s0.toFixed(5)}, s1 ${P[i].s1.toFixed(5)} vs ${Q[i].s1.toFixed(5)}, n ${P[i].pts.length / 2} vs ${Q[i].pts.length / 2}, pts Hausdorff ${hausOpen(P[i].pts, Q[i].pts).toExponential(2)}, pts ${JSON.stringify(P[i].pts.map((v) => +v.toFixed(5)))} vs ${JSON.stringify(Q[i].pts.map((v) => +v.toFixed(5)))}`);
    }
    if (out.length) { console.log(`== ${name} ${mult}`); for (const l of out) console.log("  " + l); }
  }
}
console.log("done");
