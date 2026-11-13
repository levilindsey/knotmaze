// K1247 s30 (4): how much an incremental frame would recompute per 60 Hz frame mid-drag, by granularity. Replays a
// captured drag interpolated to sub=N frames per captured pair (as k1247s30_inc.ts), and snaps at T device px with
// commit semantics (a unit is released, and re-committed, when any of its points drifts past T from where it was
// last committed). Units: whole chains (today's prototype), and spans of K points along a chain (K = 4, 8, 16, 32).
// Prints, per frame p50/p95: the share of units released and the share of POINTS in released units (the work).
// Counting only (no timing):
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s30_dirty.ts <dragDir> [sub=10] [T=0.5]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { SceneIn } from "../../../src/render/outline/outline";

const dir = process.argv[2];
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const sub = +arg("sub", "10"); const T = +arg("T", "0.5");
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const cap = files.map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn);
const px = cap[0].camera.pxPerUnit * cap[0].camera.dpr;
const lerpPts = (a: number[], b: number[], t: number): number[] => (a.length === b.length ? b.map((v, k) => a[k] + (v - a[k]) * t) : b.slice());
const frames: number[][][] = [cap[0].chains.map((c) => Array.from(c.pts))];
for (let i = 1; i < cap.length; i++) {
  for (let k = 1; k <= sub; k++) frames.push(cap[i].chains.map((c, q) => lerpPts(Array.from(cap[i - 1].chains[q].pts), Array.from(c.pts), k / sub)));
}
const nPts = frames[0].reduce((s, p) => s + p.length / 2, 0);
const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;
console.log(`${dir.split(/[\\/]/).filter(Boolean).pop()}: ${frames.length} frames (sub ${sub}), T ${T} px, chains ${frames[0].length}, points ${nPts}`);
// span length K in points; 0 = the whole chain
for (const K of [0, 32, 16, 8, 4]) {
  const committed = frames[0].map((p) => p.slice());
  const unitShare: number[] = []; const ptShare: number[] = [];
  let nUnits = 0;
  for (const p of frames[0]) nUnits += K ? Math.ceil(p.length / 2 / K) : 1;
  for (let f = 1; f < frames.length; f++) {
    let units = 0; let pts = 0;
    frames[f].forEach((p, c) => {
      const C = committed[c]; const n = p.length / 2;
      if (C.length !== p.length) { committed[c] = p.slice(); units += K ? Math.ceil(n / K) : 1; pts += n; return; }
      const span = K || n;
      for (let s0 = 0; s0 < n; s0 += span) {
        const s1 = Math.min(n, s0 + span);
        let moved = false;
        for (let k = s0; k < s1 && !moved; k++) moved = Math.hypot(p[2 * k] - C[2 * k], p[2 * k + 1] - C[2 * k + 1]) * px > T;
        if (moved) { units++; pts += s1 - s0; for (let k = 2 * s0; k < 2 * s1; k++) C[k] = p[k]; }
      }
    });
    unitShare.push(units / nUnits); ptShare.push(pts / nPts);
  }
  console.log(`${K ? `span ${String(K).padStart(2)} pts` : "whole chain"} (${nUnits} units): units released p50 ${pct(q(unitShare, 0.5))} p95 ${pct(q(unitShare, 0.95))}; points recomputed p50 ${pct(q(ptShare, 0.5))} p95 ${pct(q(ptShare, 0.95))} mean ${pct(ptShare.reduce((s, x) => s + x, 0) / ptShare.length)}`);
}
