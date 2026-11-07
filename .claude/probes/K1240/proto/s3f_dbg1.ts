// S3f debug: which ch8 run pieces emit the point near (30.4, 29.5)?
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { structure, frame, buildOutlineFull, type SceneIn } from "./outline";
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const scene = JSON.parse(readFileSync(join(SCENE_DIR, "def.json"), "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const st = structure(scene);
console.log("intervals ch8:", st.intervalsD.filter((iv) => iv.pi === 8).map((iv) => {
  const A = st.stationsD[iv.aSt]; const B = st.stationsD[iv.bSt];
  return A.key + ">" + B.key + (iv.discard ? " DISCARD" : "");
}).join("\n  "));
const t = frame(st, scene);
t.pieces.forEach((p, i) => {
  if (p.chain !== 8 || p.kind !== "run") return;
  let has = false;
  for (let k = 0; k + 1 < p.pts.length; k += 2) if (Math.hypot(p.pts[k] - 30.4, p.pts[k + 1] - 29.5) < 0.6) has = true;
  const n = p.pts.length / 2;
  console.log(`piece ${i} run ch8 side${p.side} s=${p.s0.toFixed(2)}..${p.s1.toFixed(2)} pts=${n} hasBadPt=${has} first=(${p.pts[0]?.toFixed(2)},${p.pts[1]?.toFixed(2)}) last=(${p.pts[p.pts.length - 2]?.toFixed(2)},${p.pts[p.pts.length - 1]?.toFixed(2)})`);
});
const full = buildOutlineFull(scene, st);
console.log("diagnostics:", t.diagnostics.slice(-2).join(" | "));
console.log("junctions near (30.4,29.5):", scene.junctions.map((j, ji) => ({ ji, id: j.id, d: Math.hypot(j.c[0] - 30.4, j.c[1] - 29.5) })).filter((q) => q.d < 3));
console.log("corners at those junctions:", t.corners.map((c, ci) => ({ ci, c })).filter((q) => q.c.junction === "j35" || q.c.junction === "j34").map((q) => `ci${q.ci} ok=${q.c.ok} why=${q.c.why ?? ""} r=${q.c.r.toFixed(3)} aCh${q.c.aChain} bCh${q.c.bChain}`).join("\n  "));
