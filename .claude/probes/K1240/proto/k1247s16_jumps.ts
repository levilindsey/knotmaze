// K1247 s16: which piece each jump is. Runs frame() over a recording
// (k1247s15_record.mjs) like k1247s15_gain.ts, finds the same jumps (a drawn
// vertex moves > 0.25 px while every input within 2h moves < 0.1 px), and per
// jump names the piece the vertex sits on (kind, chain, side, corner), that
// piece's end moves and s0/s1 change, and the nearest junction.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s16_jumps.ts <name> [--all] [--out=<file>]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame, type SceneIn, type OutlineTable } from "./outline";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const name = args.find((a) => !a.startsWith("--")) ?? "def";
const dir = join(here, "..", "out", "s15", `rec_${name}`);
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const loadScene = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; };
const scenes: SceneIn[] = files.map(loadScene);
const F = scenes.length; const s0 = scenes[0];
const h = s0.look.halfWidth; const S = s0.camera.pxPerUnit * 2;
const sig = (s: SceneIn): string => s.chains.map((c) => `${c.id}:${c.pts.length}`).join(",");
const st = structure(s0);
type Face = { pts: Float64Array; owner: number };
const tabs: OutlineTable[] = []; const tables: Face[][] = [];
for (let f = 0; f < F; f++) {
  const t0 = frame(st, scenes[f]);
  // frame() reuses its buffers: snapshot what this tool reads later
  const t = { ...t0, pieces: t0.pieces.map((p) => ({ ...p, pts: Array.from(p.pts) })), regions: t0.regions.map((r) => ({ ...r, pieces: [...(r.pieces ?? [])] })) } as OutlineTable; tabs.push(t);
  const rid = new Map<number[], number>(); t0.regions.forEach((r, i) => rid.set(r.pts, i));
  const byRid: Face[] = new Array(t0.regions.length);
  for (const x of t0.faces) { const r = rid.get(x.pts)!; if (x.ownerChain >= 0 && !x.hole) byRid[r] = { pts: Float64Array.from(x.pts), owner: x.ownerChain }; }
  tables.push(byRid);
}
const CELL = 0.03;
function dirDist(A: Float64Array, B: Float64Array, out: Float64Array): void {
  const m = B.length >> 1; const n = A.length >> 1;
  for (let i = 0; i < n; i++) {
    const px = A[2 * i], py = A[2 * i + 1]; let best = CELL * CELL;
    for (let j = 0; j < m; j++) {
      const k = (j + 1) % m; const ax = B[2 * j], ay = B[2 * j + 1]; const ex = B[2 * k] - ax, ey = B[2 * k + 1] - ay;
      if (Math.min(ax, ax + ex) > px + CELL || Math.max(ax, ax + ex) < px - CELL || Math.min(ay, ay + ey) > py + CELL || Math.max(ay, ay + ey) < py - CELL) continue;
      const L2 = ex * ex + ey * ey; let t = L2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = ax + t * ex - px, dy = ay + t * ey - py; const d2 = dx * dx + dy * dy; if (d2 < best) best = d2;
    }
    out[i] = Math.sqrt(best);
  }
}
function inputMove(a: SceneIn, b: SceneIn, r: number): (x: number, y: number) => number {
  const mv: number[] = []; const xy: number[] = [];
  for (let c = 0; c < a.chains.length; c++) { const p = a.chains[c].pts, q = b.chains[c].pts; if (p.length !== q.length) continue; for (let i = 0; i < p.length; i += 2) { mv.push(Math.hypot(q[i] - p[i], q[i + 1] - p[i + 1])); xy.push(p[i], p[i + 1]); } }
  return (x, y) => { let m = 0; for (let k = 0; k < mv.length; k++) if (mv[k] > m && Math.abs(xy[2 * k] - x) <= r && Math.abs(xy[2 * k + 1] - y) <= r && Math.hypot(xy[2 * k] - x, xy[2 * k + 1] - y) <= r) m = mv[k]; return m; };
}
const nearJ = (x: number, y: number): string => { let b = Infinity, id = ""; for (const jn of s0.junctions) { const d = Math.hypot(jn.c[0] - x, jn.c[1] - y); if (d < b) { b = d; id = jn.id; } } return `${id} ${(b / h).toFixed(1)}h`; };
function pieceAt(t: OutlineTable, r: number, x: number, y: number): { pi: number; k: number; d: number } {
  let best = { pi: -1, k: -1, d: Infinity };
  const list = t.regions[r]?.pieces ?? [];
  const scan = (ids: Iterable<number>): void => { for (const pi of ids) { const p = t.pieces[pi].pts; for (let k = 0; k < p.length; k += 2) { const d = Math.hypot(p[k] - x, p[k + 1] - y); if (d < best.d) best = { pi, k: k >> 1, d }; } } };
  scan(list);
  if (best.d * S > 0.05) scan(t.pieces.keys());
  return best;
}
type J = { f: number; x: number; y: number; d: number; mv: number; mv4: number; r: number; which: "A" | "B"; piece: number; pk: number; pd: number };
const jumps: J[] = [];
for (let f = 1; f < F; f++) {
  if (sig(scenes[f]) !== sig(scenes[f - 1])) continue;
  const A = tables[f - 1], B = tables[f]; const mv2 = inputMove(scenes[f - 1], scenes[f], 2 * h); const mv4 = inputMove(scenes[f - 1], scenes[f], 4 * h);
  for (let i = 0; i < A.length; i++) {
    if (!A[i] || !B[i]) continue;
    for (const [P, Q, which, t] of [[A[i], B[i], "A", tabs[f - 1]], [B[i], A[i], "B", tabs[f]]] as const) {
      const out = new Float64Array(P.pts.length >> 1); dirDist(P.pts, Q.pts, out);
      for (let k = 0; k < out.length; k++) {
        if (out[k] * S <= 0.25) continue; const x = P.pts[2 * k], y = P.pts[2 * k + 1]; const m2 = mv2(x, y);
        if (m2 * S >= 0.1) continue;
        const pa = pieceAt(t, i, x, y);
        jumps.push({ f, x, y, d: out[k] * S, mv: m2 * S, mv4: mv4(x, y) * S, r: i, which, piece: pa.pi, pk: pa.k, pd: pa.d * S });
      }
    }
  }
}
const cl: { x: number; y: number; js: J[] }[] = [];
for (const j of jumps) { let c = cl.find((u) => Math.hypot(u.x - j.x, u.y - j.y) < h); if (!c) cl.push((c = { x: j.x, y: j.y, js: [] })); c.js.push(j); }
cl.sort((u, v) => Math.max(...v.js.map((j) => j.d)) - Math.max(...u.js.map((j) => j.d)));
console.log(`${name}: ${F} frames; jumps ${jumps.length} vertices in ${new Set(jumps.map((j) => j.f)).size} frame pairs, ${cl.length} places`);
const pdesc = (t: OutlineTable, pi: number): string => { if (pi < 0) return "none"; const p = t.pieces[pi]; return `${p.kind} c${p.chain} s${p.side}${p.corner >= 0 ? ` corner ${p.corner}` : ""} [${p.s0.toFixed(3)},${p.s1.toFixed(3)}] n${p.pts.length >> 1}`; };
const res: unknown[] = [];
for (const c of cl) {
  const worst = c.js.reduce((a, b) => (b.d > a.d ? b : a));
  const frames = [...new Set(c.js.map((j) => j.f))];
  const pieces = [...new Set(c.js.map((j) => j.piece))];
  console.log(`\n(${c.x.toFixed(3)}, ${c.y.toFixed(3)}) ${nearJ(c.x, c.y)}: ${frames.length} pairs, worst ${worst.d.toFixed(3)} px at f${worst.f} (input ${worst.mv.toFixed(3)}, within 4h ${worst.mv4.toFixed(3)}; frames ${frames.slice(0, 12).join(",")}), regions ${[...new Set(c.js.map((j) => j.r))].join(",")}`);
  for (const pi of pieces.slice(0, 4)) {
    const js = c.js.filter((j) => j.piece === pi); const w = js.reduce((a, b) => (b.d > a.d ? b : a));
    const ta = tabs[w.f - 1], tb = tabs[w.f];
    const pa = ta.pieces[pi], pb = tb.pieces[pi];
    let ends = "";
    if (pa && pb) {
      const e0 = Math.hypot(pa.pts[0] - pb.pts[0], pa.pts[1] - pb.pts[1]) * S; const L = pa.pts.length, Lb = pb.pts.length;
      const e1 = Math.hypot(pa.pts[L - 2] - pb.pts[Lb - 2], pa.pts[L - 1] - pb.pts[Lb - 1]) * S;
      ends = `ends move ${e0.toFixed(3)} / ${e1.toFixed(3)} px, s0 ${(pb.s0 - pa.s0).toExponential(2)} s1 ${(pb.s1 - pa.s1).toExponential(2)}`;
    }
    console.log(`  piece ${pi}: ${pdesc(ta, pi)} -> n${pb ? pb.pts.length >> 1 : "?"}; ${js.length} verts, worst ${w.d.toFixed(3)} at f${w.f} (${w.which}, pt ${w.pk}, ${w.pd.toFixed(3)} px off it); ${ends}`);
  }
  res.push({ x: c.x, y: c.y, near: nearJ(c.x, c.y), frames, worst: worst.d, pieces: pieces.map((pi) => ({ pi, d: pdesc(tabs[worst.f - 1], pi) })), js: c.js });
}
writeFileSync(opt("out") ?? join(here, "..", "out", "s16", `jumps_${name}.json`), JSON.stringify(res));
