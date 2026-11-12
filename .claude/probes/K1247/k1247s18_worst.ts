// K1247 s18: the strips whose records-on vertices sit farthest from off's, on a rest scene (K868
// scenes): per strip the worst column's distance, its row, the strip's chain, N, s range and where it is.
// env ARC = 1 spaces the sides' columns by border length.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s18_worst.ts <sceneName> [top=8] [x y R]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { fillFrame, fillResolution, fillStructure } from "../../../src/render/outline/fill_tri";
import { zChains } from "../../../src/render/outline/draw";
import { ARC } from "../../../src/render/outline/chain_frame";

if (process.env.ARC !== undefined) ARC.on = process.env.ARC === "1";
const [nm, topS, xS, yS, rS] = process.argv.slice(2);
const scene = JSON.parse(readFileSync(join("C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes", `${nm}.json`), "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const st = structure(scene); const tb = frame(st, scene); const fs = fillStructure(st, fillResolution(st, tb)); const zz = zChains(scene);
const off = Float64Array.from(fillFrame(fs, st, tb, scene, zz).pos);
const on = fillFrame(fs, st, tb, { ...scene, look: { ...scene.look, fillRec: 1 } } as SceneIn, zz).pos;
const rows: { d: number; line: string }[] = [];
for (const it of fs.items) {
  if (it.kind !== "strip") continue;
  const W = it.N + 1; let best = 0; let bi = 0; let br = 0;
  for (let r = 0; r < 3; r++) for (let i = 0; i <= it.N; i++) {
    const v = it.base + r * W + i; const d = Math.hypot(on[2 * v] - off[2 * v], on[2 * v + 1] - off[2 * v + 1]);
    if (d > best) { best = d; bi = i; br = r; }
  }
  if (xS !== undefined) {
    let hit = false;
    for (let v = it.base; v < it.base + 3 * W; v++) if (Math.hypot(off[2 * v] - Number(xS), off[2 * v + 1] - Number(yS)) < Number(rS ?? 0.4)) hit = true;
    if (!hit) continue;
  }
  const pl = tb.pieces[it.pL]; const v = it.base + br * W + bi;
  rows.push({ d: best, line: `iv ${it.iv} chain ${it.pi} N ${it.N} worst ${best.toFixed(3)} at row ${br} col ${bi} (${off[2 * v].toFixed(2)},${off[2 * v + 1].toFixed(2)}) | L ${pl?.kind} s ${pl?.s0.toFixed(2)}..${pl?.s1.toFixed(2)}` });
}
rows.sort((a, b) => b.d - a.d);
for (const r of rows.slice(0, Number(topS ?? 8))) console.log(r.line);
