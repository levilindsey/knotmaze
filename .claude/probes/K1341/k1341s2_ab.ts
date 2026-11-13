// K1341 s2: interleaved master (src/render/outline_m, untracked copy) vs branch, fill/band/zChains per frame.
// usage: node <out>/k1341s2_ab.mjs <s18 root> [R=8] [drags=def,muse_hash,fat]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import * as B from "../../../src/render/outline/outline";
import * as BM from "../../../src/render/outline/outline_model";
import * as BF from "../../../src/render/outline/fill_tri";
import * as BD from "../../../src/render/outline/draw";
import * as M from "../../../src/render/outline_m/outline";
import * as MM from "../../../src/render/outline_m/outline_model";
import * as MF from "../../../src/render/outline_m/fill_tri";
import * as MD from "../../../src/render/outline_m/draw";
const [root, Rs = "8", dl = "def,muse_hash,fat"] = process.argv.slice(2);
const R = Number(Rs);
const V: Record<string, any> = { master: { O: M, Mo: MM, F: MF, D: MD }, branch: { O: B, Mo: BM, F: BF, D: BD } };
const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const mean = (a: number[]): number => a.reduce((s, v) => s + v, 0) / a.length;
const sd = (a: number[]): number => { const u = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - u) ** 2, 0) / Math.max(1, a.length - 1)); };
for (const nm of dl.split(",")) {
  const dir = join(root, nm);
  const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
  const mk = () => files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; Object.assign(s.look, { fillRec: 2, bandRec: 1, bandRecGpu: 1 }); return s; });
  const st: Record<string, any> = {};
  for (const k of ["master", "branch"]) { const sc = mk(); st[k] = { sc, m: new V[k].Mo.OutlineModel(sc[0]), buf: {} }; }
  const P: Record<string, Record<string, number[]>> = { master: { z: [], f: [], b: [] }, branch: { z: [], f: [], b: [] } };
  const n = st.master.sc.length;
  for (let r = 0; r < R + 2; r++) for (let i = 1; i < n; i++) {
    const order = (i + r) % 2 ? ["master", "branch"] : ["branch", "master"];
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
    const a = P.master[part]; const b = P.branch[part];
    const d = a.map((v, i) => b[i] - v); const se = sd(d) / Math.sqrt(d.length);
    console.log(`${nm.padEnd(9)} ${part} master p50 ${q(a, .5).toFixed(2)} mean ${mean(a).toFixed(2)} | branch p50 ${q(b, .5).toFixed(2)} mean ${mean(b).toFixed(2)} | diff ${(mean(d)).toFixed(3)} +-${(1.96 * se).toFixed(3)} (${(100 * mean(d) / mean(a)).toFixed(1)}%)`);
  }
}
