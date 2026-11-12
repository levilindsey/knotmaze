// K1247 s22 debug: frame 0's tied run/ghost pieces, colAt's column 1 vs today's polyline, bucketed.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s22_dbg.ts <dragDir>
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OB_DI, alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { zChains } from "../../../src/render/outline/draw";
import { colAt, recSideOk, recTables } from "../../../src/render/outline/chain_frame";

const dir = process.argv[2];
const fl = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort(); const f0 = fl[0]; const FI = Number(process.argv[3] ?? 0);
const sc: SceneIn = JSON.parse(readFileSync(join(dir, f0), "utf8")); sc.look.ctrlArc ??= 0.47;
OB_DI.on = true;
const st = structure(sc); const scF: SceneIn = FI ? alignJunctionArms(st, (() => { const s = JSON.parse(readFileSync(join(dir, fl[FI]), "utf8")); s.look.ctrlArc ??= 0.47; return s; })()) : sc; const tb = frame(st, scF); const zz = zChains(scF); const T = recTables(zz.zc, tb.h);
const dPoly = (x: number, y: number, P: ArrayLike<number>, n: number): number => {
  let best = Infinity;
  for (let i = 0; i + 1 < n; i++) {
    const ax = P[2 * i]; const ay = P[2 * i + 1]; const ex = P[2 * i + 2] - ax; const ey = P[2 * i + 3] - ay; const l2 = ex * ex + ey * ey;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2)) : 0;
    best = Math.min(best, (ax + t * ex - x) ** 2 + (ay + t * ey - y) ** 2);
  }
  return Math.sqrt(best);
};
const B = new Map<string, number[]>(); const out = new Float64Array(2); let shown = 0;
for (const p of tb.pieces) {
  if (!(p.kind === "run" || p.kind === "ghost") || p.alpha || p.pts.length < 4) continue;
  const C = zz.zc[p.chain]; let dS = p.s1 - p.s0; const raw = dS; if (C.closed && dS <= 0) dS += C.len;
  const np = p.pts.length / 2; const N = Math.ceil((np - 1) * 1.25) + 4;
  if (!recSideOk(C, T, p.chain, p.s0, dS, N, p.side)) continue;
  let e = 0; let eF = 0;
  for (let i = 1; i < N; i++) {
    colAt(C, T.pf, T.base[p.chain], p.s0, dS, N, p.side, tb.h, i, out, 0); e = Math.max(e, dPoly(out[0], out[1], p.pts, np));
    colAt(C, T.pf, T.base[p.chain], p.s0, dS, N, p.side, tb.h - tb.W, i, out, 0); const TI: number[] = []; for (let q = 0; q < np; q++) { let dx = p.cpts[2 * q] - p.pts[2 * q]; let dy = p.cpts[2 * q + 1] - p.pts[2 * q + 1]; const l = Math.hypot(dx, dy) || 1; TI.push(p.pts[2 * q] + (dx / l) * tb.W, p.pts[2 * q + 1] + (dy / l) * tb.W); } eF = Math.max(eF, dPoly(out[0], out[1], TI, np));
  }
  const k = `${p.kind} side ${p.side} ${raw > 0 ? "fwd" : "rev"} ${C.closed ? "loop" : "open"} outer ${e * 40 > 0.25 ? "BAD" : "ok"} inner ${eF * 40 > 0.25 ? "BAD" : "ok"}`;
  const a = B.get(k) ?? []; a.push(e * 40); B.set(k, a);
  if ((e > 0.25 / 40 || eF > 0.25 / 40) && shown < 4) { shown++; console.log(`  e.g. ${p.kind} c${p.chain} side ${p.side} s0 ${p.s0.toFixed(3)} s1 ${p.s1.toFixed(3)} len ${C.len.toFixed(2)} np ${np} pts0 (${p.pts[0].toFixed(2)},${p.pts[1].toFixed(2)}) end (${p.pts[2 * np - 2].toFixed(2)},${p.pts[2 * np - 1].toFixed(2)}) e ${(e * 40).toFixed(2)} inner ${(eF * 40).toFixed(2)}px`); }
}
for (const [k, a] of [...B.entries()].sort()) console.log(`${k}: ${a.length}`);
