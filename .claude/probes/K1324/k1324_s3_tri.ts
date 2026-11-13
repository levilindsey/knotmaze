// K1324 s3: the band triangles covering a point, with their vertices, and each vertex's tie broken down by
// pass (draw.ts tieAlpha's terms: the partner's foot, the key gap, the bury shift, the fade).
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s3_tri.ts <scene> <x> <y>
import { readFileSync } from "node:fs";
import { frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import * as D from "../../../src/render/outline/draw";

const [nm, xs, ys] = process.argv.slice(2);
const sc = JSON.parse(readFileSync(`.claude/probes/K868/scenes/${nm}.json`, "utf8")) as SceneIn;
(sc.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const table = frame(structure(sc), sc); const zz = D.zChains(sc);
const h = table.h; const W = table.W; const zt = 0.1 * sc.look.depthAmp;
const px = Number(xs); const py = Number(ys);
type P = { s: number; o: number; so: number; lo: number; hi: number; rO: number };
const breakdown = (c: number, x: number, y: number, s: number, dC: number): void => {
  const C = zz.zc[c]; const zCs = D.zAtC(C, s); const keyC = zCs - (dC * zt) / h;
  console.log(`      own ch ${c} s ${s.toFixed(3)} zCs ${(zCs / zt).toFixed(2)}zt dC ${(dC / h).toFixed(3)}h keyC ${(keyC / zt).toFixed(2)}zt`);
  for (const Pp of zz.passes[c] as P[]) {
    const ds = D.dSC(C, Pp.s, s); if (ds < -Pp.lo || ds > Pp.hi) continue;
    const O = zz.zc[Pp.o];
    const f = D.footNear(O, x, y, Pp.so, Pp.rO, s, Pp.o === c ? 3 * h : 0);
    const g = Math.min(1, Math.max(0, (h - f.d) / W));
    const zOf = D.zAtC(O, f.s); const keyO = zOf - (f.d * zt) / h;
    const dA = Pp.o === c ? D.zAtC(C, Pp.so) - D.zAtC(C, Pp.s) : 0;
    const bury = Pp.o === c ? D.selfBury(dA, zCs, zOf, zt) : 0;
    const fade = f.d < h ? 1 - g * D.sstep(-zt, zt, keyO - keyC + bury) : 1;
    console.log(`      pass s ${Pp.s.toFixed(2)} -> ch ${Pp.o} so ${Pp.so.toFixed(2)}: foot s ${f.s.toFixed(3)} d ${(f.d / h).toFixed(3)}h g ${g.toFixed(2)} zOf ${(zOf / zt).toFixed(2)}zt keyO-keyC ${((keyO - keyC) / zt).toFixed(2)}zt D ${(dA / zt).toFixed(1)}zt bury ${(bury / zt).toFixed(2)}zt fade ${fade.toFixed(3)}`);
  }
};
table.pieces.forEach((p, pi) => {
  const bd = D.bandData({ ...table, pieces: [p] }, sc, zz);
  for (let t = 0; t < bd.bandCount / 3; t++) {
    const T = bd.bandPos; const A = bd.bandAlpha;
    const ax = T[6 * t]; const ay = T[6 * t + 1]; const bx = T[6 * t + 2]; const by = T[6 * t + 3]; const cx = T[6 * t + 4]; const cy = T[6 * t + 5];
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (!(Math.abs(den) > 1e-18)) continue;
    const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den; const l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den; const l3 = 1 - l1 - l2;
    if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
    console.log(`p${pi} ${p.kind} ch ${p.chain} s ${p.s0.toFixed(2)}-${p.s1.toFixed(2)} tri ${t} bary ${l1.toFixed(2)} ${l2.toFixed(2)} ${l3.toFixed(2)}`);
    for (let k = 0; k < 3; k++) {
      const vx = T[6 * t + 2 * k]; const vy = T[6 * t + 2 * k + 1];
      console.log(`   v${k} (${vx.toFixed(4)}, ${vy.toFixed(4)}) a ${A[3 * t + k].toFixed(3)}`);
      if (A[3 * t + k] < 0.999 && p.chain >= 0) {
        // own s and dC as bandData takes them: the foot on the own chain near the vertex.
        const f = D.footNear(zz.zc[p.chain], vx, vy, (p.s0 + p.s1) / 2, 2 * h + Math.abs(p.s1 - p.s0), 0, 0);
        breakdown(p.chain, vx, vy, f.s, f.d);
      }
    }
  }
});
console.log(`h ${h} W ${W} zt ${zt}`);
