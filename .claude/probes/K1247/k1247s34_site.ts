// K1247 s34: why a (b) site is not exact. Runs the snap as OutlineModel.update does (alignJunctionArms, snapScene)
// to frame f under kf.* overrides, then at the world point (x, y): per chain in chains=a,b,..., its own / held state,
// release centres, the nearest point's w and its snapped-vs-true offset (px); and for junction j=<ji>: whole,
// forced, its centre's distance, its arms (chain, kind, own) and the nearest release centre on each arm.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s34_site.ts <dragDir> f=63 x=19.603 y=18.938 chains=49,85 j=113 [kf.x=v]
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { KF_INC, SNAP_DBG, alignJunctionArms, newSnapState, snapScene } from "../../../src/render/outline/outline";
import type { DiagramStructure } from "../../../src/render/outline/outline";
import { loadDrag } from "./k1247s32_lib";

const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
for (const kv of process.argv.slice(3)) { const m = /^kf\.(\w+)=(.*)$/.exec(kv); if (m) (KF_INC as unknown as Record<string, unknown>)[m[1]] = m[2] === "true" ? true : m[2] === "false" ? false : +m[2]; }
KF_INC.snap = true;
const { cap, raw } = loadDrag(process.argv[2], +arg("sub", "10"));
const F = +arg("f", "63"); const X = +arg("x", "0"); const Y = +arg("y", "0"); const J = +arg("j", "-1");
const ids = arg("chains", "").split(",").filter(Boolean).map(Number);
const st = (new OutlineModel(cap[0]) as unknown as { st: DiagramStructure }).st;
const S = newSnapState(); const px = cap[0].camera.pxPerUnit * cap[0].camera.dpr;
for (let f = 0; f <= F; f++) {
  const al = alignJunctionArms(st, raw[f]); SNAP_DBG.on = f === F;
  const sc = snapScene(S, al);
  if (f !== F) continue;
  const near = (c: number[], x: number, y: number): [number, number] => { let b = -1; let d = Infinity; for (let q = 0; q < c.length; q += 2) { const e = Math.hypot(c[q] - x, c[q + 1] - y); if (e < d) { d = e; b = q >> 1; } } return [b, d]; };
  for (const id of ids) {
    const i = al.chains.findIndex((c) => c.id === id); const t = Array.from(al.chains[i].pts as ArrayLike<number>); const s = Array.from(sc.chains[i].pts as ArrayLike<number>);
    const [k, d] = near(t, X, Y); const w = SNAP_DBG.part[i]; const cn = SNAP_DBG.cen[i] ?? [];
    const [, dc] = near(cn, t[2 * k], t[2 * k + 1]);
    console.log(`chain ${id} (i ${i}): own ${SNAP_DBG.own[i]} dC ${S.dChains[i]} centres ${cn.length / 2}; nearest pt ${k} ${(d * px).toFixed(1)} px off the site: w ${w ? w[k].toFixed(3) : "-"}, snapped off truth ${(Math.hypot(s[2 * k] - t[2 * k], s[2 * k + 1] - t[2 * k + 1]) * px).toFixed(3)} px, nearest centre ${(dc * px).toFixed(1)} px`);
  }
  if (J >= 0) {
    const j = al.junctions[J];
    console.log(`junction ${J} (id ${j.id}): whole ${SNAP_DBG.whole[J]} forced ${SNAP_DBG.forced[J]} dJ ${S.dJunc[J]}, centre ${(Math.hypot(j.c[0] - X, j.c[1] - Y) * px).toFixed(1)} px off the site`);
    for (const a of j.arms) {
      const i = al.chains.findIndex((c) => c.id === a.chain); const cn = SNAP_DBG.cen[i] ?? [];
      const [, dc] = near(cn, j.c[0], j.c[1]);
      console.log(`  arm ${a.chain} ${a.kind} s ${a.s.toFixed(3)}: own ${SNAP_DBG.own[i]}, dC ${S.dChains[i]}, centres ${cn.length / 2}, nearest to the junction centre ${(dc * px).toFixed(1)} px`);
    }
  }
}
