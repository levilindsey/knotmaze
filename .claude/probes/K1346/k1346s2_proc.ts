// K1346 s2: the worker's whole frame (OutlineModel.update: frame, zChains, fill, paint, band) for ONE variant per
// process, as the app's worker runs one build: no other build's types reach the shared code's inline caches (the
// in-process ABBAs, k1346s2_ab.ts and _band.ts, feed both builds' tables to one band/fill). which=M builds the
// model from outline_model_m2.ts (an untracked copy of outline_model.ts importing outline_m2.ts:
// `(Get-Content src/render/outline/outline_model.ts -Raw).Replace('from "./outline";', 'from "./outline_m2";')`;
// delete both copies after). Constructs the model on frame 0, then rounds of update() over frames 1..n; prints
// each part's p50 over the rounds after the first, as one line (k1346s2_proc.ps1 runs the processes M B B M ...).
//   node --expose-gc scripts/run_node.mjs .claude/probes/K1346/k1346s2_proc.ts <dragDir> which=M|B [rounds=6] [heap=<out.json>]
// heap=: a sampling heap profile of the measured rounds that keeps collected objects (every allocation, not only
// what is live at the end; k1346s2_heap.mjs compares two).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PerformanceObserver } from "node:perf_hooks";
import { Session } from "node:inspector/promises";
import { writeFileSync } from "node:fs";
import type { SceneIn } from "../../../src/render/outline/outline";

const dir = process.argv[2];
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const which = arg("which", "B"); const rounds = +arg("rounds", "6"); const heap = arg("heap", "");
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const cap = files.map((f) => {
  const S = JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn;
  const look = S.look as SceneIn["look"] & Record<string, number>;
  look.ctrlArc ??= 0.47; look.fillRec = 2; look.bandRec = 1; look.bandRecGpu = 1;
  return S;
});
const mod = which === "M" ? await import("../../../src/render/outline/outline_model_m2") : await import("../../../src/render/outline/outline_model");
let gcMs = 0; let on = false;
new PerformanceObserver((l) => { for (const e of l.getEntries()) if (on) gcMs += e.duration; }).observe({ entryTypes: ["gc"] });
const ses = new Session(); if (heap) ses.connect();
const m = new mod.OutlineModel(cap[0]);
const K = ["frame", "zChains", "fill", "paint", "band"] as const;
const P: Record<string, number[]> = { total: [] }; for (const k of K) P[k] = [];
for (let r = 0; r < rounds; r++) {
  if (r === 1) { on = true; gcMs = 0; if (heap) { await ses.post("HeapProfiler.enable"); await ses.post("HeapProfiler.startSampling", { samplingInterval: 16384, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true }); } }
  for (let i = 1; i < cap.length; i++) {
    m.update(cap[i]);
    if (r === 0) continue;
    let t = 0; for (const k of K) { P[k].push(m.parts[k]); t += m.parts[k]; }
    P.total.push(t);
  }
}
if (heap) { const { profile } = await ses.post("HeapProfiler.stopSampling") as { profile: unknown }; writeFileSync(heap, JSON.stringify(profile)); }
await new Promise((r) => setTimeout(r, 100));
const med = (a: number[]): number => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
console.log(`${which} ${["total", ...K].map((k) => `${k} ${med(P[k]).toFixed(2)}`).join(" | ")} | gc ${(gcMs / (rounds - 1)).toFixed(1)} ms per drag`);
