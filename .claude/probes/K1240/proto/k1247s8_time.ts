// K1247 s8: def's frame timed in motion, full density (master's path, --eps=0)
// or reduced (--eps=<device px>): k1247c_time.ts's model (its inconsistent
// 40-frame cycle from S to the 0.5h S' and back, one warm-up cycle, 3 timed
// cycles = 120 frames, then one profiled cycle for the phases). On the reduced
// path the kept set is chosen once beside structure() (counted in structure
// time) and every timed frame includes reduceScene (the gather and the s
// remap), reported as the phase `reduce`. Run under the perf lock
// (k1247s8_run_locked.ps1, through k1247s8_pair.mjs).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s8_time.ts <tag> --eps=0.05 [--scene=def]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame, type SceneIn } from "./outline";
import { selectKeep, reduceScene, keepStats } from "./k1247s8_reduce";

const here = dirname(fileURLToPath(import.meta.url));
const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const tag = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "run";
const epsPx = +(arg("eps") ?? 0);
const name = arg("scene") ?? "def";
const shortH = +(arg("short") ?? 0); // keepShort, in h
const outDir = join(here, "..", "out", "k1247s8_time");
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
function load(n: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${n}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
// k1247c_time.ts's perturb, inconsistent (s values unchanged).
function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return sc;
}
const q = (xs: number[], p: number): number => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const STEPS = 20;
const scene = load(name);
const h = scene.look.halfWidth; const S = scene.camera.pxPerUnit * 2;
const reduced = epsPx > 0;
const ta = performance.now();
const K = reduced ? selectKeep(scene, { eps: epsPx / S, keepShort: shortH * scene.look.halfWidth }) : null;
const tSelect = performance.now() - ta;
const st = structure(K ? reduceScene(scene, K) : scene);
const tStruct = performance.now() - ta;
const one = (sc: SceneIn, prof?: Record<string, number>): void => {
  if (!K) { frame(st, sc, prof); return; }
  const t0 = prof ? performance.now() : 0;
  const r = reduceScene(sc, K);
  if (prof) prof.reduce = (prof.reduce ?? 0) + (performance.now() - t0);
  frame(st, r, prof);
};
const tb = performance.now();
one(scene);
const tCold = performance.now() - tb;
const fwd = Array.from({ length: STEPS + 1 }, (_, k) => (k === 0 ? scene : perturb(scene, (k / STEPS) * 0.5 * h)));
const cycle = [...fwd, ...fwd.slice(1, STEPS).reverse()];
for (const sc of cycle) one(sc);
const ms: number[] = [];
for (let c = 0; c < 3; c++) for (const sc of cycle) { const t0 = performance.now(); one(sc); ms.push(performance.now() - t0); }
const acc: Record<string, number> = {};
for (const sc of cycle) { const prof: Record<string, number> = {}; one(sc, prof); for (const [k, v] of Object.entries(prof)) acc[k] = (acc[k] ?? 0) + v; }
const phases: Record<string, number> = {};
for (const [k, v] of Object.entries(acc)) phases[k] = +(v / cycle.length).toFixed(3);
const ks = K ? keepStats(K) : null;
const row = { scene: name, epsPx, shortH, kept: ks ? ks.kept : null, full: ks ? ks.full : null, frames: ms.length, median: +q(ms, 0.5).toFixed(3), p95: +q(ms, 0.95).toFixed(3), max: +Math.max(...ms).toFixed(3), selectMs: +tSelect.toFixed(2), structureMs: +tStruct.toFixed(2), firstColdMs: +tCold.toFixed(2), phases };
console.log(`${name} eps ${epsPx} px${ks ? ` (${ks.kept}/${ks.full} points, ${(ks.kept / ks.full * 100).toFixed(1)}%)` : " (full)"}: median ${row.median} ms, p95 ${row.p95}, max ${row.max}; select ${row.selectMs} ms, structure (with select) ${row.structureMs}, first cold ${row.firstColdMs}; phases ${Object.entries(phases).map(([k, v]) => `${k} ${v}`).join(", ")}`);
writeFileSync(join(outDir, `time_${tag}.json`), JSON.stringify(row, null, 1));
