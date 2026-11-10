// K1247 s9: the closed-form growth's trace for one corner, still and jittered
// (k1247s8_jitter.ts's seeded jitter), plus wDbg's rows.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s9_trace.ts <scene> <corner> <dpx> [--impl=./outline_x.ts] [--cyc=<frame>]
import type { SceneIn } from "./outline";
import { load } from "./k1247s5_scenes";
const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const pos = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const name = pos[0]; const ci = +pos[1]; const dpx = +pos[2];
const mod = (await import(/* @vite-ignore */ new URL(arg("impl") ?? "./outline.ts", import.meta.url).href)) as typeof import("./outline");
const { structure, frame, setCfDebug, cfTrace, wDbg } = mod;
// --cyc=<frame>: k1247s8_jitter.ts's cycle frame (its perturbT) instead of the still scene.
const perturbT = (scene: SceneIn, A: number): SceneIn => {
  const o = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of o.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return o;
};
const cyc = arg("cyc");
const still0 = load(name);
const still = cyc !== undefined ? perturbT(still0, ((+cyc <= 20 ? +cyc : 40 - +cyc) / 20) * 0.5 * still0.look.halfWidth) : still0; const S = still.camera.pxPerUnit * 2;
let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const sc = JSON.parse(JSON.stringify(still)) as SceneIn;
for (const c of sc.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * dpx) / S / Math.SQRT2;
for (const [lab, s] of [["still", still], ["jit", sc]] as const) {
  setCfDebug(ci); wDbg.ci = ci; wDbg.rows = [];
  const t = frame(structure(s), s);
  const c = t.corners[ci];
  console.log(`${lab}: ok ${(c as { ok?: boolean }).ok} why ${(c as { why?: string }).why ?? ""} r ${c.r.toFixed(5)} theta ${c.theta.toFixed(5)} V (${c.Vx.toFixed(6)},${c.Vy.toFixed(6)}) q (${c.qx.toFixed(5)},${c.qy.toFixed(5)})`);
  for (const l of cfTrace) console.log(`   ${l}`);
  for (const r of wDbg.rows) console.log(`   w kind ${r[0]} rho-h ${(r[1]).toFixed(4)}h w ${r[2].toFixed(5)} ua ${r[5].toFixed(6)} ub ${r[6].toFixed(5)}`);
}
setCfDebug(-1); wDbg.ci = -1;
