// K1179 S1b cost (task 4.4): the lean solve's cost per frame over every
// distinct frame of the 4 recordings, plus the 12 scenes' medians.
// Run under the perf lock ($env:TEMP\claude-perf.lock, owner K1179-S1b,
// taken by the caller). It counts the corner solve given the arm
// windows (task 3's inputs); the reference build it rides on is timed
// beside it for scale, split as in Run I's spike (baseline / V+spans /
// ball is the reference's own cost, not the lean solve's).
// Run: npx.cmd vite-node .claude/probes/K1179/s1b/s1b_cost.ts
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { fmt, loadScene, pct, RECORDINGS, SCENES_12 } from "../outline";
import { sameScene } from "../seq13_lib";
import { FormB as FormBRef } from "./form_b_ref";
import { leanCorners } from "./lean";
import type { LeanTiming } from "./lean";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });
const SEQ_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/S3a/seq13";
const keyOf = (c: any) => `${c.j}|${c.a}-${c.b}`;

// Per-arm window vertex coords, for the moved-inputs share.
function armWindowCoords(fb: any, ai: number): number[] {
  const a = fb.arms[ai];
  const p = fb.polys[a.pi];
  const out: number[] = [a.L];
  for (let v = 0; v < p.n; v++) {
    const d = fb.armDist(ai, p.s[v]);
    if (d >= -1e-9 && d <= a.L + 1e-9) out.push(p.x[v], p.y[v]);
  }
  return out;
}
const sameArr = (x: number[], y: number[]): boolean => x.length === y.length && x.every((v, i) => v === y[i]);

const txt: string[] = [];
// Scenes: lean median of 7 on one built reference, per corner.
const sceneRows: any[] = [];
for (const name of SCENES_12) {
  const sc = loadScene(name);
  const ref: any = new FormBRef(sc);
  const builds: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    new FormBRef(sc);
    builds.push(performance.now() - t0);
  }
  const leans: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t0 = performance.now();
    leanCorners(ref);
    leans.push(performance.now() - t0);
  }
  const med = pct(leans, 0.5);
  const row = { scene: name, corners: ref.corners.length, leanMedianMs: +fmt(med, 3), leanPerCornerUs: +fmt((med / Math.max(1, ref.corners.length)) * 1000, 1), refBuildMedianMs: +fmt(pct(builds, 0.5), 1) };
  sceneRows.push(row);
  txt.push(`${name}: lean median ${fmt(med, 3)} ms over ${ref.corners.length} corners (${fmt(row.leanPerCornerUs, 1)} us/corner); reference build median ${fmt(row.refBuildMedianMs, 1)} ms`);
  console.log(txt[txt.length - 1]);
}

// Recordings: per-frame lean time, parts, moved share.
const recRows: any[] = [];
for (const name of RECORDINGS) {
  const rl = createInterface({ input: createReadStream(`${SEQ_DIR}/${name}.jsonl.gz`).pipe(createGunzip()), crlfDelay: Infinity });
  let first = true;
  let prev: FieldScene | null = null;
  let prevWins = new Map<string, number[]>();
  let prevKeys = new Map<string, any>();
  const frameMs: number[] = [];
  const perCorner: number[] = [];
  const parts: LeanTiming = { v: 0, spans: 0, ball: 0, gates: 0, calls: 0 };
  let movedN = 0;
  let comparedN = 0;
  for await (const line of rl) {
    if (!line) continue;
    if (first) { first = false; continue; }
    const fr = JSON.parse(line) as { scene: FieldScene };
    fr.scene.look.ctrlArc ??= 0.47;
    if (prev && sameScene(prev, fr.scene)) continue;
    prev = fr.scene;
    const ref: any = new FormBRef(fr.scene);
    const t0 = performance.now();
    leanCorners(ref);
    const dt = performance.now() - t0;
    frameMs.push(dt);
    if (ref.corners.length) perCorner.push(dt / ref.corners.length);
    // Instrumented run for the parts split (its own total is not used).
    const timing: LeanTiming = { v: 0, spans: 0, ball: 0, gates: 0, calls: 0 };
    leanCorners(ref, timing);
    parts.v += timing.v; parts.spans += timing.spans; parts.ball += timing.ball; parts.gates += timing.gates; parts.calls += timing.calls;
    // Moved inputs vs the previous distinct frame.
    const wins = new Map<string, number[]>();
    const keys = new Map<string, any>();
    for (const c of ref.corners as any[]) {
      keys.set(keyOf(c), c);
      for (const ai of [c.a, c.b]) {
        const wk = `${c.j}|${ai}`;
        if (!wins.has(wk)) wins.set(wk, armWindowCoords(ref, ai));
      }
    }
    for (const [k] of keys) {
      const pc: any = prevKeys.get(k);
      if (!pc) continue;
      comparedN++;
      const cc: any = keys.get(k);
      const moved = !sameArr(prevWins.get(`${pc.j}|${pc.a}`) ?? [], wins.get(`${cc.j}|${cc.a}`) ?? [])
        || !sameArr(prevWins.get(`${pc.j}|${pc.b}`) ?? [], wins.get(`${cc.j}|${cc.b}`) ?? []);
      if (moved) movedN++;
    }
    prevWins = wins;
    prevKeys = keys;
  }
  const row = {
    recording: name, frames: frameMs.length,
    leanP50Ms: +fmt(pct(frameMs, 0.5), 3), leanP95Ms: +fmt(pct(frameMs, 0.95), 3), leanMaxMs: +fmt(Math.max(...frameMs), 3),
    perCornerP95Ms: +fmt(pct(perCorner, 0.95), 5),
    partsMsTotal: { v: +fmt(parts.v, 1), spansAndOmega: +fmt(parts.spans, 1), ballAdvanceExclGates: +fmt(Math.max(0, parts.ball - parts.gates), 1), gates: +fmt(parts.gates, 1) },
    partsFrames: frameMs.length, movedShare: comparedN ? +fmt(movedN / comparedN, 4) : null, movedN, comparedN,
  };
  recRows.push(row);
  txt.push(`${name}: ${frameMs.length} frames, lean p50 ${fmt(row.leanP50Ms, 3)} ms p95 ${fmt(row.leanP95Ms, 3)} ms max ${fmt(row.leanMaxMs, 3)} ms; per-corner p95 ${fmt(row.perCornerP95Ms, 5)} ms; parts (instrumented totals over ${frameMs.length} frames) V ${fmt(parts.v, 1)} spans+omega ${fmt(parts.spans, 1)} ball-advance ${fmt(Math.max(0, parts.ball - parts.gates), 1)} gates ${fmt(parts.gates, 1)} ms; inputs moved ${movedN}/${comparedN} (${row.movedShare})`);
  console.log(txt[txt.length - 1]);
}
writeFileSync(`${OUT}/cost_s1b.json`, JSON.stringify({ scenes: sceneRows, recordings: recRows }, null, 1));
writeFileSync(`${OUT}/cost_s1b.txt`, txt.join("\n") + "\n");
