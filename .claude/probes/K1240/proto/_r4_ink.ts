import { readFileSync } from "node:fs";
import { FormB } from "../../../../src/render/field/form_b";
const [name, ...xy] = process.argv.slice(2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8"));
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene as never, { dpr: 2 }) as any;
const ppd = scene.camera.pxPerUnit * 2;
console.log(`ppd ${ppd.toFixed(1)} W ${fb.W} aa ${fb.aa} h ${fb.h} zt ${fb.zt}`);
for (let k = 0; k < xy.length; k += 2) {
  const x = Number(xy[k]); const y = Number(xy[k + 1]);
  for (const [dx, dy, lab] of [[1, 0, "x"], [0, 1, "y"]] as const) {
    const row: string[] = [];
    for (let o = -6; o <= 6; o++) { const ev = fb.evalPoint(x + dx * o / ppd, y + dy * o / ppd); row.push(`${ev.ink.toFixed(2)}${ev.fade ? "f" + ev.fade : ""}`); }
    console.log(`(${x},${y}) along ${lab} -6..6 px: ${row.join(" ")}`);
  }
}
