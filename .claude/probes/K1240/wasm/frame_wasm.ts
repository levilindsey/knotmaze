// K1247 WASM: the partial port inside the real frame. def in motion (the
// gated bench: k1247_bench.ts's 40-scene perturbation cycle), timed three
// ways: js = ../proto/outline.ts as it is; copyJs = outline_wasm_off.ts (the
// generated copy with WASM compiled out: the copy's own noise); wasm =
// outline_wasm.ts, footNearM and marginOfC in build/<wasm> (polys + tangents
// copied in once per frame, the WalkCache copied in and out per call).
// Each mode has its own structure and walks the same scene sequence, in
// blocks of one cycle (40 frames), the block order rotated each round, so a
// mode's caches stay warm inside its block. frame()'s phase profile is kept
// per mode. Exactness: every table of a fresh cycle compared as JSON, js
// against wasm, before the timing, and one more frame of each mode after.
// Run under the perf lock.
//   node scripts/run_node.mjs .claude/probes/K1240/wasm/frame_wasm.ts [rounds] [wasm file]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as A from "../proto/outline";
import * as B from "./outline_wasm";
import * as Boff from "./outline_wasm_off";

const here = dirname(fileURLToPath(import.meta.url));
const ROUNDS = Number(process.argv[2] ?? 3);
const wasmName = process.argv[3] ?? "kernels.wasm";
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
type SceneIn = A.SceneIn;
function load(name: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
// k1247_bench.ts's perturbation, verbatim.
function perturb(scene: SceneIn, Am: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) {
    const x = c.pts[i]; const y = c.pts[i + 1];
    c.pts[i] = x + Am * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4));
    c.pts[i + 1] = y + Am * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3));
  }
  return sc;
}
const scene = load("def");
const h = scene.look.halfWidth;
const cyc: SceneIn[] = [];
for (let k = 0; k <= 20; k++) cyc.push(perturb(scene, (k / 20) * 0.5 * h));
for (let k = 19; k >= 1; k--) cyc.push(perturb(scene, (k / 20) * 0.5 * h));
const N = cyc.length;

const wasmBytes = readFileSync(join(here, "build", wasmName));
const ex = new WebAssembly.Instance(new WebAssembly.Module(wasmBytes), {}).exports as unknown as Parameters<typeof B.__wasmSet>[1];
B.__wasmSet(true, ex);
console.log(`outline.ts ${B.__wasmSourceSha}, wasm ${wasmName} ${wasmBytes.length} B, def motion cycle ${N} scenes, ${ROUNDS} rounds of one cycle per mode`);

// ---- exactness over a fresh cycle -------------------------------------------
{
  const sA = A.structure(scene); const sB = B.structure(scene);
  let bad = 0; let first = -1;
  for (let i = 0; i <= N; i++) {
    const ta = JSON.stringify(A.frame(sA, cyc[i % N]));
    B.__wasmDirty();
    const tb = JSON.stringify(B.frame(sB, cyc[i % N]));
    if (ta !== tb) { bad++; if (first < 0) first = i; }
  }
  console.log(`exact: ${N + 1} frames, js vs wasm tables ${bad === 0 ? "identical" : `${bad} differ (first at frame ${first})`}`);
}

// ---- timing ----------------------------------------------------------------------
const stJs = A.structure(scene); const stCopy = Boff.structure(scene); const stW = B.structure(scene);
const prof: Record<string, number>[] = [{}, {}, {}];
const modes: [string, (sc: SceneIn, p?: Record<string, number>) => unknown][] = [
  ["js", (sc, p) => A.frame(stJs, sc, p)],
  ["copyJs", (sc, p) => Boff.frame(stCopy, sc, p)],
  ["wasm", (sc, p) => { B.__wasmDirty(); return B.frame(stW, sc, p); }],
];
const pos = [0, 0, 0];
const T: number[][] = modes.map(() => []);
for (let j = 0; j < modes.length; j++) for (let i = 0; i < N; i++) modes[j][1](cyc[pos[j]++ % N]);
for (let round = 0; round < ROUNDS; round++) {
  for (let jj = 0; jj < modes.length; jj++) {
    const j = (jj + round) % modes.length;
    for (let i = 0; i < N; i++) {
      const sc = cyc[pos[j]++ % N];
      const t0 = performance.now(); modes[j][1](sc, prof[j]); T[j].push(performance.now() - t0);
    }
  }
}
const pct = (a: number[], q: number): number => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const res: Record<string, { med: number; p95: number; phases: Record<string, number> }> = {};
for (let j = 0; j < modes.length; j++) {
  const n = T[j].length;
  res[modes[j][0]] = { med: pct(T[j], 0.5), p95: pct(T[j], 0.95), phases: Object.fromEntries(Object.entries(prof[j]).map(([k, v]) => [k, +(v / n).toFixed(3)])) };
}
for (const [m] of modes) console.log(`${m}: median ${res[m].med.toFixed(3)} ms, p95 ${res[m].p95.toFixed(3)} ms; phases ${JSON.stringify(res[m].phases)}`);
console.log(`saving js - wasm: median ${(res.js.med - res.wasm.med).toFixed(3)} ms; copyJs - wasm ${(res.copyJs.med - res.wasm.med).toFixed(3)} ms`);
const outs = modes.map(([, f], j) => JSON.stringify(f(cyc[pos[j] % N])));
console.log(`after: next frame's tables ${outs[0] === outs[1] && outs[0] === outs[2] ? "identical in all three modes" : "DIFFER"}`);
mkdirSync(join(here, "out"), { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
writeFileSync(join(here, "out", `frame_${wasmName.replace(/\W/g, "_")}_${stamp}.json`), JSON.stringify({ wasm: wasmName, rounds: ROUNDS, node: process.version, sha: B.__wasmSourceSha, res }, null, 1));
