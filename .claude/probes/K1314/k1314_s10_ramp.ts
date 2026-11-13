// K1314 s10: runRootRamp's own time per frame on def's motion cycle. Needs temporary, uncommitted instrumentation:
// piecesPhaseC's runRootRamp call wrapped in performance.now() adding to globalThis.__rampMs / __rampN (+= runAtArm.size),
// and inside runRootRamp the tailFoot call timed into __rfMs / __rfN, with __rdN counting feet within h.
// s10 measured (a6ed3ebb, instrumented): ramp 0.87 ms/frame over 1126 run ends; tailFoot 0.55 ms, 1511 calls, 124 feet within h
// (with only the outer timer: ramp 0.51 ms/frame).
import { readFileSync } from "node:fs";
import * as CUR from "../../../src/render/outline/outline";
const S = JSON.parse(readFileSync("C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/def.json", "utf8")) as CUR.SceneIn;
(S.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const h = S.look.halfWidth; const cyc: CUR.SceneIn[] = [];
const pert = (A: number): CUR.SceneIn => { const sc = JSON.parse(JSON.stringify(S)) as CUR.SceneIn; for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const x = c.pts[i]; const y = c.pts[i + 1]; c.pts[i] = x + A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)); c.pts[i + 1] = y + A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3)); } return sc; };
for (let k = 0; k <= 20; k++) cyc.push(pert((k / 20) * 0.5 * h)); for (let k = 19; k >= 1; k--) cyc.push(pert((k / 20) * 0.5 * h));
const st = CUR.structure(S); const G = globalThis as any;
for (let i = 0; i < 30; i++) CUR.frame(st, cyc[i % cyc.length]);
G.__rampMs = 0; G.__rampN = 0; G.__rfMs = 0; G.__rfN = 0; G.__rdN = 0; const reps = 200;
for (let i = 0; i < reps; i++) CUR.frame(st, cyc[i % cyc.length]);
console.log(`ramp ${(G.__rampMs / reps).toFixed(3)} ms/frame over ${(G.__rampN / reps).toFixed(0)} run ends`);
if (G.__rfN !== undefined) console.log(`tailFoot ${(G.__rfMs / reps).toFixed(3)} ms/frame, ${(G.__rfN / reps).toFixed(0)} calls; ${((G.__rdN ?? 0) / reps).toFixed(0)} feet within h`);