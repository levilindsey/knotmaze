// K1247 s9: corners whose ok/why differ, still vs jittered (k1247s8_jitter.ts's
// seeded jitter and cycle frames), and, with --impl=, the still scene's
// corners that differ between that outline copy and this one.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s9_flip.ts --scene=a,b --d=0.01 [--cyc=10] [--impl=./x.ts]
import type { SceneIn } from "./outline";
import { ALL, load } from "./k1247s5_scenes";
const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const M = (await import("./outline")) as typeof import("./outline");
const impl = arg("impl"); const O = impl ? ((await import(/* @vite-ignore */ new URL(impl, import.meta.url).href)) as typeof import("./outline")) : undefined;
const names = arg("scene") ? arg("scene")!.split(",") : ALL; const ds = (arg("d") ?? "0.01").split(",").map(Number); const cyc = arg("cyc");
const perturbT = (scene: SceneIn, A: number): SceneIn => {
  const o = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of o.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return o;
};
type Cn = { ok: boolean; why?: string; r: number };
const desc = (c: Cn): string => `${c.ok ? "ok" : "no"}${c.why ? ` (${c.why})` : ""} r ${c.r.toFixed(4)}`;
for (const name of names) {
  const s0 = load(name);
  const still = cyc !== undefined ? perturbT(s0, ((+cyc <= 20 ? +cyc : 40 - +cyc) / 20) * 0.5 * s0.look.halfWidth) : s0; const S = still.camera.pxPerUnit * 2;
  const cF = M.frame(M.structure(still), still).corners as Cn[];
  if (O) { const cO = O.frame(O.structure(still), still).corners as Cn[]; for (let i = 0; i < cF.length; i++) if (cO[i].ok !== cF[i].ok || (cO[i].why ?? "") !== (cF[i].why ?? "") || Math.abs(cO[i].r - cF[i].r) > 1e-9) console.log(`${name} still: corner ${i} impl ${desc(cO[i])} -> now ${desc(cF[i])}`); }
  for (const dpx of ds) {
    let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const sc = JSON.parse(JSON.stringify(still)) as SceneIn;
    for (const c of sc.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * dpx) / S / Math.SQRT2;
    const cJ = M.frame(M.structure(sc), sc).corners as Cn[];
    for (let i = 0; i < cF.length; i++) if (cJ[i].ok !== cF[i].ok || (cJ[i].why ?? "") !== (cF[i].why ?? "")) console.log(`${name}${cyc !== undefined ? ` cyc${cyc}` : ""} ${dpx}: corner ${i} ${desc(cF[i])} -> jit ${desc(cJ[i])}`);
  }
}