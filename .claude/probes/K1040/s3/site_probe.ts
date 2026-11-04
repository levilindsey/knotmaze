// K1040 S3c: what Form B sees at one census site (an unattributed DEFECT).
//   node scripts/run_node.mjs .claude/probes/K1040/s3/site_probe.ts <scene> <scale> <x> <y> [chain ...]
// Prints the candidates and pieces at (x, y), evalPoint's answer, and for each
// chain asked: closed, s0, len, its vertex count, and the foot of (x, y).
import { readFileSync } from "node:fs";
import { FormB, type Piece } from "../../../../src/render/field/form_b";
import { candidates, type Cand } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";

const [name, scaleS, xs, ys, ...chainsS] = process.argv.slice(2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
const fb = new FormB(scene, { dpr: Number(scaleS) });
const x = Number(xs), y = Number(ys);
const r6 = (v: number) => Number(v.toFixed(6));
console.log(`h ${r6(fb.h)} W ${r6(fb.W)} aa ${r6(fb.aa)} sigma ${r6(fb.sigma)} K ${r6(fb.K)} ppuDev ${r6(fb.ppuDev)}`);
const cs: Cand[] = [];
candidates(fb.grid, x, y, fb.h + fb.W + 2 * fb.aa, cs);
console.log("candidates: " + cs.sort((a, b) => a.d - b.d).map((c) => `ch${c.chain} s${r6(c.s)} d${r6(c.d)}`).join("; "));
const P: Piece[] = [];
const fade = fb.pieces(x, y, P);
console.log(`pieces (fade ${fade}): ` + P.map((p) => `ch${p.chain} s${r6(p.s)} d${r6(p.d)} key${r6(p.key)} g${p.g} vtx${p.vtx} alts${p.alts.length}`).join("; "));
const e = fb.evalPoint(x, y);
console.log("evalPoint: " + JSON.stringify(e, (k, v) => (typeof v === "number" ? r6(v) : v)).slice(0, 900));
for (const cS of chainsS) {
  const c = Number(cS);
  const p = fb.polys[c];
  const n = p.n;
  console.log(`chain ${c}: closed ${p.closed} s0 ${r6(p.s0)} len ${r6(p.len)} n ${n} first (${r6(p.x[0])}, ${r6(p.y[0])}) last (${r6(p.x[n - 1])}, ${r6(p.y[n - 1])}) s[n-1] ${r6(p.s[n - 1])}`);
  const one: Cand[] = [];
  candidates(fb.grid, x, y, 1.0, one, c);
  console.log(`  feet within 1.0: ` + one.map((q) => `s${r6(q.s)} d${r6(q.d)}`).join("; "));
  const arms = fb.armsOf[c] ?? [];
  console.log(`  arms: ` + arms.map((ai) => JSON.stringify(fb.arms[ai], (k, v) => (typeof v === "number" ? r6(v) : v)).slice(0, 300)).join(" | "));
}
