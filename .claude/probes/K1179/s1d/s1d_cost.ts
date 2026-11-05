// K1179 S1d cost: the pinned-at-V rule's cost per frame over every
// distinct frame of the 4 recordings, cold, under the perf lock (taken
// by the caller, owner K1179-S1d). Counted: everything a frame needs
// to make its rounds beyond the sampled centrelines it already has --
// V and theta (pair iteration over cached arm windows), the feet
// (exact-edge walks), the cap/steep gates, the round, and variant
// (ii)'s margin gate -- through the production path (solveVPair, not
// the built corner's V). The full FormB build is timed beside it for
// scale only, as Run L timed it. Tessellation to 0.1 device px chord
// error is timed separately, not gated.
// Run: npx.cmd vite-node .claude/probes/K1179/s1d/s1d_cost.ts
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
import { evalRound, newTiming, s1dCorner, solveVPair } from "./lib_s1d";
import type { S1dTiming } from "./lib_s1d";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });
const SEQ_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/S3a/seq13";

function tessellate(c: any, tolWorld: number): number {
  if (!c.live) return 0;
  let segs = 0;
  const rec = (t0: number, t1: number, depth: number): void => {
    const p0 = evalRound(c, t0), p1 = evalRound(c, t1), pm = evalRound(c, (t0 + t1) / 2);
    const dev = Math.hypot(pm.x - (p0.x + p1.x) / 2, pm.y - (p0.y + p1.y) / 2);
    if (dev <= tolWorld || depth <= 0) { segs++; return; }
    rec(t0, (t0 + t1) / 2, depth - 1);
    rec((t0 + t1) / 2, t1, depth - 1);
  };
  rec(0, 1, 12);
  return segs;
}

function solveFrame(fb: any, variant: 1 | 2, timing: S1dTiming): { n: number; tessMs: number; tessSegs: number; maxDV: number } {
  const cache = new Map<number, WinArm>();
  const specs = cornerSpecs(fb);
  const masterMap = new Map((fb.corners as any[]).map((c: any) => [`${c.j}|${c.a}-${c.b}`, c]));
  let tessMs = 0, tessSegs = 0, maxDV = 0;
  const tolWorld = 0.1 / (fb.scene.camera.pxPerUnit * 2);
  for (const s of specs) {
    const t0 = performance.now();
    const V = solveVPair(fb, s.a, s.b, s.ji, s.th, cache);
    timing.vTheta += performance.now() - t0;
    if (!V) continue;
    const mc = masterMap.get(`${s.ji}|${s.a}-${s.b}`);
    if (mc) maxDV = Math.max(maxDV, Math.hypot(V.Vx - mc.Vx, V.Vy - mc.Vy) / fb.h);
    const c = s1dCorner(fb, { j: s.ji, a: s.a, b: s.b, theta: s.th, style: s.style, Vx: V.Vx, Vy: V.Vy, dVa: V.dVa, dVb: V.dVb }, variant, timing);
    const tt = performance.now();
    tessSegs += tessellate(c, tolWorld);
    tessMs += performance.now() - tt;
  }
  return { n: specs.length, tessMs, tessSegs, maxDV };
}

const txt: string[] = [];
// Scenes: medians + per-corner distribution (variant i; variant ii's
// margin gate is timed on the recordings beside it).
const perCornerAll: number[] = [];
const sceneRows: any[] = [];
let sceneMaxDV = 0;
for (const name of SCENES_12) {
  const sc = loadScene(name);
  const fb: any = new FormB(sc);
  const builds: number[] = [];
  for (let i = 0; i < 5; i++) { const t0 = performance.now(); new FormB(sc); builds.push(performance.now() - t0); }
  solveFrame(fb, 1, newTiming()); // warm JIT on this scene's shapes
  const frames: number[] = [];
  for (let i = 0; i < 7; i++) { const t0 = performance.now(); solveFrame(fb, 1, newTiming()); frames.push(performance.now() - t0); }
  const perCorner: number[] = [];
  const cacheTim = newTiming();
  const cache = new Map<number, WinArm>();
  void cacheTim;
  for (const s of cornerSpecs(fb)) {
    const t0 = performance.now();
    const V = solveVPair(fb, s.a, s.b, s.ji, s.th, cache);
    if (V) s1dCorner(fb, { j: s.ji, a: s.a, b: s.b, theta: s.th, style: s.style, Vx: V.Vx, Vy: V.Vy, dVa: V.dVa, dVb: V.dVb }, 1);
    perCorner.push(performance.now() - t0);
    perCornerAll.push(perCorner[perCorner.length - 1]);
  }
  const row = { scene: name, corners: fb.corners.length, medianMs: +fmt(pct(frames, 0.5), 3), perCornerMedianUs: +fmt((pct(perCorner, 0.5) || 0) * 1000, 1), masterBuildMedianMs: +fmt(pct(builds, 0.5), 1) };
  sceneRows.push(row);
  txt.push(`${name}: rule median ${fmt(row.medianMs, 3)} ms over ${row.corners} corners; per-corner median ${fmt(row.perCornerMedianUs, 1)} us; master build median ${fmt(row.masterBuildMedianMs, 1)} ms`);
  console.log(txt[txt.length - 1]);
}

const recRows: any[] = [];
for (const name of RECORDINGS) {
  const rl = createInterface({ input: createReadStream(`${SEQ_DIR}/${name}.jsonl.gz`).pipe(createGunzip()), crlfDelay: Infinity });
  let first = true;
  let prevScene: FieldScene | null = null;
  const frameMs1: number[] = [], frameMs2: number[] = [], perCornerFrame1: number[] = [];
  const parts1 = newTiming(), parts2 = newTiming();
  const buildMs: number[] = [];
  let tessMsTot = 0, tessSegsTot = 0, frames = 0;
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
    const t1 = newTiming();
    const s0 = performance.now();
    const r1 = solveFrame(fb, 1, t1);
    frameMs1.push(performance.now() - s0);
    if (r1.n) perCornerFrame1.push(frameMs1[frameMs1.length - 1] / r1.n);
    tessMsTot += r1.tessMs; tessSegsTot += r1.tessSegs;
    sceneMaxDV = Math.max(sceneMaxDV, r1.maxDV);
    parts1.vTheta += t1.vTheta; parts1.feet += t1.feet; parts1.round += t1.round; parts1.capGate += t1.capGate; parts1.marginGate += t1.marginGate;
    const t2 = newTiming();
    const s1 = performance.now();
    solveFrame(fb, 2, t2);
    frameMs2.push(performance.now() - s1);
    parts2.vTheta += t2.vTheta; parts2.feet += t2.feet; parts2.round += t2.round; parts2.capGate += t2.capGate; parts2.marginGate += t2.marginGate;
  }
  const row = {
    recording: name, frames,
    v1P50Ms: +fmt(pct(frameMs1, 0.5), 3), v1P95Ms: +fmt(pct(frameMs1, 0.95), 3), v1MaxMs: +fmt(Math.max(...frameMs1), 3),
    v2P95Ms: +fmt(pct(frameMs2, 0.95), 3),
    perCornerFrameP95Ms: +fmt(pct(perCornerFrame1, 0.95), 5),
    parts1Ms: { vTheta: +fmt(parts1.vTheta, 1), feet: +fmt(parts1.feet, 1), round: +fmt(parts1.round, 1), capGate: +fmt(parts1.capGate, 1) },
    parts2Ms: { vTheta: +fmt(parts2.vTheta, 1), feet: +fmt(parts2.feet, 1), round: +fmt(parts2.round, 1), capGate: +fmt(parts2.capGate, 1), marginGate: +fmt(parts2.marginGate, 1) },
    tessMsPerFrame: frames ? +fmt(tessMsTot / frames, 3) : 0, tessSegsPerFrame: frames ? Math.round(tessSegsTot / frames) : 0,
    masterBuildP95Ms: +fmt(pct(buildMs, 0.95), 1),
  };
  recRows.push(row);
  txt.push(`${name}: ${frames} frames, v1 p50 ${fmt(row.v1P50Ms, 3)} p95 ${fmt(row.v1P95Ms, 3)} max ${fmt(row.v1MaxMs, 3)} ms (gate 0.75); v2 p95 ${fmt(row.v2P95Ms, 3)} ms; parts v1 V+theta ${fmt(parts1.vTheta, 1)} feet ${fmt(parts1.feet, 1)} round ${fmt(parts1.round, 1)} cap ${fmt(parts1.capGate, 1)} ms total; v2 margin ${fmt(parts2.marginGate, 1)} ms; tess ${fmt(row.tessMsPerFrame, 3)} ms/frame (${row.tessSegsPerFrame} segs); master build p95 ${fmt(row.masterBuildP95Ms, 1)} ms`);
  console.log(txt[txt.length - 1]);
}
const perCornerDist = { n: perCornerAll.length, medianUs: +fmt((pct(perCornerAll, 0.5) || 0) * 1000, 1), p95Us: +fmt((pct(perCornerAll, 0.95) || 0) * 1000, 1), p99Us: +fmt((pct(perCornerAll, 0.99) || 0) * 1000, 1), maxUs: +fmt(Math.max(...perCornerAll) * 1000, 1), maxDVh: sceneMaxDV };
txt.push(`per-corner (12 scenes, n=${perCornerDist.n}): median ${perCornerDist.medianUs} us p95 ${perCornerDist.p95Us} us p99 ${perCornerDist.p99Us} us max ${perCornerDist.maxUs} us; production V vs master max ${sceneMaxDV}h`);
writeFileSync(`${OUT}/cost_s1d.json`, JSON.stringify({ scenes: sceneRows, recordings: recRows, perCornerDist }, null, 1));
writeFileSync(`${OUT}/cost_s1d.txt`, txt.join("\n") + "\n");
console.log(txt[txt.length - 1]);
