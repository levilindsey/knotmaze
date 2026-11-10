// K1247 debug: warm frame on a rigidly moved scene vs the oracle there.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { structure, frame, frameRef, type SceneIn } from "./outline";
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const name = process.argv[2] ?? "def";
const S = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
(S.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const A = 0.7; const ca = Math.cos(A); const sa = Math.sin(A);
const R = (x: number, y: number): [number, number] => [ca * x - sa * y + 3.25, sa * x + ca * y - 1.5];
const moved = JSON.parse(JSON.stringify(S)) as SceneIn;
for (const c of moved.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const r = R(c.pts[i], c.pts[i + 1]); c.pts[i] = r[0]; c.pts[i + 1] = r[1]; }
for (const j of moved.junctions) { const r = R(j.c[0], j.c[1]); j.c = r; }
const st = structure(S);
const fast = process.argv.includes("--cold") ? frame(structure(moved), moved) : (frame(st, S), frame(st, moved));
const ref = frameRef(st, moved);
for (let i = 0; i < Math.min(fast.pieces.length, ref.pieces.length); i++) {
  const a = ref.pieces[i]; const b = fast.pieces[i];
  if (a.pts.length !== b.pts.length) console.log(`piece ${i} ${a.kind} ch${a.chain} side${a.side} corner${a.corner}: pts ${a.pts.length / 2} -> ${b.pts.length / 2}`);
  else {
    let m = 0;
    for (let k = 0; k < a.pts.length; k += 2) m = Math.max(m, Math.hypot(a.pts[k] - b.pts[k], a.pts[k + 1] - b.pts[k + 1]));
    if (m > 1e-6) console.log(`piece ${i} ${a.kind} ch${a.chain} side${a.side} corner${a.corner}: maxPt ${m.toExponential(2)}`);
  }
}
for (let i = 0; i < ref.corners.length; i++) {
  const a = ref.corners[i]; const b = fast.corners[i];
  const d = Math.max(Math.hypot(a.qx - b.qx, a.qy - b.qy), Math.abs(a.r - b.r), Math.hypot(a.Vx - b.Vx, a.Vy - b.Vy));
  if (a.ok !== b.ok || d > 1e-6) console.log(`corner ${i} j${a.junction}: ok ${a.ok}->${b.ok} r ${a.r.toFixed(5)}->${b.r.toFixed(5)} d=${d.toExponential(2)} why=${b.why ?? ""}`);
}
console.log(`cuts ${ref.cuts.length} -> ${fast.cuts.length}`);
console.log("diag fast:", fast.diagnostics.join(" | "));
console.log("diag ref :", ref.diagnostics.join(" | "));
