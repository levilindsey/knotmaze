// K1247 s23: one record piece against today's band, vertex by vertex (Node only; the run-end miss).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s23_end.ts <dragDir> <frame> <pieceD>
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OB_DI, alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { zChains } from "../../../src/render/outline/draw";
import { BandRecState } from "../../../src/render/outline/band_rec";
import { bandGpu } from "../../../src/render/outline/band_gpu";

const [dir, fS, dS] = process.argv.slice(2);
const F = Number(fS); const D = Number(dS);
OB_DI.on = true; (globalThis as any).EFDBG = D;
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const scenes: SceneIn[] = files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; return s; });
const st = structure(scenes[0]);
const SC = new BandRecState(false);
for (let f = 0; f <= F; f++) {
  const sc = f === 0 ? scenes[0] : alignJunctionArms(st, scenes[f]); const zz = zChains(sc);
  const tb = frame(st, sc);
  const c = SC.band(st, tb, sc, zz); const lay = SC.lay!;
  if (f !== F) continue;
  const today = bandGpu(tb, sc, zz);
  let qG = 0;
  for (const p of tb.pieces) {
    const np = p.pts.length / 2; if (np < 2) continue;
    const q0 = qG; qG += np - 1; if (p.di !== D) continue;
    const TO: number[] = []; const TI: number[] = [];
    for (let i = 0; i < np - 1; i++) { const w = 6 * (q0 + i); TO.push(today.pos[2 * w], today.pos[2 * w + 1]); TI.push(today.pos[2 * (w + 2)], today.pos[2 * (w + 2) + 1]); }
    { const w = 6 * (q0 + np - 2); TO.push(today.pos[2 * (w + 1)], today.pos[2 * (w + 1) + 1]); TI.push(today.pos[2 * (w + 4)], today.pos[2 * (w + 4) + 1]); }
    const RO: number[] = []; const RI: number[] = []; const RSo: number[] = [];
    for (let i = 0; i < lay.used[D]; i++) { const w = 6 * (lay.off[D] + i); if (i === 0) { RO.push(c.pos[2 * w], c.pos[2 * w + 1]); RI.push(c.pos[2 * (w + 2)], c.pos[2 * (w + 2) + 1]); RSo.push(c.attr[4 * w]); } RO.push(c.pos[2 * (w + 1)], c.pos[2 * (w + 1) + 1]); RI.push(c.pos[2 * (w + 4)], c.pos[2 * (w + 4) + 1]); RSo.push(c.attr[4 * (w + 1)]); }
    const dPoly = (x: number, y: number, P: number[]): number => {
      const n = P.length / 2; let best = Infinity;
      for (let i = 0; i + 1 < n; i++) { const ax = P[2 * i]; const ay = P[2 * i + 1]; const ex = P[2 * i + 2] - ax; const ey = P[2 * i + 3] - ay; const l2 = ex * ex + ey * ey; const u = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2)) : 0; best = Math.min(best, (ax + u * ex - x) ** 2 + (ay + u * ey - y) ** 2); }
      return Math.sqrt(best) * 40;
    };
    console.log(`f${F} d${D} ${p.kind} c${p.chain} side ${p.side} s ${p.s0.toFixed(4)}..${p.s1.toFixed(4)} np ${np} cap ${lay.cap[D]} used ${lay.used[D]} how ${lay.how[D]} alpha ${p.alpha ? 1 : 0}`);
    const fmt = (P: number[], i: number): string => `(${P[2 * i].toFixed(4)},${P[2 * i + 1].toFixed(4)})`;
    console.log("today outer/inner, dist to records (px):");
    for (let i = 0; i < np; i++) console.log(`  t${i} O${fmt(TO, i)} ${dPoly(TO[2 * i], TO[2 * i + 1], RO).toFixed(3)}  I${fmt(TI, i)} ${dPoly(TI[2 * i], TI[2 * i + 1], RI).toFixed(3)}  cpts(${p.cpts[2 * i].toFixed(4)},${p.cpts[2 * i + 1].toFixed(4)})`);
    // The end groups: today's points sharing the end's cpts, as angle (deg) and radius about it.
    for (const [nm, i0, i1] of [["start", 0, 6], ["end", np - 7, np - 1]] as [string, number, number][]) {
      const out: string[] = [];
      for (let i = Math.max(0, i0); i <= Math.min(np - 1, i1); i++) { const cx = p.cpts[2 * i]; const cy = p.cpts[2 * i + 1]; out.push(`${i}:${((Math.atan2(TO[2 * i + 1] - cy, TO[2 * i] - cx) * 180) / Math.PI).toFixed(6)}/${Math.hypot(TO[2 * i] - cx, TO[2 * i + 1] - cy).toFixed(9)}`); }
      console.log(`${nm} angles/radii: ${out.join(" ")}  h ${tb.h}`);
    }
    console.log("records outer/inner, dist to today (px):");
    const nr = RO.length / 2;
    for (let i = 0; i < nr; i++) console.log(`  r${i} s ${RSo[i].toFixed(4)} O${fmt(RO, i)} ${dPoly(RO[2 * i], RO[2 * i + 1], TO).toFixed(3)}  I${fmt(RI, i)} ${dPoly(RI[2 * i], RI[2 * i + 1], TI).toFixed(3)}`);
  }
}
