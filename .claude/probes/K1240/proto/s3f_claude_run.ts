// K1240 S3f (Claude): one run piece, its diagram stations and its points.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s3f_claude_run.ts <scene> <pieceIndex,...>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { structure, frame, type SceneIn } from "./outline";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const name = process.argv[2] ?? "def";
const ids = (process.argv[3] ?? "0").split(",").map(Number);
const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const st = structure(scene);
const t = frame(st, scene);
const f = (v: number): string => v.toFixed(3);
for (const id of ids) {
  const p = t.pieces[id]; const dp = st.piecesD[id];
  console.log(`piece ${id} ${p.kind} ch${p.chain} side${p.side} s0 ${f(p.s0)} s1 ${f(p.s1)} n=${p.pts.length / 2}`);
  if (dp && dp.kind === "run") {
    const iv = st.intervalsD[dp.interval];
    for (const k of [iv.aSt, iv.bSt]) {
      const s = st.stationsD[k];
      const arm = s.arm >= 0 ? st.arms[s.arm] : null;
      console.log(`  station ${s.key} kind ${s.kind} sKey ${f(s.sKey)}${arm ? ` arm ji${arm.ji} e${arm.ei} ${arm.kind} dir${arm.dir}` : ""}`);
    }
    // Every diagram station on this chain, in order.
    const on = st.stationsD.map((s, i) => ({ s, i })).filter((q) => q.s.pi === dp.chain).sort((a, b) => a.s.sKey - b.s.sKey);
    const ia = on.findIndex((q) => q.i === iv.aSt);
    console.log(`  chain stations near: ${on.slice(Math.max(0, ia - 3), ia + 4).map((q) => `${q.s.key}@${f(q.s.sKey)}`).join(" ")}`);
  }
  const n = p.pts.length / 2;
  const show = (i: number): string => `(${f(p.pts[2 * i])},${f(p.pts[2 * i + 1])})`;
  const idx = n <= 8 ? [...Array(n).keys()] : [0, 1, 2, 3, n - 4, n - 3, n - 2, n - 1];
  console.log(`  pts ${idx.map((i) => `${i}:${show(i)}`).join(" ")}`);
}
