// K1114 S1i: the corners at S1h's F1 sites (both corners of each cut arm), their angle and r, per form.
import { readFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
const sc = JSON.parse(readFileSync("C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/muse_hash.json", "utf8")) as FieldScene;
sc.look.ctrlArc ??= 0.47;
const S = new FormB(sc, { dpr: 2, dEdge: "skip", rootBand: 0 }) as any;
const N = new FormB(sc, { dpr: 2 }) as any;
const h = S.h;
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
for (const [j, cut] of [[0, 0], [36, 109], [155, 471], [156, 475], [62, 189], [131, 397], [99, 301], [73, 222]]) {
  const cs = S.corners.map((c: any, i: number) => [c, i]).filter(([c]: any) => c.a === cut || c.b === cut);
  const arms = S.arms.map((a: any, i: number) => [a, i]).filter(([a]: any) => a.j === S.arms[cut].j);
  console.log(`j${j} arm ${cut}: L S1f ${f(S.arms[cut].L / h)}h, today ${f(N.arms[cut].L / h)}h; arms at the junction: ${arms.map(([a, i]: any) => `${i}@${f((a.ang * 180) / Math.PI, 0)}deg L${f(a.L / h, 2)}`).join(", ")}`);
  for (const [c, i] of cs) {
    const n = N.corners[i];
    const keys = Object.keys(c).filter((k) => typeof c[k] === "number").slice(0, 30);
    console.log(`  corner ${c.a}-${c.b}: ${keys.map((k) => `${k} ${f(c[k])}`).join(" ")}  | today r ${f(n.r / h)}h`);
  }
}
