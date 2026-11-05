// K1179 S1 spike, criterion 4: the corner solve's cost on the desktop,
// measured under the perf lock ($env:TEMP\claude-perf.lock, taken by the
// caller). Times `new FormB(scene)` per frame (the constructor holds the
// corner solve; evalPoint is not timed), on the 12 scenes and on every
// distinct frame of the 4 recordings, streamed like spike_motion.ts.
// Split on two scenes: no junctions (chains/depth/grid/groups baseline),
// all-sharp corners (V + arm spans, no ball integration), default.
// Run: npx.cmd vite-node .claude/probes/K1179/spike_cost.ts
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../src/render/field/form_b";
import type { FieldScene } from "../../../src/render/field/scene";
import { fmt, loadScene, pct, RECORDINGS, SCENES_12 } from "./outline";
import { sameScene } from "./seq13_lib";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });
const SEQ_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/S3a/seq13";

function timeBuild(sc: FieldScene, reps: number): { ms: number[]; corners: number } {
  const fb0 = new FormB(sc); // warmup + corner count
  const corners = fb0.corners.length;
  const ms: number[] = [];
  for (let i = 0; i < reps; i++) {
    const t0 = performance.now();
    new FormB(sc);
    ms.push(performance.now() - t0);
  }
  return { ms, corners };
}

const txt: string[] = [];
const sceneRows: Record<string, unknown>[] = [];
for (const name of SCENES_12) {
  const sc = loadScene(name);
  const { ms, corners } = timeBuild(sc, 7);
  const med = pct(ms, 0.5);
  const row = { scene: name, corners, medianMs: +fmt(med, 2), minMs: +fmt(Math.min(...ms), 2), perCornerUs: +fmt((med / Math.max(1, corners)) * 1000, 1) };
  sceneRows.push(row);
  txt.push(`${name}: corners ${corners}, FormB build median ${fmt(med, 2)} ms (min ${fmt(Math.min(...ms), 2)}), per corner ${fmt((med / Math.max(1, corners)) * 1000, 1)} us`);
  console.log(txt[txt.length - 1]);
}

// Split on def + muse_hash.
const splitRows: Record<string, unknown>[] = [];
for (const name of ["def", "muse_hash"]) {
  const sc = loadScene(name);
  const noJ: FieldScene = { ...sc, junctions: [] };
  const sharp: FieldScene = JSON.parse(JSON.stringify(sc)) as FieldScene;
  for (const j of sharp.junctions) if (j.corners) for (const cnr of j.corners) cnr.style = "sharp";
  const a = pct(timeBuild(noJ, 5).ms, 0.5);
  const b = pct(timeBuild(sharp, 5).ms, 0.5);
  const c = pct(timeBuild(sc, 5).ms, 0.5);
  const corners = new FormB(sc).corners.length;
  splitRows.push({ scene: name, corners, noJunctionsMs: +fmt(a, 2), sharpMs: +fmt(b, 2), defaultMs: +fmt(c, 2), vAndArmsMs: +fmt(b - a, 2), ballMs: +fmt(c - b, 2) });
  txt.push(`${name} split: baseline (no junctions) ${fmt(a, 2)} ms, +V/arm spans (sharp) ${fmt(b - a, 2)} ms, +ball integration ${fmt(c - b, 2)} ms, total ${fmt(c, 2)} ms over ${corners} corners`);
  console.log(txt[txt.length - 1]);
}

// Recordings: every distinct frame, streamed.
const recRows: Record<string, unknown>[] = [];
for (const name of RECORDINGS) {
  const rl = createInterface({ input: createReadStream(`${SEQ_DIR}/${name}.jsonl.gz`).pipe(createGunzip()), crlfDelay: Infinity });
  let first = true;
  let prev: FieldScene | null = null;
  const builds: number[] = [];
  const perCorner: number[] = [];
  for await (const line of rl) {
    if (!line) continue;
    if (first) {
      first = false;
      continue;
    }
    const fr = JSON.parse(line) as { scene: FieldScene };
    fr.scene.look.ctrlArc ??= 0.47;
    if (prev && sameScene(prev, fr.scene)) continue;
    prev = fr.scene;
    const t0 = performance.now();
    const fb = new FormB(fr.scene);
    const dt = performance.now() - t0;
    builds.push(dt);
    if (fb.corners.length) perCorner.push(dt / fb.corners.length);
  }
  const row = {
    recording: name, frames: builds.length,
    buildP50Ms: +fmt(pct(builds, 0.5), 2), buildP95Ms: +fmt(pct(builds, 0.95), 2), buildMaxMs: +fmt(Math.max(...builds), 2),
    perCornerP95Ms: +fmt(pct(perCorner, 0.95), 4),
  };
  recRows.push(row);
  txt.push(`${name}: ${builds.length} frames, build p50 ${fmt(pct(builds, 0.5), 2)} ms, p95 ${fmt(pct(builds, 0.95), 2)} ms, max ${fmt(Math.max(...builds), 2)} ms; per-corner p95 ${fmt(pct(perCorner, 0.95), 4)} ms`);
  console.log(txt[txt.length - 1]);
}
writeFileSync(`${OUT}/cost.json`, JSON.stringify({ scenes: sceneRows, split: splitRows, recordings: recRows }, null, 1));
writeFileSync(`${OUT}/cost.txt`, txt.join("\n") + "\n");
