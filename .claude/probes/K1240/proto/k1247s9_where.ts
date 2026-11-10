// K1247 s9: where a leftover drawn move sits. For each named piece (index from
// k1247s9_union.ts's rows): the point of its largest drawn move (device px, both ways
// as in k1247s9_union), and the 3 outline corners nearest that point, each with its
// q move under the jitter and form B's matched corner's q move (k1247s9_formb's match).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s9_where.ts <scene> <piece,...> <dpx> [--cyc=<frame>]
import type { SceneIn } from "./outline";
import { structure, frame } from "./outline";
import { load } from "./k1247s5_scenes";
import { piecesOf } from "./k1247s8_reduce";
import { FormB } from "../../../../src/render/field/form_b";
const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const pos = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const name = pos[0]; const ids = pos[1].split(",").map(Number); const dpx = +pos[2]; const cyc = arg("cyc");
const perturbT = (scene: SceneIn, A: number): SceneIn => {
  const o = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of o.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return o;
};
const s0 = load(name); const h = s0.look.halfWidth;
const still = cyc !== undefined ? perturbT(s0, ((+cyc <= 20 ? +cyc : 40 - +cyc) / 20) * 0.5 * h) : s0; const S = still.camera.pxPerUnit * 2;
let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const jit = JSON.parse(JSON.stringify(still)) as SceneIn;
for (const c of jit.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * dpx) / S / Math.SQRT2;
type P = { key: string; pts: Float64Array };
interface Cq { ok: boolean; why?: string; Vx: number; Vy: number; qx: number; qy: number; r: number }
const tS = frame(structure(still), still); const tJ = frame(structure(jit), jit);
const A = piecesOf(tS) as P[]; const B = piecesOf(tJ) as P[];
const cS = tS.corners as unknown as Cq[]; const cJ = tJ.corners as unknown as Cq[];
const fbS = new FormB(still as never, { dpr: 2 }).corners as unknown as Cq[];
const fbJ = new FormB(jit as never, { dpr: 2 }).corners as unknown as Cq[];
const near = (t: Cq[], c: Cq): Cq | undefined => { let best: Cq | undefined; let bd = 0.05 * h; for (const x of t) { const d = Math.hypot(x.Vx - c.Vx, x.Vy - c.Vy); if (d < bd) { bd = d; best = x; } } return best; };
const segD = (x: number, y: number, ps: P[]): number => {
  let best = Infinity;
  for (const p of ps) { const a = p.pts; if (a.length === 2) { best = Math.min(best, Math.hypot(x - a[0], y - a[1])); continue; }
    for (let i = 0; i + 3 < a.length; i += 2) { const vx = a[i + 2] - a[i]; const vy = a[i + 3] - a[i + 1]; const l2 = vx * vx + vy * vy; const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - a[i]) * vx + (y - a[i + 1]) * vy) / l2)) : 0; best = Math.min(best, Math.hypot(x - a[i] - vx * t, y - a[i + 1] - vy * t)); } }
  return best;
};
const f = (c: Cq | undefined): string => (c ? `${c.ok ? "ok" : `no(${c.why ?? ""})`} r ${(c.r / h).toFixed(3)}h` : "-");
console.log(`${name}${cyc !== undefined ? ` cyc ${cyc}` : ""} jitter ${dpx} px`);
for (const i of ids) {
  let u = 0; let ux = 0; let uy = 0; let which = "";
  for (let k = 0; k + 1 < B[i].pts.length; k += 2) { const d = segD(B[i].pts[k], B[i].pts[k + 1], A); if (d > u) { u = d; ux = B[i].pts[k]; uy = B[i].pts[k + 1]; which = `jit pt ${k / 2}/${B[i].pts.length / 2}`; } }
  for (let k = 0; k + 1 < A[i].pts.length; k += 2) { const d = segD(A[i].pts[k], A[i].pts[k + 1], B); if (d > u) { u = d; ux = A[i].pts[k]; uy = A[i].pts[k + 1]; which = `still pt ${k / 2}/${A[i].pts.length / 2}`; } }
  console.log(`#${i} ${A[i].key}: drawn ${(u * S).toFixed(3)} px at (${ux.toFixed(3)},${uy.toFixed(3)}) [${which}]`);
  const order = cS.map((c, ci) => [Math.min(Math.hypot(c.Vx - ux, c.Vy - uy), Math.hypot(c.qx - ux, c.qy - uy)) / h, ci] as [number, number]).sort((a, b) => a[0] - b[0]).slice(0, 3);
  for (const [d, ci] of order) {
    const a = cS[ci]; const b = cJ[ci]; const fa = near(fbS, a); const fb = fa ? near(fbJ, fa) : undefined;
    const mv = (p?: Cq, q?: Cq): string => (p && q ? `${(Math.hypot(p.qx - q.qx, p.qy - q.qy) * S).toFixed(3)} px` : "-");
    const rmv = (p?: Cq, q?: Cq): string => (p && q ? `${(Math.abs(p.r - q.r) * S).toFixed(3)} px` : "-");
    console.log(`    corner ${ci} at ${d.toFixed(2)} h: outline ${f(a)} -> ${f(b)}, q ${mv(a, b)}, r ${rmv(a, b)} | form B ${f(fa)} -> ${f(fb)}, q ${mv(fa, fb)}, r ${rmv(fa, fb)}`);
  }
}
