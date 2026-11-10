// K1247 s9: one tail's f terms along u (u/h, f, ad/h, 0.5 - ramp, the width
// term, the depth margin / zt, the point), still and jittered (k1247s8_jitter's
// seeded jitter), from the fast frame.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s9_tail.ts <scene> <corner> <dpx> [--cyc=<frame>]
import type { SceneIn } from "./outline";
import { structure, frame, tailDbg } from "./outline";
import { load } from "./k1247s5_scenes";
const pos = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const name = pos[0]; const ci = +pos[1]; const dpx = +pos[2];
const still = load(name); const S = still.camera.pxPerUnit * 2;
let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const sc = JSON.parse(JSON.stringify(still)) as SceneIn;
for (const c of sc.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * dpx) / S / Math.SQRT2;
const out: number[][][] = [];
for (const s of [still, sc]) {
  tailDbg.ci = ci; tailDbg.rows = [];
  const t = frame(structure(s), s);
  out.push(tailDbg.rows.slice());
  const pc = t.pieces.find((p) => p.kind === "tail" && p.corner === ci);
  console.log(`${s === still ? "still" : "jit"}: tail pts ${pc ? pc.pts.length / 2 : "-"} first ${pc && pc.pts.length ? `(${pc.pts[0].toFixed(4)},${pc.pts[1].toFixed(4)})` : "-"}`);
}
tailDbg.ci = -1;
const f = (v: number): string => (Number.isFinite(v) ? v.toFixed(4) : String(v)).padStart(9);
console.log("      u/h        f     ad/h   0.5-rmp    width    depth  | jit: f     ad/h   0.5-rmp    width    depth");
for (let m = 0; m < out[0].length; m++) {
  const a = out[0][m]; const b = out[1][m] ?? [];
  console.log(`${f(a[0])}${f(a[1])}${f(a[2])}${f(a[3])}${f(a[4])}${f(a[5])}  |${f(b[1])}${f(b[2])}${f(b[3])}${f(b[4])}${f(b[5])}  pt ${f(a[6])}${f(a[7])} |${f(b[6])}${f(b[7])}`);
}
