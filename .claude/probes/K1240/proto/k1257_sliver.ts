// K1257: the fill/outline sliver before and after form B's closed-form
// corners (k1247s6_sliver.ts's measure, both form Bs in one run). Per scene:
// each corner's q in master's form B (k1257_master.ts writes it to
// formb_master.ts from git), in today's form B and in the outline (outline.ts),
// matched by V within 0.05 h; the largest |q_formB - q_outline| in h and in
// device px (pxPerUnit at dpr 2) and how many corners sit over 0.5 px.
// --list prints every corner left over 0.5 px (its r in both, r0, the
// outline's piece count is not visible here).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1257_sliver.ts [--scene=user_tw42.lightpaper] [--list]
import * as NEW from "./outline";
import { ALL, multsOf, sceneOf } from "./k1247s5_scenes";
import { FormB } from "../../../../src/render/field/form_b";
import { cfStats } from "../../../../src/render/field/corner_cf";
import { masterFormB } from "./k1257_master";
const FormBMaster = await masterFormB();

const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const list = process.argv.includes("--list");
const names = arg("scene") ? [arg("scene")!] : ALL;
interface Cq { ok: boolean; Vx: number; Vy: number; qx: number; qy: number; r: number; r0: number; theta: number }
let totB = 0; let totA = 0;
for (const name of names) for (const mult of multsOf(name)) {
  const sc = sceneOf(name, mult); const h = sc.look.halfWidth; const S = sc.camera.pxPerUnit * 2;
  const f0 = cfStats.fails; const c0 = cfStats.corners;
  const fbNew = (new FormB(sc as never, { dpr: 2 }).corners as unknown as Cq[]).filter((c) => c.ok && Number.isFinite(c.qx));
  const fails = cfStats.fails - f0; const grown = cfStats.corners - c0;
  const fbOld = ((new FormBMaster(sc as never, { dpr: 2 }) as { corners: unknown }).corners as Cq[]).filter((c) => c.ok && Number.isFinite(c.qx));
  const out = (NEW.frame(NEW.structure(sc), sc).corners as unknown as Cq[]).filter((c) => c.ok);
  const near = (t: Cq[], c: Cq): Cq | undefined => { let best: Cq | undefined; let bd = 0.05 * h; for (const x of t) { const d = Math.hypot(x.Vx - c.Vx, x.Vy - c.Vy); if (d < bd) { bd = d; best = x; } } return best; };
  const run = (fb: Cq[]): { matched: number; max: number; n: number; over: string[] } => {
    let matched = 0; let max = 0; let n = 0; const over: string[] = [];
    for (const f of fb) {
      const o = near(out, f);
      if (!o) continue;
      matched++;
      const d = Math.hypot(o.qx - f.qx, o.qy - f.qy);
      if (d > max) max = d;
      if (d * S > 0.5) { n++; over.push(`c${fb.indexOf(f)} (outline c${out.indexOf(o)}) ${(d * S).toFixed(2)} px ${(d / h).toFixed(4)} h: r formB ${(f.r / h).toFixed(4)} h, outline ${(o.r / h).toFixed(4)} h, r0 ${(f.r0 / h).toFixed(4)} h, theta ${f.theta.toFixed(3)}, V ${f.Vx.toFixed(3)},${f.Vy.toFixed(3)}`); }
    }
    return { matched, max, n, over };
  };
  const b = run(fbOld); const a = run(fbNew);
  totB += b.n; totA += a.n;
  console.log(`${name} ${mult}: before ${b.n} over 0.5 px (max ${(b.max * S).toFixed(2)} px, ${(b.max / h).toFixed(4)} h; ${b.matched}/${fbOld.length} matched); after ${a.n} (max ${(a.max * S).toFixed(3)} px, ${(a.max / h).toFixed(5)} h; ${a.matched}/${fbNew.length} matched); closed-form ${grown}, fell back ${fails}`);
  if (list) for (const l of a.over) console.log(`  ${l}`);
}
console.log(`total over 0.5 px: before ${totB}, after ${totA}`);
