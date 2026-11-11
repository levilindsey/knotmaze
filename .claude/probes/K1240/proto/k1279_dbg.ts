// K1279 debug: at points (x, y) of a scene, form B's evalPoint (ink, surfaces, dz, dkey)
// against the redesign's depth mirror (each chain within 1.5h: d, s, z, key at the edge).
// Usage: node scripts/run_node.mjs .claude/probes/K1240/proto/k1279_dbg.ts <scene> <x0>:<y0> <x1>:<y1> [--n=8]
import { FormB } from "../../../../src/render/field/form_b";
import { loadScene } from "./k1279_census";
import { zChains, zAtC, footNear, dSC } from "./draw";

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const n = Number(args.find((a) => a.startsWith("--n="))?.slice(4) ?? 8);
const scene = loadScene(pos[0]);
const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): Record<string, unknown> };
const [x0, y0] = pos[1].split(":").map(Number); const [x1, y1] = pos[2].split(":").map(Number);
const { zc, passes } = zChains(scene);
const h = scene.look.halfWidth; const zt = 0.1 * scene.look.depthAmp;
console.log(`h ${h} zt ${zt} amp ${scene.look.depthAmp} win ${scene.look.depthWindow * (scene.look.ctrlArc ?? 1)}`);
for (let i = 0; i <= n; i++) {
  const t = i / n; const x = x0 + (x1 - x0) * t; const y = y0 + (y1 - y0) * t;
  const e = fb.evalPoint(x, y);
  const mine: string[] = [];
  zc.forEach((c, ci) => {
    const f = footNear(c, x, y, 0, 1e9, 0, 0);
    if (f.d < 1.5 * h) mine.push(`c${ci} d=${(f.d / h).toFixed(2)}h s=${f.s.toFixed(3)} z=${zAtC(c, f.s).toFixed(3)} key=${(zAtC(c, f.s) - Math.min(f.d, h) * zt / h).toFixed(3)}`);
  });
  console.log(`(${x.toFixed(3)}, ${y.toFixed(3)}) B ink=${(e.ink as number).toFixed(2)} chain=${e.chain} z=${(e.z as number).toFixed(3)} nSurf=${e.nSurf} dz=${(e.dz as number).toFixed(3)} dkey=${(e.dkey as number).toFixed(3)} | ${mine.join(" ; ")}`);
}
const near = (ci: number): string => passes[ci].map((p) => `[s ${p.s.toFixed(2)} o c${p.o} so ${p.so.toFixed(2)} lo ${(p.lo / h).toFixed(1)}h hi ${(p.hi / h).toFixed(1)}h rO ${(p.rO / h).toFixed(1)}h]`).join(" ");
const used = new Set<number>(); zc.forEach((c, ci) => { const f = footNear(c, (x0 + x1) / 2, (y0 + y1) / 2, 0, 1e9, 0, 0); if (f.d < 3 * h) used.add(ci); });
for (const ci of used) console.log(`c${ci} passes: ${near(ci)}`);
const ac = args.find((a) => a.startsWith("--alpha="));
if (ac) {
  const c = Number(ac.slice(8)); const C = zc[c];
  for (let i = 0; i <= n; i++) {
    const t = i / n; const x = x0 + (x1 - x0) * t; const y = y0 + (y1 - y0) * t;
    const fc = footNear(C, x, y, 0, 1e9, 0, 0); const dC = Math.min(fc.d, h); const s = fc.s;
    const keyC = zAtC(C, s) - (dC * zt) / h;
    const parts: string[] = [];
    for (const P of passes[c]) {
      const ds = dSC(C, P.s, s); if (ds < -P.lo || ds > P.hi) continue;
      const O = zc[P.o];
      const f = footNear(O, x, y, P.so, P.rO, s, P.o === c ? 3 * h : 0);
      const W = 0.25 * h;
      const g = Math.min(1, Math.max(0, (h - f.d) / W));
      const keyO = zAtC(O, f.s) - (Math.min(f.d, h) * zt) / h;
      parts.push(`P(s ${P.s.toFixed(2)} o c${P.o}) ds ${(ds / h).toFixed(2)}h fo.d ${(f.d / h).toFixed(2)}h fo.s ${f.s.toFixed(2)} g ${g.toFixed(2)} keyO-keyC ${(keyO - keyC).toFixed(3)}`);
    }
    console.log(`alpha c${c} (${x.toFixed(3)}, ${y.toFixed(3)}) dC ${(fc.d / h).toFixed(2)}h s ${s.toFixed(2)} keyC ${keyC.toFixed(3)} :: ${parts.join(" | ")}`);
  }
}