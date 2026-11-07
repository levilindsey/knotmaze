// S3f debug 2: shape of the long ch8 runs (are they long-way borders?)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { structure, frame, type SceneIn } from "./outline";
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const scene = JSON.parse(readFileSync(join(SCENE_DIR, "def.json"), "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const t = frame(structure(scene), scene);
for (const idx of [330, 331, 332, 336, 341, 342]) {
  const p = t.pieces[idx];
  if (!p) continue;
  const n = p.pts.length / 2;
  let len = 0;
  for (let i = 1; i < n; i++) len += Math.hypot(p.pts[2 * i] - p.pts[2 * i - 2], p.pts[2 * i + 1] - p.pts[2 * i - 1]);
  const uniq = new Set<string>();
  for (let i = 0; i < n; i++) uniq.add(p.pts[2 * i].toFixed(3) + "," + p.pts[2 * i + 1].toFixed(3));
  console.log(`piece ${idx} ${p.kind} ch${p.chain} side${p.side} s=${p.s0.toFixed(2)}..${p.s1.toFixed(2)} pts=${n} uniq=${uniq.size} len=${len.toFixed(2)}`);
  console.log("  first6:", Array.from({ length: Math.min(6, n) }, (_, i) => `(${p.pts[2 * i].toFixed(2)},${p.pts[2 * i + 1].toFixed(2)})`).join(" "));
  console.log("  last3:", Array.from({ length: Math.min(3, n) }, (_, k) => { const i = n - 3 + k; return i >= 0 ? `(${p.pts[2 * i].toFixed(2)},${p.pts[2 * i + 1].toFixed(2)})` : ""; }).join(" "));
}
console.log("chain8 centre pts:", scene.chains[8].pts.length / 2, "closed", scene.chains[8].closed);
