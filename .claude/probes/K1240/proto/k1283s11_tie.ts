// K1283 s11: at one pixel, form B's surfaces (id, chain, best key, nearest d, selfW) in its composite
// order, the tie pair, and the outline's tie alpha for each chain within h (its passes, feet, keys).
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283s11_tie.ts <scene>:<x>:<y> ...
import { FormB } from "../../../../src/render/field/form_b";
import * as D from "./draw";
import { loadScene } from "./k1279_census";

const cache = new Map<string, { fb: FormB; zz: ReturnType<typeof D.zChains>; scene: ReturnType<typeof loadScene> }>();
for (const spec of process.argv.slice(2).filter((a) => !a.startsWith("--"))) {
  const [nm, xs, ys] = spec.split(":"); const x = +xs; const y = +ys;
  let e = cache.get(nm);
  if (!e) {
    const scene = loadScene(nm);
    e = { fb: new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }), zz: D.zChains(scene as never), scene };
    cache.set(nm, e);
  }
  const { fb, zz, scene } = e;
  const h = scene.look.halfWidth; const zt = 0.1 * scene.look.depthAmp;
  const fbA = fb as unknown as { inkOf: (S: number, x: number, y: number, P: { surf: number; chain: number; key: number; d: number; s: number; selfW: number }[]) => { v: number; a: number } };
  const orig = fbA.inkOf.bind(fb);
  const rows: string[] = [];
  fbA.inkOf = (S, px, py, P) => {
    const r = orig(S, px, py, P as never);
    let bk = -Infinity; let bc = -1; let bd = Infinity; let bs = 0; let sw = 0;
    for (const A of P) if (A.surf === S && A.d < h + 0.02) { if (A.key > bk) { bk = A.key; bc = A.chain; bs = A.s; } if (A.d < bd) { bd = A.d; sw = A.selfW; } }
    rows.push(`    surf ${S} ch${bc} s${bs.toFixed(2)} key ${bk.toFixed(4)} dmin ${bd.toFixed(3)} selfW ${sw.toFixed(2)} v ${r.v.toFixed(2)} a ${r.a.toFixed(2)}`);
    return r;
  };
  const ev = fb.evalPoint(x, y);
  fbA.inkOf = orig;
  console.log(`${spec}: fb ink ${ev.ink.toFixed(3)} fade ${ev.fade} top ch${ev.chain} dkey ${ev.dkey.toFixed(4)} zt ${zt.toFixed(4)}`);
  for (const r of rows) console.log(r);
  // The outline's tie alpha, chain by chain (each chain whose centreline is within h).
  const alphaAt = D.tieAlpha(zz, h, 0.152, zt);
  zz.zc.forEach((C, c) => {
    const f = D.footNear(C, x, y, 0, 1e9, 0, 0); if (!(f.d < h)) return;
    const keyC = D.zAtC(C, f.s) - (f.d * zt) / h;
    const ps = zz.passes[c].map((P) => { const ds = D.dSC(C, P.s, f.s); return `${P.o}@${P.s.toFixed(1)}[${(-P.lo).toFixed(2)},${P.hi.toFixed(2)}]ds${ds.toFixed(2)}`; }).filter((t) => Math.abs(+t.split("ds")[1]) < 3);
    console.log(`  outline ch${c} s${f.s.toFixed(2)} d${f.d.toFixed(3)} keyC ${keyC.toFixed(4)} tieA(dC=h-d.. edge) ${alphaAt(c, x, y, f.s, f.d).toFixed(3)} passes near: ${ps.join(" ")}`);
  });
}
