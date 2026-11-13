// K1351 s1: frame() phase profile (frameFast's profMark keys), thruGate on vs off, one drag.
//   node scripts/run_node.mjs .claude/probes/K1351/k1351s1_prof.ts <dragDir>
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as O from "../../../src/render/outline/outline";
const dir = process.argv[2];
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const scenes = files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; Object.assign(s.look, { fillRec: 2, bandRec: 1, bandRecGpu: 1 }); return s; });
const profs: Record<string, Record<string, number>> = {};
for (const on of [true, false]) {
  (O.K1314S13 as Record<string, boolean>).thruGate = on;
  const st = O.structure(scenes[0]);
  const prof: Record<string, number> = {};
  for (let r = 0; r < 3; r++) for (let i = 1; i < scenes.length; i++) O.frame(st, O.alignJunctionArms(st, scenes[i]), prof);
  profs[on ? "on" : "off"] = prof;
  const thru = st.piecesD.filter((d) => d.kind === "tail" && d.interval >= 2).length;
  console.log(`gate=${on} piecesD ${st.piecesD.length} thru ${thru}`);
}
const n = 2 * (scenes.length - 1);
for (const k of Object.keys(profs.on)) console.log(`${k.padEnd(18)} on ${(profs.on[k] / n).toFixed(3)} off ${(profs.off[k] / n).toFixed(3)} d ${((profs.on[k] - profs.off[k]) / n).toFixed(3)} ms/frame`);
