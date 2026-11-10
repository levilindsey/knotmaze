// K1257: why a k1247_exact row sample sits over 0.5 px. For one scene (and
// move mult, as k1247_exact builds it: frame(structure(orig), moved)) and
// the points given, prints the outline piece the point lies on, that
// piece's corner in the outline and the form B corner with the same V
// (master's, k1257_master.ts, and today's): q, r, feet (ta, tb), in device
// px apart; then evalPoint at the point in both form Bs (Dexp, the term,
// the top) and the point's distance to each form B corner's circle.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1257_rowdiag.ts --scene=def [--move=0.5] x,y [x,y...]
import { structure, frame, type SceneIn } from "./outline";
import { load, perturb } from "./k1247s5_scenes";
import { FormB } from "../../../../src/render/field/form_b";
import { masterFormB } from "./k1257_master";
const FormBMaster = await masterFormB();

const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const name = arg("scene") ?? "def";
const mult = Number(arg("move") ?? 0);
const pts = process.argv.slice(2).filter((a) => !a.startsWith("--")).map((a) => a.split(",").map(Number));
const orig = load(name);
const sc: SceneIn = mult ? perturb(orig, mult * orig.look.halfWidth) : orig;
const table = frame(structure(orig), sc);
const S = sc.camera.pxPerUnit * 2; const h = sc.look.halfWidth;
interface C { ok: boolean; Vx: number; Vy: number; qx: number; qy: number; r: number; tax: number; tay: number; tbx: number; tby: number; theta: number; r0?: number }
const fbs = { master: new FormBMaster(sc as never, { dpr: 2 }) as unknown as FormB, now: new FormB(sc as never, { dpr: 2 }) };
const px = (a: number, b: number, c: number, d: number): string => (Math.hypot(a - c, b - d) * S).toFixed(3);
for (const [x, y] of pts) {
  let best = Infinity; let bp = -1;
  table.pieces.forEach((p, i) => { for (let k = 0; k + 1 < p.pts.length; k += 2) { const d = Math.hypot(p.pts[k] - x, p.pts[k + 1] - y); if (d < best) { best = d; bp = i; } } });
  const p = table.pieces[bp];
  console.log(`point ${x},${y}: piece ${bp} ${p.kind} ch${p.chain} side${p.side} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} corner ${p.corner} (nearest pt ${(best * S).toFixed(3)} px)`);
  const oc = p.corner >= 0 ? (table.corners[p.corner] as unknown as C) : undefined;
  if (oc) console.log(`  outline c${p.corner}: ok ${oc.ok} theta ${oc.theta.toFixed(4)} V ${oc.Vx.toFixed(4)},${oc.Vy.toFixed(4)} q ${oc.qx.toFixed(5)},${oc.qy.toFixed(5)} r ${(oc.r / h).toFixed(5)} h; |p-q|-r ${((Math.hypot(x - oc.qx, y - oc.qy) - oc.r) * S).toFixed(3)} px`);
  for (const [k, fb] of Object.entries(fbs)) {
    const cs = fb.corners as unknown as C[];
    if (oc) {
      let bi = -1; let bd = 0.05 * h;
      cs.forEach((c, i) => { const d = Math.hypot(c.Vx - oc.Vx, c.Vy - oc.Vy); if (d < bd) { bd = d; bi = i; } });
      if (bi < 0) console.log(`  ${k}: no corner at V`);
      else {
        const c = cs[bi]; console.log(`  ${k} c${bi}: ok ${c.ok} r0 ${((c.r0 ?? NaN) / h).toFixed(5)} h r ${(c.r / h).toFixed(5)} h; q ${px(c.qx, c.qy, oc.qx, oc.qy)} px from the outline's, ta ${px(c.tax, c.tay, oc.tax, oc.tay)} tb ${px(c.tbx, c.tby, oc.tbx, oc.tby)} px; |p-q|-r ${((Math.hypot(x - c.qx, y - c.qy) - c.r) * S).toExponential(2)} px`);
        // The row measure a hair either side of the point, along the radius (1e-6 device px).
        const L = Math.hypot(x - c.qx, y - c.qy); const e = 1e-6 / S;
        const ux = (x - c.qx) / L; const uy = (y - c.qy) / L;
        console.log(`  ${k} row measure 1e-6 px inward ${rowD(fb, x - e * ux, y - e * uy).toFixed(3)} px, outward ${rowD(fb, x + e * ux, y + e * uy).toFixed(3)} px`);
        for (const t of [1e-3, 1e-2, 0.1, 0.5]) {
          const xi = x - (t / S) * ux; const yi = y - (t / S) * uy;
          const ei = fb.evalPoint(xi, yi) as unknown as { Dexp: number; top: number; ink: number; term?: { kind: number; chain: number; D: number } };
          console.log(`    ${t} px inward: row ${rowD(fb, xi, yi).toFixed(3)} px; Dexp ${(Math.abs(ei.Dexp) * S).toFixed(3)} top ${ei.top} ink ${ei.ink.toFixed(3)} term ${ei.term ? `${ei.term.kind} ch${ei.term.chain} D ${(Math.abs(ei.term.D) * S).toFixed(3)}` : "-"}`);
        }
      }
    }
    const ev = fb.evalPoint(x, y) as unknown as { Dexp: number; top: number; fade: number; ink: number; term?: { kind: number; chain: number; D: number } };
    const near = (fb as unknown as { cornersNear(x: number, y: number): number[] }).cornersNear(x, y);
    console.log(`  ${k} row measure (k1247_exact's min of visible ink, Dexp, term): ${rowD(fb, x, y).toFixed(3)} px; eval again: ${JSON.stringify(fb.evalPoint(x, y)) === JSON.stringify(ev) ? "same" : "DIFFERS"}`);
    console.log(`  ${k} eval: Dexp ${(Math.abs(ev.Dexp) * S).toFixed(3)} px, term ${ev.term ? `${ev.term.kind} ch${ev.term.chain} D ${(Math.abs(ev.term.D) * S).toFixed(3)} px` : "-"}, top ${ev.top}, fade ${ev.fade}, ink ${ev.ink.toFixed(3)}; cornersNear ${near.map((i) => { const c = cs_(fb)[i]; return `c${i}(${((Math.hypot(x - c.qx, y - c.qy) - c.r) * S).toFixed(2)}px${c.ok ? "" : " !ok"})`; }).join(" ")}`);
  }
}
function cs_(fb: FormB): C[] { return fb.corners as unknown as C[]; }
// k1247_exact.ts's direction A measure at one point, copied.
function rowD(fbIn: FormB, x: number, y: number): number {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const fb = fbIn as any;
  const buf: any[] = [];
  fb.pieces(x, y, buf);
  const surfIds: number[] = [];
  for (const pc of buf) if (!surfIds.includes(pc.surf)) surfIds.push(pc.surf);
  for (const ci of fb.cornersNear(x, y)) { const g = fb.corners[ci].g; if (!surfIds.includes(g)) surfIds.push(g); }
  const entries = surfIds.map((s) => {
    const io = fb.inkOf(s, x, y, buf);
    let key = -Infinity;
    for (const pc of buf) if (pc.surf === s && pc.d < fb.h + fb.aa) key = Math.max(key, pc.key);
    return { io, key };
  }).sort((a, b) => b.key - a.key);
  let T = 1; let dInk = Infinity;
  for (const e of entries) {
    if (Number.isFinite(e.io.Dexp) && T * e.io.v > 0.05) dInk = Math.min(dInk, Math.abs(e.io.Dexp) * S);
    T *= 1 - e.io.a;
    if (!(T > 0)) break;
  }
  const ev = fb.evalPoint(x, y);
  const dDexp = Number.isFinite(ev.Dexp) ? Math.abs(ev.Dexp) * S : Infinity;
  const dTerm = ev.term ? Math.abs(ev.term.D) * S : Infinity;
  return Math.min(dInk, dDexp, dTerm);
}
