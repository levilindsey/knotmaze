// K1324 s1: draw.ts groupMember (on groupArms' arms) against form B's member(), sampled along every chain.
//   node scripts/run_node.mjs .claude/probes/K1324/k1314_s1_member.ts [--scene=a,b] [--tau=0.999] [--list=n]
// Per scene: samples on a group in one and own in the other, ramp differences, full-member (ramp >= tau)
// disagreements, and the group-id map's consistency (each draw.ts group to one form B group).
import * as D from "../../../src/render/outline/draw";
import { FormB } from "../../../src/render/field/form_b";
import { loadScene, ALL } from "../K1314/k1314_census";

const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const scenes = opt("scene")?.split(",") ?? (ALL as string[]);
const tau = Number(opt("tau") ?? 0.999);
const nList = Number(opt("list") ?? 6);
for (const nm of scenes) {
  const scene = loadScene(nm);
  let arms: D.GroupArm[][] | null = null;
  D.contactOpts.groups = true; D.contactOpts.onArms = (a) => { arms = a; };
  const zz = D.zChains(scene);
  D.contactOpts.onArms = null;
  if (!arms) { console.log(`${nm}: no arms`); continue; }
  const A = arms as D.GroupArm[][];
  const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as unknown as { idxOf: Map<number, number>; member(pi: number, s: number): { g: number; ramp: number }; h: number };
  const h = fb.h;
  const ids = [...zz.idx.entries()].sort((a, b) => a[1] - b[1]).map((e) => e[0]);
  let n = 0, gOwn = 0, ownG = 0, fullDis = 0, rampBig = 0, rampSum = 0, both = 0;
  const map = new Map<number, Map<number, number>>();
  const bad: string[] = [];
  zz.zc.forEach((c, ci) => {
    const pi = fb.idxOf.get(ids[ci]); if (pi === undefined) return;
    for (let s = 0; s <= c.len; s += 0.25 * h) {
      const m = D.groupMember(A[ci], c, s, h); const f = fb.member(pi, s); n++;
      if (m.g >= 0 && f.g < 0) { gOwn++; if (bad.length < nList * 3) bad.push(`c${ids[ci]}@${s.toFixed(2)} mine g${m.g}@${m.ramp.toFixed(2)} fb own`); }
      else if (m.g < 0 && f.g >= 0) { ownG++; if (bad.length < nList * 3) bad.push(`c${ids[ci]}@${s.toFixed(2)} mine own fb g${f.g}@${f.ramp.toFixed(2)}`); }
      else if (m.g >= 0) {
        both++; const d = Math.abs(m.ramp - f.ramp); rampSum += d; if (d > 0.1) rampBig++;
        let e = map.get(m.g); if (!e) map.set(m.g, (e = new Map())); e.set(f.g, (e.get(f.g) ?? 0) + 1);
      }
      if ((m.g >= 0 && m.ramp >= tau) !== (f.g >= 0 && f.ramp >= tau)) fullDis++;
    }
  });
  let split = 0; for (const e of map.values()) if (e.size > 1) split++;
  console.log(`${nm}: ${n} samples h ${h.toFixed(3)}; mine-group/fb-own ${gOwn}, mine-own/fb-group ${ownG}; both ${both}, ramp |d| mean ${(rampSum / Math.max(1, both)).toFixed(3)}, >0.1 ${rampBig}; full-member disagree ${fullDis}; groups ${map.size}, split ${split}`);
  for (const b of bad.slice(0, nList)) console.log(`  ${b}`);
}
