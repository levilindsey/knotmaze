// K1247 s14: a border's segments around one index in k1247s13_x310's two frames (still or
// --cyc, then the seeded jitter): index, start point, s, s span, length, span/length. For
// #658 (fat cyc18 jit 0.01, chain 2 side -1 near 13505), whose synthesized cut sat on a
// near-zero-span join segment at the window's edge.
// Usage: node scripts/run_node.mjs <this> <scene> <cyc|-> <jitter px> <chain> <side 1|-1> <seg | s=value> [k=6]
import type { SceneIn } from "./outline";
import { structure, frame, debugCache } from "./outline";
import { load } from "./k1247s5_scenes";
const [nm, cycS, jS, chS, sdS, segS, kS] = process.argv.slice(2);
const ch = +chS; const side = +sdS; const K = Number(kS ?? 6);
const perturbT = (scene: SceneIn, A: number): SceneIn => {
  const o = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of o.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return o;
};
const s0 = load(nm);
const still = cycS !== "-" ? perturbT(s0, ((+cycS <= 20 ? +cycS : 40 - +cycS) / 20) * 0.5 * s0.look.halfWidth) : s0; const S = still.camera.pxPerUnit * 2;
let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const sc = JSON.parse(JSON.stringify(still)) as SceneIn;
for (const c of sc.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * +jS) / S / Math.SQRT2;
for (const [lab, scn] of [["A", still], ["B", sc]] as const) {
  const st = structure(scn); frame(st, scn);
  const C = debugCache(st) as any; const B = C.bords[ch * 2 + (side === 1 ? 0 : 1)];
  // <seg> is an index, or s=<value>: the first segment whose s span holds that s.
  let seg = +segS; if (segS.startsWith("s=")) { const sv = +segS.slice(2); seg = 0; for (let i = 0; i + 1 < B.nb; i++) if (B.bs[i] <= sv && B.bs[i + 1] > sv) { seg = i; break; } }
  console.log(`${lab}: chain ${ch} side ${side} nb ${B.nb}`);
  for (let i = Math.max(0, seg - K); i <= Math.min(B.nb - 2, seg + K); i++) {
    const L = B.bs[i + 1] - B.bs[i]; const len = Math.hypot(B.bx[i + 1] - B.bx[i], B.by[i + 1] - B.by[i]);
    console.log(`  ${i === seg ? "*" : " "}${i} (${B.bx[i].toFixed(5)},${B.by[i].toFixed(5)}) s ${B.bs[i].toFixed(5)} span ${L.toExponential(2)} len ${len.toFixed(5)} span/len ${(len > 0 ? L / len : NaN).toFixed(3)}`);
  }
}
