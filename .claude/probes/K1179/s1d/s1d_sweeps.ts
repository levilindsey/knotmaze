// K1179 S1d sweeps: gate699, tee, ring and the synthetic arm sweep on
// the stands Run L copied (dpr 1), for master's form B and variants
// (i)/(ii). Ink at a probe is the outline's signed-distance ramp
// clamp(0.5 + sd/(2aa)) of the union (tubes + fills), sd the max of
// the tube's and each fill's signed distances to its sampled loop --
// the same ramp form B's band uses, so steps read against form B's
// ordinary rates (gate699 0.1270, tee 0.1480, ring 0.1737, synthetic
// 0.0508). Run: npx.cmd vite-node .claude/probes/K1179/s1d/s1d_sweeps.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { candidates } from "../../../../src/render/field/geom";
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";
import { fmt, linePts, synthScene } from "../outline";
import { evalRound, fillLoop, keyOf, pointInLoop, s1dCorner } from "./lib_s1d";
import type { S1dCorner } from "./lib_s1d";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });

function stand(name: string, chains: { pts: number[]; closed?: boolean }[], junctions: FieldScene["junctions"], crossings: FieldScene["crossings"] = []): FieldScene {
  return {
    version: 1, name,
    source: { kind: "synthetic", generator: "K1179 copied stand", params: {} },
    camera: { worldToCss: [10, 0, 0, -10, 100, 100], pxPerUnit: 10, dpr: 1, viewport: [200, 200] },
    look: { halfWidth: 1, band: 0.38, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: 3, paper: "#fff", ink: "#000" },
    chains: chains.map((c, id) => ({ id, closed: !!c.closed, pts: c.pts, z: new Array(c.pts.length / 2).fill(0) })),
    crossings, junctions, deadEnds: [],
  } as FieldScene;
}
const roundCorners = () => [0, 1, 2].map(() => ({ style: "round" as const, pinned: false }));
function gate699(e: number): FieldScene {
  const pb = 2.0, pc = -2.2;
  return stand("gate699", [
    { pts: linePts(0, 0, 10, 0) },
    { pts: linePts(-e, 0, -e + 10 * Math.cos(pb), 10 * Math.sin(pb)) },
    { pts: linePts(0, 0, 10 * Math.cos(pc), 10 * Math.sin(pc)) },
  ], [{ id: "j0", c: [0, 0], arms: [0, 1, 2].map((chain) => ({ chain, s: 0, dir: 1 as const, kind: "end" as const })), corners: roundCorners() }]);
}
function tee(dc: number): FieldScene {
  const a = (60 * Math.PI) / 180;
  return stand("tee", [
    { pts: linePts(-10, 0, 10, 0) },
    { pts: linePts(0, 0, 10 * Math.cos(a), 10 * Math.sin(a)) },
    { pts: linePts(dc, -10, dc, 10) },
  ], [{
    id: "j0", c: [0, 0],
    arms: [
      { chain: 0, s: 10, dir: 1, kind: "through" },
      { chain: 1, s: 0, dir: 1, kind: "end" },
      { chain: 0, s: 10, dir: -1, kind: "through" },
    ], corners: roundCorners(),
  }], [{ a: { chain: 0, s: 10 + dc }, b: { chain: 2, s: 10 }, over: "b" }]);
}
function ring(dc: number): FieldScene {
  const R = 8, n = 400;
  const pts: number[] = [];
  for (let i = 0; i < n; i++) { const t = (2 * Math.PI * i) / n; pts.push(R * Math.sin(t), -R + R * Math.cos(t)); }
  const len = 2 * Math.PI * R;
  const sc = ((dc % len) + len) % len;
  const t = sc / R;
  const cx = R * Math.sin(t), cy = -R + R * Math.cos(t);
  const ux = Math.sin(t), uy = Math.cos(t);
  const a = (60 * Math.PI) / 180;
  return stand("ring", [
    { pts, closed: true },
    { pts: linePts(0, 0, 10 * Math.cos(a), 10 * Math.sin(a)) },
    { pts: linePts(cx - 6 * ux, cy - 6 * uy, cx + 6 * ux, cy + 6 * uy) },
  ], [{
    id: "j0", c: [0, 0],
    arms: [
      { chain: 0, s: 0, dir: 1, kind: "through" },
      { chain: 1, s: 0, dir: 1, kind: "end" },
      { chain: 0, s: 0, dir: -1, kind: "through" },
    ], corners: roundCorners(),
  }], [{ a: { chain: 0, s: sc }, b: { chain: 2, s: 6 }, over: "b" }]);
}

function distToLoop(loop: { x: number; y: number }[], x: number, y: number): number {
  let best = Infinity;
  for (let i = 1; i < loop.length; i++) {
    const ax = loop[i - 1].x, ay = loop[i - 1].y;
    const ex = loop[i].x - ax, ey = loop[i].y - ay;
    const l2 = ex * ex + ey * ey;
    const f = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * ex + (y - ay) * ey) / l2)) : 0;
    best = Math.min(best, Math.hypot(x - (ax + ex * f), y - (ay + ey * f)));
  }
  return best;
}
function masterLoop(fb: any, c: any, vc: S1dCorner): { x: number; y: number }[] {
  const loop: { x: number; y: number }[] = [];
  const aArc = vc.walkA.arcOf(c.tax, c.tay);
  for (const p of vc.walkA.pts.filter((p) => p.cum <= aArc + 1e-9)) loop.push({ x: p.x, y: p.y });
  loop.push({ x: c.tax, y: c.tay });
  if (c.r > 1e-12 && c.omega > 0) {
    const a0 = Math.atan2(c.tay - c.qy, c.tax - c.qx);
    let a1 = Math.atan2(c.tby - c.qy, c.tbx - c.qx);
    while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
    while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
    for (let i = 1; i < 25; i++) { const an = a0 + ((a1 - a0) * i) / 25; loop.push({ x: c.qx + c.r * Math.cos(an), y: c.qy + c.r * Math.sin(an) }); }
  }
  loop.push({ x: c.tbx, y: c.tby });
  const bArc = vc.walkB.arcOf(c.tbx, c.tby);
  for (const p of vc.walkB.pts.filter((p) => p.cum <= bArc + 1e-9).reverse()) loop.push({ x: p.x, y: p.y });
  return loop;
}

function inkAt(fb: any, loops: { x: number; y: number }[][], x: number, y: number): number {
  const cand: any[] = [];
  candidates(fb.grid, x, y, 4 * fb.h, cand);
  let dC = Infinity;
  for (const cd of cand) dC = Math.min(dC, cd.d);
  let sd = fb.h - dC;
  for (const loop of loops) {
    if (loop.length < 3) continue;
    const d = distToLoop(loop, x, y);
    sd = Math.max(sd, pointInLoop(loop, x, y) ? d : -d);
  }
  const v = 0.5 + sd / (2 * fb.aa);
  return Math.min(1, Math.max(0, v));
}

interface SweepRes { name: string; gate: number; master: number; v1: number; v2: number; atMaster: number; atV1: number; atV2: number }
function sweep(name: string, gate: number, mk: (t: number) => FieldScene, ts: number[], probes: [number, number][]): SweepRes {
  let prevM: number[] | null = null, prev1: number[] | null = null, prev2: number[] | null = null;
  let mM = 0, m1 = 0, m2 = 0, atM = 0, at1 = 0, at2 = 0;
  for (const t of ts) {
    const sc = mk(t);
    const fb: any = new FormB(sc);
    const srcOf = (c: any) => ({ j: c.j, a: c.a, b: c.b, theta: c.theta, style: c.style, Vx: c.Vx, Vy: c.Vy, dVa: c.dVa, dVb: c.dVb });
    const v1 = (fb.corners as any[]).map((c: any) => s1dCorner(fb, srcOf(c), 1));
    const v2 = (fb.corners as any[]).map((c: any) => s1dCorner(fb, srcOf(c), 2));
    const v1Map = new Map(v1.map((c) => [keyOf(c), c]));
    const loopsM: { x: number; y: number }[][] = [], loops1: { x: number; y: number }[][] = [], loops2: { x: number; y: number }[][] = [];
    for (const mc of fb.corners as any[]) {
      const vc = v1Map.get(keyOf(mc));
      if (vc) loopsM.push(masterLoop(fb, mc, vc));
    }
    for (const c of v1) if (c.live) loops1.push(fillLoop(c, 25));
    for (const c of v2) if (c.live) loops2.push(fillLoop(c, 25));
    const inkM = probes.map(([x, y]) => inkAt(fb, loopsM, x, y));
    const ink1 = probes.map(([x, y]) => inkAt(fb, loops1, x, y));
    const ink2 = probes.map(([x, y]) => inkAt(fb, loops2, x, y));
    if (prevM && prev1 && prev2) {
      for (let i = 0; i < probes.length; i++) {
        const dM = Math.abs(inkM[i] - prevM[i]); if (dM > mM) { mM = dM; atM = t; }
        const d1 = Math.abs(ink1[i] - prev1[i]); if (d1 > m1) { m1 = d1; at1 = t; }
        const d2 = Math.abs(ink2[i] - prev2[i]); if (d2 > m2) { m2 = d2; at2 = t; }
      }
    }
    prevM = inkM; prev1 = ink1; prev2 = ink2;
    void evalRound;
  }
  const res = { name, gate, master: +fmt(mM), v1: +fmt(m1), v2: +fmt(m2), atMaster: atM, atV1: at1, atV2: at2 };
  console.log(`${name}: master ${fmt(mM)} (gate ${gate}) at ${fmt(atM, 4)}; v1 ${fmt(m1)} at ${fmt(at1, 4)}; v2 ${fmt(m2)} at ${fmt(at2, 4)}`);
  return res;
}

const span = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
const results: SweepRes[] = [];
results.push(sweep("gate699 coarse (e 0.005h)", 0.127, gate699, span(0, 1.0, 200), [[0.02, 1.03], [0.05, 1.08], [0.1, 1.16], [0.2, 1.3], [0.15, 1.05], [-0.05, 1.08], [0.0, 1.0]]));
results.push(sweep("tee coarse (dc 0.01)", 0.148, tee, span(-2.5, 2.5, 500), [[1.6, 1.25], [-1.25, 1.25], [1.25, -1.25], [-1.25, -1.25]]));
results.push(sweep("ring coarse (dc 0.01)", 0.1737, ring, span(-2.5, 2.5, 500), [[1.6, 1.25], [-1.25, 1.25], [0, 1.05], [0, -0.95]]));
{
  const mk = (thDeg: number): FieldScene => {
    const a = (thDeg * Math.PI) / 180;
    return synthScene("armsweep", [
      { pts: linePts(-10, 0, 10, 0) },
      { pts: linePts(0, 0, 10 * Math.cos(a), 10 * Math.sin(a)) },
    ], [{
      id: "j0", c: [0, 0],
      arms: [
        { chain: 0, s: 10, dir: 1, kind: "through" },
        { chain: 1, s: 0, dir: 1, kind: "end" },
        { chain: 0, s: 10, dir: -1, kind: "through" },
      ], corners: roundCorners(),
    }]);
  };
  const probes: [number, number][] = [[1, 1], [2, 1], [1, 2], [2, 2], [3, 1], [1, 3], [2.5, 2.5], [-1, 1], [-2, 1], [-1, 2], [-2, 2], [0.5, 0.5]];
  const dTh = 0.0005;
  const nSteps = Math.ceil(((120 - 60) * Math.PI / 180) / dTh);
  const ts = Array.from({ length: nSteps + 1 }, (_, i) => 60 + (i * dTh * 180) / Math.PI);
  results.push(sweep(`synthetic arm 60deg (${nSteps} steps of 0.005h tip)`, 0.0508, mk, ts, probes));
}
writeFileSync(`${OUT}/sweeps_s1d.json`, JSON.stringify(results, null, 1));
writeFileSync(`${OUT}/sweeps_s1d.txt`, results.map((r) => `${r.name}: master ${r.master} vs ${r.gate}; v1 ${r.v1}; v2 ${r.v2}`).join("\n") + "\n");
