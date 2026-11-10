// K1247: fast frame vs frameRef oracle, per scene: piece keys/order,
// point counts, largest point distance (same piece index, pointwise;
// Hausdorff when counts differ), corners and cuts. Modes:
//   (default) cold: fresh structure, frame vs frameRef at S
//   --warm: frame at S' (consistent 0.5h) first, then frame at S vs oracle
//   --move: frame(structure(S), S') vs frameRef(structure(S), S')
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { structure, frame, frameRef, type SceneIn, type OutlineTable } from "./outline";
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const mode = process.argv.includes("--warm") ? "warm" : process.argv.includes("--move") ? "move" : "cold";
const nameArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
const names = nameArg ? nameArg.split(",") : ALL;

function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const cumOf = (c: { closed: boolean; pts: number[] }): number[] => {
    const p = c.pts; const n = p.length / 2; const segs = c.closed ? n : n - 1; const cum = [0];
    for (let i = 0; i < segs; i++) { const j = (i + 1) % n; cum.push(cum[i] + Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1])); }
    return cum;
  };
  const before = new Map(sc.chains.map((c) => [c.id, cumOf(c)]));
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const x = c.pts[i]; const y = c.pts[i + 1]; const d = dxy(x, y); c.pts[i] = x + d[0]; c.pts[i + 1] = y + d[1]; }
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
function haus(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const distTo = (px: number, py: number, pts: ArrayLike<number>): number => {
    const n = pts.length / 2;
    if (n === 0) return Infinity;
    if (n === 1) return Math.hypot(pts[0] - px, pts[1] - py);
    let best = Infinity;
    for (let i = 0; i + 1 < n; i++) best = Math.min(best, ptSeg(px, py, pts[2 * i], pts[2 * i + 1], pts[2 * i + 2], pts[2 * i + 3]));
    return best;
  };
  let m = 0;
  for (let i = 0; i + 1 < a.length; i += 2) m = Math.max(m, distTo(a[i], a[i + 1], b));
  for (let i = 0; i + 1 < b.length; i += 2) m = Math.max(m, distTo(b[i], b[i + 1], a));
  return m;
}
function cmpTables(name: string, a: OutlineTable, b: OutlineTable): void {
  // a = oracle (frameRef), b = fast
  let keyDiff = 0; let lenDiff = 0; let maxPw = 0; let maxHaus = 0; let worst = "";
  const n = Math.min(a.pieces.length, b.pieces.length);
  if (a.pieces.length !== b.pieces.length) console.log(`  ${name}: piece count ${a.pieces.length} -> ${b.pieces.length}`);
  for (let i = 0; i < n; i++) {
    const pa = a.pieces[i]; const pb = b.pieces[i];
    if (pa.kind !== pb.kind || pa.chain !== pb.chain || pa.side !== pb.side || pa.corner !== pb.corner) { keyDiff++; if (keyDiff <= 3) console.log(`  ${name}: piece ${i} key ${pa.kind}|${pa.chain}|${pa.side}|${pa.corner} -> ${pb.kind}|${pb.chain}|${pb.side}|${pb.corner}`); continue; }
    if (pa.pts.length !== pb.pts.length) {
      lenDiff++;
      const hd = haus(pa.pts as unknown as ArrayLike<number>, pb.pts as unknown as ArrayLike<number>);
      if (hd > maxHaus) { maxHaus = hd; worst = `piece ${i} ${pa.kind} ch${pa.chain} s${pa.side} (${pa.pts.length / 2} vs ${pb.pts.length / 2} pts)`; }
      continue;
    }
    for (let k = 0; k < pa.pts.length; k += 2) {
      const d = Math.hypot(pa.pts[k] - pb.pts[k], pa.pts[k + 1] - pb.pts[k + 1]);
      if (d > maxPw) { maxPw = d; worst = `piece ${i} ${pa.kind} ch${pa.chain} side${pa.side} pt${k / 2}`; }
    }
  }
  let cDiff = 0; let maxC = 0;
  for (let i = 0; i < Math.min(a.corners.length, b.corners.length); i++) {
    const ca = a.corners[i]; const cb = b.corners[i];
    if (ca.ok !== cb.ok || Math.abs(ca.r - cb.r) > 1e-9) cDiff++;
    maxC = Math.max(maxC, Math.hypot(ca.qx - cb.qx, ca.qy - cb.qy), Math.hypot(ca.tax - cb.tax, ca.tay - cb.tay));
  }
  console.log(`${name} [${mode}]: pieces=${b.pieces.length} keyDiff=${keyDiff} lenDiffPieces=${lenDiff} maxPoint=${maxPw.toExponential(3)} maxHausDiffLen=${maxHaus.toExponential(3)} worst=${worst} | corners ${a.corners.length}->${b.corners.length} diff=${cDiff} maxCornerPt=${maxC.toExponential(3)} | cuts ${a.cuts.length}->${b.cuts.length} regions ${a.regions.length}->${b.regions.length} faces ${a.faces.length}->${b.faces.length}`);
  const da = a.diagnostics.join(" | "); const db = b.diagnostics.join(" | ");
  if (da !== db) console.log(`  diag oracle: ${da}\n  diag fast  : ${db}`);
}
for (const name of names) {
  const S = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (S.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  const st = structure(S);
  if (mode === "cold") {
    const fast = frame(st, S);
    const ref = frameRef(st, S);
    cmpTables(name, ref, fast);
  } else if (mode === "warm") {
    const Sp = perturb(S, 0.5 * S.look.halfWidth);
    frame(st, Sp);
    const fast = frame(st, S);
    const ref = frameRef(st, S);
    cmpTables(name, ref, fast);
  } else {
    const Sp = perturb(S, 0.5 * S.look.halfWidth);
    const fast = frame(st, Sp);
    const ref = frameRef(st, Sp);
    cmpTables(name, ref, fast);
  }
}
