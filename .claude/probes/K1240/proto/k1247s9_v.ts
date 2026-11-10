import type { SceneIn } from "./outline";
import { structure, frame, vDbg } from "./outline";
import { load } from "./k1247s5_scenes";
const [name, ciS, dS, cycS] = process.argv.slice(2); const ci = +ciS; const dpx = +dS;
const perturbT = (scene: SceneIn, A: number): SceneIn => {
  const o = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of o.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return o;
};
const s0 = load(name); const cyc = cycS === undefined ? undefined : +cycS;
const still = cyc !== undefined ? perturbT(s0, ((cyc <= 20 ? cyc : 40 - cyc) / 20) * 0.5 * s0.look.halfWidth) : s0; const S = still.camera.pxPerUnit * 2;
let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const sc = JSON.parse(JSON.stringify(still)) as SceneIn;
for (const c of sc.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * dpx) / S / Math.SQRT2;
for (const [lab, s] of [["still", still], ["jit", sc]] as const) {
  vDbg.ci = ci; vDbg.rows = []; frame(structure(s), s);
  console.log(lab); for (const r of vDbg.rows) console.log(`  it ${r[0]} (${r[1].toFixed(6)},${r[2].toFixed(6)}) Fa/h ${r[3].toExponential(3)} Fb/h ${r[4].toExponential(3)} ka ${r[5]} kb ${r[6]} det ${r[7].toExponential(3)}`);
}
vDbg.ci = -1;