// K1344 s1: which band pieces ink a point, in the census (bandData, per vertex) and the app (bandGpu, per pixel).
//   node scripts/run_node.mjs .claude/probes/K1344/k1344_at.ts <scene> <x:y;x:y;...>
// Per point: every piece whose triangle holds it, with kind, chain, side, s0..s1, corner, region, the census
// alpha (bandData) and the app alpha (bandGpu's own alpha x the per-pixel tie, as BAND_FS), and the composite.
import * as D from "../../../src/render/outline/draw";
import { bandGpu } from "../../../src/render/outline/band_gpu";
import { buildModel } from "../K1314/k1314_census";
import { protoModel } from "./k1344_model";

const a = process.argv.slice(2);
// --proto: the model from outline_proto.ts (K1344.fix on), not src's.
const m = a.includes("--proto") ? protoModel(a[0]) : buildModel(a[0]);
const pts = a[1].split(";").map((p) => p.split(":").map(Number));
const bary = (X: number[], Y: number[], x: number, y: number): number[] | null => {
  const den = (Y[1] - Y[2]) * (X[0] - X[2]) + (X[2] - X[1]) * (Y[0] - Y[2]); if (!(Math.abs(den) > 1e-18)) return null;
  const l1 = ((Y[1] - Y[2]) * (x - X[2]) + (X[2] - X[1]) * (y - Y[2])) / den; const l2 = ((Y[2] - Y[0]) * (x - X[2]) + (X[0] - X[2]) * (y - Y[2])) / den; const l3 = 1 - l1 - l2;
  return l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9 ? null : [l1, l2, l3];
};
const out: string[][] = pts.map(() => []); const inkC = pts.map(() => 0); const inkA = pts.map(() => 0);
const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
const bx0 = Math.min(...xs) - 0.01; const bx1 = Math.max(...xs) + 0.01; const by0 = Math.min(...ys) - 0.01; const by1 = Math.max(...ys) + 0.01;
m.table.pieces.forEach((p, pi) => {
  let near = false; for (let k = 0; k < p.pts.length; k += 2) if (p.pts[k] > bx0 - 0.3 && p.pts[k] < bx1 + 0.3 && p.pts[k + 1] > by0 - 0.3 && p.pts[k + 1] < by1 + 0.3) { near = true; break; }
  if (!near) return;
  const one = { ...m.table, pieces: [p] };
  const bd = D.bandData(one, m.scene, m.zz);
  const bg = bandGpu(one, m.scene, m.zz); const tie = D.tieAlpha(m.zz, bg.h, bg.W, bg.zt);
  const tag = `p${pi} ${p.kind} ch${p.chain} side${p.side} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} cor${p.corner} reg${p.region}${p.alpha ? " own-alpha" : ""}`;
  pts.forEach(([x, y], q) => {
    let c = 0; let ap = 0; let nt = 0; let ng = 0;
    for (let t = 0; 3 * t + 2 < bd.bandCount; t++) {
      const v = [3 * t, 3 * t + 1, 3 * t + 2]; const L = bary(v.map((k) => bd.bandPos[2 * k]), v.map((k) => bd.bandPos[2 * k + 1]), x, y); if (!L) continue;
      const al = Math.min(1, Math.max(0, L[0] * bd.bandAlpha[v[0]] + L[1] * bd.bandAlpha[v[1]] + L[2] * bd.bandAlpha[v[2]])); c = 1 - (1 - c) * (1 - al); nt++;
    }
    let tri = "";
    for (let t = 0; 3 * t + 2 < bg.count; t++) {
      const v = [3 * t, 3 * t + 1, 3 * t + 2]; const L = bary(v.map((k) => bg.pos[2 * k]), v.map((k) => bg.pos[2 * k + 1]), x, y); if (!L) continue;
      const at = (k: number): number => L[0] * bg.attr[4 * v[0] + k] + L[1] * bg.attr[4 * v[1] + k] + L[2] * bg.attr[4 * v[2] + k];
      const ch = bg.chain[v[0]]; const sl = bg.slots.subarray(4 * v[0], 4 * v[0] + 4); const tied = ch >= 0 && Array.from(sl).some((s) => s >= 0);
      const al = Math.min(1, Math.max(0, tied ? at(3) * tie(ch, x, y, at(0), at(1)) : at(3))); ap = 1 - (1 - ap) * (1 - al); ng++;
      tri = ` gtri${t} own(${[0, 1, 2].map((k) => bg.attr[4 * v[k] + 3].toFixed(3)).join(",")}) dC ${at(1).toFixed(4)} s ${at(0).toFixed(4)}`;
    }
    if (nt || ng) { out[q].push(`  ${tag}: census ${c.toFixed(3)} (${nt} tri) app ${ap.toFixed(3)} (${ng} tri)${tri}`); inkC[q] = 1 - (1 - inkC[q]) * (1 - c); inkA[q] = 1 - (1 - inkA[q]) * (1 - ap); }
  });
});
pts.forEach(([x, y], q) => { console.log(`(${x}, ${y}) census ${inkC[q].toFixed(3)} app ${inkA[q].toFixed(3)}`); for (const s of out[q]) console.log(s); });
