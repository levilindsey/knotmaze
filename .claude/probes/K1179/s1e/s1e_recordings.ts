// K1179 S1e recordings: criterion 3 as Run L/H measured it (edge
// points with the corrected allowance, round points at 21 fractions),
// for master's form B and variants (i) K=32 / (ii) K=8, over every
// distinct frame of the 4 recordings. Agreement (21-point Hausdorff,
// dpr 2) is accumulated too, gated as the brief says: a recording
// corner whose master itself fails 1v is reported apart and left out
// of the gate. On recordings master-1v is read by its class test
// (marginsAt min < 0, class c, or otherDist < h+r, class d - the two
// classes of all 63 scene failures; the exact meet test runs on the
// scenes, where it is counted corner by corner).
// Run: npx.cmd vite-node .claude/probes/K1179/s1e/s1e_recordings.ts [name,...]
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import { pointAt } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";
import { armFrame, RECORDINGS } from "../outline";
import { marginsAt, otherDist } from "../s1b/lib_s1b";
import { sameScene } from "../seq13_lib";
import { fillChecker } from "../s1c/lib_s1c";
import { agreementDev, evalRound, s1dChecker } from "../s1d/lib_s1d";
import { fmt, keyOf, pctile, s1eCorner } from "./lib_s1e";
import type { S1eCorner } from "./lib_s1e";

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

function trackedVariant(fb: any, corners: S1eCorner[], sc: FieldScene): MapT {
  const h = fb.h;
  const buried = s1dChecker(fb, corners as any);
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
      const p = c.live ? evalRound(c as any, fi / 20) : { x: c.Vx, y: c.Vy };
      m.set(`R|${c.j}|${A.ei}-${B.ei}|${fi}`, { x: p.x, y: p.y, cx: fa.x, cy: fa.y, nAng: 0, cx2: fbq.x, cy2: fbq.y, buried: buried(p.x, p.y, c as any) });
    }
  }
  return m;
}

const pooledAgree: Record<string, number[]> = { k32: [], k8: [], k32Apart: [], k8Apart: [] };
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
  let prevM: MapT | null = null, prev32: MapT | null = null, prev8: MapT | null = null;
  const aggM = newAgg(), agg32 = newAgg(), agg8 = newAgg();
  const agree32: number[] = [], agree8: number[] = [], agree32Apart: number[] = [], agree8Apart: number[] = [];
  const agreeOver2: any[] = [];
  let frames = 0, kept = 0;
  let fbCount = { k32: 0, k8: 0, total: 0 };
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
    const winCache = new Map();
    const v32 = (fb.corners as any[]).map((c: any) => s1eCorner(fb, srcOf(c), 32, undefined, { winCache }));
    const v8 = (fb.corners as any[]).map((c: any) => s1eCorner(fb, srcOf(c), 8, undefined, { winCache }));
    fbCount.total += fb.corners.length;
    fbCount.k32 += v32.filter((c) => c.nodeFallback).length;
    fbCount.k8 += v8.filter((c) => c.nodeFallback).length;
    const m32 = new Map(v32.map((c) => [keyOf(c), c]));
    const m8 = new Map(v8.map((c) => [keyOf(c), c]));
    for (const mc of fb.corners as any[]) {
      const masterLive = mc.r > 1e-12 && mc.omega > 0;
      const masterFails = masterLive && (marginsAt(fb, mc).min < -1e-9 || otherDist(fb, mc) < fb.h + mc.r - 1e-9);
      const c32 = m32.get(keyOf(mc)); if (c32) {
        const dev = agreementDev(fb, c32 as any, mc, 20);
        if (masterFails) { agree32Apart.push(dev); pooledAgree.k32Apart.push(dev); } else { agree32.push(dev); pooledAgree.k32.push(dev); if (dev > 2) agreeOver2.push({ variant: "k32", recording: name, key: keyOf(mc), devPx: +fmt(dev, 3), theta: +fmt(mc.theta, 4) }); }
      }
      const c8 = m8.get(keyOf(mc)); if (c8) {
        const dev = agreementDev(fb, c8 as any, mc, 20);
        if (masterFails) { agree8Apart.push(dev); pooledAgree.k8Apart.push(dev); } else { agree8.push(dev); pooledAgree.k8.push(dev); if (dev > 2) agreeOver2.push({ variant: "k8", recording: name, key: keyOf(mc), devPx: +fmt(dev, 3), theta: +fmt(mc.theta, 4) }); }
      }
    }
    const mapM = trackedMaster(fb, fr.scene);
    const map32 = trackedVariant(fb, v32, fr.scene);
    const map8 = trackedVariant(fb, v8, fr.scene);
    if (prevM) compare(prevM, mapM, fb, aggM);
    if (prev32) compare(prev32, map32, fb, agg32);
    if (prev8) compare(prev8, map8, fb, agg8);
    prevM = mapM; prev32 = map32; prev8 = map8;
  }
  const summ = (xs: number[]) => ({ n: xs.length, p50: +fmt(pctile(xs, 0.5), 3), p95: +fmt(pctile(xs, 0.95), 3), max: xs.length ? +fmt(Math.max(...xs), 3) : 0, over1: xs.filter((x) => x > 1).length });
  const res = {
    recording: name, frames, keptDistinct: kept, fallbackCount: fbCount,
    master: { ...aggM, maxExcessDev: +fmt(aggM.maxExcessDev, 3) },
    k32: { ...agg32, maxExcessDev: +fmt(agg32.maxExcessDev, 3) },
    k8: { ...agg8, maxExcessDev: +fmt(agg8.maxExcessDev, 3) },
    agreeK32: summ(agree32), agreeK8: summ(agree8),
    agreeK32Apart: summ(agree32Apart), agreeK8Apart: summ(agree8Apart),
    agreeOver2: agreeOver2.sort((a: any, b: any) => b.devPx - a.devPx).slice(0, 50),
  };
  console.log(`${name}: kept ${kept}; master over ${aggM.over} max ${fmt(aggM.maxExcessDev, 2)}; k32 over ${agg32.over} max ${fmt(agg32.maxExcessDev, 2)} worst ${agg32.worst}; k8 over ${agg8.over} max ${fmt(agg8.maxExcessDev, 2)} worst ${agg8.worst}; agreeK32 p95 ${res.agreeK32.p95} agreeK8 p95 ${res.agreeK8.p95}`);
  return res;
}

const names = process.argv[2] ? process.argv[2].split(",") : RECORDINGS;
const all: any[] = [];
for (const n of names) all.push(await runRecording(n));
const summP = (xs: number[]) => ({ n: xs.length, p50: +fmt(pctile(xs, 0.5), 3), p95: +fmt(pctile(xs, 0.95), 3), max: xs.length ? +fmt(Math.max(...xs), 3) : 0, over1: xs.filter((x) => x > 1).length, over2: xs.filter((x) => x > 2).length });
const pooled = { k32: summP(pooledAgree.k32), k8: summP(pooledAgree.k8), k32Apart: summP(pooledAgree.k32Apart), k8Apart: summP(pooledAgree.k8Apart) };
writeFileSync(`${OUT}/recordings_s1e.json`, JSON.stringify({ recordings: all, pooled }, null, 1));
console.log(`POOLED agree k32 ${JSON.stringify(pooled.k32)} k8 ${JSON.stringify(pooled.k8)} apart k32 ${JSON.stringify(pooled.k32Apart)}`);
writeFileSync(`${OUT}/recordings_s1e.txt`, all.map((r) => `${r.recording}: kept ${r.keptDistinct}; master over ${r.master.over} maxExcess ${r.master.maxExcessDev} worst ${r.master.worst}; k32 over ${r.k32.over} maxExcess ${r.k32.maxExcessDev} worst ${r.k32.worst}; k8 over ${r.k8.over} maxExcess ${r.k8.maxExcessDev} worst ${r.k8.worst}; agree k32 p50/p95/max ${r.agreeK32.p50}/${r.agreeK32.p95}/${r.agreeK32.max} over1 ${r.agreeK32.over1}/${r.agreeK32.n} apart p95 ${r.agreeK32Apart.p95} n=${r.agreeK32Apart.n}; k8 p50/p95/max ${r.agreeK8.p50}/${r.agreeK8.p95}/${r.agreeK8.max} over1 ${r.agreeK8.over1}/${r.agreeK8.n} apart p95 ${r.agreeK8Apart.p95}`).join("\n") + "\n");
