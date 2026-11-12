// K1283 s11: one outline piece's band profile against form B, vertex by vertex: own s, p.alpha (outer,
// inner), the outline's band alpha at the band's middle (tie x own) and form B's ink there.
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283s11_prof.ts <scene> <piece> [--every=3] [--max=40]
import { FormB } from "../../../../src/render/field/form_b";
import * as O from "./outline";
import * as D from "./draw";
import { loadScene } from "./k1279_census";

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const every = Number(opt("every") ?? 3); const max = Number(opt("max") ?? 40);
const scene = loadScene(pos[0]);
const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 });
const st = O.structure(scene); const t = O.frame(st, scene);
const zz = D.zChains(scene as never);
const h = t.h; const W = t.W; const zt = 0.1 * scene.look.depthAmp;
const alphaAt = D.tieAlpha(zz, h, W, zt);
for (const ps of pos.slice(1)) {
  const pi = +ps; const p = t.pieces[pi]; const np = p.pts.length / 2;
  const C = zz.zc[p.chain];
  console.log(`piece ${pi} ${p.kind} ch${p.chain} side ${p.side} s ${p.s0.toFixed(2)}..${p.s1.toFixed(2)} np ${np} corner ${p.corner} alpha ${p.alpha ? "yes" : "no"}`);
  let n = 0;
  for (let i = 0; i < np && n < max; i += every, n++) {
    const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
    let dx = p.cpts[2 * i] - x; let dy = p.cpts[2 * i + 1] - y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const mx = x + dx * W * 0.5; const my = y + dy * W * 0.5;
    const f = D.footNear(C, p.cpts[2 * i], p.cpts[2 * i + 1], p.s0, 1e9, 0, 0);
    const tie = zz.passes[p.chain].length ? alphaAt(p.chain, mx, my, f.s, h - W * 0.5) : 1;
    const oa = p.alpha ? p.alpha[2 * i] : 1; const ia = p.alpha ? p.alpha[2 * i + 1] : 1;
    const ev = fb.evalPoint(mx, my);
    console.log(`  v${i} (${x.toFixed(3)}, ${y.toFixed(3)}) s ${f.s.toFixed(2)} own ${oa.toFixed(2)}/${ia.toFixed(2)} tie ${tie.toFixed(2)} out ${(tie * (oa + ia) / 2).toFixed(2)} fb ${Math.min(1, ev.ink).toFixed(2)} fade ${ev.fade} top ch${ev.chain}`);
  }
}
