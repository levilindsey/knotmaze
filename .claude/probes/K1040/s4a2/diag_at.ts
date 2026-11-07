// K1040 S4a2: CPU diag at one check #12 spot: form B's pieces and the label
// mirror (label_b.ts labelAt) at the pixel centres along the section.
//   node scripts/run_node.mjs .claude/probes/K1040/s4a2/diag_at.ts <scene> <u> <v> <chain> <k> <side> [scale]
import { readFileSync } from "node:fs";
import { FormB, OWN } from "../../../../src/render/field/form_b";
import type { Piece } from "../../../../src/render/field/form_b";
import { buildLabelB, labelAt } from "../../../../src/render/field/label_b";
import type { FieldScene } from "../../../../src/render/field/scene";

const [name, us, vs, cs, ks, sds, scs] = process.argv.slice(2);
const scale = Number(scs ?? 2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: scale });
const T = buildLabelB(fb);
const [a0, b0, c0, d0, e0, f0] = scene.camera.worldToCss;
const [a, b, c, d, e, f] = [a0 * scale, b0 * scale, c0 * scale, d0 * scale, e0 * scale, f0 * scale];
const det = a * d - b * c;
const ppd = Math.sqrt(Math.abs(det));
const u = Number(us);
const v = Number(vs);
const ci = Number(cs);
const k = Number(ks);
const side = Number(sds);
const p = fb.polys[ci];
const k1 = k + 1 === p.n ? 0 : k + 1;
const dx = p.x[k1] - p.x[k];
const dy = p.y[k1] - p.y[k];
const l = Math.sqrt(dx * dx + dy * dy);
const tx = dx / l;
const ty = dy / l;
const px = (d * (u - e) - c * (v - f)) / det;
const py = (-b * (u - e) + a * (v - f)) / det;
const nx = -ty * side;
const ny = tx * side;
console.log(`h ${(fb.h * ppd).toFixed(3)}px W ${(fb.W * ppd).toFixed(3)}px aa ${(fb.aa * ppd).toFixed(3)}px sigma ${(fb.sigma * ppd).toFixed(2)}px ppd ${ppd.toFixed(3)} chain ${ci} closed ${p.closed} n ${p.n} s0 ${p.s0.toFixed(4)} len ${p.len.toFixed(3)}`);
const out: Piece[] = [];
for (let t = (fb.h - fb.W - 4 / ppd); t <= fb.h + 4 / ppd; t += 0.25 / ppd) {
  const x = px + nx * t;
  const y = py + ny * t;
  const r = fb.evalPoint(x, y);
  fb.pieces(x, y, out);
  const ps = out.map((q) => `c${q.chain}@s${q.s.toFixed(3)} d${(q.d * ppd).toFixed(2)}px selfW${q.selfW.toFixed(2)} surf${q.surf >= OWN ? `OWN${q.surf - OWN}` : q.surf} g${q.g} ramp${q.ramp.toFixed(2)} alts${q.alts.length}[${q.alts.map((z) => `s${z.s.toFixed(2)}/b${z.beta.toFixed(2)}`).join(",")}]`).join(" | ");
  const lb = labelAt(fb, T, x, y);
  // Strip containment (band_b_glsl.ts VS) for each piece's owner segment.
  const strip = out.map((q) => {
    const pp = fb.polys[q.chain];
    const kk = q.k;
    const kb = kk + 1 === pp.n ? 0 : kk + 1;
    const ax = pp.x[kk], ay = pp.y[kk];
    let ux = pp.x[kb] - ax, uy = pp.y[kb] - ay;
    const ll = Math.hypot(ux, uy) || 1;
    ux /= ll; uy /= ll;
    const off = (x - q.fx) * -uy + (y - q.fy) * ux; // not used; side from foot normal below
    const sd = Math.sign((x - q.fx) * -uy + (y - q.fy) * ux) || 1;
    const nrx = -uy * sd, nry = ux * sd;
    const along = (x - ax) * ux + (y - ay) * uy;
    const offs = (x - ax) * nrx + (y - ay) * nry;
    const ro = fb.h + fb.aa + 2 / ppd;
    const lo = Math.max(0, fb.h - fb.W - fb.aa - 2 / ppd);
    return `c${q.chain}k${kk} side${sd} along${(along * ppd).toFixed(1)}px off${(offs * ppd).toFixed(1)}px in[${(lo * ppd).toFixed(1)},${(ro * ppd).toFixed(1)}] ${offs >= lo - 1e-9 && offs <= ro + 1e-9 ? "IN" : "OUT"}`;
  }).join(" | ");
  // Label 1 device px outward along each piece's normal (the lay-3 probe).
  const probes = out.map((q) => {
    const dl = q.d || 1e-12;
    const qx = x + (2 * fb.aa * (x - q.fx)) / dl;
    const qy = y + (2 * fb.aa * (y - q.fy)) / dl;
    const w = labelAt(fb, T, qx, qy);
    return `out(c${q.chain}@${q.s.toFixed(2)})->c${w.chain} code${w.code} s${w.s.toFixed(2)}`;
  }).join(" | ");
  console.log(`t ${(t * ppd).toFixed(2)} ink ${r.ink.toFixed(3)} top ${r.top} fade ${r.fade} term ${r.term ? `k${r.term.kind} s${r.term.s.toFixed(3)} D${(r.term.D * ppd).toFixed(2)} w${r.term.w.toFixed(2)} v${r.term.v.toFixed(3)}` : "-"} label c${lb.chain} code${lb.code} fill${lb.fill ? 1 : 0} s${lb.s.toFixed(3)} :: ${ps} || STRIP ${strip} || PROBE ${probes}`);
}
