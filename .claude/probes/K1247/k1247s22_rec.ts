// K1247 s22: the fixed band layout (band_rec.ts, ob=1) over a captured drag against today's band (bandGpu):
// restructures (vertex count or layout changes) per frame for both, the time of each (p50 after a warm-up
// rep), and fidelity: each record-placed vertex's distance to today's piece polyline (outer to outer,
// inner to inner) and each of today's vertices' distance to the record polyline (a chord cutting a corner),
// in device px at --ppu (default 40). Worst spots to out JSON (for the crops).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s22_rec.ts <dragDir> [reps=2] [--ppu=40] [--out=file.json]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OB_DI, alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { zChains } from "../../../src/render/outline/draw";
import { bandGpu } from "../../../src/render/outline/band_gpu";
import { BandRecState } from "../../../src/render/outline/band_rec";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string, d: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=")[1];
const dir = args[0]; const R = Number(args[1] ?? 2); const PPU = Number(opt("ppu", "40")); const OUT = opt("out", "");
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const scenes: SceneIn[] = files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; return s; });
OB_DI.on = true;
const st = structure(scenes[0]);
const inp = scenes.map((s, i) => { const sc = i === 0 ? s : alignJunctionArms(st, s); return { sc, zz: zChains(sc) }; }); // frame() per use: its pieces' pts are views into reused buffers
// Point-to-polyline distance.
const dPoly = (x: number, y: number, P: ArrayLike<number>, n: number): number => {
  let best = Infinity;
  for (let i = 0; i + 1 < n; i++) {
    const ax = P[2 * i]; const ay = P[2 * i + 1]; const bx = P[2 * i + 2]; const by = P[2 * i + 3];
    const ex = bx - ax; const ey = by - ay; const l2 = ex * ex + ey * ey;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2)) : 0;
    const dx = ax + t * ex - x; const dy = ay + t * ey - y; const d = dx * dx + dy * dy; if (d < best) best = d;
  }
  if (n === 1) best = (P[0] - x) ** 2 + (P[1] - y) ** 2;
  return Math.sqrt(best);
};
const tG: number[] = []; const tR: number[] = [];
const S = new BandRecState();
let restrG = 0; let restrR = 0; let prevCntG = -1; let prevCntR = -1; let prevLay: unknown = null; let relayoutsAt0 = 0;
const errs: number[] = []; const worst: { f: number; x: number; y: number; d: number; kind: string; chain: number; how: number }[] = []; const errBy: Record<number, number[]> = {};
let dbgN = 0; let recVerts = 0; let recPieces = 0; let padPieces = 0;
for (let r = 0; r < R; r++) for (let f = 0; f < inp.length; f++) {
  const { sc, zz } = inp[f]; const tb = frame(st, sc);
  const a = performance.now(); const g = bandGpu(tb, sc, zz); const b = performance.now();
  const s0 = { ...S.stats }; const rl0 = S.relayouts;
  const rb = S.band(st, tb, sc, zz); const c = performance.now();
  if (r > 0 || R === 1) { tG.push(b - a); tR.push(c - b); }
  // Restructures on the first pass (no capacity learned from an earlier pass).
  if (r === 0) {
    if (f === 0) relayoutsAt0 = S.relayouts;
    if (f > 0) { if (g.count !== prevCntG) restrG++; if (rb.count !== prevCntR || S.lay !== prevLay || S.relayouts !== rl0) restrR++; }
    prevCntG = g.count; prevCntR = rb.count; prevLay = S.lay;
  }
  if (r !== R - 1) continue;
  recPieces += S.stats.rec - s0.rec; padPieces += S.stats.pad - s0.pad;
  // Fidelity: per record piece (layout range), today's quads by piece order.
  const lay = S.lay!; let qG = 0;
  for (const p of tb.pieces) {
    const np = p.pts.length / 2; if (np < 2) continue;
    const q0 = qG; qG += np - 1;
    const d = p.di as number; const vo = 6 * lay.off[d]; const nq = lay.cap[d];
    // Today's outer and inner polylines (from bandGpu's quads: pO = v0, pI = v2; last cO = v1, cI = v4).
    const TO = new Float64Array(2 * np); const TI = new Float64Array(2 * np);
    for (let i = 0; i < np - 1; i++) { const w = 6 * (q0 + i); TO[2 * i] = g.pos[2 * w]; TO[2 * i + 1] = g.pos[2 * w + 1]; TI[2 * i] = g.pos[2 * (w + 2)]; TI[2 * i + 1] = g.pos[2 * (w + 2) + 1]; }
    { const w = 6 * (q0 + np - 2); TO[2 * np - 2] = g.pos[2 * (w + 1)]; TO[2 * np - 1] = g.pos[2 * (w + 1) + 1]; TI[2 * np - 2] = g.pos[2 * (w + 4)]; TI[2 * np - 1] = g.pos[2 * (w + 4) + 1]; }
    // The layout's: non-degenerate quads only (padding has alpha 0 on its outer vertex).
    const RO: number[] = []; const RI: number[] = [];
    for (let i = 0; i < Math.min(nq, lay.used[d]); i++) {
      const w = vo + 6 * i;
      if (i === 0) { RO.push(rb.pos[2 * w], rb.pos[2 * w + 1]); RI.push(rb.pos[2 * (w + 2)], rb.pos[2 * (w + 2) + 1]); }
      RO.push(rb.pos[2 * (w + 1)], rb.pos[2 * (w + 1) + 1]); RI.push(rb.pos[2 * (w + 4)], rb.pos[2 * (w + 4) + 1]);
    }
    const nr = RO.length / 2;
    let e = 0; let ex = 0; let ey = 0;
    const upd = (dd: number, x: number, y: number): void => { if (dd > e) { e = dd; ex = x; ey = y; } };
    let eO = 0; let iO = -1; for (let i = 0; i < nr; i++) { const dd = dPoly(RO[2 * i], RO[2 * i + 1], TO, np); if (dd > eO) { eO = dd; iO = i; } upd(dd, RO[2 * i], RO[2 * i + 1]); upd(dPoly(RI[2 * i], RI[2 * i + 1], TI, np), RI[2 * i], RI[2 * i + 1]); recVerts += 2; }
    for (let i = 0; i < np; i++) { upd(dPoly(TO[2 * i], TO[2 * i + 1], RO, nr), TO[2 * i], TO[2 * i + 1]); upd(dPoly(TI[2 * i], TI[2 * i + 1], RI, nr), TI[2 * i], TI[2 * i + 1]); }
    const px = e * PPU; errs.push(px); const hw = lay.how[d]; (errBy[hw] ??= []).push(px);
    if (process.env.DBG && px > Number(process.env.DBG) && dbgN++ < 3) console.log(`DBG outer-rec ${(eO * PPU).toFixed(2)}px at col ${iO}/${nr - 1} alpha ${p.alpha ? 1 : 0} f${f} ${p.kind} d${d} c${p.chain} side ${p.side} cap ${nq} np ${np} nr ${nr} s0 ${p.s0.toFixed(3)} s1 ${p.s1.toFixed(3)} TO ${Array.from(TO.slice(0, 4)).map((x) => x.toFixed(2))} .. ${Array.from(TO.slice(2 * np - 2)).map((x) => x.toFixed(2))} RO ${RO.slice(0, 4).map((x) => x.toFixed(2))} .. ${RO.slice(2 * nr - 4).map((x) => x.toFixed(2))}`);
    if (px > 0.05) worst.push({ f, x: ex, y: ey, d: px, kind: p.kind, chain: p.chain, how: hw });
  }
}
const p = (a: number[], q: number): number => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
worst.sort((a, b) => b.d - a.d);
const nF = inp.length - 1;
console.log(`${dir}: frames ${inp.length}; today restructures ${restrG}/${nF}, ob=1 ${restrR}/${nF} (relayouts ${S.relayouts - relayoutsAt0} after f0 over all reps; over ${S.stats.over} unkeyed ${S.stats.unkeyed} total; last over: ${S.stats.lastOver ?? "-"})`);
console.log(`  time p50: bandGpu ${p(tG, 0.5).toFixed(1)} ms, bandRec ${p(tR, 0.5).toFixed(1)} ms; verts today ${bandGpu(frame(st, inp[0].sc), inp[0].sc, inp[0].zz).count}, ob=1 ${6 * (S.lay?.Q ?? 0)}`);
console.log(`  pieces per frame: records ${(recPieces / inp.length).toFixed(0)}, padded ${(padPieces / inp.length).toFixed(0)}`);
console.log(`  fidelity per piece (max over its vertices, both ways), px at ppu ${PPU}: p50 ${p(errs, 0.5).toFixed(4)} p99 ${p(errs, 0.99).toFixed(3)} max ${p(errs, 1).toFixed(3)}; pieces > 0.25 px: ${errs.filter((e) => e > 0.25).length} of ${errs.length}`);
for (const [k, a] of Object.entries(errBy)) console.log(`  by placement ${['absent', 'records', 'padded', 'decimated'][Number(k)]}: ${a.length} pieces, p50 ${p(a, 0.5).toFixed(4)} p99 ${p(a, 0.99).toFixed(3)} max ${p(a, 1).toFixed(3)}, > 0.25 px ${a.filter((x) => x > 0.25).length}`);
console.log(`  worst: ${worst.slice(0, 5).map((w) => `f${w.f} ${w.kind} c${w.chain} (${w.x.toFixed(2)},${w.y.toFixed(2)}) ${w.d.toFixed(2)}px h${w.how}`).join("; ")}`);
if (OUT) writeFileSync(OUT, JSON.stringify(worst.slice(0, 200)));
