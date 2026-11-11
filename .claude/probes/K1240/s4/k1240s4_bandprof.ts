import { loadScene } from "../../../../test/render/outline_digest";
import { structure, frame } from "../../../../src/render/outline/outline";
import { bandData, zChains } from "../../../../src/render/outline/draw";
const s0 = loadScene(`.claude/probes/K868/scenes/def.json`);
const st = structure(s0); const tb = frame(st, s0); const zz = zChains(s0);
let nT = 0; let nV = 0; const per: number[] = zz.passes.map((p) => p.length);
for (const p of tb.pieces) { nV += p.pts.length / 2; if ((p.kind === "run" || p.kind === "ghost") && p.chain >= 0 && zz.passes[p.chain].length > 0) nT += p.pts.length / 2; }
console.log("pieces", tb.pieces.length, "pts", nV, "tied pts", nT, "passes/chain max", Math.max(...per), "sum", per.reduce((a, b) => a + b, 0));
const t = performance.now(); const b = bandData(tb, s0, zz); console.log("band ms", (performance.now() - t).toFixed(0), "verts", b.bandCount);
