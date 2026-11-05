// K1179 S1 spike, criterion 3 (sweeps): gate699, tee and ring measured as
// K1114's probes measure them (stands copied verbatim from
// .claude/probes/K1040/s1/gate699_s1i.ts and dedge_s1g.ts, camera dpr 1 as
// there; ink steps per coarse step, gates 0.125 / 0.148 / 0.174, appearing
// and vanishing corners included), plus a synthetic sweep of one arm
// through 60 deg about its junction in 0.005h tip steps. Each sweep also
// tracks boundary points (outline.ts trackedMap) against the 1-device-px
// rule at dpr 2 for the synthetic stand, dpr 1 stands as built.
// Run: npx.cmd vite-node .claude/probes/K1179/spike_sweeps.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../src/render/field/form_b";
import type { FieldScene } from "../../../src/render/field/scene";
import { compareTracked, fmt, linePts, synthScene, trackedMap } from "./outline";

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

// gate699_s1i.ts's Y: three ENDs, chain 1's root at (-e, 0), corner 0-1 at 2.0 rad.
function gate699(e: number): FieldScene {
  const pb = 2.0;
  const pc = -2.2;
  return stand("gate699", [
    { pts: linePts(0, 0, 10, 0) },
    { pts: linePts(-e, 0, -e + 10 * Math.cos(pb), 10 * Math.sin(pb)) },
    { pts: linePts(0, 0, 10 * Math.cos(pc), 10 * Math.sin(pc)) },
  ], [{ id: "j0", c: [0, 0], arms: [0, 1, 2].map((chain) => ({ chain, s: 0, dir: 1 as const, kind: "end" as const })), corners: roundCorners() }]);
}
// dedge.ts's tee: chain 0 through, END at 60 deg, chain 2 crossing at dc.
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
// dedge_s1g.ts's ring: closed circle radius 8 through the junction at its top.
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

interface SweepRes { name: string; steps: number; maxInkStep: number; atParam: number; gate: number; pass: boolean; maxExcessDev: number; overPts: number; comparedPts: number; cornerAppear: number; cornerVanish: number }
function sweep(name: string, gate: number, mk: (t: number) => FieldScene, ts: number[], probes: [number, number][]): SweepRes {
  let prevInk: number[] | null = null;
  let prevMap: ReturnType<typeof trackedMap> | null = null;
  let prevCorners = new Set<string>();
  let maxInk = 0;
  let atParam = 0;
  let maxExcess = 0;
  let overPts = 0;
  let comparedPts = 0;
  let cApp = 0;
  let cVan = 0;
  for (const t of ts) {
    const sc = mk(t);
    const fb = new FormB(sc);
    const ink = probes.map(([x, y]) => fb.evalPoint(x, y).ink);
    if (prevInk) {
      for (let i = 0; i < ink.length; i++) {
        const d = Math.abs(ink[i] - prevInk[i]);
        if (d > maxInk) {
          maxInk = d;
          atParam = t;
        }
      }
    }
    prevInk = ink;
    const map = trackedMap(fb, sc);
    const cornerKeys = new Set([...map.keys()].filter((k) => k.startsWith("R|")).map((k) => k.split("|").slice(0, 3).join("|")));
    for (const k of cornerKeys) if (!prevCorners.has(k)) cApp++;
    for (const k of prevCorners) if (!cornerKeys.has(k)) cVan++;
    prevCorners = cornerKeys;
    if (prevMap) {
      const cmp = compareTracked(prevMap, map, fb.ppuDev);
      comparedPts += cmp.compared;
      overPts += cmp.over;
      if (cmp.maxExcess > maxExcess) maxExcess = cmp.maxExcess;
    }
    prevMap = map;
  }
  const res = { name, steps: ts.length - 1, maxInkStep: +fmt(maxInk), atParam, gate, pass: maxInk <= gate, maxExcessDev: +fmt(maxExcess, 3), overPts, comparedPts, cornerAppear: cApp, cornerVanish: cVan };
  console.log(`${name}: ink step max ${fmt(maxInk)} (gate ${gate}, at ${fmt(atParam, 4)}) ${res.pass ? "PASS" : "FAIL"}; boundary max excess ${fmt(maxExcess, 3)} devpx, over ${overPts}/${comparedPts}; corners appear ${cApp} vanish ${cVan}`);
  return res;
}

const span = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
const results: SweepRes[] = [];
results.push(sweep("gate699 coarse (e step 0.005h)", 0.125, gate699, span(0, 1.0, 200), [[0.02, 1.03], [0.05, 1.08], [0.1, 1.16], [0.2, 1.3], [0.15, 1.05], [-0.05, 1.08], [0.0, 1.0]]));
results.push(sweep("gate699 fine (e step 0.00005h)", 0.125, gate699, span(0.6374, 0.6474, 200), [[0.02, 1.03], [0.05, 1.08], [0.1, 1.16], [0.2, 1.3], [0.15, 1.05], [-0.05, 1.08], [0.0, 1.0]]));
results.push(sweep("tee coarse (dc step 0.01)", 0.148, tee, span(-2.5, 2.5, 500), [[1.6, 1.25], [-1.25, 1.25], [1.25, -1.25], [-1.25, -1.25]]));
results.push(sweep("tee fine (dc step 0.0001)", 0.148, tee, span(-0.005, 0.005, 100), [[1.6, 1.25], [-1.25, 1.25], [1.25, -1.25], [-1.25, -1.25]]));
results.push(sweep("ring coarse (dc step 0.01)", 0.174, ring, span(-2.5, 2.5, 500), [[1.6, 1.25], [-1.25, 1.25], [0, 1.05], [0, -0.95]]));
results.push(sweep("ring fine (dc step 0.0001)", 0.174, ring, span(-0.005, 0.005, 100), [[1.6, 1.25], [-1.25, 1.25], [0, 1.05], [0, -0.95]]));

// Synthetic: one END arm rotates 60 deg about the junction (60 -> 120 deg),
// tip moving 0.005h per step (arm length 10h, dTheta = 0.0005 rad).
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
  // No ink gate is named for this stand in the brief; the boundary rule
  // (1 dev px over skeleton) is its gate, ink steps reported alongside.
  const r = sweep(`synthetic arm sweep 60deg (${nSteps} steps of 0.005h tip)`, Infinity, mk, ts, probes);
  r.gate = 1;
  r.name = "synthetic arm sweep (boundary gate 1 devpx)";
  r.pass = r.maxExcessDev <= 1;
  console.log(`  synthetic boundary gate: max excess ${r.maxExcessDev} devpx -> ${r.pass ? "PASS" : "FAIL"}`);
  results.push(r);
}
writeFileSync(`${OUT}/sweeps.json`, JSON.stringify(results, null, 1));
writeFileSync(`${OUT}/sweeps.txt`, results.map((r) => `${r.name}: ink ${r.maxInkStep} vs ${r.gate} ${r.pass ? "PASS" : "FAIL"} at ${r.atParam}; boundary maxExcess ${r.maxExcessDev} devpx over ${r.overPts}/${r.comparedPts}; corners +${r.cornerAppear}/-${r.cornerVanish}`).join("\n") + "\n");
