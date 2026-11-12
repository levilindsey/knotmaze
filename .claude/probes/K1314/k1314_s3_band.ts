// K1314 s3: the GPU band (band_gpu) against its CPU twin with the piece's own alpha.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s3_band.ts [scene=muse_hash] [junction=78] [--r=3 (in h)]
// For every tied quad: alphaCpu(..., base = the vertex's attr .w, interpolated as the GPU does) against
// draw's reference, tieAlpha * the piece's own alpha (outer/inner per point, bilinear), at 16 points.
// Prints the worst |got - want| over the scene and near the junction, and near the junction the
// tied quads whose own alpha is below 1 (the stretch stage 2's fade covers: the old GPU drew them at 1).
import { buildModel } from "./k1314_census";
import { tieAlpha, zAtC } from "../../../src/render/outline/draw";
import { alphaCpu, bandGpu, BAND_SLOTS } from "../../../src/render/outline/band_gpu";

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const nm = pos[0] ?? "muse_hash"; const J = Number(pos[1] ?? 78);
const R = Number(args.find((a) => a.startsWith("--r="))?.slice(4) ?? 3);
const m = buildModel(nm); const tb = m.table; const sc = m.scene; const zz = m.zz;
const b = bandGpu(tb, sc, zz);
const ref = tieAlpha(zz, tb.h, tb.W, 0.1 * sc.look.depthAmp);
const jx = sc.junctions[J].c[0]; const jy = sc.junctions[J].c[1];
let v = 0; let worst = 0; let worstJ = 0; let n = 0; let nJ = 0; let faded = 0; let oldWorst = 0;
for (const p of tb.pieces) {
  const np = p.pts.length / 2; if (np < 2) continue;
  const pa = p.alpha && p.alpha.length === 2 * np ? p.alpha : null;
  for (let i = 0; i + 1 < np; i++, v += 6) {
    const sl = Array.from(b.slots.subarray(BAND_SLOTS * v, BAND_SLOTS * v + BAND_SLOTS));
    if (sl.every((x) => x < 0)) continue;
    const P = (k: number, d: number): number => b.pos[2 * (v + k) + d];
    const A = (k: number, d: number): number => b.attr[4 * (v + k) + d];
    const mx = (P(0, 0) + P(1, 0)) / 2; const my = (P(0, 1) + P(1, 1)) / 2;
    const near = Math.hypot(mx - jx, my - jy) < R * tb.h;
    let qFaded = false;
    for (const t of [0, 0.3, 0.7, 1]) for (const u of [0, 0.25, 0.5, 1]) {
      const ox = P(0, 0) + (P(1, 0) - P(0, 0)) * t; const oy = P(0, 1) + (P(1, 1) - P(0, 1)) * t;
      const ix = P(2, 0) + (P(4, 0) - P(2, 0)) * t; const iy = P(2, 1) + (P(4, 1) - P(2, 1)) * t;
      const x = ox + (ix - ox) * u; const y = oy + (iy - oy) * u;
      const s = A(0, 0) + (A(1, 0) - A(0, 0)) * t; const dC = tb.h - tb.W * u;
      const oT = pa ? pa[2 * i] + (pa[2 * i + 2] - pa[2 * i]) * t : 1; const iT = pa ? pa[2 * i + 1] + (pa[2 * i + 3] - pa[2 * i + 1]) * t : 1;
      const own = oT + (iT - oT) * u;
      const wO = A(0, 3) + (A(1, 3) - A(0, 3)) * t; const wI = A(2, 3) + (A(4, 3) - A(2, 3)) * t; const base = wO + (wI - wO) * u;
      const tie = ref(p.chain, x, y, s, dC); const want = tie * own;
      const got = alphaCpu(b, x, y, s, dC, zAtC(zz.zc[p.chain], s), sl, base);
      const e = Math.abs(got - want); worst = Math.max(worst, e); n++;
      if (near) { worstJ = Math.max(worstJ, e); nJ++; if (own < 0.999) { qFaded = true; oldWorst = Math.max(oldWorst, Math.abs(tie - want)); } }
    }
    if (qFaded) faded++;
  }
}
console.log(`${nm} j${J} at (${jx.toFixed(3)},${jy.toFixed(3)}) h ${tb.h.toFixed(4)}: tied points ${n}, worst |alphaCpu*w - tie*own| ${worst.toExponential(2)}; within ${R} h: ${nJ} points, worst ${worstJ.toExponential(2)}; faded tied quads there ${faded}, worst |tie - tie*own| (what the GPU drew before) ${oldWorst.toFixed(3)}`);
