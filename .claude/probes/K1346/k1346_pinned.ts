// K1346 s1: which pieces near (x, y) the band loop pin changes, and the opposed area it removed. Usage: <scene> <x> <y> <r>
import { buildModel } from "../K1314/k1314_census";
import * as O from "../../../src/render/outline/outline";
const [sc, xs, ys, rs] = process.argv.slice(2); const X = Number(xs); const Y = Number(ys); const R = Number(rs);
const mA = buildModel(sc); O.K1346.loops = false; const mM = buildModel(sc);
const W = 0.152;
const opp = (p: any): number => { const np = p.pts.length / 2; let t = 0; for (let i = 0; i < np - 1; i++) t += O.bandQuadArea(p.pts, p.cpts, W, i); let s = 0; for (let i = 0; i < np - 1; i++) s += O.bandQuadOpp(p.pts, p.cpts, W, i, t); return s * 960 * 960; };
mA.table.pieces.forEach((pa: any, i: number) => {
  const pm = mM.table.pieces[i] as any; if (!pm || pa.kind === "cap") return;
  let near = false; for (let k = 0; k < pm.pts.length; k += 2) if (Math.hypot(pm.pts[k] - X, pm.pts[k + 1] - Y) < R) near = true;
  if (!near || pa.pts.length !== pm.pts.length) { if (near) console.log(`#${i} ${pa.kind} len ${pm.pts.length / 2} -> ${pa.pts.length / 2}`); return; }
  let d = 0; for (let k = 0; k < pa.pts.length; k++) d = Math.max(d, Math.abs(pa.pts[k] - pm.pts[k]));
  if (d > 0) console.log(`#${i} ${pa.kind} c${pa.chain} moved ${d.toFixed(5)} opp px ${opp(pm).toFixed(2)} -> ${opp(pa).toFixed(2)}`);
});
