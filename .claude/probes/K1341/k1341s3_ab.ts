// K1341 s3: interleaved A/B, copy A = src/render/outline, copy B = src/render/outline_m, execution
// order randomized per pair (seeded). The s3 null test (identical copies, s2's harness) read fat
// zChains -11% for copy B, so a run is only meaningful paired with a second build whose two
// directories hold the opposite code: code effect = (diff1 - diff2) / 2, bias = (diff1 + diff2) / 2.
// usage: node <out>/k1341s3_ab.mjs <s18 drag root> [R=16] [drags=def,muse_hash,fat]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import * as OA from "../../../src/render/outline/outline";
import * as MA from "../../../src/render/outline/outline_model";
import * as FA from "../../../src/render/outline/fill_tri";
import * as DA from "../../../src/render/outline/draw";
import * as OB from "../../../src/render/outline_m/outline";
import * as MB from "../../../src/render/outline_m/outline_model";
import * as FB from "../../../src/render/outline_m/fill_tri";
import * as DB from "../../../src/render/outline_m/draw";
const [root, Rs = "16", dl = "def,muse_hash,fat"] = process.argv.slice(2);
const R = Number(Rs);
const V: Record<string, any> = { A: { O: OA, Mo: MA, F: FA, D: DA }, B: { O: OB, Mo: MB, F: FB, D: DB } };
const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const mean = (a: number[]): number => a.reduce((s, v) => s + v, 0) / a.length;
const sd = (a: number[]): number => { const u = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - u) ** 2, 0) / Math.max(1, a.length - 1)); };
let seed = 0x9e3779b9;
const rnd = (): number => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
for (const nm of dl.split(",")) {
  const dir = join(root, nm);
  const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
  const mk = () => files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; Object.assign(s.look, { fillRec: 2, bandRec: 1, bandRecGpu: 1 }); return s; });
  const st: Record<string, any> = {};
  for (const k of ["A", "B"]) { const sc = mk(); st[k] = { sc, m: new V[k].Mo.OutlineModel(sc[0]), buf: {} }; }
  const P: Record<string, Record<string, number[]>> = { A: { z: [], f: [], b: [] }, B: { z: [], f: [], b: [] } };
  const n = st.A.sc.length;
  for (let r = 0; r < R + 2; r++) for (let i = 1; i < n; i++) {
    const order: string[] = rnd() < 0.5 ? ["A", "B"] : ["B", "A"];
    for (const k of order) {
      const { O, F, D } = V[k]; const { sc, m, buf } = st[k];
      const scene = O.alignJunctionArms(m.st, sc[i]); O.OB_DI.on = true; m.table = O.frame(m.st, scene);
      const t1 = performance.now(); const zz = D.zChains(scene); const t2 = performance.now();
      const fr = F.fillFrame(m.fs, m.st, m.table, scene, zz, buf); const t3 = performance.now();
      m.recFrame = fr.rec ?? null; const t4 = performance.now(); m.band = m.bandOf(scene, zz); const t5 = performance.now();
      if (r >= 2) { P[k].z.push(t2 - t1); P[k].f.push(t3 - t2); P[k].b.push(t5 - t4); }
    }
  }
  for (const part of ["z", "f", "b"]) {
    const a = P.A[part]; const b = P.B[part];
    const d = a.map((v, i) => v - b[i]); const se = sd(d) / Math.sqrt(d.length);
    console.log(`${nm.padEnd(9)} ${part} A p50 ${q(a, .5).toFixed(2)} mean ${mean(a).toFixed(2)} | B p50 ${q(b, .5).toFixed(2)} mean ${mean(b).toFixed(2)} | A-B ${(mean(d)).toFixed(3)} +-${(1.96 * se).toFixed(3)} (${(100 * mean(d) / mean(b)).toFixed(1)}% of B) n=${d.length}`);
  }
}
