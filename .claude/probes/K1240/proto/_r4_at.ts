import { readFileSync } from "node:fs";
import { FormB } from "../../../../src/render/field/form_b";
const [name, ...xy] = process.argv.slice(2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8"));
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene as never, { dpr: 2 }) as any;
const ids = scene.chains.map((c: any) => c.id);
for (let k = 0; k < xy.length; k += 2) {
  const x = Number(xy[k]); const y = Number(xy[k + 1]);
  const ev = fb.evalPoint(x, y);
  const buf: any[] = []; fb.pieces(x, y, buf);
  console.log(`(${x},${y}) top${ev.top} ink${ev.ink.toFixed(2)} fade${ev.fade} Dexp${(ev.Dexp * 1).toFixed(3)} term${ev.term ? ev.term.kind + " ch" + ids[ev.term.chain] + " D" + ev.term.D.toFixed(3) : "-"}`);
  for (const pc of buf) console.log(`   ch${ids[pc.chain]} s${pc.s.toFixed(3)} d${pc.d.toFixed(3)} z${(pc.z ?? NaN).toFixed?.(3)} key${pc.key.toFixed(3)} S${pc.surf} sw${pc.selfW.toFixed(2)} ${Object.keys(pc).filter((k) => !["chain","s","d","z","key","surf","selfW"].includes(k)).map((k) => `${k}=${typeof pc[k] === "number" ? pc[k].toFixed(3) : typeof pc[k] === "object" ? "obj" : pc[k]}`).join(" ")}`);
}
