import { loadDrag } from "./k1247s32_lib";
const { raw } = loadDrag(".claude/probes/K1247/out/s18/drag/def", 10);
const sc = raw[5]; const byId = new Map(sc.chains.map((c) => [c.id, c]));
const at = (id: number, s: number): [number, number] => { const p = byId.get(id)!.pts; let acc = 0; for (let k = 0; k + 3 < p.length; k += 2) { const l = Math.hypot(p[k + 2] - p[k], p[k + 3] - p[k + 1]); if (acc + l >= s) { const t = (s - acc) / l; return [p[k] + t * (p[k + 2] - p[k]), p[k + 1] + t * (p[k + 3] - p[k + 1])]; } acc += l; } return [NaN, NaN]; };
let mx = 0; for (const x of sc.crossings.slice(0, 200)) { const A = at(x.a.chain, x.a.s); const B = at(x.b.chain, x.b.s); mx = Math.max(mx, Math.hypot(A[0] - B[0], A[1] - B[1]) || 0); }
let mj = 0; for (const j of sc.junctions) for (const a of j.arms) { const P = at(a.chain, a.s); mj = Math.max(mj, Math.hypot(P[0] - j.c[0], P[1] - j.c[1]) || 0); }
console.log(`crossings max mismatch ${mx.toFixed(4)}; junction arm vs centre max ${mj.toFixed(4)}; halfWidth ${sc.look.halfWidth}; px ${sc.camera.pxPerUnit * sc.camera.dpr}; closed ${sc.chains.filter((c) => c.closed).length}/${sc.chains.length}`);
