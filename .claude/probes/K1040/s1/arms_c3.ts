// K1040 S1e F4: the arms candidate 3 moves. Per scene, four FormB builds:
// c1 (curvedReach false: the straight reach, S1d's and S1e's final
// definition), c2 (curvedReach true, curvedFrom 0: the curved reach
// everywhere), c3 (curvedReach true: the curved reach past curvedFrom = 4 h)
// and the default, which must equal c1 arm for arm. Lists every arm whose L
// moves by more than 1e-3 between c1 and c3, with c2's L and the pass that
// binds its c1 Lcut (d, θ, the straight reach in h); counts the arms c2
// moves that c3 leaves.
// Run: npx vite-node .claude/probes/K1040/s1/arms_c3.ts [scene...]
import { readFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";

const ALL = ["def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "muse_hash", "muse_default_tw", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const argList = process.argv.slice(2);
const names = argList.length ? argList : ALL;
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
let tot3 = 0;
let tot2 = 0;
let totDef = 0;
for (const name of names) {
  const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
  sc.look.ctrlArc ??= 0.47;
  const b1 = new FormB(sc, { curvedReach: false });
  const b2 = new FormB(sc, { curvedReach: true, curvedFrom: 0 });
  const b3 = new FormB(sc, { curvedReach: true });
  const bDef = new FormB(sc);
  const hw = b1.h;
  let n3 = 0;
  let n2 = 0;
  let n2only = 0;
  let nDef = 0;
  const rows: string[] = [];
  for (let ai = 0; ai < b1.arms.length; ai++) {
    const l1 = b1.arms[ai].L;
    const l2 = b2.arms[ai].L;
    const l3 = b3.arms[ai].L;
    if (bDef.arms[ai].L !== l1) nDef++;
    const m3 = Math.abs(l3 - l1) > 1e-3;
    const m2 = Math.abs(l2 - l1) > 1e-3;
    if (m3) n3++;
    if (m2) n2++;
    if (m2 && !m3) n2only++;
    if (!m3) continue;
    const a1 = b1.arms[ai];
    const pa = b1.polys[a1.pi];
    let best = { d: NaN, theta: NaN, c: Infinity };
    for (const x of b1.passes[a1.pi]) {
      let d = (x.s - a1.sR) * a1.dir;
      if (pa.closed) d = ((d % pa.len) + pa.len) % pa.len;
      if (d < -1e-12) continue;
      const tn = Math.tan(x.theta / 2);
      const c = tn > 1e-12 ? d - hw / tn - hw : -Infinity;
      if (c < best.c) best = { d, theta: x.theta, c };
    }
    rows.push(`  arm ${ai} (j ${a1.j} pi ${a1.pi} dir ${a1.dir}) L c1 ${f(l1)} c2 ${f(l2)} c3 ${f(l3)} | c1 binds d ${f(best.d)} θ ${f(best.theta, 4)} reach ${f((best.d - best.c - hw) / hw, 1)} h`);
  }
  tot3 += n3;
  tot2 += n2;
  totDef += nDef;
  console.log(`== ${name}: h ${f(hw, 4)}; arms ${b1.arms.length}, L = 0 c1 ${b1.arms.filter((a) => a.L === 0).length} c3 ${b3.arms.filter((a) => a.L === 0).length}; moved by c3 ${n3}, by c2 ${n2} (${n2only} c2 only); default != c1 on ${nDef}`);
  for (const r of rows) console.log(r);
}
console.log(`ALL: moved by c3 ${tot3}, by c2 ${tot2}; default != c1 on ${totDef}`);
