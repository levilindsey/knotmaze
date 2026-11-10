// K1247 s3: the output format's own cost on a scene, as a floor for frame().
// Takes one frame's real output, then times rebuilding the same shape:
//   push  - fresh objects, every pts/cpts/pieces array grown by push (frame() today)
//   slice - fresh objects, each array copied in one slice (exact-size arrays)
//   flat  - every number into one preallocated Float64Array plus offsets (no objects)
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s3_floor.ts [scene] [--reps=N]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { structure, frame, type SceneIn, type OutlineTable } from "./outline";
const name = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "def";
const reps = +(process.argv.find((a) => a.startsWith("--reps="))?.slice(7) ?? 200);
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const st = structure(scene);
const T = frame(st, scene);
for (let i = 0; i < 20; i++) frame(st, scene);
let nNum = 0;
for (const p of T.pieces) nNum += p.pts.length + p.cpts.length;
for (const r of T.regions) nNum += r.pts.length + r.pieces.length;
for (const f of T.faces) nNum += f.pts.length;
console.log(`${name}: pieces ${T.pieces.length}, regions ${T.regions.length}, faces ${T.faces.length}, corners ${T.corners.length}, cuts ${T.cuts.length}; ${nNum} numbers (${(nNum * 8 / 1024).toFixed(0)} KB as doubles)`);
function pushCopy(a: number[]): number[] { const o: number[] = []; for (let i = 0; i < a.length; i++) o.push(a[i]); return o; }
function rebuild(t: OutlineTable, cp: (a: number[]) => number[]): OutlineTable {
  return {
    h: t.h, W: t.W,
    pieces: t.pieces.map((p) => ({ kind: p.kind, chain: p.chain, side: p.side, s0: p.s0, s1: p.s1, pts: cp(p.pts), cpts: cp(p.cpts), region: p.region, corner: p.corner })),
    regions: t.regions.map((r) => ({ id: r.id, ownerChain: r.ownerChain, group: r.group, pts: cp(r.pts), pieces: cp(r.pieces), hole: r.hole })),
    faces: t.faces.map((f) => ({ ownerChain: f.ownerChain, group: f.group, pts: cp(f.pts), sample: [f.sample[0], f.sample[1]] as [number, number], hole: f.hole })),
    corners: t.corners.map((c) => ({ ...c })),
    cuts: t.cuts.map((c) => ({ ...c })),
    diagnostics: t.diagnostics.slice(),
  };
}
const flat = new Float64Array(nNum); const offs = new Int32Array(3 * (T.pieces.length + T.regions.length + T.faces.length) + 1);
function flatCopy(t: OutlineTable): number {
  let o = 0; let q = 0;
  const put = (a: number[]): void => { offs[q++] = o; for (let i = 0; i < a.length; i++) flat[o++] = a[i]; };
  for (const p of t.pieces) { put(p.pts); put(p.cpts); }
  for (const r of t.regions) { put(r.pts); put(r.pieces); }
  for (const f of t.faces) put(f.pts);
  offs[q] = o; return o;
}
function time(label: string, fn: () => unknown): void {
  const ms: number[] = [];
  for (let i = 0; i < 30; i++) fn();
  for (let i = 0; i < reps; i++) { const t0 = performance.now(); fn(); ms.push(performance.now() - t0); }
  ms.sort((a, b) => a - b);
  console.log(`  ${label.padEnd(6)} median ${ms[ms.length >> 1].toFixed(3)} ms, p95 ${ms[Math.floor(ms.length * 0.95)].toFixed(3)} ms`);
}
let sink = 0;
time("push", () => { sink += rebuild(T, pushCopy).pieces.length; });
time("slice", () => { sink += rebuild(T, (a) => a.slice()).pieces.length; });
time("flat", () => { sink += flatCopy(T); });
// frame() itself on the same (still) scene, for scale.
time("frame", () => { sink += frame(st, scene).pieces.length; });
if (sink < 0) console.log(sink);
