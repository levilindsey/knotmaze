// K1179 S1c cost (tasks 3 and 4.4): the closed-form solve's cost per
// frame over every distinct frame of the 4 recordings, cold (no warm
// start; each frame solved from its own windows), plus the 12 scenes'
// medians and a per-corner distribution. Run under the perf lock
// ($env:TEMP\claude-perf.lock, owner K1179-S1c, taken by the caller).
// The counted cost is the corner solve given the arm windows (the
// sampled centrelines and arm spans form B builds each frame, which the
// renderer already has); the full form-B build is timed beside it for
// scale, as Run I and Run K timed it. Parts: windows (window extraction
// from the polylines), walk (V, the pair walk and its quadrature,
// excluding the margin walks), gates (the margin walks inside w),
// omega (the overlap scan; room rides on the gate evaluations).
// Run: npx.cmd vite-node .claude/probes/K1179/s1c/s1c_cost.ts
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";
import { fmt, loadScene, pct, RECORDINGS, SCENES_12 } from "../outline";
import { sameScene } from "../seq13_lib";
import { closedCorner, closedCorners, cornerSpecs, newTiming } from "./closed";
import type { ClosedCtx } from "./closed";
import { winOf } from "./lib_s1c";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });
const SEQ_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/S3a/seq13";
const keyOf = (c: any): string => `${c.j}|${c.a}-${c.b}`;

const txt: string[] = [];
const sceneRows: any[] = [];
const perCornerAll: number[] = [];
for (const name of SCENES_12) {
  const sc = loadScene(name);
  const builds: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    new FormB(sc);
    builds.push(performance.now() - t0);
  }
  const fb: any = new FormB(sc);
  closedCorners(fb); // warm the JIT on this scene's shapes
  const frames: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t0 = performance.now();
    closedCorners(fb);
    frames.push(performance.now() - t0);
  }
  // Per-corner distribution on this scene (shared window cache).
  const ctx: ClosedCtx = { cache: new Map(), maxWork: { wEvals: 0, pairSteps: 0 } };
  const perCorner: number[] = [];
  for (const s of cornerSpecs(fb)) {
    const t0 = performance.now();
    closedCorner(fb, s.ji, s.a, s.b, s.th, s.style, ctx);
    perCorner.push(performance.now() - t0);
    perCornerAll.push(perCorner[perCorner.length - 1]);
  }
  const med = pct(frames, 0.5);
  const row = {
    scene: name, corners: fb.corners.length, closedMedianMs: +fmt(med, 3),
    perCornerMedianUs: +fmt((pct(perCorner, 0.5) || 0) * 1000, 1),
    perCornerP95Us: +fmt((pct(perCorner, 0.95) || 0) * 1000, 1),
    masterBuildMedianMs: +fmt(pct(builds, 0.5), 1),
  };
  sceneRows.push(row);
  txt.push(`${name}: closed median ${fmt(med, 3)} ms over ${fb.corners.length} corners; per-corner median ${fmt(row.perCornerMedianUs, 1)} us p95 ${fmt(row.perCornerP95Us, 1)} us; master build median ${fmt(row.masterBuildMedianMs, 1)} ms`);
  console.log(txt[txt.length - 1]);
}

const recRows: any[] = [];
for (const name of RECORDINGS) {
  const rl = createInterface({ input: createReadStream(`${SEQ_DIR}/${name}.jsonl.gz`).pipe(createGunzip()), crlfDelay: Infinity });
  let first = true;
  let prevScene: FieldScene | null = null;
  let prevWins = new Map<string, { n: number; x: Float64Array; y: Float64Array; L: number }>();
  let prevKeys = new Set<string>();
  const frameMs: number[] = [];
  const perCornerFrame: number[] = [];
  const parts = newTiming();
  const buildMs: number[] = [];
  let comparedN = 0;
  const movedN = [0, 0, 0]; // >0.001h, >0.01h, >0.05h
  for await (const line of rl) {
    if (!line) continue;
    if (first) { first = false; continue; }
    const fr = JSON.parse(line) as { scene: FieldScene };
    fr.scene.look.ctrlArc ??= 0.47;
    if (prevScene && sameScene(prevScene, fr.scene)) continue;
    prevScene = fr.scene;
    const tb = performance.now();
    const fb: any = new FormB(fr.scene);
    buildMs.push(performance.now() - tb);
    const timing = newTiming();
    const t0 = performance.now();
    const { corners } = closedCorners(fb, timing);
    const dt = performance.now() - t0;
    frameMs.push(dt);
    if (corners.length) perCornerFrame.push(dt / corners.length);
    parts.windows += timing.windows; parts.walk += timing.walk; parts.gates += timing.gates;
    parts.omega += timing.omega; parts.calls += timing.calls; parts.wEvals += timing.wEvals;
    parts.pairSteps += timing.pairSteps; parts.nearestScans += timing.nearestScans;
    // Moved arm windows vs the previous distinct frame.
    const wins = new Map<string, { n: number; x: Float64Array; y: Float64Array; L: number }>();
    const keys = new Set<string>();
    for (const c of fb.corners as any[]) {
      keys.add(keyOf(c));
      for (const ai of [c.a, c.b]) {
        const wk = `${c.j}|${ai}`;
        if (!wins.has(wk)) {
          const w = winOf(fb, ai);
          wins.set(wk, { n: w.n, x: w.x, y: w.y, L: w.L });
        }
      }
    }
    for (const k of keys) {
      if (!prevKeys.has(k)) continue;
      comparedN++;
      const c: any = fb.corners.find((cc: any) => keyOf(cc) === k);
      let move = 0;
      for (const ai of [c.a, c.b]) {
        const wk = `${c.j}|${ai}`;
        const pw = prevWins.get(wk), cw = wins.get(wk);
        if (!pw || !cw) { move = Infinity; continue; }
        const m = Math.min(pw.n, cw.n);
        for (let i = 0; i < m; i++) move = Math.max(move, Math.hypot(cw.x[i] - pw.x[i], cw.y[i] - pw.y[i]));
        if (pw.n !== cw.n) move = Math.max(move, 0); // point count alone is not a move
        move = Math.max(move, Math.abs(cw.L - pw.L));
      }
      const hh = fb.h;
      if (move > 0.001 * hh) movedN[0]++;
      if (move > 0.01 * hh) movedN[1]++;
      if (move > 0.05 * hh) movedN[2]++;
    }
    prevWins = wins;
    prevKeys = keys;
  }
  const row = {
    recording: name, frames: frameMs.length,
    closedP50Ms: +fmt(pct(frameMs, 0.5), 3), closedP95Ms: +fmt(pct(frameMs, 0.95), 3), closedMaxMs: +fmt(Math.max(...frameMs), 3),
    perCornerFrameP95Ms: +fmt(pct(perCornerFrame, 0.95), 5),
    partsMsTotal: { windows: +fmt(parts.windows, 1), walk: +fmt(parts.walk, 1), gatesMargin: +fmt(parts.gates, 1), omega: +fmt(parts.omega, 1) },
    wEvals: parts.wEvals, pairSteps: parts.pairSteps, nearestScans: parts.nearestScans,
    masterBuildP95Ms: +fmt(pct(buildMs, 0.95), 1),
    moved: { compared: comparedN, gt0001h: comparedN ? +fmt(movedN[0] / comparedN, 4) : null, gt001h: comparedN ? +fmt(movedN[1] / comparedN, 4) : null, gt005h: comparedN ? +fmt(movedN[2] / comparedN, 4) : null },
  };
  recRows.push(row);
  txt.push(`${name}: ${row.frames} frames, closed p50 ${fmt(row.closedP50Ms, 3)} ms p95 ${fmt(row.closedP95Ms, 3)} ms max ${fmt(row.closedMaxMs, 3)} ms (gate 0.75); per-corner(frame) p95 ${fmt(row.perCornerFrameP95Ms, 5)} ms; parts windows ${fmt(parts.windows, 1)} walk ${fmt(parts.walk, 1)} gates ${fmt(parts.gates, 1)} omega ${fmt(parts.omega, 1)} ms over ${row.frames} frames; master build p95 ${fmt(row.masterBuildP95Ms, 1)} ms; moved>0.001/0.01/0.05h ${row.moved.gt0001h}/${row.moved.gt001h}/${row.moved.gt005h} of ${comparedN}`);
  console.log(txt[txt.length - 1]);
}
const perCornerDist = {
  n: perCornerAll.length,
  medianUs: +fmt((pct(perCornerAll, 0.5) || 0) * 1000, 1),
  p95Us: +fmt((pct(perCornerAll, 0.95) || 0) * 1000, 1),
  p99Us: +fmt((pct(perCornerAll, 0.99) || 0) * 1000, 1),
  maxUs: +fmt(Math.max(...perCornerAll) * 1000, 1),
};
txt.push(`per-corner (12 scenes, n=${perCornerDist.n}): median ${perCornerDist.medianUs} us p95 ${perCornerDist.p95Us} us p99 ${perCornerDist.p99Us} us max ${perCornerDist.maxUs} us`);
writeFileSync(`${OUT}/cost_s1c.json`, JSON.stringify({ scenes: sceneRows, recordings: recRows, perCornerDist }, null, 1));
writeFileSync(`${OUT}/cost_s1c.txt`, txt.join("\n") + "\n");
console.log(txt[txt.length - 1]);
