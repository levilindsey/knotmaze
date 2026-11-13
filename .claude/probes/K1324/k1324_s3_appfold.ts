// K1324 s3 scratch: pixels in a window where two or more of the app band's (bandGpu) triangles of one chain
// overlap (a folded fan inks twice), with the first few triangles' vertices.
import { bandGpu } from "../../../src/render/outline/band_gpu";
import { buildModel } from "../K1314/k1314_census";

const [nm, xs, ys, rs, ps] = process.argv.slice(2);
const m = buildModel(nm); const cx = Number(xs); const cy = Number(ys); const R = Number(rs ?? 0.06); const ppu = Number(ps ?? 960);
const b = bandGpu(m.table, m.scene, m.zz);
const c0 = Math.floor((cx - R) * ppu); const r0 = Math.floor((cy - R) * ppu); const N = Math.ceil(2 * R * ppu);
const hits = new Map<number, number[]>();
for (let t = 0; 3 * t + 2 < b.count; t++) {
  const v = [3 * t, 3 * t + 1, 3 * t + 2];
  const X = v.map((k) => b.pos[2 * k]); const Y = v.map((k) => b.pos[2 * k + 1]);
  if (Math.max(...X) < cx - R || Math.min(...X) > cx + R || Math.max(...Y) < cy - R || Math.min(...Y) > cy + R) continue;
  const den = (Y[1] - Y[2]) * (X[0] - X[2]) + (X[2] - X[1]) * (Y[0] - Y[2]); if (!(Math.abs(den) > 1e-18)) continue;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu;
    const l1 = ((Y[1] - Y[2]) * (x - X[2]) + (X[2] - X[1]) * (y - Y[2])) / den; const l2 = ((Y[2] - Y[0]) * (x - X[2]) + (X[0] - X[2]) * (y - Y[2])) / den; const l3 = 1 - l1 - l2;
    if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
    const i = r * N + c; (hits.get(i) ?? hits.set(i, []).get(i)!).push(t);
  }
}
let n = 0; const shown = new Set<string>();
for (const [i, ts] of hits) {
  const byCh = new Map<number, number[]>(); for (const t of ts) { if (process.env.UNTIED && b.slots[12 * t] >= 0) continue; const ch = b.chain[3 * t]; (byCh.get(ch) ?? byCh.set(ch, []).get(ch)!).push(t); }
  for (const [ch, l] of byCh) if (l.length > 1) {
    n++; const k = l.join(",");
    if (shown.size < 4 && !shown.has(k)) {
      shown.add(k); const x = (c0 + (i % N) + 0.5) / ppu; const y = (r0 + Math.floor(i / N) + 0.5) / ppu;
      console.log(`(${x.toFixed(4)}, ${y.toFixed(4)}) ch ${ch} tris ${k}: ${l.map((t) => [0, 1, 2].map((q) => `(${b.pos[6 * t + 2 * q].toFixed(4)}, ${b.pos[6 * t + 2 * q + 1].toFixed(4)}) w ${b.attr[4 * (3 * t + q) + 3].toFixed(2)} sl ${b.slots[4 * (3 * t + q)]}`).join(" ")).join(" | ")}`);
    }
  }
}
console.log(`${n} px with two or more triangles of one chain, window ${N}x${N} at ${ppu} px/unit`);
