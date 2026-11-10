// K1247 s2: allocation sites of frame() (sampling heap profiler, collected
// objects included), aggregated by function:line, over the time cycle.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s2_heap.ts [scene] [--reps=N] [--top=N]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Session } from "node:inspector";
import { structure, frame, type SceneIn } from "./outline";

const name = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "def";
const reps = +(process.argv.find((a) => a.startsWith("--reps="))?.slice(7) ?? 2);
const top = +(process.argv.find((a) => a.startsWith("--top="))?.slice(6) ?? 30);
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
function perturb(sc0: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(sc0)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return sc;
}
const h = scene.look.halfWidth;
const st = structure(scene);
const fwd = Array.from({ length: 21 }, (_, k) => (k === 0 ? scene : perturb(scene, (k / 20) * 0.5 * h)));
const cycle = [...fwd, ...fwd.slice(1, 20).reverse()];
for (const sc of cycle) frame(st, sc);
const ses = new Session();
ses.connect();
const post = (m: string, p?: object): Promise<any> => new Promise((res, rej) => ses.post(m, p ?? {}, (e: Error | null, r: unknown) => (e ? rej(e) : res(r))));
await post("HeapProfiler.enable");
await post("HeapProfiler.startSampling", { samplingInterval: 1024, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
let nF = 0;
for (let r = 0; r < reps; r++) for (const sc of cycle) { frame(st, sc); nF++; }
const { profile } = await post("HeapProfiler.stopSampling");
interface HN { callFrame: { functionName: string; lineNumber: number }; selfSize: number; children: HN[] }
const self = new Map<string, number>();
let all = 0;
const walk = (n: HN): void => {
  const k = `${n.callFrame.functionName || "(anon)"}:${n.callFrame.lineNumber + 1}`;
  self.set(k, (self.get(k) ?? 0) + n.selfSize); all += n.selfSize;
  for (const c of n.children) walk(c);
};
walk(profile.head as HN);
console.log(`${nF} frames, ${(all / nF / 1024).toFixed(0)} KB allocated per frame (sampled)`);
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`${(v / nF / 1024).toFixed(1).padStart(8)} KB/frame  ${k}`);
