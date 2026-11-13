// K1247 s29: OutlineModel.update in Node with the app's look (fillRec 2, bandRec 1 + bandRecGpu 1,
// ctrlArc 0.47) on k1314_s9_fbench's motion cycle (a smooth perturbation of every chain, 0 -> 0.5 h -> 0).
// Prints the parts' p50 / p95 (OutlineModel.parts) and frame()'s own phase split (a second, profiled
// frame() call per rep on the same scene, timed apart from the parts). Relative numbers for attribution;
// the official worker frame is the app's (k1314_s10_bench.ps1 / k1247s29_bench.ps1, ABBA under the lock).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s29_mbench.ts [scene=def] [reps=120] [split=1]
//   node --cpu-prof --cpu-prof-dir=<dir> scripts/run_node.mjs .claude/probes/K1247/k1247s29_mbench.ts split=0
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { frame, alignJunctionArms, type SceneIn } from "../../../src/render/outline/outline";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const name = arg("scene", "def"); const reps = +arg("reps", "120"); const split = arg("split", "1") === "1";
const S = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
const look = S.look as SceneIn["look"] & Record<string, number>;
look.ctrlArc ??= 0.47; look.fillRec = 2; look.bandRec = 1; look.bandRecGpu = 1;
// The s9 field, plus what the app's scene builder keeps consistent: every s on a chain (junction arms,
// crossings, dead ends) scales with the chain's new length (an open chain's end arm stays at its end, or
// sectionPaint finds another run), and junction centres move with the field.
const len = (p: number[], closed: boolean): number => {
  let L = 0; const n = p.length >> 1;
  for (let i = 0; i + 1 < n; i++) L += Math.hypot(p[2 * i + 2] - p[2 * i], p[2 * i + 3] - p[2 * i + 1]);
  if (closed && n > 1) L += Math.hypot(p[0] - p[2 * n - 2], p[1] - p[2 * n - 1]);
  return L;
};
function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dx = (x: number, y: number): number => A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4));
  const dy = (x: number, y: number): number => A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3));
  const ratio = new Map<number, number>();
  for (const c of sc.chains) {
    const L0 = len(c.pts, c.closed);
    for (let i = 0; i + 1 < c.pts.length; i += 2) {
      const x = c.pts[i]; const y = c.pts[i + 1];
      c.pts[i] = x + dx(x, y); c.pts[i + 1] = y + dy(x, y);
    }
    ratio.set(c.id, L0 > 0 ? len(c.pts, c.closed) / L0 : 1);
  }
  const r = (chain: number): number => ratio.get(chain) ?? 1;
  for (const J of sc.junctions) {
    for (const a of J.arms) a.s *= r(a.chain);
    const c = (J as unknown as { c?: number[] }).c;
    if (c) { const x = c[0]; const y = c[1]; c[0] = x + dx(x, y); c[1] = y + dy(x, y); }
  }
  for (const x of sc.crossings) { x.a.s *= r(x.a.chain); x.b.s *= r(x.b.chain); }
  for (const d of (sc as unknown as { deadEnds?: { chain: number; s: number }[] }).deadEnds ?? []) d.s *= r(d.chain);
  return sc;
}
const h = S.look.halfWidth;
const cyc: SceneIn[] = [];
for (let k = 0; k <= 20; k++) cyc.push(perturb(S, (k / 20) * 0.5 * h));
for (let k = 19; k >= 1; k--) cyc.push(perturb(S, (k / 20) * 0.5 * h));
const m = new OutlineModel(S);
for (let i = 0; i < 20; i++) m.update(cyc[i % cyc.length]);
const parts: Record<string, number[]> = {};
const prof: Record<string, number> = {};
for (let i = 0; i < reps; i++) {
  const sc = cyc[i % cyc.length];
  m.update(sc);
  for (const [k, v] of Object.entries(m.parts ?? {})) (parts[k] ??= []).push(v);
  (parts.total ??= []).push(m.frameMs);
  if (split) frame(m.st, alignJunctionArms(m.st, sc), prof);
}
const q = (a: number[], p: number): number => { const t = [...a].sort((x, y) => x - y); return t[Math.min(t.length - 1, Math.floor(p * t.length))]; };
console.log(`${name} reps ${reps}: ` + Object.entries(parts).map(([k, a]) => `${k} ${q(a, 0.5).toFixed(2)}/${q(a, 0.95).toFixed(2)}`).join(", "));
if (split) console.log(`frame split (mean ms): ` + Object.entries(prof).map(([k, x]) => `${k} ${(x / reps).toFixed(2)}`).join(", "));
