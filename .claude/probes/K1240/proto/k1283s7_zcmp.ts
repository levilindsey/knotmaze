// K1283 s7: outline z vs form B z at a round end's term, c' and the through chain's foot.
// Usage: k1283s7_zcmp.ts <scene> <ji,ji>
import { FormB } from "../../../../src/render/field/form_b";
import * as D from "./draw";
import { loadScene } from "./k1279_census";
const [nm, js] = process.argv.slice(2);
const scene: any = loadScene(nm); const zz = D.zChains(scene); const h = scene.look.halfWidth;
const fb: any = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 });
const at = (c: any, s: number): [number, number] => { let best = 0; let bd = Infinity; for (let i = 0; i < c.n; i++) { const d = Math.abs(c.s[i] - s); if (d < bd) { bd = d; best = i; } } return [c.xs[best], c.ys[best]]; };
for (const ji of js.split(",").map(Number)) {
  const J = scene.junctions[ji];
  for (const a of J.arms) {
    if (a.kind !== "end") continue;
    const cE = zz.zc[zz.idx.get(a.chain)!]; const [tx, ty] = at(cE, a.s);
    let best = Infinity; let cp: [number, number] = [J.c[0], J.c[1]]; let tc = -1; let ts = 0;
    for (const t of J.arms) { if (t.kind !== "through") continue; const ct = zz.zc[zz.idx.get(t.chain)!]; const f = D.footNear(ct, tx, ty, t.s, 4 * h, 0, 0); if (f.d < best) { best = f.d; cp = at(ct, f.s); tc = t.chain; ts = f.s; } }
    const ct = zz.zc[zz.idx.get(tc)!];
    console.log(`j${ji} end c${a.chain}@${a.s.toFixed(2)} zO ${D.zAtC(cE, a.s).toFixed(4)} | through c${tc}@${ts.toFixed(2)} zO ${D.zAtC(ct, ts).toFixed(4)} | |term-c'|/h ${(Math.hypot(tx - cp[0], ty - cp[1]) / h).toFixed(3)}`);
    for (const [lab, u] of [["term", 0], ["mid", 0.5], ["c'", 1], ["past c' 0.5h", -1]] as [string, number][]) {
      let x: number; let y: number;
      if (u >= 0) { x = tx + (cp[0] - tx) * u; y = ty + (cp[1] - ty) * u; } else { const L = Math.hypot(cp[0] - tx, cp[1] - ty) || 1; x = cp[0] + ((cp[0] - tx) / L) * 0.5 * h; y = cp[1] + ((cp[1] - ty) / L) * 0.5 * h; }
      const ev = fb.evalPoint(x, y);
      console.log(`  ${lab}: fb top chain c${ev.chain} z ${(+ev.z).toFixed(4)} key ${(+ev.key).toFixed(4)} dkey ${(+ev.dkey).toFixed(4)}`);
    }
  }
}