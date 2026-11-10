// K1247 s11: one tail's f terms with its depth inputs (sE, sF, dF/h, zE/zt, zX/zt), full vs reduced.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s11_tailz.ts <scene> <mult> <eps px> <corner> [--step=2]
import { structure, frame, tailDbg, type SceneIn } from "./outline";
import { sceneOf, load } from "./k1247s5_scenes";
import { selectKeep, reduceScene } from "./k1247s8_reduce";
const [name, multS, epsS, ciS] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const step = +(arg("step") ?? 2);
const still = load(name); const S = still.camera.pxPerUnit * 2;
const K = selectKeep(still, { eps: +epsS / S });
const sc: SceneIn = sceneOf(name, +multS);
const rowsOf = (run: () => void): number[][] => { tailDbg.ci = +ciS; tailDbg.rows = []; run(); const r = tailDbg.rows; tailDbg.ci = -1; return r; };
const rf = rowsOf(() => frame(structure(still), sc));
const rr = rowsOf(() => frame(structure(reduceScene(still, K)), reduceScene(sc, K)));
const c = [0, 1, 2, 5, 8, 9, 10, 11, 12];
console.log("u/h | full: f ad/h margin sE sF dF/h zE zX | red: same");
for (let m = 0; m < Math.min(rf.length, rr.length); m += step) console.log(`${rf[m][0].toFixed(3)} | ${c.slice(1).map((k) => rf[m][k].toFixed(3)).join(" ")} | ${c.slice(1).map((k) => rr[m][k].toFixed(3)).join(" ")}`);
