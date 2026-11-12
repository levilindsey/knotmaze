// K1247 s24: one record piece's colRow inputs at one drag frame (needs the CRD/CRDBG debug lines in
// band_rec/chain_frame; Node only).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s24_cs.ts <dragDir> <frame> <pieceD>
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OB_DI, alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { zChains } from "../../../src/render/outline/draw";
import { BandRecState } from "../../../src/render/outline/band_rec";

const [dir, fS, dS] = process.argv.slice(2);
const F = Number(fS); const D = Number(dS);
OB_DI.on = true;
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const scenes: SceneIn[] = files.slice(0, F + 1).map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; return s; });
const st = structure(scenes[0]);
const SC = new BandRecState(false);
for (let f = 0; f <= F; f++) {
  const sc = f === 0 ? scenes[0] : alignJunctionArms(st, scenes[f]); const zz = zChains(sc);
  (globalThis as unknown as { CRD: number }).CRD = f === F ? D : -1;
  const tb = frame(st, sc);
  SC.band(st, tb, sc, zz);
  if (f === F) { const p = tb.pieces.find((q) => q.di === D); if (p) console.log(`piece d${D} chain ${p.chain} side ${p.side} s ${p.s0}..${p.s1} np ${p.pts.length / 2}; first cpts ${Array.from(p.cpts.slice(0, 8)).map((x) => x.toFixed(4)).join(",")}`); }
}
