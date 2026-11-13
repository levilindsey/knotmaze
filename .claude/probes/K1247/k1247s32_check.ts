// K1247 s32: checks (a) and (b) through OutlineModel itself (as the worker runs it), KF_INC.snap and .cache on.
// (b): per frame of a drag, the model's snapped table against frame() on the TRUE input (its own structure),
//   device px, two metrics over DRAWN pieces (bandData draws pieces of 2+ points): "drawn" = every drawn border
//   point's distance to the other table's drawn borders (the image: ink does not know its chain or side), and
//   "keyed" = s31's (same chain and side only). The worst five frames by "drawn", where, and the nearest junction.
// (a): after the drag, update(last, exact=true), and its every output (table digest, paint pos/key/w, band, rec
//   frame) against a model with the snap off framing the same input: byte for byte.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s32_check.ts <dragDir> [sub=10] [stride=1] [cache=1] [snap=1] [T=0.5]
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
KF_INC.snap = arg("snap", "1") === "1"; KF_INC.cache = arg("cache", "1") === "1"; const T0 = KF_INC.T; KF_INC.T = +arg("T", String(T0));
let M = new OutlineModel(cap[0]); let Mi = M as unknown as { table: OutlineTable }; const threw: string[] = []; let rb = 0;
const Rst = (new OutlineModel(cap[0]) as unknown as { st: DiagramStructure }).st;
const rows: { f: number; d: number; k: number; x: number; y: number; key: string; j: string }[] = [];
const t0 = performance.now();
for (let i = 1; i <= last; i++) {
  // as the worker: an update that throws rebuilds the model on that input (a restructure)
  try { M.update(raw[i]); } catch (e) { threw.push(`f${i}: ${(e as Error).message}`); M = new OutlineModel(raw[i]); Mi = M as unknown as { table: OutlineTable }; rb = i; }
  if (i % stride !== 0 && i !== last) continue;
  const tb = Mi.table; const tt = frame(Rst, alignJunctionArms(Rst, raw[i]));
  const u = borderDist(tb, tt, 0.05, true); const k = borderDist(tb, tt, 0.05, false);
  const nj = nearJ(raw[i], u.x, u.y);
  rows.push({ f: i, d: u.d * px, k: k.d * px, x: u.x, y: u.y, key: u.key, j: `j${nj.id} ${(nj.d * px).toFixed(1)} px off` });
}
console.log(`updates that threw (the worker restructures): ${threw.length}${threw.length ? ": " + threw.slice(0, 4).join("; ") : ""}`);
const name = dir.split(/[\\/]/).filter(Boolean).pop();
const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const D = rows.map((r) => r.d); const K = rows.map((r) => r.k);
console.log(`${name}: ${rows.length} frames (sub ${sub}, stride ${stride}), snap ${KF_INC.snap} (T ${KF_INC.T} px) cache ${KF_INC.cache}, ${((performance.now() - t0) / 1000).toFixed(1)} s`);
console.log(`check (b) drawn px: p50 ${q(D, 0.5).toFixed(3)} p95 ${q(D, 0.95).toFixed(3)} max ${Math.max(...D).toFixed(3)}; over 0.5: ${D.filter((d) => d > 0.5).length}; keyed (s31) max ${Math.max(...K).toFixed(3)}, over 0.5: ${K.filter((d) => d > 0.5).length}`);
for (const r of [...rows].sort((a, b) => b.d - a.d).slice(0, 5)) console.log(`  f${r.f}: drawn ${r.d.toFixed(3)} px at (${r.x.toFixed(3)}, ${r.y.toFixed(3)}) near ${r.j}; keyed ${r.k.toFixed(3)}`);
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
KF_INC.snap = snap0; KF_INC.cache = cache0; KF_INC.T = T0;
