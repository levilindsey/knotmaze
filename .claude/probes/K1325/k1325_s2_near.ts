// K1325 s2: the crossings near a spot, with each one's chains, whether it is a self-crossing, its four overlap
// reaches (passReach) against form B's depth window, and the pins' depths, to find what separates the five spots.
//   node scripts/run_node.mjs .claude/probes/K1325/k1325_s2_near.ts [scene] [x,y;x,y...] [--r=1.5]
import { buildModel, passReach } from "../K1314/k1314_census";
import { FormB } from "../../../src/render/field/form_b";
import { normS } from "../../../src/render/field/geom";
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const nm = args[0] ?? "muse_hash";
const spots = (args[1] ?? "28.51,18.01;31.53,7.36;19.996,3.944;25.518,13.825;0.113,15.187").split(";").map((s) => s.split(",").map(Number));
const R = Number(process.argv.find((a) => a.startsWith("--r="))?.slice(4) ?? 1.5);
const m = buildModel(nm);
const F = new FormB(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as never as {
  h: number; W: number; depthWin: number; polys: { closed: boolean; s0: number; len: number }[]; idxOf: Map<number, number>;
  depthChains: { pins: { s: number; z: number }[] }[];
};
console.log(`${nm}: h ${F.h.toFixed(3)} W ${F.W.toFixed(3)} win ${F.depthWin.toFixed(3)}`);
const xs = m.scene.crossings as { a: { chain: number; s: number }; b: { chain: number; s: number } }[];
for (const [sx, sy] of spots) {
  console.log(`spot (${sx}, ${sy})`);
  xs.forEach((x, xi) => {
    const p = m.xPts[xi]; const d = Math.hypot(p.x - sx, p.y - sy); if (!(d < R)) return;
    const ia = F.idxOf.get(x.a.chain)!; const ib = F.idxOf.get(x.b.chain)!;
    const sa = normS(F.polys[ia] as never, x.a.s); const sb = normS(F.polys[ib] as never, x.b.s);
    const r = [passReach(F as never, ia, sa, ib, sb, -1), passReach(F as never, ia, sa, ib, sb, 1), passReach(F as never, ib, sb, ia, sa, -1), passReach(F as never, ib, sb, ia, sa, 1)];
    const pa = F.depthChains[ia].pins.find((q) => q.s === sa); const pb = F.depthChains[ib].pins.find((q) => q.s === sb && q !== pa);
    const flag = Math.max(...r) > F.depthWin && !!pa && !!pb;
    const ds = x.a.chain === x.b.chain ? Math.abs(sa - sb) : NaN;
    console.log(`  x${xi} d ${d.toFixed(2)} at (${p.x.toFixed(2)}, ${p.y.toFixed(2)}) c${x.a.chain}/c${x.b.chain}${x.a.chain === x.b.chain ? " SELF" : ""} s ${sa.toFixed(2)}/${sb.toFixed(2)}${Number.isNaN(ds) ? "" : ` ds ${ds.toFixed(2)}`} z ${pa?.z.toFixed(2)}/${pb?.z.toFixed(2)} reach ${r.map((v) => v.toFixed(2)).join(" ")}${flag ? " FLAG" : ""}`);
  });
}
