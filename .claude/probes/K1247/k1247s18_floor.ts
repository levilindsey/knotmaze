// K1247 s18: the projection's floor, measured in Node on a captured drag: what a records design must
// still do on the CPU per moved frame. (a) zChains as today (the chain samples, s and z), (b) the
// smooth frames (chainTangents over every chain), (c) one frameAt per moving end point, 8 times (a
// local Newton solve of a cut or junction end seeded from the last frame: ~4 iterations x 2 curves),
// for the pieces' end points of frame() (2 per piece), (d) the per-strip parameters' size.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s18_floor.ts <dragDir>
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { fillResolution, fillStructure } from "../../../src/render/outline/fill_tri";
import { zChains } from "../../../src/render/outline/draw";
import { chainTangents, frameAt } from "../../../src/render/outline/chain_frame";

const dir = process.argv[2];
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const scenes: SceneIn[] = files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; delete s.look.fillRec; return s; });
const st = structure(scenes[0]);
const t0 = frame(st, scenes[0]);
const fs = fillStructure(st, fillResolution(st, t0));
const nPieces = t0.pieces?.length ?? 0;
const tz: number[] = []; const tt: number[] = []; const ts: number[] = [];
const out = new Float64Array(5);
let samples = 0;
for (let k = 1; k < scenes.length; k++) {
  const sc = alignJunctionArms(st, scenes[k]);
  let a = performance.now(); const zz = zChains(sc); tz.push(performance.now() - a);
  a = performance.now(); const tg = zz.zc.map((c) => (c.n > 1 ? chainTangents(c) : null)); tt.push(performance.now() - a);
  samples = zz.zc.reduce((s, c) => s + c.n, 0);
  // Moving ends: 2 per piece, each 8 frameAt evaluations near a random s on a random chain (seeded).
  let seed = 12345; const rnd = (): number => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  a = performance.now(); let acc = 0;
  for (let e = 0; e < 2 * nPieces; e++) {
    const ci = Math.floor(rnd() * zz.zc.length); const c = zz.zc[ci]; const g = tg[ci]; if (!g) continue;
    let s = rnd() * c.len; let h = -1;
    for (let it = 0; it < 8; it++) { h = frameAt(c, g, s, h, out); s += 1e-3 * out[4]; acc += out[0]; }
  }
  ts.push(performance.now() - a); if (acc === 42) console.log("");
}
const med = (xs: number[]): number => Float64Array.from(xs).sort()[xs.length >> 1];
console.log(`${dir}: ${zChainsInfo()} pieces ${nPieces}, fill strips ${fs.items?.filter?.((i: { kind: string }) => i.kind === "strip").length ?? "?"}, chain samples ${samples}`);
console.log(`per moved frame (Node, median): zChains today ${med(tz).toFixed(2)} ms | chainTangents ${med(tt).toFixed(2)} ms | ${2 * nPieces} end solves x 8 frameAt ${med(ts).toFixed(2)} ms`);
function zChainsInfo(): string { return ""; }
