// K1247 s18: which fill item owns a vertex (the item with the largest base at or below it), with its
// off/on position: for the fill tool's worst spots.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s18_which.ts <dragDir> <frame> <vertex>...
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { fillFrame, fillResolution, fillStructure } from "../../../src/render/outline/fill_tri";
import { zChains } from "../../../src/render/outline/draw";

const [dir, fS, ...vs] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const load = (k: number): SceneIn => { const s = JSON.parse(readFileSync(join(dir, files[k]), "utf8")); s.look.ctrlArc ??= 0.47; delete s.look.fillRec; return s; };
const s0 = load(0); const st = structure(s0); const fs = fillStructure(st, fillResolution(st, frame(st, s0)));
const sc = alignJunctionArms(st, load(Number(fS))); const tb = frame(st, sc); const zz = zChains(sc);
const off = fillFrame(fs, st, tb, sc, zz); const offPos = Float64Array.from(off.pos);
const on = fillFrame(fs, st, tb, { ...sc, look: { ...sc.look, fillRec: 1 } } as SceneIn, zz);
for (const vS of vs) {
  const v = Number(vS); let best = -1;
  fs.items.forEach((it, k) => { if (it.base <= v && (best < 0 || it.base > fs.items[best].base)) best = k; });
  const it = fs.items[best];
  const extra = it.kind === "strip" ? `N ${it.N} col ${(v - it.base) % (it.N + 1)} row ${Math.floor((v - it.base) / (it.N + 1))}` : `offset ${v - it.base}`;
  console.log(`v${v}: item ${best} ${it.kind} chain ${(it as { pi?: number }).pi ?? "-"} ${extra} | off (${offPos[2 * v].toFixed(3)},${offPos[2 * v + 1].toFixed(3)}) on (${on.pos[2 * v].toFixed(3)},${on.pos[2 * v + 1].toFixed(3)})`);
}
