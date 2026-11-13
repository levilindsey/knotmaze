// K1247 s30 (3): the incremental frame's prototype in Node. Replays a captured drag (k1247s18_capture.mjs frames,
// ~170 ms apart), optionally interpolated to sub=N frames per captured pair (sub=10 ~ the gate's 60 Hz cadence),
// through the app's look (fillRec 2, bandRec 1 + bandRecGpu 1), and reports:
//   - identity: frame() with KF_INC.cache on against off on the same snapped scenes (digest of the table, every frame);
//   - the snap's hit rate (chains whose borders were reused) at T device px;
//   - frame() cost in Node, p50/p95, three ways interleaved per frame: raw (no snap, no cache; today), snapped
//     without the cache, snapped with it; and the setupBorders phase alone (frame's profile).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s30_inc.ts <dragDir> [sub=10] [T=0.5] [warm=1] [time=1]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { frame, alignJunctionArms, KF_INC, newSnapState, snapScene } from "../../../src/render/outline/outline";
import type { SceneIn, DiagramStructure } from "../../../src/render/outline/outline";
import { digest } from "../../../test/render/outline_digest";

const dir = process.argv[2];
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const sub = +arg("sub", "10"); const T = +arg("T", "0.5"); const warm = +arg("warm", "1"); const timeIt = arg("time", "1") === "1";
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const cap = files.map((f) => {
  const S = JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn;
  const look = S.look as SceneIn["look"] & Record<string, number>;
  look.ctrlArc ??= 0.47; look.fillRec = 2; look.bandRec = 1; look.bandRecGpu = 1;
  return S;
});
// Linear in-betweens of two captured frames (points, crossing s, junction centres and arm s).
const lerp = (a: SceneIn, b: SceneIn, t: number): SceneIn => {
  const s = structuredClone(b);
  s.chains.forEach((c, i) => { const p = a.chains[i].pts; if (p.length === c.pts.length) for (let k = 0; k < p.length; k++) c.pts[k] = p[k] + (c.pts[k] - p[k]) * t; });
  s.crossings.forEach((x, i) => { const y = a.crossings[i]; if (y) { x.a.s = y.a.s + (x.a.s - y.a.s) * t; x.b.s = y.b.s + (x.b.s - y.b.s) * t; } });
  s.junctions.forEach((j, i) => { const k = a.junctions[i]; if (k) { j.c = [k.c[0] + (j.c[0] - k.c[0]) * t, k.c[1] + (j.c[1] - k.c[1]) * t]; j.arms.forEach((r, q) => { if (k.arms[q]) r.s = k.arms[q].s + (r.s - k.arms[q].s) * t; }); } });
  return s;
};
const raw: SceneIn[] = [cap[0]];
for (let i = 1; i < cap.length; i++) { for (let k = 1; k < sub; k++) raw.push(lerp(cap[i - 1], cap[i], k / sub)); raw.push(cap[i]); }
const S = newSnapState();
const snapped = raw.map((s) => snapScene(S, s, T));
const held = snapped.map((s, i) => s.chains.filter((c, k) => i > 0 && c.pts === snapped[i - 1].chains[k].pts).length);

const m = new OutlineModel(cap[0]);
const st = (m as unknown as { st: DiagramStructure }).st;
const mk = (): { st: DiagramStructure } => ({ st: (new OutlineModel(cap[0]) as unknown as { st: DiagramStructure }).st });
const F = mk(); const I = mk();
const run = (s0: DiagramStructure, sc: SceneIn, cache: boolean, prof?: Record<string, number>, snap = true): { ms: number; t: ReturnType<typeof frame> } => {
  KF_INC.cache = cache; KF_INC.snap = snap; KF_INC.T = T;
  const t0 = performance.now();
  const t = frame(s0, alignJunctionArms(s0, sc), prof);
  const ms = performance.now() - t0;
  KF_INC.cache = false; KF_INC.snap = false;
  return { ms, t };
};
// Identity: every frame, cache on vs off, both with the snap in frame() (KF_INC.snap; each structure its own state).
let same = 0; let diff = 0; let firstDiff = -1;
KF_INC.hits = 0; KF_INC.misses = 0; KF_INC.why = {};
for (let i = 0; i < snapped.length; i++) {
  const a = digest(run(F.st, raw[i], false).t); const b = digest(run(I.st, raw[i], true).t);
  if (a === b) same++; else { diff++; if (firstDiff < 0) firstDiff = i; }
}
console.log("miss reasons (first differing input):", JSON.stringify(KF_INC.why)); KF_INC.why = null;
const hitRate = KF_INC.hits / Math.max(1, KF_INC.hits + KF_INC.misses);
console.log(`${dir.split(/[\\/]/).filter(Boolean).pop()}: ${raw.length} frames (sub ${sub}), T ${T} px, chains ${cap[0].chains.length}`);
console.log(`identity cache on/off on snapped scenes: same ${same}, differ ${diff}${diff ? ` (first at ${firstDiff})` : ""}`);
const hs = held.slice(1).sort((x, y) => x - y);
console.log(`chains held by the snap per frame: p50 ${hs[hs.length >> 1]} p10 ${hs[Math.floor(hs.length * 0.1)]} min ${hs[0]}; border cache hit rate ${(100 * hitRate).toFixed(1)}%`);
if (timeIt) {
  const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
  const R: number[] = []; const Fm: number[] = []; const Im: number[] = []; const Rb: number[] = []; const Fb: number[] = []; const Ib: number[] = [];
  const Rs = mk(); const Fs = mk(); const Is = mk();
  const PR: Record<string, number[]> = {}; const PI: Record<string, number[]> = {};
  for (let c = 0; c < warm + 1; c++) {
    for (let i = 0; i < raw.length; i++) {
      const pr: Record<string, number> = {}; const pf: Record<string, number> = {}; const pi: Record<string, number> = {};
      const order = (i + c) % 3;
      const r1 = (): number => run(Rs.st, raw[i], false, pr, false).ms; const f1 = (): number => run(Fs.st, raw[i], false, pf).ms; const i1 = (): number => run(Is.st, raw[i], true, pi).ms;
      let a = 0; let b = 0; let d = 0;
      if (order === 0) { a = r1(); b = f1(); d = i1(); } else if (order === 1) { b = f1(); d = i1(); a = r1(); } else { d = i1(); a = r1(); b = f1(); }
      if (c >= warm) {
        R.push(a); Fm.push(b); Im.push(d); Rb.push(pr.setupBorders); Fb.push(pf.setupBorders); Ib.push(pi.setupBorders);
        for (const [k, v] of Object.entries(pr)) (PR[k] ??= []).push(v);
        for (const [k, v] of Object.entries(pi)) (PI[k] ??= []).push(v);
      }
    }
  }
  const f = (a: number[]): string => `${q(a, 0.5).toFixed(2)}/${q(a, 0.95).toFixed(2)}`;
  console.log(`frame ms p50/p95: raw ${f(R)}  snapped ${f(Fm)}  snapped+cache ${f(Im)}`);
  console.log(`setupBorders ms p50/p95: raw ${f(Rb)}  snapped ${f(Fb)}  snapped+cache ${f(Ib)}`);
  // Every phase frame() profiles (profMark), p50 raw -> snapped+cache: where the rest of frame's time is.
  const ph = Object.keys(PR).filter((k) => q(PR[k], 0.5) >= 0.05).sort((x, y) => q(PR[y], 0.5) - q(PR[x], 0.5));
  console.log(`phases p50 raw -> snap+cache: ${ph.map((k) => `${k} ${q(PR[k], 0.5).toFixed(2)}->${PI[k] ? q(PI[k], 0.5).toFixed(2) : "-"}`).join(", ")}`);
}
void st;
