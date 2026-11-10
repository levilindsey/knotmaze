// K1247 s9: one tail's f terms along u (u/h, f, ad/h, 0.5 - ramp, the width
// term, the depth margin / zt, the point), still and jittered (k1247s8_jitter's
// seeded jitter), from the fast frame.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s9_tail.ts <scene> <corner> <dpx> [--cyc=<frame>]
import type { SceneIn } from "./outline";
import { structure, frame, tailDbg } from "./outline";
import { load } from "./k1247s5_scenes";
const pos = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const name = pos[0]; const ci = +pos[1]; const dpx = +pos[2];
const cycA = process.argv.find((a) => a.startsWith("--cyc="))?.slice(6);
const perturbT = (scene: SceneIn, A: number): SceneIn => {
  const o = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of o.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return o;
};
const s0 = load(name);
// K1247 s11: --cyc=<frame> perturbs as k1247s9_union does.
const still = cycA !== undefined ? perturbT(s0, ((+cycA <= 20 ? +cycA : 40 - +cycA) / 20) * 0.5 * s0.look.halfWidth) : s0; const S = still.camera.pxPerUnit * 2;
const tailPts: number[][] = [];
let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const sc = JSON.parse(JSON.stringify(still)) as SceneIn;
for (const c of sc.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * dpx) / S / Math.SQRT2;
const out: number[][][] = [];
for (const s of [still, sc]) {
  tailDbg.ci = ci; tailDbg.rows = [];
  const t = frame(structure(s), s);
  out.push(tailDbg.rows.slice());
  const pc = t.pieces.find((p) => p.kind === "tail" && p.corner === ci);
  tailPts.push(pc ? Array.from(pc.pts) : []);
  console.log(`${s === still ? "still" : "jit"}: tail pts ${pc ? pc.pts.length / 2 : "-"} first ${pc && pc.pts.length ? `(${pc.pts[0].toFixed(4)},${pc.pts[1].toFixed(4)})` : "-"}`);
}
tailDbg.ci = -1;
if (process.argv.includes("--pts")) {
  const [a, b] = tailPts; const n = Math.max(a.length, b.length) / 2;
  for (let i = 0; i < n; i++) console.log(`pt ${i}: ${a[2 * i]?.toFixed(5)} ${a[2 * i + 1]?.toFixed(5)} | ${b[2 * i]?.toFixed(5)} ${b[2 * i + 1]?.toFixed(5)}  d ${a.length > 2 * i && b.length > 2 * i ? (Math.hypot(a[2 * i] - b[2 * i], a[2 * i + 1] - b[2 * i + 1]) * S).toFixed(3) : "-"} px`);
}
const f = (v: number): string => (Number.isFinite(v) ? v.toFixed(4) : String(v)).padStart(9);
console.log("      u/h        f     ad/h   0.5-rmp    width    depth  | jit: f     ad/h   0.5-rmp    width    depth");
for (let m = 0; m < out[0].length; m++) {
  const a = out[0][m]; const b = out[1][m] ?? [];
  console.log(`${f(a[0])}${f(a[1])}${f(a[2])}${f(a[3])}${f(a[4])}${f(a[5])}  |${f(b[1])}${f(b[2])}${f(b[3])}${f(b[4])}${f(b[5])}  pt ${f(a[6])}${f(a[7])} |${f(b[6])}${f(b[7])}`);
}
