// K1482 s2: the geometry at a fused tail: the tip of chain c (start or end), the chains within 3h of it (distance,
// their s, depth and membership there), and the arms of the tip's junction group.
//   node scripts/run_node.mjs .claude/probes/K1482/tail_geom.ts <tables.json> <c> <s|e>
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [, , tp, cs, se] = process.argv;
const SRC = resolve(process.cwd());
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const { depthAt } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const raw = JSON.parse(readFileSync(tp, "utf8")); const T: any = {};
for (const [k, v] of Object.entries<any>(raw)) { if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; T[k] = C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); } else T[k] = v; }
const E: any = new GfEval(T);
const c = +cs; const v0 = T.cV0[c]; const nv = T.cNV[c];
const vi = se === "s" ? v0 : v0 + nv - 1; const vj = se === "s" ? v0 + 3 : v0 + nv - 4;
const tx = T.vx[vi], ty = T.vy[vi]; const ang = Math.atan2(T.vy[vi] - T.vy[vj], T.vx[vi] - T.vx[vj]) * 180 / Math.PI;
console.log(`chain ${c} ${se}: tip (${tx.toFixed(3)}, ${ty.toFixed(3)}) s ${T.vs[vi].toFixed(3)} heading ${ang.toFixed(0)} deg, h ${T.h} zt ${T.zt} amp ${T.amp} win ${T.win}`);
const near = (cc: number, x: number, y: number) => { let best = Infinity, bs = 0, bi = 0; for (let k = T.cV0[cc]; k < T.cV0[cc] + T.cNV[cc] - 1; k++) { const ax = T.vx[k], ay = T.vy[k], dx = T.vx[k + 1] - ax, dy = T.vy[k + 1] - ay; const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0; const d = Math.hypot(x - ax - dx * u, y - ay - dy * u); if (d < best) { best = d; bs = T.vs[k] + u * (T.vs[k + 1] - T.vs[k]); bi = k; } } return { d: best, s: bs, k: bi }; };
for (let cc = 0; cc < T.nC; cc++) {
  const n = near(cc, tx, ty); if (n.d > 3 * T.h) continue;
  const m = E.memberAt(cc, n.s); const z = depthAt(T, cc, n.s);
  const k = n.k; const hd = Math.atan2(T.vy[k + 1] - T.vy[k], T.vx[k + 1] - T.vx[k]) * 180 / Math.PI;
  console.log(`  c${cc}: d ${n.d.toFixed(3)} s ${n.s.toFixed(3)} z ${z.toFixed(3)} member g ${m.g} ramp ${m.ramp.toFixed(2)} heading ${hd.toFixed(0)}`);
  // along the chain near there: depth and membership every 0.2
  const row: string[] = [];
  for (let t = -1.6; t <= 1.6001; t += 0.4) { const s = n.s + t; const mm = E.memberAt(cc, s); row.push(`${t.toFixed(1)}:z${depthAt(T, cc, s).toFixed(2)}g${mm.g}r${mm.ramp.toFixed(1)}`); }
  console.log(`     ${row.join(" ")}`);
}
const mt = E.memberAt(c, T.vs[vi]); const g = mt.g;
console.log(`tip group ${g}; arms of group ${g}:`);
for (let i = 0; i < T.nA; i++) if (T.aG[i] === g) { let cc = -1; for (let q = 0; q < T.nC; q++) if (i >= T.cArm0[q] && i < T.cArm0[q] + T.cArmN[q]) cc = q; console.log(`  arm ${i} c${cc} sR ${T.aSR[i].toFixed(3)} dir ${T.aDir[i]} L ${T.aL[i].toFixed(3)} Lcut ${T.aLcut[i] === Infinity ? "Inf" : T.aLcut[i].toFixed(3)} home ${T.aHome[i].toFixed(3)}`); }
