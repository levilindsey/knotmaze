// K1179 S1e cost: the pinned gate-integral rule's cost per frame over
// every distinct frame of the 4 recordings, cold, under the perf lock
// (taken by the caller, owner K1179-S1e). Counted: everything a frame
// needs to make its rounds beyond the sampled centrelines it already
// has - the edges' build (once per corner-arm, walked cumulatively
// across the nodes; each arm's margin window built once a frame in a
// shared cache and counted in the margin gate), V and theta (pair
// iteration over the shared windows), the nodes (feet, then each gate
// factor apart: margin, steep, cap, root), and the round - through
// the production path (solveVPair, not the built corner's V). The
// full FormB build is timed beside it for scale only, as Run H timed
// it. Also reported, not gated: p95 a frame without the margin gate.
// Per-corner distribution and scene medians are variant (i) K=32;
// recordings time both variants, plus a no-margin K=32 pass.
// Run: npx.cmd vite-node .claude/probes/K1179/s1e/s1e_cost.ts
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";
import { loadScene, RECORDINGS, SCENES_12 } from "../outline";
import { fmt, pct } from "../outline";
import { sameScene } from "../seq13_lib";
import { cornerSpecs } from "../s1c/closed";
import type { WinArm } from "../s1c/closed";
import { solveVPair } from "../s1d/lib_s1d";
import { newTiming, s1eCorner } from "./lib_s1e";
import type { S1eTiming } from "./lib_s1e";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });
const SEQ_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/S3a/seq13";

function solveFrame(fb: any, K: number, timing: S1eTiming, noMargin = false): { n: number; maxDV: number } {
  const shared = new Map<number, WinArm>();
  const specs = cornerSpecs(fb);
  const masterMap = new Map((fb.corners as any[]).map((c: any) => [`${c.j}|${c.a}-${c.b}`, c]));
  let maxDV = 0;
  for (const s of specs) {
    const t0 = performance.now();
    const V = solveVPair(fb, s.a, s.b, s.ji, s.th, shared);
    timing.vTheta += performance.now() - t0;
    if (!V) continue;
    const mc = masterMap.get(`${s.ji}|${s.a}-${s.b}`);
    if (mc) maxDV = Math.max(maxDV, Math.hypot(V.Vx - mc.Vx, V.Vy - mc.Vy) / fb.h);
    s1eCorner(fb, { j: s.ji, a: s.a, b: s.b, theta: s.th, style: s.style, Vx: V.Vx, Vy: V.Vy, dVa: V.dVa, dVb: V.dVb }, K, timing, { noMargin, winCache: shared });
  }
  return { n: specs.length, maxDV };
}

const txt: string[] = [];
const perCornerAll: number[] = [];
const sceneRows: any[] = [];
let sceneMaxDV = 0;
for (const name of SCENES_12) {
  const sc = loadScene(name);
  const fb: any = new FormB(sc);
  const builds: number[] = [];
  for (let i = 0; i < 5; i++) { const t0 = performance.now(); new FormB(sc); builds.push(performance.now() - t0); }
  solveFrame(fb, 32, newTiming()); // warm JIT on this scene's shapes
  const frames: number[] = [];
  for (let i = 0; i < 7; i++) { const t0 = performance.now(); solveFrame(fb, 32, newTiming()); frames.push(performance.now() - t0); }
  const perCorner: number[] = [];
  const shared = new Map<number, WinArm>();
  for (const s of cornerSpecs(fb)) {
    const t0 = performance.now();
    const V = solveVPair(fb, s.a, s.b, s.ji, s.th, shared);
    if (V) s1eCorner(fb, { j: s.ji, a: s.a, b: s.b, theta: s.th, style: s.style, Vx: V.Vx, Vy: V.Vy, dVa: V.dVa, dVb: V.dVb }, 32, undefined, { winCache: shared });
    perCorner.push(performance.now() - t0);
    perCornerAll.push(perCorner[perCorner.length - 1]);
  }
  const row = { scene: name, corners: fb.corners.length, medianMs: +fmt(pct(frames, 0.5), 3), perCornerMedianUs: +fmt((pct(perCorner, 0.5) || 0) * 1000, 1), masterBuildMedianMs: +fmt(pct(builds, 0.5), 1) };
  sceneRows.push(row);
  txt.push(`${name}: rule(i) median ${fmt(row.medianMs, 3)} ms over ${row.corners} corners; per-corner median ${fmt(row.perCornerMedianUs, 1)} us; master build median ${fmt(row.masterBuildMedianMs, 1)} ms`);
  console.log(txt[txt.length - 1]);
}

const recRows: any[] = [];
for (const name of RECORDINGS) {
  const rl = createInterface({ input: createReadStream(`${SEQ_DIR}/${name}.jsonl.gz`).pipe(createGunzip()), crlfDelay: Infinity });
  let first = true;
  let prevScene: FieldScene | null = null;
  const frame32: number[] = [], frame8: number[] = [], frameNoM: number[] = [], perCornerFrame: number[] = [];
  const parts32 = newTiming(), parts8 = newTiming();
  const buildMs: number[] = [];
  let frames = 0;
  for await (const line of rl) {
    if (!line) continue;
    if (first) { first = false; continue; }
    const fr = JSON.parse(line) as { scene: FieldScene };
    fr.scene.look.ctrlArc ??= 0.47;
    if (prevScene && sameScene(prevScene, fr.scene)) continue;
    prevScene = fr.scene;
    frames++;
    const tb = performance.now();
    const fb: any = new FormB(fr.scene);
    buildMs.push(performance.now() - tb);
    const t32 = newTiming();
    const s0 = performance.now();
    const r32 = solveFrame(fb, 32, t32);
    frame32.push(performance.now() - s0);
    if (r32.n) perCornerFrame.push(frame32[frame32.length - 1] / r32.n);
    sceneMaxDV = Math.max(sceneMaxDV, r32.maxDV);
    for (const k of ["vTheta", "edgeBuild", "nodeFeet", "gateMargin", "gateSteep", "gateCap", "gateRoot", "round"] as const) (parts32 as any)[k] += (t32 as any)[k];
    const t8 = newTiming();
    const s1 = performance.now();
    solveFrame(fb, 8, t8);
    frame8.push(performance.now() - s1);
    for (const k of ["vTheta", "edgeBuild", "nodeFeet", "gateMargin", "gateSteep", "gateCap", "gateRoot", "round"] as const) (parts8 as any)[k] += (t8 as any)[k];
    const s2 = performance.now();
    solveFrame(fb, 32, newTiming(), true);
    frameNoM.push(performance.now() - s2);
  }
  const p = (t: S1eTiming) => ({ vTheta: +fmt(t.vTheta, 1), edgeBuild: +fmt(t.edgeBuild, 1), nodeFeet: +fmt(t.nodeFeet, 1), gateMargin: +fmt(t.gateMargin, 1), gateSteep: +fmt(t.gateSteep, 1), gateCap: +fmt(t.gateCap, 1), gateRoot: +fmt(t.gateRoot, 1), round: +fmt(t.round, 1) });
  const row = {
    recording: name, frames,
    k32P50Ms: +fmt(pct(frame32, 0.5), 3), k32P95Ms: +fmt(pct(frame32, 0.95), 3), k32MaxMs: +fmt(Math.max(...frame32), 3),
    k8P95Ms: +fmt(pct(frame8, 0.95), 3),
    noMarginP95Ms: +fmt(pct(frameNoM, 0.95), 3),
    partsK32Ms: p(parts32), partsK8Ms: p(parts8),
    masterBuildP95Ms: +fmt(pct(buildMs, 0.95), 1),
  };
  recRows.push(row);
  txt.push(`${name}: ${frames} frames, (i) p50 ${fmt(row.k32P50Ms, 3)} p95 ${fmt(row.k32P95Ms, 3)} max ${fmt(row.k32MaxMs, 3)} ms (gate 0.75); (ii) p95 ${fmt(row.k8P95Ms, 3)} ms; no-margin p95 ${fmt(row.noMarginP95Ms, 3)} ms; parts(i) V+theta ${fmt(parts32.vTheta, 1)} edges ${fmt(parts32.edgeBuild, 1)} nodeFeet ${fmt(parts32.nodeFeet, 1)} margin ${fmt(parts32.gateMargin, 1)} steep ${fmt(parts32.gateSteep, 1)} cap ${fmt(parts32.gateCap, 1)} root ${fmt(parts32.gateRoot, 1)} round ${fmt(parts32.round, 1)} ms total; master build p95 ${fmt(row.masterBuildP95Ms, 1)} ms`);
  console.log(txt[txt.length - 1]);
}
const perCornerDist = { n: perCornerAll.length, medianUs: +fmt((pct(perCornerAll, 0.5) || 0) * 1000, 1), p95Us: +fmt((pct(perCornerAll, 0.95) || 0) * 1000, 1), p99Us: +fmt((pct(perCornerAll, 0.99) || 0) * 1000, 1), maxUs: +fmt(Math.max(...perCornerAll) * 1000, 1), maxDVh: sceneMaxDV };
txt.push(`per-corner (12 scenes, n=${perCornerDist.n}): median ${perCornerDist.medianUs} us p95 ${perCornerDist.p95Us} us p99 ${perCornerDist.p99Us} us max ${perCornerDist.maxUs} us; production V vs master max ${sceneMaxDV}h`);
writeFileSync(`${OUT}/cost_s1e.json`, JSON.stringify({ scenes: sceneRows, recordings: recRows, perCornerDist }, null, 1));
writeFileSync(`${OUT}/cost_s1e.txt`, txt.join("\n") + "\n");
console.log(txt[txt.length - 1]);
