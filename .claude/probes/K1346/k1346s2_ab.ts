// K1346 s2: master's outline.ts against the branch's over a captured drag, as the worker runs it (OutlineModel:
// structure + frame on frame 0, then alignJunctionArms + frame per drag frame; the app's look: fillRec 2,
// bandRec 1 + bandRecGpu 1, OB_DI on). Master's copy is src/render/outline/outline_m2.ts (untracked:
// `git show <master>:src/render/outline/outline.ts > src/render/outline/outline_m2.ts`; delete it after).
//   node --expose-gc scripts/run_node.mjs .claude/probes/K1346/k1346s2_ab.ts <dragDir> [rounds=8] [mode=warm|cold|alloc] [which=M|B]
// warm: rounds of M B B M ..., each round a whole drag on a fresh structure; per-frame p50 of the frame() part
//   and the GC time (PerformanceObserver gc entries) inside each variant's frames.
// cold: one drag on one variant (which=), its frame() calls in order (a fresh process = the app's fresh worker).
// alloc: bytes allocated per frame() (heapUsed delta after gc(), run with --max-semi-space-size large enough
//   that no scavenge runs inside a frame), per variant.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PerformanceObserver, performance } from "node:perf_hooks";
import * as B from "../../../src/render/outline/outline";
import * as M from "../../../src/render/outline/outline_m2";
import type { SceneIn } from "../../../src/render/outline/outline";

const dir = process.argv[2];
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const rounds = +arg("rounds", "8"); const mode = arg("mode", "warm"); const which = arg("which", "B");
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const load = (): SceneIn[] => files.map((f) => {
  const S = JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn;
  const look = S.look as SceneIn["look"] & Record<string, number>;
  look.ctrlArc ??= 0.47; look.fillRec = 2; look.bandRec = 1; look.bandRecGpu = 1;
  return S;
});
const cap = load();
type Mod = typeof B;
const mods: Record<string, Mod> = { M: M as unknown as Mod, B };
// One drag as the worker runs it; returns each drag frame's frame() ms (frame 0 is the structure's).
const drag = (O: Mod, tag: string, win?: [string, number, number][], alloc?: number[]): number[] => {
  O.OB_DI.on = true;
  const st = O.structure(cap[0]); O.frame(st, cap[0]);
  const out: number[] = [];
  for (let i = 1; i < cap.length; i++) {
    const sc = O.alignJunctionArms(st, cap[i]);
    O.OB_DI.on = true;
    if (alloc) { (globalThis as any).gc(); const h0 = process.memoryUsage().heapUsed; O.frame(st, sc); alloc.push(process.memoryUsage().heapUsed - h0); continue; }
    const t0 = performance.now(); O.frame(st, sc); const t1 = performance.now();
    out.push(t1 - t0); win?.push([tag, t0, t1]);
  }
  return out;
};
const q = (a: number[], p: number): number => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const f1 = (v: number): string => v.toFixed(1);

if (mode === "cold") {
  const ms = drag(mods[which], which);
  console.log(JSON.stringify({ which, ms }));
} else if (mode === "alloc") {
  const res: Record<string, number[]> = { M: [], B: [] };
  for (let r = 0; r < Math.max(2, rounds); r++) for (const k of r % 2 ? ["B", "M"] : ["M", "B"]) { const a: number[] = []; drag(mods[k], k, undefined, a); if (r > 0) res[k].push(...a); }
  for (const k of ["M", "B"]) console.log(`${k} alloc per frame MB: p50 ${(q(res[k], 0.5) / 1e6).toFixed(2)} mean ${(res[k].reduce((s, v) => s + v, 0) / res[k].length / 1e6).toFixed(2)} (n ${res[k].length})`);
} else {
  const gcs: { t: number; d: number; kind: number }[] = [];
  const obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) gcs.push({ t: e.startTime, d: e.duration, kind: (e as any).detail?.kind ?? 0 }); });
  obs.observe({ entryTypes: ["gc"] });
  const win: [string, number, number][] = [];
  const res: Record<string, number[][]> = { M: [], B: [] };
  for (let r = 0; r < rounds; r++) for (const k of r % 2 ? ["B", "M"] : ["M", "B"]) res[k].push(drag(mods[k], k, win));
  await new Promise((r) => setTimeout(r, 50));
  obs.disconnect();
  const gcIn: Record<string, number> = { M: 0, B: 0 }; const gcN: Record<string, number> = { M: 0, B: 0 };
  for (const g of gcs) { const w = win.find(([, a, b]) => g.t >= a && g.t < b); if (w) { gcIn[w[0]] += g.d; gcN[w[0]]++; } }
  for (const k of ["M", "B"]) {
    const all = res[k].slice(1).flat(); // round 0 is cold JIT for both; drop it from the warm figure
    const first = res[k][0];
    const sum = res[k].map((a) => a.reduce((s, v) => s + v, 0));
    console.log(`${k}: warm p50 ${f1(q(all, 0.5))} p95 ${f1(q(all, 0.95))} | round 0 p50 ${f1(q(first, 0.5))} | drag sums ${sum.map(f1).join(" ")} | gc in frames ${f1(gcIn[k])} ms over ${gcN[k]} gcs (${f1(gcIn[k] / rounds)} per drag)`);
  }
}
