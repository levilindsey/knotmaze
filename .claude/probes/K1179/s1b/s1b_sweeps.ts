// K1179 S1b sweeps: gate699, tee, ring and the synthetic arm sweep,
// measured as K1114's probes measure them (stands copied from Run I's
// spike_sweeps.ts, which copied them verbatim from
// .claude/probes/K1040/s1/gate699_s1i.ts and dedge_s1g.ts; dpr 1 as
// there), for Run I's form B, task 2's reference, and the lean solve.
// The corrected gates are form B's ordinary rates as Run I reproduced
// them: gate699 0.1270 (Run I's brief gate 0.125 sat below the rate),
// tee 0.1480, ring 0.1737, synthetic 0.0508.
// Run: npx.cmd vite-node .claude/probes/K1179/s1b/s1b_sweeps.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";
import { fmt, linePts, synthScene } from "../outline";
import { FormB as FormBRef } from "./form_b_ref";
import { leanCorners } from "./lean";

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
  const pb = 2.0;
  const pc = -2.2;
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
  const R = 8;
  const n = 400;
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n;
    pts.push(R * Math.sin(t), -R + R * Math.cos(t));
  }
  const len = 2 * Math.PI * R;
  const sc = ((dc % len) + len) % len;
  const t = sc / R;
  const cx = R * Math.sin(t);
  const cy = -R + R * Math.cos(t);
  const ux = Math.sin(t);
  const uy = Math.cos(t);
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

const keyOf = (c: any) => `${c.j}|${c.a}-${c.b}`;
interface SweepRes { name: string; gate: number; before: number; beforeAt: number; ref: number; refAt: number; leanMaxDiffH: number; cornersCompared: number; passBefore: boolean; passRef: boolean }
function sweep(name: string, gate: number, mk: (t: number) => FieldScene, ts: number[], probes: [number, number][]): SweepRes {
  let prevB: number[] | null = null;
  let prevR: number[] | null = null;
  let maxB = 0, atB = 0, maxR = 0, atR = 0;
  let leanMax = 0;
  let compared = 0;
  for (const t of ts) {
    const sc = mk(t);
    const fbB: any = new FormB(sc);
    const fbR: any = new FormBRef(sc);
    const lean = leanCorners(fbR);
    const refMap = new Map(fbR.corners.map((c: any) => [keyOf(c), c]));
    for (const lc of lean) {
      const rc: any = refMap.get(keyOf(lc));
      if (!rc) continue;
      compared++;
      leanMax = Math.max(leanMax, Math.hypot(lc.qx - rc.qx, lc.qy - rc.qy) / fbR.h, Math.abs(lc.r - rc.r) / fbR.h, Math.hypot(lc.Vx - rc.Vx, lc.Vy - rc.Vy) / fbR.h);
    }
    const inkB = probes.map(([x, y]) => fbB.evalPoint(x, y).ink);
    const inkR = probes.map(([x, y]) => fbR.evalPoint(x, y).ink);
    if (prevB && prevR) {
      for (let i = 0; i < inkB.length; i++) {
        const dB = Math.abs(inkB[i] - prevB[i]);
        if (dB > maxB) { maxB = dB; atB = t; }
        const dR = Math.abs(inkR[i] - prevR[i]);
        if (dR > maxR) { maxR = dR; atR = t; }
      }
    }
    prevB = inkB;
    prevR = inkR;
  }
  // The lean column's ink is the reference's: lean corners equal the
  // reference's on every step (leanMaxDiffH), and the ink is a function
  // of the corners.
  const res: SweepRes = { name, gate, before: +fmt(maxB), beforeAt: atB, ref: +fmt(maxR), refAt: atR, leanMaxDiffH: leanMax, cornersCompared: compared, passBefore: +fmt(maxB) <= gate, passRef: +fmt(maxR) <= gate };
  console.log(`${name}: before ink ${fmt(maxB)} (gate ${gate}) ${res.passBefore ? "PASS" : "FAIL"} at ${fmt(atB, 4)}; ref/lean ink ${fmt(maxR)} ${res.passRef ? "PASS" : "FAIL"} at ${fmt(atR, 4)}; lean-ref max diff ${leanMax}h over ${compared} corners`);
  return res;
}

const span = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
const results: SweepRes[] = [];
results.push(sweep("gate699 coarse (e 0.005h)", 0.127, gate699, span(0, 1.0, 200), [[0.02, 1.03], [0.05, 1.08], [0.1, 1.16], [0.2, 1.3], [0.15, 1.05], [-0.05, 1.08], [0.0, 1.0]]));
results.push(sweep("gate699 fine", 0.127, gate699, span(0.6374, 0.6474, 200), [[0.02, 1.03], [0.05, 1.08], [0.1, 1.16], [0.2, 1.3], [0.15, 1.05], [-0.05, 1.08], [0.0, 1.0]]));
results.push(sweep("tee coarse (dc 0.01)", 0.148, tee, span(-2.5, 2.5, 500), [[1.6, 1.25], [-1.25, 1.25], [1.25, -1.25], [-1.25, -1.25]]));
results.push(sweep("tee fine", 0.148, tee, span(-0.005, 0.005, 100), [[1.6, 1.25], [-1.25, 1.25], [1.25, -1.25], [-1.25, -1.25]]));
results.push(sweep("ring coarse (dc 0.01)", 0.1737, ring, span(-2.5, 2.5, 500), [[1.6, 1.25], [-1.25, 1.25], [0, 1.05], [0, -0.95]]));
results.push(sweep("ring fine", 0.1737, ring, span(-0.005, 0.005, 100), [[1.6, 1.25], [-1.25, 1.25], [0, 1.05], [0, -0.95]]));
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
writeFileSync(`${OUT}/sweeps_s1b.json`, JSON.stringify(results, null, 1));
writeFileSync(`${OUT}/sweeps_s1b.txt`, results.map((r) => `${r.name}: before ${r.before} vs ${r.gate} ${r.passBefore ? "PASS" : "FAIL"}; ref/lean ${r.ref} ${r.passRef ? "PASS" : "FAIL"}; lean diff ${r.leanMaxDiffH}h/${r.cornersCompared}`).join("\n") + "\n");

