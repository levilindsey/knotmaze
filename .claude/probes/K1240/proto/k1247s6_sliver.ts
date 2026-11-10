// K1247 s6: the fill/outline sliver (stage 5's 2_user_tw42.lightpaper_0_c31
// crop). The pictures' fill is form B's top surface (src/render/field/
// form_b.ts), whose corners still grow over 32 fixed nodes; the outline's
// corner is the new growth. Per scene: each corner's q in form B, today's
// outline (outline_base.ts, master 2d452e0e, scratch) and the new one, matched
// by V; the largest |q_formB - q_today| and |q_formB - q_new| in h and in
// device px (pxPerUnit at dpr 2), and how many corners sit over 0.5 px off
// form B's (each one a sliver where the new arc lies inside form B's hole, an
// overlap where it lies outside).
//   git show 2d452e0e:.claude/probes/K1240/proto/outline.ts > .claude/probes/K1240/proto/outline_base.ts
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s6_sliver.ts [--scene=user_tw42.lightpaper]
import * as NEW from "./outline";
import * as OLD from "./outline_base";
import { ALL, multsOf, sceneOf } from "./k1247s5_scenes";
import { FormB } from "../../../../src/render/field/form_b";

const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const names = arg("scene") ? [arg("scene")!] : ALL;
interface Cq { ok: boolean; Vx: number; Vy: number; qx: number; qy: number }
for (const name of names) for (const mult of multsOf(name)) {
  const sc = sceneOf(name, mult); const h = sc.look.halfWidth; const S = sc.camera.pxPerUnit * 2;
  const fb = (new FormB(sc as never, { dpr: 2 }).corners as unknown as Cq[]).filter((c) => c.ok && Number.isFinite(c.qx));
  const a = (OLD.frame(OLD.structure(sc), sc).corners as unknown as Cq[]).filter((c) => c.ok);
  const b = (NEW.frame(NEW.structure(sc), sc).corners as unknown as Cq[]).filter((c) => c.ok);
  const near = (t: Cq[], c: Cq): Cq | undefined => { let best: Cq | undefined; let bd = 0.05 * h; for (const x of t) { const d = Math.hypot(x.Vx - c.Vx, x.Vy - c.Vy); if (d < bd) { bd = d; best = x; } } return best; };
  let mOld = 0; let mNew = 0; let nOld = 0; let nNew = 0; let matched = 0; let worst = -1; let worstQ = [0, 0];
  for (const f of fb) {
    const o = near(a, f); const n = near(b, f);
    if (!o || !n) continue;
    matched++;
    const dO = Math.hypot(o.qx - f.qx, o.qy - f.qy); const dN = Math.hypot(n.qx - f.qx, n.qy - f.qy);
    if (dO > mOld) mOld = dO;
    if (dN > mNew) { mNew = dN; worst = b.indexOf(n); worstQ = [n.qx, n.qy]; }
    if (dO * S > 0.5) nOld++;
    if (dN * S > 0.5) nNew++;
  }
  console.log(`${name} ${mult}: ${matched}/${fb.length} matched; formB-today max ${(mOld / h).toFixed(5)} h (${(mOld * S).toFixed(2)} px), ${nOld} over 0.5 px; formB-new max ${(mNew / h).toFixed(4)} h (${(mNew * S).toFixed(2)} px), ${nNew} over 0.5 px (worst new c${worst} at ${worstQ[0].toFixed(3)},${worstQ[1].toFixed(3)})`);
}
