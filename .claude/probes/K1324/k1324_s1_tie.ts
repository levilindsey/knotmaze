// K1324 s1: tieAlpha's terms at a piece's border points near a spot (x22's smear).
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s1_tie.ts <scene> <x> <y> [--r=0.5] [--piece=n] [--every=2]
// For each tied piece's border point within r of (x, y): own s, own key (outer row), and every pass that reaches it
// (pass s, partner, foot s, foot distance, partner key, gap keyO - keyC, the fade f, and the crossing's order).
import * as D from "../../../src/render/outline/draw";
import { buildModel } from "../K1314/k1314_census";

const [nm, xs, ys] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string, d: number): number => Number(process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const x0 = Number(xs); const y0 = Number(ys); const r = opt("r", 0.5); const only = opt("piece", -1); const every = opt("every", 2);
const m = buildModel(nm);
const { zc, passes } = m.zz; const h = m.table.h; const W = m.table.W; const zt = 0.1 * m.scene.look.depthAmp;
const ids = [...m.zz.idx.entries()].sort((a, b) => a[1] - b[1]).map((e) => e[0]);
console.log(`${nm} h ${h} W ${W} zt ${zt.toFixed(3)}`);
m.table.pieces.forEach((p, pi) => {
  if (only >= 0 && pi !== only) return;
  if (!(p.kind === "run" || p.kind === "ghost") || p.chain < 0) return;
  const C = zc[p.chain]; const np = p.pts.length / 2;
  const cum = [0]; for (let i = 1; i < np; i++) cum.push(cum[i - 1] + Math.hypot(p.pts[2 * i] - p.pts[2 * i - 2], p.pts[2 * i + 1] - p.pts[2 * i - 1]));
  const L = cum[np - 1] || 1; let shown = 0;
  for (let i = 0; i < np; i += every) {
    const x = p.pts[2 * i]; const y = p.pts[2 * i + 1]; if (Math.hypot(x - x0, y - y0) > r) continue;
    const s = D.footNear(C, p.cpts[2 * i], p.cpts[2 * i + 1], p.s0 + ((p.s1 - p.s0) * cum[i]) / L, 2 * h, 0, 0).s;
    const keyC = D.zAtC(C, s) - zt; // outer row: dC = h
    const terms: string[] = [];
    for (const P of passes[p.chain]) {
      const ds = D.dSC(C, P.s, s); if (ds < -P.lo || ds > P.hi) continue;
      const O = zc[P.o]; const f = D.footNear(O, x, y, P.so, P.rO, s, P.o === p.chain ? 3 * h : 0);
      if (!(f.d < h)) continue;
      const g = Math.min(1, Math.max(0, (h - f.d) / W)); const keyO = D.zAtC(O, f.s) - (f.d * zt) / h;
      terms.push(`P@${P.s.toFixed(2)}->c${ids[P.o]}@${P.so.toFixed(2)} foot ${f.s.toFixed(2)} d ${f.d.toFixed(3)} zO ${D.zAtC(O, f.s).toFixed(3)} gap ${(keyO - keyC).toFixed(3)} f ${(1 - g * D.sstep(-zt, zt, keyO - keyC)).toFixed(2)}`);
    }
    console.log(`p${pi} ${p.kind} c${ids[p.chain]} side ${p.side} i${i} (${x.toFixed(2)},${y.toFixed(2)}) s ${s.toFixed(2)} zC ${D.zAtC(C, s).toFixed(3)}: ${terms.join("; ") || "-"}`);
    if (++shown > 14) break;
  }
});
