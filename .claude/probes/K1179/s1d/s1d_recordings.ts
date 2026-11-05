// K1179 S1d recordings: criterion 3 as Run L measured it (edge points
// with the corrected allowance, round points at 21 fractions), for
// master's form B and variants (i)/(ii), over every distinct frame of
// the 4 recordings. Agreement (21-point Hausdorff) is accumulated too.
// Run: npx.cmd vite-node .claude/probes/K1179/s1d/s1d_recordings.ts [name,...]
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import { pointAt } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";
import { armFrame, RECORDINGS } from "../outline";
import { sameScene } from "../seq13_lib";
import { fillChecker } from "../s1c/lib_s1c";
import { agreementDev, evalRound, fmt, keyOf, pctile, s1dChecker, s1dCorner } from "./lib_s1d";
import type { S1dCorner } from "./lib_s1d";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });
const SEQ_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/S3a/seq13";

interface TP { x: number; y: number; cx: number; cy: number; nAng: number; cx2?: number; cy2?: number; buried: boolean }
type MapT = Map<string, TP>;

function trackedMaster(fb: any, sc: FieldScene): MapT {
  const h = fb.h;
  const buried = fillChecker(fb, fb.corners);
  const m: MapT = new Map();
  const step = 0.1 * h;
  sc.junctions.forEach((_j, ji) => {
    for (let ai = 0; ai < fb.arms.length; ai++) {
      const a = fb.arms[ai];
      if (a.j !== ji) continue;
      for (const side of [1, -1]) {
        for (let d = 0, di = 0; d <= a.L + 1e-9; d += step, di++) {
          const f = armFrame(fb, ai, d);
          const px = f.cx + f.nx * side * h, py = f.cy + f.ny * side * h;
          m.set(`E|${ji}|${a.ei}|${side}|${di}`, { x: px, y: py, cx: f.cx, cy: f.cy, nAng: Math.atan2(f.ny * side, f.nx * side), buried: buried(px, py) });
        }
      }
    }
  });
  for (const c of fb.corners) {
    const A = fb.arms[c.a], B = fb.arms[c.b];
    const live = c.r > 1e-12 && c.omega > 0;
    const a0 = Math.atan2(c.tay - c.qy, c.tax - c.qx);
    let a1 = Math.atan2(c.tby - c.qy, c.tbx - c.qx);
    while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
    while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
    let aV = Math.atan2(c.Vy - c.qy, c.Vx - c.qx);
    while (aV - a0 > Math.PI) aV -= 2 * Math.PI;
    while (aV - a0 < -Math.PI) aV += 2 * Math.PI;
    if ((aV - a0) * (a1 - a0) < 0) a1 += a1 > a0 ? -2 * Math.PI : 2 * Math.PI;
    for (let fi = 0; fi <= 20; fi++) {
      const fr = fi / 20;
      const p = live ? { x: c.qx + c.r * Math.cos(a0 + (a1 - a0) * fr), y: c.qy + c.r * Math.sin(a0 + (a1 - a0) * fr) } : { x: c.Vx, y: c.Vy };
      const fa = pointAt(fb.polys[A.pi], c.sA);
      const fbq = pointAt(fb.polys[B.pi], c.sB);
      m.set(`R|${c.j}|${A.ei}-${B.ei}|${fi}`, { x: p.x, y: p.y, cx: fa.x, cy: fa.y, nAng: 0, cx2: fbq.x, cy2: fbq.y, buried: buried(p.x, p.y) });
    }
  }
  return m;
}

function trackedVariant(fb: any, corners: S1dCorner[], sc: FieldScene): MapT {
  const h = fb.h;
  const buried = s1dChecker(fb, corners);
  const m: MapT = new Map();
  const step = 0.1 * h;
  sc.junctions.forEach((_j, ji) => {
    for (let ai = 0; ai < fb.arms.length; ai++) {
      const a = fb.arms[ai];
      if (a.j !== ji) continue;
      for (const side of [1, -1]) {
        for (let d = 0, di = 0; d <= a.L + 1e-9; d += step, di++) {
          const f = armFrame(fb, ai, d);
          const px = f.cx + f.nx * side * h, py = f.cy + f.ny * side * h;
          m.set(`E|${ji}|${a.ei}|${side}|${di}`, { x: px, y: py, cx: f.cx, cy: f.cy, nAng: Math.atan2(f.ny * side, f.nx * side), buried: buried(px, py) });
        }
      }
    }
  });
  for (const c of corners) {
    const A = fb.arms[c.a], B = fb.arms[c.b];
    const fa = pointAt(fb.polys[A.pi], c.sFootA);
    const fbq = pointAt(fb.polys[B.pi], c.sFootB);
    for (let fi = 0; fi <= 20; fi++) {
      const p = c.live ? evalRound(c, fi / 20) : { x: c.Vx, y: c.Vy };
      m.set(`R|${c.j}|${A.ei}-${B.ei}|${fi}`, { x: p.x, y: p.y, cx: fa.x, cy: fa.y, nAng: 0, cx2: fbq.x, cy2: fbq.y, buried: buried(p.x, p.y, c) });
    }
  }
  return m;
}

interface Agg { compared: number; over: number; overEdge: number; overRound: number; maxExcessDev: number; worst: string }
const newAgg = (): Agg => ({ compared: 0, over: 0, overEdge: 0, overRound: 0, maxExcessDev: -Infinity, worst: "" });
function compare(prev: MapT, cur: MapT, fb: any, agg: Agg): void {
  const dev = fb.ppuDev, h = fb.h;
  for (const [k, c] of cur) {
    const p = prev.get(k);
    if (!p || p.buried || c.buried) continue;
    agg.compared++;
    const disp = Math.hypot(c.x - p.x, c.y - p.y);
    let allowed: number;
    if (k.startsWith("R|")) {
      let skel = Math.hypot(c.cx - p.cx, c.cy - p.cy);
      if (c.cx2 !== undefined && p.cx2 !== undefined) skel = Math.max(skel, Math.hypot(c.cx2 - p.cx2, c.cy2! - p.cy2!));
      allowed = skel;
    } else {
      let turn = Math.abs(c.nAng - p.nAng);
      while (turn > Math.PI) turn = Math.abs(turn - 2 * Math.PI);
      allowed = Math.hypot(c.cx - p.cx, c.cy - p.cy) + h * turn;
    }
    const excessDev = (disp - allowed) * dev;
    if (excessDev > agg.maxExcessDev) { agg.maxExcessDev = excessDev; agg.worst = k; }
    if (excessDev > 1) { agg.over++; if (k.startsWith("R|")) agg.overRound++; else agg.overEdge++; }
  }
}

async function runRecording(name: string): Promise<any> {
  const rl = createInterface({ input: createReadStream(`${SEQ_DIR}/${name}.jsonl.gz`).pipe(createGunzip()), crlfDelay: Infinity });
  let first = true;
  let prevScene: FieldScene | null = null;
  let prevM: MapT | null = null, prev1: MapT | null = null, prev2: MapT | null = null;
  const aggM = newAgg(), agg1 = newAgg(), agg2 = newAgg();
  const agree1: number[] = [], agree2: number[] = [];
  let frames = 0, kept = 0;
  for await (const line of rl) {
    if (!line) continue;
    if (first) { first = false; continue; }
    frames++;
    const fr = JSON.parse(line) as { i: number; scene: FieldScene };
    fr.scene.look.ctrlArc ??= 0.47;
    if (prevScene && sameScene(prevScene, fr.scene)) continue;
    kept++;
    prevScene = fr.scene;
    const fb: any = new FormB(fr.scene);
    const srcOf = (c: any) => ({ j: c.j, a: c.a, b: c.b, theta: c.theta, style: c.style, Vx: c.Vx, Vy: c.Vy, dVa: c.dVa, dVb: c.dVb });
    const v1 = (fb.corners as any[]).map((c: any) => s1dCorner(fb, srcOf(c), 1));
    const v2 = (fb.corners as any[]).map((c: any) => s1dCorner(fb, srcOf(c), 2));
    const v1Map = new Map(v1.map((c) => [keyOf(c), c]));
    const v2Map = new Map(v2.map((c) => [keyOf(c), c]));
    for (const mc of fb.corners as any[]) {
      const c1 = v1Map.get(keyOf(mc)); if (c1) agree1.push(agreementDev(fb, c1, mc, 20));
      const c2 = v2Map.get(keyOf(mc)); if (c2) agree2.push(agreementDev(fb, c2, mc, 20));
    }
    const mapM = trackedMaster(fb, fr.scene);
    const map1 = trackedVariant(fb, v1, fr.scene);
    const map2 = trackedVariant(fb, v2, fr.scene);
    if (prevM) compare(prevM, mapM, fb, aggM);
    if (prev1) compare(prev1, map1, fb, agg1);
    if (prev2) compare(prev2, map2, fb, agg2);
    prevM = mapM; prev1 = map1; prev2 = map2;
  }
  const res = {
    recording: name, frames, keptDistinct: kept,
    master: { ...aggM, maxExcessDev: +fmt(aggM.maxExcessDev, 3) },
    v1: { ...agg1, maxExcessDev: +fmt(agg1.maxExcessDev, 3) },
    v2: { ...agg2, maxExcessDev: +fmt(agg2.maxExcessDev, 3) },
    agreeV1: { n: agree1.length, p50: +fmt(pctile(agree1, 0.5), 3), p95: +fmt(pctile(agree1, 0.95), 3), max: +fmt(Math.max(...agree1), 3), over1: agree1.filter((x) => x > 1).length },
    agreeV2: { n: agree2.length, p50: +fmt(pctile(agree2, 0.5), 3), p95: +fmt(pctile(agree2, 0.95), 3), max: +fmt(Math.max(...agree2), 3), over1: agree2.filter((x) => x > 1).length },
  };
  console.log(`${name}: kept ${kept}; master over ${aggM.over} (round ${aggM.overRound}) max ${fmt(aggM.maxExcessDev, 2)}; v1 over ${agg1.over} (round ${agg1.overRound}) max ${fmt(agg1.maxExcessDev, 2)} worst ${agg1.worst}; v2 over ${agg2.over} (round ${agg2.overRound}) max ${fmt(agg2.maxExcessDev, 2)} worst ${agg2.worst}`);
  return res;
}

const names = process.argv[2] ? process.argv[2].split(",") : RECORDINGS;
const all: any[] = [];
for (const n of names) all.push(await runRecording(n));
writeFileSync(`${OUT}/recordings_s1d.json`, JSON.stringify(all, null, 1));
writeFileSync(`${OUT}/recordings_s1d.txt`, all.map((r) => `${r.recording}: kept ${r.keptDistinct}; master over ${r.master.over} maxExcess ${r.master.maxExcessDev} worst ${r.master.worst}; v1 over ${r.v1.over} maxExcess ${r.v1.maxExcessDev} worst ${r.v1.worst}; v2 over ${r.v2.over} maxExcess ${r.v2.maxExcessDev} worst ${r.v2.worst}; agree v1 p50/p95/max ${r.agreeV1.p50}/${r.agreeV1.p95}/${r.agreeV1.max} over1 ${r.agreeV1.over1}/${r.agreeV1.n}; v2 ${r.agreeV2.p50}/${r.agreeV2.p95}/${r.agreeV2.max} over1 ${r.agreeV2.over1}/${r.agreeV2.n}`).join("\n") + "\n");
