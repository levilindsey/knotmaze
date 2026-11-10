// K1247 s15: what a skipped recompute costs in drawn error. Over a recorded
// motion (k1247s15_record.mjs), frame() on every frame (the full recompute),
// then:
//  1. The gain, consecutive frames: per face vertex of frame f-1, its drawn
//     move (distance to the same face's polyline at frame f) against the
//     largest input move within r of it (r = 2h and 6h); per frame the worst
//     drawn move and the worst ratio over vertices whose inputs moved over
//     0.02 px. Faces correspond by index (the structure is decided once).
//  2. Rung 1, the whole-frame gate: reuse the last computed table while no
//     input point has moved more than delta from the frame it was computed
//     at (and the diagram's signature is the same); per frame the drawn
//     error against the full recompute (symmetric vertex-to-polyline
//     Hausdorff over the census's faces: owned, not holes), capped at CAP px.
// Faces are matched by region id (the table draws them in depth order).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s15_gain.ts <name> [--d=0.25,0.125,0.0625]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame, type SceneIn } from "./outline";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const name = args.find((a) => !a.startsWith("--")) ?? "def";
const dList = (opt("d") ?? "0.25,0.125,0.0625").split(",").map(Number);
const dir = join(here, "..", "out", "s15", `rec_${name}`);
const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8")) as { frames: { k: number; phase: string }[] };
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const loadScene = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; };
const scenes: SceneIn[] = files.map(loadScene);
const F = scenes.length; const s0 = scenes[0];
const h = s0.look.halfWidth; const S = s0.camera.pxPerUnit * 2;
const sig = (s: SceneIn): string => s.chains.map((c) => `${c.id}:${c.pts.length}`).join(",");
const st = structure(s0);
type Face = { pts: Float64Array; owner: number };
const tables: Face[][] = []; let mism = 0;
for (let f = 0; f < F; f++) {
  const t = frame(st, scenes[f]);
  // Faces are drawn in depth order (positions decide ties), so match them by region id: a face's pts is its region's.
  const rid = new Map<number[], number>(); t.regions.forEach((r, i) => rid.set(r.pts, i));
  const byRid: Face[] = new Array(t.regions.length);
  for (const x of t.faces) { const r = rid.get(x.pts); if (r === undefined) throw new Error(`frame ${f}: a face without its region`); if (x.ownerChain >= 0 && !x.hole) byRid[r] = { pts: Float64Array.from(x.pts), owner: x.ownerChain }; }
  tables.push(byRid);
  if (f > 0) { const p = tables[f - 1]; for (let i = 0; i < Math.max(p.length, byRid.length); i++) if (!!p[i] !== !!byRid[i] || (p[i] && p[i].owner !== byRid[i].owner)) { mism++; if (mism <= 5) console.log(`frame ${f}: region ${i} differs from frame ${f - 1} (owner ${p[i]?.owner} -> ${byRid[i]?.owner})`); } }
}
console.log(`${name}: ${F} frames, regions per frame ${tables[0].length}${tables.some((t) => t.length !== tables[0].length) ? " (VARIES)" : ""}, region/face mismatches between consecutive frames ${mism}`);

const CELL = 0.03; const CAP = CELL * S; // px
// Distance from each vertex of A to polyline B (closed), capped at CELL.
function dirDist(A: Float64Array, B: Float64Array, out?: Float64Array): number {
  const m = B.length >> 1; const grid = new Map<number, number[]>();
  const key = (ix: number, iy: number): number => ix * 1000003 + iy;
  for (let j = 0; j < m; j++) {
    const k = (j + 1) % m; const ax = B[2 * j], ay = B[2 * j + 1], bx = B[2 * k], by = B[2 * k + 1];
    const x0 = Math.floor(Math.min(ax, bx) / CELL), x1 = Math.floor(Math.max(ax, bx) / CELL), y0 = Math.floor(Math.min(ay, by) / CELL), y1 = Math.floor(Math.max(ay, by) / CELL);
    for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) { const kk = key(ix, iy); let l = grid.get(kk); if (!l) grid.set(kk, (l = [])); l.push(j); }
  }
  let worst = 0; const n = A.length >> 1;
  for (let i = 0; i < n; i++) {
    const px = A[2 * i], py = A[2 * i + 1]; const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
    let best = CELL * CELL;
    for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iy = cy - 1; iy <= cy + 1; iy++) {
      const l = grid.get(key(ix, iy)); if (!l) continue;
      for (const j of l) {
        const k = (j + 1) % m; const ax = B[2 * j], ay = B[2 * j + 1]; const ex = B[2 * k] - ax, ey = B[2 * k + 1] - ay;
        const L2 = ex * ex + ey * ey; let t = L2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = ax + t * ex - px, dy = ay + t * ey - py; const d2 = dx * dx + dy * dy; if (d2 < best) best = d2;
      }
    }
    const d = Math.sqrt(best); if (out) out[i] = d; if (d > worst) worst = d;
  }
  return worst;
}
const haus = (TA: Face[], TB: Face[]): number => { let w = 0; for (let i = 0; i < TA.length; i++) { if (!TA[i] || !TB[i]) { if (TA[i] || TB[i]) w = Infinity; continue; } w = Math.max(w, dirDist(TA[i].pts, TB[i].pts), dirDist(TB[i].pts, TA[i].pts)); } return w; };

// Input points of a frame, and a spatial hash for "largest input move within r".
function inputMove(a: SceneIn, b: SceneIn, r: number): (x: number, y: number) => number {
  const grid = new Map<number, number[]>(); const mv: number[] = []; const xy: number[] = [];
  const key = (ix: number, iy: number): number => ix * 1000003 + iy;
  for (let c = 0; c < a.chains.length; c++) {
    const p = a.chains[c].pts, q = b.chains[c].pts; if (p.length !== q.length) continue;
    for (let i = 0; i < p.length; i += 2) {
      const k = mv.length; mv.push(Math.hypot(q[i] - p[i], q[i + 1] - p[i + 1])); xy.push(p[i], p[i + 1]);
      const kk = key(Math.floor(p[i] / r), Math.floor(p[i + 1] / r)); let l = grid.get(kk); if (!l) grid.set(kk, (l = [])); l.push(k);
    }
  }
  return (x, y) => {
    const cx = Math.floor(x / r), cy = Math.floor(y / r); let m = 0;
    for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iy = cy - 1; iy <= cy + 1; iy++) { const l = grid.get(key(ix, iy)); if (!l) continue; for (const k of l) if (mv[k] > m && Math.hypot(xy[2 * k] - x, xy[2 * k + 1] - y) <= r) m = mv[k]; }
    return m;
  };
}
const maxMove = (a: SceneIn, b: SceneIn): number => { let m = 0; for (let c = 0; c < a.chains.length; c++) { const p = a.chains[c].pts, q = b.chains[c].pts; if (p.length !== q.length) return Infinity; for (let i = 0; i < p.length; i += 2) m = Math.max(m, Math.hypot(q[i] - p[i], q[i + 1] - p[i + 1])); } return m; };
const q = (a: number[], p: number): number => { const b = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * b.length))] : NaN; };

// 1. Gain, consecutive frames.
const gainRows: { f: number; phase: string; inMax: number; drawn: number; g2: number; g6: number }[] = [];
const jumps: { f: number; x: number; y: number; d: number; mv: number; r: number; nA: number; nB: number }[] = [];
for (let f = 1; f < F; f++) {
  if (sig(scenes[f]) !== sig(scenes[f - 1])) continue;
  const A = tables[f - 1], B = tables[f]; const mv2 = inputMove(scenes[f - 1], scenes[f], 2 * h); const mv6 = inputMove(scenes[f - 1], scenes[f], 6 * h);
  let drawn = 0, g2 = 0, g6 = 0; const fl = 0.02 / S;
  for (let i = 0; i < A.length; i++) {
    if (!A[i] || !B[i]) continue;
    const out = new Float64Array(A[i].pts.length >> 1); const w = dirDist(A[i].pts, B[i].pts, out);
    const outB = new Float64Array(B[i].pts.length >> 1); drawn = Math.max(drawn, w, dirDist(B[i].pts, A[i].pts, outB));
    for (let k = 0; k < out.length; k++) {
      if (out[k] * S < 0.01) continue; const x = A[i].pts[2 * k], y = A[i].pts[2 * k + 1];
      const m2 = mv2(x, y), m6 = mv6(x, y);
      if (m2 > fl) g2 = Math.max(g2, out[k] / m2); if (m6 > fl) g6 = Math.max(g6, out[k] / m6);
      if (out[k] * S > 0.25 && m2 * S < 0.1) jumps.push({ f, x, y, d: out[k] * S, mv: m2 * S, r: i, nA: A[i].pts.length >> 1, nB: B[i].pts.length >> 1 });
    }
    for (let k = 0; k < outB.length; k++) {
      if (outB[k] * S <= 0.25) continue; const x = B[i].pts[2 * k], y = B[i].pts[2 * k + 1]; const m2 = mv2(x, y);
      if (m2 * S < 0.1) jumps.push({ f, x, y, d: outB[k] * S, mv: m2 * S, r: i, nA: A[i].pts.length >> 1, nB: B[i].pts.length >> 1 });
    }
  }
  gainRows.push({ f, phase: meta.frames[f]?.phase ?? "?", inMax: maxMove(scenes[f - 1], scenes[f]) * S, drawn: drawn * S, g2, g6 });
}
console.log(`\ngain, consecutive frames (${gainRows.length} pairs with the same diagram): drawn move / input move within r, per frame's worst vertex`);
for (const ph of ["pull", "hold", "release", "settle"]) {
  const r = gainRows.filter((x) => x.phase === ph); if (!r.length) continue;
  console.log(`  ${ph.padEnd(8)} ${String(r.length).padStart(4)} pairs: input max med ${q(r.map((x) => x.inMax), 0.5).toFixed(3)} px, drawn max med ${q(r.map((x) => x.drawn), 0.5).toFixed(3)} px; gain r=2h med ${q(r.map((x) => x.g2), 0.5).toFixed(2)} max ${q(r.map((x) => x.g2), 1).toFixed(2)}, r=6h med ${q(r.map((x) => x.g6), 0.5).toFixed(2)} max ${q(r.map((x) => x.g6), 1).toFixed(2)}`);
}
console.log(`  whole-frame drawn max / input max: med ${q(gainRows.filter((x) => x.inMax > 0.02).map((x) => x.drawn / x.inMax), 0.5).toFixed(2)}, max ${q(gainRows.filter((x) => x.inMax > 0.02).map((x) => x.drawn / x.inMax), 1).toFixed(2)}`);

// Jumps: a vertex that moves over 0.25 px while every input point within 2h moved under 0.1 px, clustered by place (1h).
{
  const cl: { x: number; y: number; n: number; frames: Set<number>; d: number; mv: number; regions: Set<number>; nChange: number }[] = [];
  for (const j of jumps) {
    let c = cl.find((u) => Math.hypot(u.x - j.x, u.y - j.y) < h);
    if (!c) cl.push((c = { x: j.x, y: j.y, n: 0, frames: new Set(), d: 0, mv: 0, regions: new Set(), nChange: 0 }));
    c.n++; c.frames.add(j.f); c.d = Math.max(c.d, j.d); c.mv = Math.max(c.mv, j.mv); c.regions.add(j.r); if (j.nA !== j.nB) c.nChange++;
  }
  cl.sort((u, v) => v.frames.size - u.frames.size || v.d - u.d);
  const nearJ = (x: number, y: number): string => { let b = Infinity, id = ""; for (const jn of s0.junctions) { const d = Math.hypot(jn.c[0] - x, jn.c[1] - y); if (d < b) { b = d; id = jn.id; } } return `${id} ${(b / h).toFixed(1)}h`; };
  console.log(`\njumps (a vertex moves > 0.25 px while its inputs within 2h moved < 0.1 px): ${jumps.length} vertices in ${new Set(jumps.map((j) => j.f)).size} frame pairs, ${cl.length} places`);
  for (const c of cl.slice(0, 15)) console.log(`  (${c.x.toFixed(3)}, ${c.y.toFixed(3)}) nearest junction ${nearJ(c.x, c.y)}: ${c.frames.size} frame pairs, worst ${c.d.toFixed(3)} px at input <= ${c.mv.toFixed(3)} px, regions ${[...c.regions].slice(0, 4).join(",")}; vertex count changed in ${c.nChange} of ${c.n}`);
}

// 2. Rung 1: the whole-frame gate.
const res: Record<string, unknown> = { name, F, gain: gainRows, jumps };
for (const dpx of dList) {
  const delta = dpx / S; let ref = 0; let reused = 0; const err: number[] = []; const rows: { f: number; reused: boolean; err: number }[] = [];
  for (let f = 0; f < F; f++) {
    const D = f === 0 ? Infinity : maxMove(scenes[ref], scenes[f]);
    if (f === 0 || D > delta || sig(scenes[f]) !== sig(scenes[ref])) { ref = f; err.push(0); rows.push({ f, reused: false, err: 0 }); continue; }
    reused++; const e = haus(tables[ref], tables[f]) * S; err.push(e); rows.push({ f, reused: true, err: e });
  }
  const over = rows.filter((r) => r.err > 0.25);
  console.log(`\nrung 1, delta ${dpx} px: ${reused} of ${F} frames reuse the last table (${F - reused} computed); drawn error med ${q(err, 0.5).toFixed(3)} p95 ${q(err, 0.95).toFixed(3)} max ${Math.max(...err).toFixed(3)} px (cap ${CAP.toFixed(2)}); frames over 0.25 px: ${over.length}${over.length ? " (" + over.slice(0, 8).map((r) => `f${r.f} ${r.err.toFixed(2)}`).join(", ") + ")" : ""}`);
  const byPh: Record<string, number> = {}; for (const r of rows) if (!r.reused) { const ph = meta.frames[r.f]?.phase ?? "?"; byPh[ph] = (byPh[ph] ?? 0) + 1; }
  console.log(`  computed frames by phase: ${Object.entries(byPh).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  res[`rung1_${dpx}`] = rows;
}
writeFileSync(join(here, "..", "out", "s15", `gain_${name}.json`), JSON.stringify(res));
