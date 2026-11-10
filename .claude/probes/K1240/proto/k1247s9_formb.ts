// K1247 s9: does form B jump where the outline does? Per outline corner: its ok/r/q
// still and jittered (k1247s8_jitter's seed), and form B's corner matched by V
// within 0.05 h, still and jittered (r in h, q moves in device px).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s9_formb.ts <scene> <corner,...> <dpx> [--cyc=<frame>] [--impl=./_s9_outline_master.ts]
import type { SceneIn } from "./outline";
import { load } from "./k1247s5_scenes";
import { FormB } from "../../../../src/render/field/form_b";
const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const pos = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const name = pos[0]; const cis = pos[1].split(",").map(Number); const dpx = +pos[2];
const O = (await import(/* @vite-ignore */ new URL(arg("impl") ?? "./outline.ts", import.meta.url).href)) as typeof import("./outline");
const perturbT = (scene: SceneIn, A: number): SceneIn => {
  const o = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of o.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return o;
};
const cyc = arg("cyc");
const s0 = load(name); const h = s0.look.halfWidth;
const still = cyc !== undefined ? perturbT(s0, ((+cyc <= 20 ? +cyc : 40 - +cyc) / 20) * 0.5 * h) : s0; const S = still.camera.pxPerUnit * 2;
let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const jit = JSON.parse(JSON.stringify(still)) as SceneIn;
for (const c of jit.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * dpx) / S / Math.SQRT2;
interface Cq { ok: boolean; why?: string; Vx: number; Vy: number; qx: number; qy: number; r: number }
const outS = O.frame(O.structure(still), still).corners as unknown as Cq[];
const outJ = O.frame(O.structure(jit), jit).corners as unknown as Cq[];
const fbS = new FormB(still as never, { dpr: 2 }).corners as unknown as Cq[];
const fbJ = new FormB(jit as never, { dpr: 2 }).corners as unknown as Cq[];
const near = (t: Cq[], c: Cq): Cq | undefined => { let best: Cq | undefined; let bd = 0.05 * h; for (const x of t) { const d = Math.hypot(x.Vx - c.Vx, x.Vy - c.Vy); if (d < bd) { bd = d; best = x; } } return best; };
const f = (c: Cq | undefined): string => (c ? `${c.ok ? "ok" : `no(${c.why ?? ""})`} r ${(c.r / h).toFixed(4)}h q (${c.qx.toFixed(4)},${c.qy.toFixed(4)})` : "-");
const mv = (a: Cq | undefined, b: Cq | undefined): string => (a && b ? `${(Math.hypot(a.qx - b.qx, a.qy - b.qy) * S).toFixed(3)} px` : "-");
console.log(`${name}${cyc !== undefined ? ` cyc ${cyc}` : ""} jitter ${dpx} px${arg("impl") ? ` impl ${arg("impl")}` : ""}`);
for (const ci of cis) {
  const a = outS[ci]; const b = outJ[ci]; const fa = near(fbS, a); const fb = fa ? near(fbJ, fa) : undefined;
  console.log(`corner ${ci}: outline still ${f(a)} | jit ${f(b)} | q moves ${mv(a, b)}`);
  console.log(`           form B  still ${f(fa)} | jit ${f(fb)} | q moves ${mv(fa, fb)}`);
}
