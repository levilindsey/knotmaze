// K1247 s33: a copy of k1247s32_check.ts that also takes kf.<field>=<value> (any KF_INC field, after the named ones:
//   kf.jlocal=true) and reports the held chains per frame. K1247 s32: checks (a) and (b) through OutlineModel itself (as the worker runs it), KF_INC.snap and .cache on.
// (b): per frame of a drag, the model's snapped table against frame() on the TRUE input (its own structure),
//   device px, two metrics over DRAWN pieces (bandData draws pieces of 2+ points): "drawn" = every drawn border
//   point's distance to the other table's drawn borders (the image: ink does not know its chain or side), and
//   "keyed" = s31's (same chain and side only). The worst five frames by "drawn", where, and the nearest junction.
// (a): after the drag, update(last, exact=true), and its every output (table digest, paint pos/key/w, band, rec
//   frame) against a model with the snap off framing the same input: byte for byte.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s32_check.ts <dragDir> [sub=10] [stride=1] [cache=1] [snap=1] [T=0.5] [border=0] [jclose=1]
import { createHash } from "node:crypto";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { frame, alignJunctionArms, KF_INC } from "../../../src/render/outline/outline";
import type { DiagramStructure, OutlineTable } from "../../../src/render/outline/outline";
import { digest } from "../../../test/render/outline_digest";
import { loadDrag, borderDist, nearJ } from "./k1247s32_lib";

const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const dir = process.argv[2]; const sub = +arg("sub", "10"); const stride = +arg("stride", "1");
const { cap, raw } = loadDrag(dir, sub);
const px = cap[0].camera.pxPerUnit * cap[0].camera.dpr; const last = raw.length - 1;
const snap0 = KF_INC.snap; const cache0 = KF_INC.cache;
KF_INC.snap = arg("snap", "1") === "1"; KF_INC.cache = arg("cache", "1") === "1"; const T0 = KF_INC.T; KF_INC.T = +arg("T", String(T0)); const B0 = KF_INC.border; KF_INC.border = arg("border", "0") === "1"; const J0 = KF_INC.jclose; KF_INC.jclose = arg("jclose", "1") === "1";
for (const kv of process.argv.slice(3)) { const m = /^kf\.(\w+)=(.*)$/.exec(kv); if (m) (KF_INC as unknown as Record<string, unknown>)[m[1]] = m[2] === "true" ? true : m[2] === "false" ? false : +m[2]; }
const heldF: number[] = [];
let M = new OutlineModel(cap[0]); let Mi = M as unknown as { table: OutlineTable; st: DiagramStructure }; const threw: string[] = []; let rb = 0;
// The TRUE frame is what the worker shows with the snap off: a model fed the true input (update exact, check (a)),
// rebuilt where its update throws. (Not frame() on cap[0]'s structure: muse_hash's drag outgrows it, and that
// frame breaks where the worker would have restructured.)
let R = new OutlineModel(cap[0]); let Ri = R as unknown as { table: OutlineTable; st: DiagramStructure }; const rThrew: number[] = [];
// Also "same": frame() on the TRUE input over the snapped model's OWN current structure: the snap's error alone,
// apart from the two models restructuring at different frames (the snap holds the input, so it delays a rebuild).
const rows: { f: number; d: number; k: number; x: number; y: number; key: string; j: string; s: number; sx: number; sy: number; sj: string }[] = [];
const t0 = performance.now();
for (let i = 1; i <= last; i++) {
  // as the worker: an update that throws rebuilds the model on that input (a restructure)
  try { M.update(raw[i]); } catch (e) { threw.push(`f${i}: ${(e as Error).message}`); M = new OutlineModel(raw[i]); Mi = M as unknown as { table: OutlineTable; st: DiagramStructure }; rb = i; }
  try { R.update(raw[i], true); } catch { rThrew.push(i); R = new OutlineModel(raw[i]); Ri = R as unknown as { table: OutlineTable; st: DiagramStructure }; }
  { const d = (M as unknown as { snap: { dChains: Uint8Array } }).snap.dChains; let n = 0; for (let q2 = 0; q2 < d.length; q2++) n += 1 - d[q2]; heldF.push(n / Math.max(1, d.length)); }
  if (i % stride !== 0 && i !== last) continue;
  const tb = Mi.table; const tt = Ri.table;
  const u = borderDist(tb, tt, 0.05, true); const k = borderDist(tb, tt, 0.05, false);
  const nj = nearJ(raw[i], u.x, u.y);
  let s = { d: NaN, x: NaN, y: NaN }; let sj = "-";
  try { const ts = frame(Mi.st, alignJunctionArms(Mi.st, raw[i])); s = borderDist(tb, ts, 0.05, true); const n2 = nearJ(raw[i], s.x, s.y); sj = `j${n2.id} ${(n2.d * px).toFixed(1)} px off`; } catch { /* the true input does not fit this structure */ }
  rows.push({ f: i, d: u.d * px, k: k.d * px, x: u.x, y: u.y, key: u.key, j: `j${nj.id} ${(nj.d * px).toFixed(1)} px off`, s: s.d * px, sx: s.x, sy: s.y, sj });
}
console.log(`updates that threw (the worker restructures): snapped ${threw.length}${threw.length ? ": " + threw.slice(0, 4).join("; ") : ""}; true ${rThrew.length} (${rThrew.slice(0, 8).join(",")})`);
const name = dir.split(/[\\/]/).filter(Boolean).pop();
const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const D = rows.map((r) => r.d); const K = rows.map((r) => r.k);
console.log(`${name}: ${rows.length} frames (sub ${sub}, stride ${stride}), snap ${KF_INC.snap} (T ${KF_INC.T} px, border ${KF_INC.border}, jclose ${KF_INC.jclose}) cache ${KF_INC.cache}, ${((performance.now() - t0) / 1000).toFixed(1)} s`);
console.log(`held chains per frame p50 ${(100 * q(heldF, 0.5)).toFixed(1)}% p95 ${(100 * q(heldF, 0.95)).toFixed(1)}%; KF_INC ${JSON.stringify({ T: KF_INC.T, jclose: KF_INC.jclose, jlocal: (KF_INC as unknown as Record<string, unknown>).jlocal })}`);
console.log(`check (b) drawn px: p50 ${q(D, 0.5).toFixed(3)} p95 ${q(D, 0.95).toFixed(3)} max ${Math.max(...D).toFixed(3)}; over 0.5: ${D.filter((d) => d > 0.5).length}; keyed (s31) max ${Math.max(...K).toFixed(3)}, over 0.5: ${K.filter((d) => d > 0.5).length}`);
for (const r of [...rows].sort((a, b) => b.d - a.d).slice(0, 5)) console.log(`  f${r.f}: drawn ${r.d.toFixed(3)} px at (${r.x.toFixed(3)}, ${r.y.toFixed(3)}) near ${r.j}; keyed ${r.k.toFixed(3)}`);
const S = rows.map((r) => r.s).filter((d) => Number.isFinite(d));
console.log(`check (b) same structure (the snap alone), drawn px over ${S.length} frames: p50 ${q(S, 0.5).toFixed(3)} p95 ${q(S, 0.95).toFixed(3)} max ${Math.max(...S).toFixed(3)}; over 0.5: ${S.filter((d) => d > 0.5).length}`);
for (const r of [...rows].filter((r) => Number.isFinite(r.s)).sort((a, b) => b.s - a.s).slice(0, 5)) console.log(`  f${r.f}: ${r.s.toFixed(3)} px at (${r.sx.toFixed(3)}, ${r.sy.toFixed(3)}) near ${r.sj}`);
// (a)
const bytes = (o: unknown, h = createHash("sha256"), seen = new Set<unknown>()): ReturnType<typeof createHash> => {
  if (o === null || o === undefined || typeof o !== "object") { h.update(JSON.stringify(o) ?? "u"); return h; }
  if (seen.has(o)) return h; seen.add(o);
  if (ArrayBuffer.isView(o)) { h.update(new Uint8Array(o.buffer, o.byteOffset, o.byteLength)); return h; }
  for (const k of Object.keys(o).sort()) { h.update(k); bytes((o as Record<string, unknown>)[k], h, seen); }
  return h;
};
const parts = (m: OutlineModel): Record<string, string> => {
  const x = m as unknown as { table: OutlineTable; pd: { pos: Float32Array; key: Float32Array; w: Float32Array }; band: unknown; recFrame: unknown };
  return { table: digest(x.table), pos: bytes(x.pd.pos).digest("hex"), key: bytes(x.pd.key).digest("hex"), w: bytes(x.pd.w).digest("hex"), band: bytes(x.band).digest("hex"), rec: bytes(x.recFrame).digest("hex") };
};
const held = parts(M); M.update(raw[last], true); const ex = parts(M);
const snapWas = KF_INC.snap; KF_INC.snap = false; // the reference: the snap off on the structure the model last rebuilt at (the worker's restructure), and a fresh model on the last input
const N = new OutlineModel(raw[rb]); if (rb !== last) N.update(raw[last]); const ref = parts(N); const fresh = parts(new OutlineModel(raw[last])); KF_INC.snap = snapWas;
const diff = (a: Record<string, string>, b = ref): string => Object.keys(b).filter((k) => a[k] !== b[k]).join(",") || "none";
console.log(`check (a): held (no exact frame) differs from the true frame in: ${diff(held)}; after update(exact): ${diff(ex)} (vs a fresh model on the last input: ${diff(ex, fresh)}; last rebuilt at f${rb})`);
KF_INC.snap = snap0; KF_INC.cache = cache0; KF_INC.T = T0; KF_INC.border = B0; KF_INC.jclose = J0;
