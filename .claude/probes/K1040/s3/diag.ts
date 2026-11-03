// K1040 S3: one census site in detail: form B's pieces (kept, dropped into
// alts, fold weights) and evalPoint, against labelAt's hit.
//   node scripts/run_node.mjs .claude/probes/K1040/s3/diag.ts <scene> <i> <j> [scale]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FormB, type Piece } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";
import { buildLabelB, labelAt } from "../../../../src/render/field/label_b";
import { candidates } from "../../../../src/render/field/geom";

const [name, si, sj, ss] = process.argv.slice(2);
const scale = Number(ss ?? 2);
const sc = JSON.parse(readFileSync(join("C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes", `${name}.json`), "utf8")) as FieldScene;
sc.look.ctrlArc ??= 0.47;
const fb = new FormB(sc, { dpr: scale });
const T = buildLabelB(fb);
const [a, b, c, d, e, f] = sc.camera.worldToCss.map((v) => v * scale);
const det = a * d - b * c;
const u = Number(si) + 0.5 - e;
const v = Number(sj) + 0.5 - f;
const x = (d * u - c * v) / det;
const y = (-b * u + a * v) / det;
console.log(`site ${si},${sj} -> (${x.toFixed(5)}, ${y.toFixed(5)}); h ${fb.h.toFixed(4)} sigma ${fb.sigma.toFixed(4)} K ${fb.K} aa ${fb.aa.toFixed(5)} W ${fb.W}`);
const cb: { chain: number; s: number; d: number }[] = [];
candidates(fb.grid, x, y, fb.h + fb.W + 2 * fb.aa, cb as never);
console.log("candidates:", cb.slice().sort((p, q) => p.d - q.d).map((q) => `c${q.chain} s ${q.s.toFixed(3)} d ${q.d.toFixed(4)}`).join("; "));
const P: Piece[] = [];
const fade = fb.pieces(x, y, P);
console.log(`pieces fade ${fade}:`);
for (const A of P) console.log(`  c${A.chain} s ${A.s.toFixed(3)} d ${A.d.toFixed(4)} z ${A.z.toFixed(4)} key ${A.key.toFixed(4)} g ${A.g} ramp ${A.ramp.toFixed(3)} surf ${A.surf} selfW ${A.selfW.toFixed(3)} alts ${A.alts.map((X) => `s ${X.s.toFixed(3)} d ${X.d.toFixed(4)} b ${(X as { beta: number }).beta.toFixed(3)}`).join(",")}`);
const r = fb.evalPoint(x, y);
console.log(`evalPoint top ${r.top} chain ${r.chain} s ${r.s.toFixed(4)} key ${r.key.toFixed(4)} ink ${r.ink.toFixed(3)} fade ${r.fade} nSurf ${r.nSurf} dkey ${r.dkey}`);
const L = labelAt(fb, T, x, y);
console.log("labelAt:", JSON.stringify(L));
