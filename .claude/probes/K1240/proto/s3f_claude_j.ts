// K1240 S3f (Claude, run 3): one junction's arms, corners and nearby crossings.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s3f_claude_j.ts <scene> <ji,...> [moveMult]
import { readFileSync } from "node:fs";
import { structure, buildOutlineFull, type SceneIn } from "./outline";

const name = process.argv[2] ?? "g41_user_tw42";
const jis = (process.argv[3] ?? "28").split(",").map(Number);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const st = structure(scene);
const full = buildOutlineFull(scene, st);
const dbgArms = (full.debug as { arms: { ji: number; pi: number; sR: number; dir: number; L: number; Lcut: number; ang: number }[] }).arms;
const h = (scene.look as { halfWidth?: number; h?: number }).halfWidth ?? 0;
const f = (v: number): string => (Number.isFinite(v) ? v.toFixed(3) : String(v));
for (const ji of jis) {
  const j = scene.junctions[ji];
  console.log(`j${ji} id=${j.id} c=(${f(j.c[0])},${f(j.c[1])}) group=${st.groupOfJ[ji]} h=${h}`);
  st.armsOfJ[ji].forEach((ai) => {
    const a = st.arms[ai]; const x = j.arms[a.ei]; const d = dbgArms[ai];
    console.log(`  a${ai} ch${scene.chains[a.pi].id}(pi${a.pi}) ${a.kind} dir${a.dir} s=${f(x.s)} sR=${f(d.sR)} ang=${f(d.ang)} L=${f(d.L)} Lcut=${f(d.Lcut)}`);
    scene.crossings.forEach((c, xi) => {
      for (const [me, ot, over] of [[c.a, c.b, c.over === "a"], [c.b, c.a, c.over === "b"]] as const) {
        if (me.chain !== x.chain) continue;
        const ds = (me.s - d.sR) * a.dir;
        if (ds > -2 && ds < 4) console.log(`     x${xi} at d=${f(ds)} ${over ? "OVER" : "under"} ch${ot.chain} s=${f(ot.s)}`);
      }
    });
  });
  st.corners.forEach((c, ci) => {
    if (c.ji !== ji) return;
    const cw = full.table.corners[ci];
    console.log(`  corner${ci} a${c.aArm}-a${c.bArm} ok=${cw.ok} why=${cw.why ?? ""} r=${f(cw.r)} V=(${f(cw.Vx)},${f(cw.Vy)}) ta=(${f(cw.tax)},${f(cw.tay)}) tb=(${f(cw.tbx)},${f(cw.tby)})`);
  });
}
