import { buildModel } from "../K1314/k1314_census";
import * as O from "../../../src/render/outline/outline";
const a = process.argv.slice(2); O.K1346.loops = false; O.K1346.chevron = false;
const m = buildModel(a[0]); const p = m.table.pieces[Number(a[1])] as any; const W = 0.152;
const np = p.pts.length / 2; let tot = 0; const sg: string[] = [];
for (let i = 0; i < np - 1; i++) { const ar = O.bandQuadArea(p.pts, p.cpts, W, i); tot += ar; if (i < 12 || i > np - 12) sg.push(`${i}:${ar.toExponential(1)}`); }
console.log(`tot ${tot.toExponential(2)}`); console.log(sg.join(" "));
const tr = O.trimFoldEnds(p.pts, p.cpts, W); console.log("trim", tr ? (tr.pts.length / 2) : null);
const lp = O.pinBandLoops(p.pts, p.cpts, W); console.log("pin", lp ? lp.slice(0, 14).map((v: number) => v.toFixed(4)).join(" ") : null);
