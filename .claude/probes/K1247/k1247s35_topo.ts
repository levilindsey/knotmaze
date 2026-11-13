// K1247 s35: how often the outline's TOPOLOGY changes mid-drag, and how much of each frame the CPU still places
// under today's records (fillRec 2, bandRec 1, bandRecGpu 1). Replays a captured drag (s18, sub=N: ~60 Hz)
// through OutlineModel.update and, per frame against the previous one, counts:
//  - set:     the present pieces (by piecesD index di) differ (a piece appears or dies: a tail, an arc, a cap);
//  - corner:  a corner's ok flag flips;
//  - region:  a region's piece list (by di) differs, or the region / face count does;
//  - npts:    pieces whose point count changed (border vertices born or dying: arc steps, folds, tail walks);
//  - how:     band pieces whose layout mode changed (0 absent, 1 records, 2 padded CPU points, 3 decimated);
//  - relay:   band relayouts (a piece outgrew its capacity).
// and the CPU's placement share: band quads used by padded / decimated pieces (CPU points) against records, and
// the fill's fallback rows (record strips that took the CPU path this frame) against nDyn (CPU vertices).
// Times are Node, per part p50 / p95 (model.parts), plus frame()'s own phases (a second frame() call, profiled).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s35_topo.ts <dragDir> [sub=10] [out=<file.json>]
import { writeFileSync } from "node:fs";
import { OutlineModel, diagramKey } from "../../../src/render/outline/outline_model";
import { frame, alignJunctionArms, type DiagramStructure, type OutlineTable } from "../../../src/render/outline/outline";
import { loadDrag } from "./k1247s32_lib";

const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const dir = process.argv[2]; const sub = +arg("sub", "10"); const out = arg("out", "");
const { raw } = loadDrag(dir, sub);
const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * b.length))] : NaN; };
const f2 = (x: number): string => x.toFixed(2);

// The worker's rule: a new diagram key, or an update that throws (paintFrame: run count changed), restructures.
let restr = 0, restrKey = 0; const restrAt: number[] = [];
const step = (mm: OutlineModel, s: (typeof raw)[number], f: number, count: boolean): OutlineModel => {
  if (diagramKey(s) !== mm.key) { if (count) { restr++; restrKey++; restrAt.push(f); } return new OutlineModel(s); }
  try { mm.update(s); return mm; } catch { if (count) { restr++; restrAt.push(f); } return new OutlineModel(s); }
};
// warm: one whole pass on a throwaway model
{ let w = new OutlineModel(raw[0]); for (let f = 1; f < raw.length; f++) w = step(w, raw[f], f, false); }
let m = new OutlineModel(raw[0]);
let st = (m as unknown as { st: DiagramStructure }).st;
let nD = st.piecesD.length;

interface Snap { npts: Int32Array; present: Uint8Array; ok: string; reg: string; nReg: number; nFace: number; how: Uint8Array }
const snapOf = (t: OutlineTable, how: Uint8Array): Snap => {
  const npts = new Int32Array(nD).fill(-1); const present = new Uint8Array(nD);
  for (const p of t.pieces) { const d = p.di ?? -1; if (d >= 0) { npts[d] = p.pts.length >> 1; present[d] = 1; } }
  const ok = t.corners.map((c) => (c.ok ? "1" : "0")).join("");
  const reg = t.regions.map((r) => r.pieces.map((i) => t.pieces[i]?.di ?? -9).join(",")).join("|");
  return { npts, present, ok, reg, nReg: t.regions.length, nFace: t.faces.length, how: how.slice() };
};
type Row = Record<string, number>;
const rows: Row[] = [];
const parts: Record<string, number[]> = {}; const ph: Record<string, number[]> = {}; const ftot: number[] = [];
let prev: Snap | null = null;
let relay0 = 0;
for (let f = 0; f < raw.length; f++) {
  const m0 = m; if (f > 0) m = step(m, raw[f], f, true); else m.update(raw[f]);
  if (m !== m0) { st = (m as unknown as { st: DiagramStructure }).st; prev = null; }
  const br = (m as unknown as { bandRec: { lay: { how: Uint8Array; used: Int32Array; cap: Int32Array }; relayouts: number } | null }).bandRec;
  if (m !== m0) { nD = st.piecesD.length; relay0 = br ? br.relayouts : 0; }
  for (const k of Object.keys(m.parts)) (parts[k] ??= []).push((m.parts as Record<string, number>)[k]);
  const P: Record<string, number> = {}; const t0 = performance.now(); frame(st, alignJunctionArms(st, raw[f]), P); ftot.push(performance.now() - t0);
  for (const k of Object.keys(P)) (ph[k] ??= []).push(P[k]);
  const t = m.table; const how = br ? br.lay.how : new Uint8Array(nD);
  const s = snapOf(t, how);
  // band placement share (quads): records vs CPU points
  let qRec = 0, qPad = 0, nRec = 0, nPad = 0;
  if (br) for (let d = 0; d < nD; d++) { const u = br.lay.used[d]; if (how[d] === 1) { qRec += u; nRec++; } else if (how[d] >= 2) { qPad += u; nPad++; } }
  const rf = m.recFrame; const nFb = rf ? rf.nFb : 0;
  const nDyn = (m as unknown as { rec: { nDyn: number } | null }).rec?.nDyn ?? 0;
  const nAll = (m as unknown as { pd: { src: Uint32Array } }).pd.src.length;
  const row: Row = { f, pieces: t.pieces.length, ptsAll: t.pieces.reduce((a, p) => a + (p.pts.length >> 1), 0), qRec, qPad, nRec, nPad, nFb, nDyn, nAll, nReg: s.nReg, nFace: s.nFace };
  if (prev) {
    let set = 0, npts = 0, hw = 0;
    for (let d = 0; d < nD; d++) {
      if (s.present[d] !== prev.present[d]) set++;
      else if (s.present[d] && s.npts[d] !== prev.npts[d]) npts++;
      if (s.how[d] !== prev.how[d]) hw++;
    }
    let corner = 0; for (let i = 0; i < Math.max(s.ok.length, prev.ok.length); i++) if (s.ok[i] !== prev.ok[i]) corner++;
    const region = s.reg !== prev.reg || s.nReg !== prev.nReg || s.nFace !== prev.nFace ? 1 : 0;
    const relay = br ? br.relayouts - relay0 : 0;
    Object.assign(row, { set, corner, region, npts, how: hw, relay });
  }
  if (br) relay0 = br.relayouts;
  prev = s; rows.push(row);
}
const R = rows.slice(1);
const frac = (k: string): string => `${(100 * R.filter((r) => r[k] > 0).length / R.length).toFixed(1)}%`;
const p50 = (k: string): number => q(R.map((r) => r[k]), 0.5); const p95 = (k: string): number => q(R.map((r) => r[k]), 0.95);
const topo = R.filter((r) => r.set > 0 || r.corner > 0 || r.region > 0).length / R.length;
console.log(`${dir}: ${raw.length} frames (sub ${sub}), restructures ${restr} (key ${restrKey}) at ${restrAt.join(",")}, ${nD} diagram pieces, pieces/frame p50 ${p50("pieces")}, piece pts p50 ${p50("ptsAll")}`);
console.log(`frames with a change vs the last: piece set ${frac("set")} (p95 ${p95("set")} pieces), corner ok ${frac("corner")}, regions/faces ${frac("region")}; ANY of these ${(100 * topo).toFixed(1)}%`);
console.log(`  point counts: ${frac("npts")} of frames (pieces p50 ${p50("npts")}, p95 ${p95("npts")}); band how: ${frac("how")} (p50 ${p50("how")}, p95 ${p95("how")}); band relayouts: ${frac("relay")}`);
console.log(`band quads: records p50 ${p50("qRec")} (${p50("nRec")} pieces), CPU-padded p50 ${p50("qPad")} (${p50("nPad")} pieces) = ${(100 * p50("qPad") / (p50("qPad") + p50("qRec"))).toFixed(1)}% CPU`);
console.log(`fill verts: ${p50("nAll")} in all, ${p50("nDyn")} CPU-placed (${(100 * p50("nDyn") / p50("nAll")).toFixed(1)}%), record fallback rows p50 ${p50("nFb")} p95 ${p95("nFb")}`);
console.log(`Node parts p50 (p95) ms: ${Object.keys(parts).map((k) => `${k} ${f2(q(parts[k], 0.5))} (${f2(q(parts[k], 0.95))})`).join(", ")}`);
console.log(`frame() alone p50 ${f2(q(ftot, 0.5))}; phases p50: ${Object.keys(ph).map((k) => `${k} ${f2(q(ph[k], 0.5))}`).join(", ")}`);
if (out) writeFileSync(out, JSON.stringify({ rows, parts, ph, ftot }, null, 0));
