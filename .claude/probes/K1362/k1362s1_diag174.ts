import { buildModel, plainOf } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
const m = buildModel("def"); const f = plainOf(m) as any; const h = f.h;
const a = 531, b = 532, th0 = 3.1017; const A = f.arms[a], B = f.arms[b]; const j = f.scene.junctions[174];
let bx = A.ux + B.ux, by = A.uy + B.uy; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl; const sn = Math.sin(th0 / 2);
const full = [0, Infinity]; const V = f.solveEq(a, b, h, j.c[0] + (bx * h) / sn, j.c[1] + (by * h) / sn, full, full);
const dVa = f.armDist(a, V.fa.s), dVb = f.armDist(b, V.fb.s);
const crossA = A.ux * (V.y - j.c[1]) - A.uy * (V.x - j.c[0]); const crossB = B.ux * (V.y - j.c[1]) - B.uy * (V.x - j.c[0]); const sgn = Math.sign(A.ux * B.uy - A.uy * B.ux);
console.log(`V ok ${V.ok} (${V.x.toFixed(4)},${V.y.toFixed(4)}) dVa/h ${(dVa / h).toFixed(4)} dVb/h ${(dVb / h).toFixed(4)} L ${A.L.toFixed(3)} ${B.L.toFixed(3)} crossA*s ${(crossA * sgn).toFixed(5)} crossB*s ${(crossB * sgn).toFixed(5)} c (${j.c[0].toFixed(4)},${j.c[1].toFixed(4)})`);
