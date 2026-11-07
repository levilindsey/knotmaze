// K1040 S4a2: the cap mix at one point: inkOf per surface in each configuration.
//   node scripts/run_node.mjs .claude/probes/K1040/s4a2/diag_cfg.ts <scene> <u> <v> <chain> <k> <side> <tPx> [scale]
import { readFileSync } from "node:fs";
import { FormB, OWN } from "../../../../src/render/field/form_b";
import type { Piece } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";

const [name, us, vs, cs, ks, sds, ts, scs] = process.argv.slice(2);
const scale = Number(scs ?? 2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: scale });
const [a0, b0, c0, d0, e0, f0] = scene.camera.worldToCss;
const [a, b, c, d, e, f] = [a0 * scale, b0 * scale, c0 * scale, d0 * scale, e0 * scale, f0 * scale];
const det = a * d - b * c;
const ppd = Math.sqrt(Math.abs(det));
const ci = Number(cs);
const k = Number(ks);
const p = fb.polys[ci];
const k1 = k + 1 === p.n ? 0 : k + 1;
const dx = p.x[k1] - p.x[k];
const dy = p.y[k1] - p.y[k];
const l = Math.sqrt(dx * dx + dy * dy);
const px = (d * (Number(us) - e) - c * (Number(vs) - f)) / det;
const py = (-b * (Number(us) - e) + a * (Number(vs) - f)) / det;
const t = Number(ts) / ppd;
const x = px + (-dy / l) * Number(sds) * t;
const y = py + (dx / l) * Number(sds) * t;
console.log(`point world (${x.toFixed(4)}, ${y.toFixed(4)}) h ${(fb.h * ppd).toFixed(2)}px W ${(fb.W * ppd).toFixed(2)}px`);
const P: Piece[] = [];
fb.pieces(x, y, P);
for (const q of P) console.log(`piece c${q.chain} s${q.s.toFixed(4)} d${(q.d * ppd).toFixed(2)}px z${q.z.toFixed(4)} key${q.key.toFixed(4)} g${q.g} ramp${q.ramp.toFixed(4)} selfW${q.selfW.toFixed(3)} surf${q.surf}`);
const ev = fb.evalPoint(x, y);
console.log(`eval ink ${ev.ink.toFixed(4)} top ${ev.top} fade ${ev.fade}`);
const ids = [...new Set(P.map((q) => q.surf))];
for (const S of ids) {
  const o = fb.inkOf(S, x, y, P);
  console.log(`inkOf surf ${S >= OWN ? `OWN${S - OWN}` : S}: v ${o.v.toFixed(4)} a ${o.a.toFixed(4)} term ${o.term ? `kind${o.term.kind} c${o.term.chain} s${o.term.s.toFixed(3)} D${(o.term.D * ppd).toFixed(2)}px w${o.term.w.toFixed(3)}` : "-"}`);
}
// The OWN configuration for every ramp piece, one at a time and all together.
const ramped = P.filter((q) => q.g >= 0 && q.ramp < 1);
for (const q of ramped) {
  const save = q.surf;
  q.surf = OWN + q.idx;
  for (const S of [...new Set(P.map((z) => z.surf))]) {
    const o = fb.inkOf(S, x, y, P);
    console.log(`cfg c${q.chain} OWN: inkOf ${S >= OWN ? `OWN${S - OWN}` : S}: v ${o.v.toFixed(4)} a ${o.a.toFixed(4)}`);
  }
  q.surf = save;
}
