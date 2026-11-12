// K1247 s19: on = 0 | 1 | 2 (fillRec). K1247 s18: fillFrame alone, R times on one captured frame (for --cpu-prof). argv: dragDir frame R on(0|1)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { FILL_PROF, fillFrame, fillResolution, fillStructure } from "../../../src/render/outline/fill_tri";
import { zChains } from "../../../src/render/outline/draw";
const [dir, fk, Rs, onS] = process.argv.slice(2);
const ld = (f: string): SceneIn => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; return s; };
const sc0 = ld("f000.json"); const st = structure(sc0); const fs = fillStructure(st, fillResolution(st, frame(st, sc0)));
const sc = alignJunctionArms(st, ld(`f${String(Number(fk)).padStart(3, "0")}.json`));
if (onS === "1" || onS === "2") sc.look.fillRec = Number(onS);
const tb = frame(st, sc); const zz = zChains(sc);
for (let r = 0; r < 3; r++) fillFrame(fs, st, tb, sc, zz);
FILL_PROF.on = true;
const t = performance.now(); for (let r = 0; r < Number(Rs); r++) fillFrame(fs, st, tb, sc, zz);
console.log(Object.entries(FILL_PROF.t).map(([k, v]) => `${k} ${(v / Number(Rs)).toFixed(2)}`).join("  "));
console.log(`fillFrame ${((performance.now() - t) / Number(Rs)).toFixed(1)} ms/frame`);
