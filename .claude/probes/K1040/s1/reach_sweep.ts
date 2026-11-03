// K1040 S1f F1: the reach at one near-tangent pass, against a moved vertex.
// Takes an arm, finds the pass that binds its straight-reach cut (c1's
// Lcut), and writes:
//   profile: behind the pass, every 0.1 h out to min(r0, 40): the chord at
//     matched arc length (what the quad reach samples) and the walk's foot
//     distance (what c2 tracks), with the targets T;
//   sweep: one partner vertex (nearest the partner's point at eV h behind
//     the pass) moved by δ h along the separation (+ apart, − together),
//     the scene rebuilt per δ; per δ: r0, c2's walked e_c, the quad e* (1
//     and 2 fits, floor 4h), the final reaches (quad min(r0, max(4h, e*)),
//     c2's min(r0, e_c), c3's max(4h, min(r0, e_c))), and the arm's L under
//     quad (the default), c2 and c3; then the largest step between
//     neighbouring δ of each reach and L.
// Run: npx vite-node .claude/probes/K1040/s1/reach_sweep.ts <scene> <arm> [eV h | "ec"] [range h] [steps] [tag]
//   writes out/s1f/sweep/<scene>_a<arm>_<tag>.txt
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import type { Pass } from "../../../../src/render/field/form_b";
import { footInWindow, normS, pointAt } from "../../../../src/render/field/geom";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a43dac8f0673db4df/.claude/probes/K1040/s1";
const [name, armArg, eVArg = "ec", rangeArg = "1", stepsArg = "200", tag = "v"] = process.argv.slice(2);
const ai = Number(armArg);
const range = Number(rangeArg);
const steps = Number(stepsArg);
const f = (v: number, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const sc0 = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
sc0.look.ctrlArc ??= 0.47;

function bindingPass(b: FormB): { x: Pass; d: number; r0: number } {
  const a = b.arms[ai];
  const pa = b.polys[a.pi];
  let best: { x: Pass; d: number; c: number; r0: number } | null = null;
  for (const x of b.passes[a.pi]) {
    let d = (x.s - a.sR) * a.dir;
    if (pa.closed) d = ((d % pa.len) + pa.len) % pa.len;
    if (d < -1e-12) continue;
    const tn = Math.tan(x.theta / 2);
    const r0 = tn > 1e-12 ? b.h / tn : Infinity;
    const c = d - r0 - b.h;
    if (!best || c < best.c) best = { x, d, c, r0 };
  }
  if (!best) throw new Error(`arm ${ai} has no pass`);
  return best;
}

const out: string[] = [];
const b0 = new FormB(sc0);
const hw = b0.h;
const a0 = b0.arms[ai];
const { x: x0, d: d0, r0: r00 } = bindingPass(b0);
const pa0 = b0.polys[a0.pi];
const pq0 = b0.polys[x0.qi];
// The partner's matched side: the one whose chord at 0.5 h is the shorter.
const chordAt = (b: FormB, x: Pass, dir: number, e: number, sg: number) => {
  const A = pointAt(b.polys[b.arms[ai].pi], x.s - dir * e);
  const B = pointAt(b.polys[x.qi], x.sq + sg * e);
  return Math.hypot(A.x - B.x, A.y - B.y);
};
const sg = chordAt(b0, x0, a0.dir, 0.5 * hw, 1) <= chordAt(b0, x0, a0.dir, 0.5 * hw, -1) ? 1 : -1;
const ec0 = b0.curvedReachOf(a0.pi, x0, a0.dir, r00, hw);
out.push(`${name} arm ${ai} (pi ${a0.pi} dir ${a0.dir} ${a0.kind}, L ${f(a0.L)}): binding pass s ${f(x0.s)} → chain ${x0.qi} sq ${f(x0.sq)} σ ${sg}, d ${f(d0 / hw, 2)}h θ ${f(x0.theta)} r0 ${f(r00 / hw, 2)}h; e_c ${f(ec0 / hw, 3)}h; h ${hw}`);

// Profile.
const Tc = 2 * hw * Math.cos(x0.theta / 2);
const Tf = hw * (1 + Math.cos(x0.theta));
out.push(`profile (e in h; chord target T ${f(Tc / hw, 3)}h, foot target ${f(Tf / hw, 3)}h):`);
{
  const lim = Math.min(r00, 40);
  let sP = x0.sq;
  const win = 4 * 0.004 + 0.02;
  for (let e = 0.1 * hw; e <= lim + 1e-12; e += 0.1 * hw) {
    let sA = x0.s - a0.dir * e;
    if (pa0.closed) sA = normS(pa0, sA);
    else if (sA < pa0.s0 || sA > pa0.s0 + pa0.len) break;
    const A = pointAt(pa0, sA);
    const B = pointAt(pq0, x0.sq + sg * e);
    // The foot as the walk tracks it, at this coarser step (several windows per step).
    let ft = footInWindow(pq0, A.x, A.y, sP - win, sP + win);
    for (let k = 0; k < 30 && Math.abs(ft.s - sP) > 1e-9; k++) {
      sP = ft.s;
      ft = footInWindow(pq0, A.x, A.y, sP - win, sP + win);
    }
    sP = ft.s;
    out.push(`  e ${f(e / hw, 1)}h chord ${f(Math.hypot(A.x - B.x, A.y - B.y) / hw, 3)}h foot ${f(ft.d / hw, 3)}h`);
  }
}

// Sweep: the partner's vertex nearest its matched point at eV.
const eV = eVArg === "ec" ? ec0 : Number(eVArg) * hw;
const P = pointAt(pq0, x0.sq + sg * eV);
const A0 = pointAt(pa0, x0.s - a0.dir * eV);
const ch = sc0.chains[x0.qi];
let vi = -1;
let vd = Infinity;
for (let k = 0; k < ch.pts.length / 2; k++) {
  const dd = Math.hypot(ch.pts[2 * k] - P.x, ch.pts[2 * k + 1] - P.y);
  if (dd < vd) {
    vd = dd;
    vi = k;
  }
}
let nx = P.x - A0.x;
let ny = P.y - A0.y;
const nl = Math.hypot(nx, ny);
nx /= nl;
ny /= nl;
out.push(`sweep: chain ${ch.id} vertex ${vi} (${f(ch.pts[2 * vi])}, ${f(ch.pts[2 * vi + 1])}), ${f(vd, 4)} from the matched point at eV ${f(eV / hw, 3)}h, moved δ h along (${f(nx, 3)}, ${f(ny, 3)}), δ in [−${range}, ${range}], ${steps} steps`);
out.push(`  δ(h)     r0(h)    e_c(h)   e*1(h)   e*2(h)   reach: quad    c2       c3      | L: quad   c2      c3`);
const cols: number[][] = [];
// DC (env, h): the sweep's centre, so a fine sweep can sit on one step of a coarse one.
const dc = Number(process.env.DC ?? 0);
if (dc) out.push(`  (centred at δ ${dc} h: δ in [${dc - range}, ${dc + range}])`);
for (let i = 0; i <= steps; i++) {
  const dl = dc - range + (2 * range * i) / steps;
  const sc = structuredClone(sc0);
  sc.chains[x0.qi].pts[2 * vi] += dl * hw * nx;
  sc.chains[x0.qi].pts[2 * vi + 1] += dl * hw * ny;
  const bq = new FormB(sc);
  const bq1 = new FormB(sc, { reachSteps: 1 });
  const b2 = new FormB(sc, { reach: "walk", curvedFrom: 0 });
  const b3 = new FormB(sc, { reach: "walk" });
  const a = bq.arms[ai];
  const { x, r0 } = bindingPass(bq);
  const fl = 4 * hw;
  const ec = bq.curvedReachOf(a.pi, x, a.dir, r0, hw);
  const e1 = bq1.quadReachOf(a.pi, x, a.dir, hw, fl);
  const e2 = bq.quadReachOf(a.pi, x, a.dir, hw, fl);
  const rq = r0 > fl ? Math.min(r0, Math.max(fl, e2)) : r0;
  const r2 = Math.min(r0, ec);
  const r3 = r0 > fl ? Math.max(fl, Math.min(r0, ec)) : r0;
  const row = [dl, r0 / hw, ec / hw, e1 / hw, e2 / hw, rq / hw, r2 / hw, r3 / hw, a.L, b2.arms[ai].L, b3.arms[ai].L];
  cols.push(row);
  out.push(`  ${row.map((v, k) => f(v, k === 0 ? 3 : 4).padStart(8)).join(" ")}`);
}
const names = ["δ", "r0", "e_c", "e*1", "e*2", "reach quad", "reach c2", "reach c3", "L quad", "L c2", "L c3"];
const jumps = names.map((n, k) => {
  let mx = 0;
  let at = 0;
  for (let i = 1; i < cols.length; i++) {
    const dv = Math.abs(cols[i][k] - cols[i - 1][k]);
    if (dv > mx) {
      mx = dv;
      at = cols[i][0];
    }
  }
  return `${n} ${f(mx, 4)} (at δ ${f(at, 3)})`;
});
out.push(`largest step between neighbouring δ (δ step ${f((2 * range) / steps, 4)} h; reaches in h, L in world units): ${jumps.slice(1).join("; ")}`);
mkdirSync(`${HERE}/out/s1f/sweep`, { recursive: true });
const file = `${HERE}/out/s1f/sweep/${name}_a${ai}_${tag}.txt`;
writeFileSync(file, out.join("\n") + "\n");
console.log(out[0]);
console.log(out[out.length - 1]);
console.log(`wrote ${file}`);
