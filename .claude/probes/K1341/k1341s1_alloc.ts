// K1341 s1: where zChains and fillFrame allocate. A sampling heap profile that keeps collected objects (every
// allocation, not only what survives) over R zf passes of one s18 drag, summed by function and line.
//   node .claude/probes/K1247/k1247s28_build.mjs .claude/probes/K1341/k1341s1_alloc.ts <outDir>
//   node <outDir>/k1341s1_alloc.mjs <s18 drag root> [drag=def] [R=3] [top=25]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Session } from "node:inspector/promises";
import type { SceneIn } from "../../../src/render/outline/outline";
import { OB_DI, alignJunctionArms, frame } from "../../../src/render/outline/outline";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { fillFrame } from "../../../src/render/outline/fill_tri";
import { zChains } from "../../../src/render/outline/draw";
const [root, nm = "def", Rs = "3", tops = "25"] = process.argv.slice(2);
const dir = join(root, nm);
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const scenes = files.map((f) => {
  const s = JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  Object.assign(s.look, { fillRec: 2, bandRec: 1, bandRecGpu: 1 });
  return s;
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const m = new OutlineModel(scenes[0]) as any;
const buf = {};
const pre = scenes.slice(1).map((s) => { const sc = alignJunctionArms(m.st, s); OB_DI.on = true; return { sc, table: frame(m.st, sc) }; });
for (const { sc, table } of pre) fillFrame(m.fs, m.st, table, sc, zChains(sc), buf);
const ses = new Session(); ses.connect();
await ses.post("HeapProfiler.enable");
await ses.post("HeapProfiler.startSampling", { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
for (let r = 0; r < Number(Rs); r++) for (const { sc, table } of pre) fillFrame(m.fs, m.st, table, sc, zChains(sc), buf);
const { profile } = await ses.post("HeapProfiler.stopSampling");
type N = { callFrame: { functionName: string; url: string; lineNumber: number }; selfSize: number; children: N[] };
const by = new Map<string, number>(); let tot = 0;
const walk = (n: N): void => {
  if (n.selfSize) {
    const k = `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.replace(/^.*[\\/]/, "")}:${n.callFrame.lineNumber + 1}`;
    by.set(k, (by.get(k) ?? 0) + n.selfSize); tot += n.selfSize;
  }
  for (const c of n.children) walk(c);
};
walk((profile as unknown as { head: N }).head);
console.log(`${nm}: ${(tot / 1e6).toFixed(1)} MB sampled over ${Rs} passes of ${pre.length} frames (${(tot / 1e6 / Number(Rs) / pre.length).toFixed(2)} MB/frame)`);
for (const [k, v] of [...by].sort((a, b) => b[1] - a[1]).slice(0, Number(tops))) console.log(`${(v / 1e6).toFixed(1).padStart(8)}  ${k}`);
