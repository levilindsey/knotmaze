// K1247 s8: where a reduced frame's region list parts from the full one (a
// region id shift moves every later piece's key). Prints the first regions
// that differ (owner, group, point count, bbox, area) and the chain's
// stations near them.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s8_regions.ts --scene=g41_def_tw64 --mult=0 --eps=0.02
import { structure, frame } from "./outline";
import { sceneOf, load } from "./k1247s5_scenes";
import { selectKeep, reduceScene } from "./k1247s8_reduce";

const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const name = arg("scene") ?? "g41_def_tw64"; const mult = +(arg("mult") ?? 0); const epsPx = +(arg("eps") ?? 0.02);
const still = load(name); const S = still.camera.pxPerUnit * 2; const h = still.look.halfWidth;
const K = selectKeep(still, { eps: epsPx / S, keepShort: +(arg("short") ?? 0) * h });
// --cyc=<frame>: def's timed cycle frame (k1247c_time.ts's inconsistent perturb, 0.5h over 20 steps and back).
const perturbT = (scene: typeof still, A: number): typeof still => {
  const o = JSON.parse(JSON.stringify(scene)) as typeof still;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of o.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return o;
};
const cyc = arg("cyc");
const sc = cyc !== undefined ? perturbT(still, ((+cyc <= 20 ? +cyc : 40 - +cyc) / 20) * 0.5 * h) : sceneOf(name, mult);
const red = reduceScene(sc, K);
type R = { id: number; ownerChain: number; group: number; pts: number[] };
const cp = (t: { regions: unknown[] }): R[] => (t.regions as R[]).map((r) => ({ id: r.id, ownerChain: r.ownerChain, group: r.group, pts: Array.from(r.pts) }));
const a = cp(frame(structure(still), sc)); const b = cp(frame(structure(red), red));
const area = (p: number[]): number => { let s = 0; for (let i = 0; i < p.length; i += 2) { const j = (i + 2) % p.length; s += p[i] * p[j + 1] - p[j] * p[i + 1]; } return s / 2; };
const box = (p: number[]): string => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); } return `(${x0.toFixed(3)},${y0.toFixed(3)})-(${x1.toFixed(3)},${y1.toFixed(3)})`; };
const desc = (r: R | undefined): string => (r ? `owner ${r.ownerChain} group ${r.group} n${r.pts.length / 2} area ${(area(r.pts) / (h * h)).toExponential(2)} h^2 box ${box(r.pts)}` : "-");
console.log(`${name} ${mult} eps ${epsPx}: regions full ${a.length}, reduced ${b.length}`);
let i = 0; while (i < Math.min(a.length, b.length) && a[i].ownerChain === b[i].ownerChain && Math.hypot(a[i].pts[0] - b[i].pts[0], a[i].pts[1] - b[i].pts[1]) < 0.5 * h) i++;
for (let k = Math.max(0, i - 1); k < Math.min(Math.max(a.length, b.length), i + 3); k++) console.log(`  #${k} full: ${desc(a[k])}\n       red:  ${desc(b[k])}`);
// Which chain, and its features near the odd region.
const r = a[i]?.pts.length && b[i] && a[i + 1] && b[i].ownerChain === a[i + 1].ownerChain ? a[i] : b[i];
if (r) {
  const ci = sc.chains.findIndex((c) => c.id === r.ownerChain) >= 0 ? sc.chains.findIndex((c) => c.id === r.ownerChain) : r.ownerChain;
  const P = sc.chains[ci].pts; const n = P.length / 2; const cx = r.pts.reduce((s, v, k) => (k % 2 ? s : s + v), 0) / (r.pts.length / 2); const cy = r.pts.reduce((s, v, k) => (k % 2 ? s + v : s), 0) / (r.pts.length / 2);
  let best = Infinity; let bs = 0; let acc = 0;
  for (let k = 0; k + 1 < n; k++) { const ax = P[2 * k]; const ay = P[2 * k + 1]; const ex = P[2 * k + 2] - ax; const ey = P[2 * k + 3] - ay; const l = Math.hypot(ex, ey); let t = l > 0 ? ((cx - ax) * ex + (cy - ay) * ey) / (l * l) : 0; t = Math.min(1, Math.max(0, t)); const d = Math.hypot(ax + ex * t - cx, ay + ey * t - cy); if (d < best) { best = d; bs = acc + t * l; } acc += l; }
  console.log(`odd region's centre on chain index ${ci} (id ${sc.chains[ci].id}) at s ${bs.toFixed(4)} (off ${(best / h).toFixed(2)} h); features within 3h (full s -> reduced s):`);
  sc.crossings.forEach((x, k) => { for (const [lab, e, er] of [["a", x.a, red.crossings[k].a], ["b", x.b, red.crossings[k].b]] as const) if (e.chain === sc.chains[ci].id && Math.abs(e.s - bs) < 3 * h) console.log(`  crossing ${k}.${lab} s ${e.s.toFixed(6)} -> ${er.s.toFixed(6)}`); });
  sc.junctions.forEach((j, k) => j.arms.forEach((m, q) => { if (m.chain === sc.chains[ci].id && Math.abs(m.s - bs) < 3 * h) console.log(`  junction ${k} arm ${q} (${m.kind}, dir ${m.dir}) s ${m.s.toFixed(6)} -> ${red.junctions[k].arms[q].s.toFixed(6)}`); }));
  sc.deadEnds.forEach((e, k) => { if (e.chain === sc.chains[ci].id && Math.abs(e.s - bs) < 3 * h) console.log(`  deadEnd ${k} s ${e.s.toFixed(6)} -> ${red.deadEnds[k].s.toFixed(6)}`); });
}
