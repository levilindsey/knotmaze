// K1247 s16: one piece of k1247s9_union's jitter test, before and after the
// jitter (same scene, perturbT and seed): kind, chain, side, s0/s1, its end
// points and the point that moved most (device px).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s16_udump.ts <scene> <cyc|-> <dpx> <piece,...>
import { structure, frame, type SceneIn } from "./outline";
import { load } from "./k1247s5_scenes";
const [name, cycS, dS, psS] = process.argv.slice(2);
const perturbT = (scene: SceneIn, A: number): SceneIn => {
  const o = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of o.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return o;
};
const s0 = load(name);
const still = cycS !== "-" ? perturbT(s0, ((+cycS <= 20 ? +cycS : 40 - +cycS) / 20) * 0.5 * s0.look.halfWidth) : s0;
const S = still.camera.pxPerUnit * 2; const dpx = +dS;
let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const sc = JSON.parse(JSON.stringify(still)) as SceneIn;
for (const c of sc.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * dpx) / S / Math.SQRT2;
const snap = (s: SceneIn) => frame(structure(s), s).pieces.map((p) => ({ ...p, pts: Array.from(p.pts) }));
const A = snap(still); const B = snap(sc);
for (const pi of psS.split(",").map(Number)) {
  for (const [tag, T] of [["A", A], ["B", B]] as const) {
    const p = T[pi]; const n = p.pts.length;
    console.log(`${tag} #${pi} ${p.kind} c${p.chain} s${p.side} corner ${p.corner} [${p.s0.toFixed(6)}, ${p.s1.toFixed(6)}] n${n >> 1} start (${(p.pts[0] * S).toFixed(3)}, ${(p.pts[1] * S).toFixed(3)}) end (${(p.pts[n - 2] * S).toFixed(3)}, ${(p.pts[n - 1] * S).toFixed(3)})`);
  }
  const a = A[pi].pts, b = B[pi].pts;
  if (a.length === b.length) { let m = 0, mk = -1; for (let k = 0; k < a.length; k += 2) { const d = Math.hypot(a[k] - b[k], a[k + 1] - b[k + 1]) * S; if (d > m) { m = d; mk = k >> 1; } } console.log(`  same count: largest point move ${m.toFixed(3)} px at point ${mk} of ${a.length >> 1}`); }
  else console.log(`  point count ${a.length >> 1} -> ${b.length >> 1}`);
}
