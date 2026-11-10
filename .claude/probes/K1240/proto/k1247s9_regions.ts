// K1247 s9: a cycle frame's regions, still vs jittered (k1247s8_jitter's seed and perturbT):
// region counts (also structure(still) on the jittered points), the structure's sizes, the
// first regions that differ, and the frame diagnostics only one side has (twist cuts, stations).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s9_regions.ts <scene> <cycFrame> <dpx>
import type { SceneIn } from "./outline";
import { structure, frame } from "./outline";
import { load } from "./k1247s5_scenes";
const pos = process.argv.slice(2);
const name = pos[0]; const cyc = +pos[1]; const dpx = +pos[2];
const perturbT = (scene: SceneIn, A: number): SceneIn => {
  const o = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of o.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return o;
};
const s0 = load(name); const h = s0.look.halfWidth;
const still = perturbT(s0, ((cyc <= 20 ? cyc : 40 - cyc) / 20) * 0.5 * h); const S = still.camera.pxPerUnit * 2;
let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const sc = JSON.parse(JSON.stringify(still)) as SceneIn;
for (const c of sc.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * dpx) / S / Math.SQRT2;
type R = { id: number; ownerChain: number; group: number; pts: number[] };
const cp = (t: { regions: unknown[] }): R[] => (t.regions as R[]).map((r) => ({ id: r.id, ownerChain: r.ownerChain, group: r.group, pts: Array.from(r.pts) }));
const stA = structure(still); const stB = structure(sc);
const tA = frame(stA, still); const tB = frame(stB, sc);
const a = cp(tA); const b = cp(tB); const c = cp(frame(stA, sc));
console.log(`regions still ${a.length} jit ${b.length} jit-on-still-structure ${c.length}`);
const cnt = (o: Record<string, unknown>): string => Object.entries(o).filter(([, v]) => Array.isArray(v) || ArrayBuffer.isView(v as ArrayBufferView)).map(([k, v]) => `${k}:${(v as unknown[]).length}`).join(" ");
console.log(`structure still: ${cnt(stA as unknown as Record<string, unknown>)}`);
console.log(`structure jit:   ${cnt(stB as unknown as Record<string, unknown>)}`);
const box = (p: number[]): string => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); } return `(${x0.toFixed(3)},${y0.toFixed(3)})-(${x1.toFixed(3)},${y1.toFixed(3)})`; };
let i = 0; while (i < Math.min(a.length, b.length) && a[i].ownerChain === b[i].ownerChain && a[i].group === b[i].group && Math.hypot(a[i].pts[0] - b[i].pts[0], a[i].pts[1] - b[i].pts[1]) < 0.5 * h) i++;
console.log(`first difference at #${i}`);
for (let k = Math.max(0, i - 2); k < i + 3; k++) console.log(`  #${k} still: ${a[k] ? `owner ${a[k].ownerChain} g ${a[k].group} n${a[k].pts.length / 2} ${box(a[k].pts)}` : "-"}\n      jit:   ${b[k] ? `owner ${b[k].ownerChain} g ${b[k].group} n${b[k].pts.length / 2} ${box(b[k].pts)}` : "-"}`);
const dg = (t: unknown): string[] => ((t as { diagnostics?: string[] }).diagnostics ?? []);
const dA = new Set(dg(tA)); const dB = new Set(dg(tB));
console.log(`diag only still: ${[...dA].filter((x) => !dB.has(x)).join(" | ")}`);
console.log(`diag only jit:   ${[...dB].filter((x) => !dA.has(x)).join(" | ")}`);
