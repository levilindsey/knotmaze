// K1240 S3f (Claude): one junction's arms and corners, ours and form B's.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s3f_claude_junc.ts <scene> <ji,...>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { structure, frame, type SceneIn } from "./outline";
import { FormB } from "../../../../src/render/field/form_b";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const name = process.argv[2] ?? "def";
const jis = (process.argv[3] ?? "0").split(",").map(Number);
const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const st = structure(scene);
const t = frame(st, scene);
const fb = new FormB(scene as never, { dpr: 2 }) as any;
for (const ji of jis) {
  const j = scene.junctions[ji];
  console.log(`j${ji} id ${j.id} c=(${j.c[0].toFixed(3)},${j.c[1].toFixed(3)}) arms:`);
  j.arms.forEach((a, ei) => console.log(`  e${ei} chain ${a.chain} ${a.kind} dir ${a.dir} s ${a.s.toFixed(3)} corner ${JSON.stringify(j.corners?.[ei] ?? null)}`));
  st.corners.forEach((c, ci) => {
    if (c.ji !== ji) return;
    const p = t.pieces.find((q) => q.kind === "arc" && q.corner === ci);
    const A = st.arms[c.aArm]; const B = st.arms[c.bArm];
    console.log(`  ours corner ${ci}: e${A.ei}->e${B.ei} style ${c.style} arc pts ${p ? p.pts.length / 2 : "none"} first (${p ? p.pts[0].toFixed(3) : ""},${p ? p.pts[1].toFixed(3) : ""})`);
  });
  (fb.corners as any[]).forEach((c, k) => { if (c.ji === ji || c.j === ji || c.junction === j.id) console.log(`  B corner ${k}: ${JSON.stringify(Object.fromEntries(Object.entries(c).filter(([key, v]) => typeof v === "number" && ["a", "b", "ji", "r", "rV", "theta", "g"].includes(key))))}`); });
}
console.log((t.diagnostics ?? []).filter((d: string) => d.includes("corner")).slice(0, 8).join("\n"));
