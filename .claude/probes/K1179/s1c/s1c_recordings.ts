// K1179 S1c recordings: task 2 agreement (closed-form vs master's form
// B) and task 4 criterion 3 as Run K corrected it (edge allowance
// includes h * normal turn), over every distinct frame of the 4 seq13
// recordings. Streams the gz files. Column 1 of the doc's tables (Run K
// measured) is quoted from ../s1b/out/recordings_s1b.json, not recomputed.
// Run: npx.cmd vite-node .claude/probes/K1179/s1c/s1c_recordings.ts [name,...]
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
import { closedCorners } from "./closed";
import { fillChecker, fineR, fmt, keyOf } from "./lib_s1c";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });
const SEQ_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/S3a/seq13";

interface TP { x: number; y: number; cx: number; cy: number; nAng: number; cx2?: number; cy2?: number; buried: boolean }
type MapT = Map<string, TP>;

function tracked(fb: any, corners: any[], sc: FieldScene): MapT {
  const h = fb.h;
  const buried = fillChecker(fb, corners);
  const m: MapT = new Map();
  const step = 0.1 * h;
  sc.junctions.forEach((_j, ji) => {
    for (let ai = 0; ai < fb.arms.length; ai++) {
      const a = fb.arms[ai];
      if (a.j !== ji) continue;
      for (const side of [1, -1]) {
        for (let d = 0, di = 0; d <= a.L + 1e-9; d += step, di++) {
          const f = armFrame(fb, ai, d);
          const px = f.cx + f.nx * side * h;
          const py = f.cy + f.ny * side * h;
          m.set(`E|${ji}|${a.ei}|${side}|${di}`, { x: px, y: py, cx: f.cx, cy: f.cy, nAng: Math.atan2(f.ny * side, f.nx * side), buried: buried(px, py) });
        }
      }
    }
  });
  for (const c of corners) {
    const A = fb.arms[c.a];
    const B = fb.arms[c.b];
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
      const p = live
        ? { x: c.qx + c.r * Math.cos(a0 + (a1 - a0) * fr), y: c.qy + c.r * Math.sin(a0 + (a1 - a0) * fr) }
        : { x: c.Vx, y: c.Vy };
      const fa = pointAt(fb.polys[A.pi], c.sA);
      const fbq = pointAt(fb.polys[B.pi], c.sB);
      m.set(`R|${c.j}|${A.ei}-${B.ei}|${fi}`, { x: p.x, y: p.y, cx: fa.x, cy: fa.y, nAng: 0, cx2: fbq.x, cy2: fbq.y, buried: buried(p.x, p.y) });
    }
  }
  return m;
}

interface MotionAgg { compared: number; over: number; overEdge: number; overRound: number; maxExcessDev: number; worst: string }
const newAgg = (): MotionAgg => ({ compared: 0, over: 0, overEdge: 0, overRound: 0, maxExcessDev: -Infinity, worst: "" });

function compare(prev: MapT, cur: MapT, fb: any, agg: MotionAgg, events: { appear: Map<string, number>; vanish: Map<string, number> }): void {
  const dev = fb.ppuDev;
  const h = fb.h;
  const bump = (mm: Map<string, number>, k: string) => mm.set(k, (mm.get(k) ?? 0) + 1);
  for (const [k, c] of cur) {
    const p = prev.get(k);
    if (!p) { bump(events.appear, k.startsWith("R|") ? "round: corner appeared" : "edge: span grew / arm appeared"); continue; }
    if (p.buried || c.buried) {
      if (p.buried && !c.buried) bump(events.appear, "exposure gained (was buried)");
      if (!p.buried && c.buried) bump(events.vanish, "exposure lost (buried)");
      continue;
    }
    agg.compared++;
    const disp = Math.hypot(c.x - p.x, c.y - p.y);
    let allowed: number;
    if (k.startsWith("R|")) {
      let skel = Math.hypot(c.cx - p.cx, c.cy - p.cy);
      if (c.cx2 !== undefined && p.cx2 !== undefined) skel = Math.max(skel, Math.hypot(c.cx2 - p.cx2, c.cy2! - p.cy2!));
      allowed = skel;
    } else {
      // Corrected: centre motion plus h times the normal's turn, plus 1 dev px.
      let turn = Math.abs(c.nAng - p.nAng);
      while (turn > Math.PI) turn = Math.abs(turn - 2 * Math.PI);
      allowed = Math.hypot(c.cx - p.cx, c.cy - p.cy) + h * turn;
    }
    const excessDev = (disp - allowed) * dev;
    if (excessDev > agg.maxExcessDev) { agg.maxExcessDev = excessDev; agg.worst = k; }
    if (excessDev > 1) {
      agg.over++;
      if (k.startsWith("R|")) agg.overRound++;
      else agg.overEdge++;
    }
  }
  for (const k of prev.keys()) {
    if (cur.has(k)) continue;
    bump(events.vanish, k.startsWith("R|") ? "round: corner vanished" : "edge: span shrank / arm gone");
  }
}

async function runRecording(name: string): Promise<any> {
  const rl = createInterface({ input: createReadStream(`${SEQ_DIR}/${name}.jsonl.gz`).pipe(createGunzip()), crlfDelay: Infinity });
  let first = true;
  let prevScene: FieldScene | null = null;
  let prevBefore: MapT | null = null;
  let prevLean: MapT | null = null;
  const aggBefore = newAgg();
  const aggLean = newAgg();
  const evBefore = { appear: new Map<string, number>(), vanish: new Map<string, number>() };
  const evLean = { appear: new Map<string, number>(), vanish: new Map<string, number>() };
  let frames = 0;
  let kept = 0;
  let comparedCorners = 0;
  let maxDiff = { V: 0, Q: 0, R: 0, F: 0 };
  let maxDevPx = 0;
  let outCount = 0;
  const outs: any[] = [];
  for await (const line of rl) {
    if (!line) continue;
    if (first) { first = false; continue; }
    frames++;
    const fr = JSON.parse(line) as { i: number; scene: FieldScene };
    fr.scene.look.ctrlArc ??= 0.47;
    if (prevScene && sameScene(prevScene, fr.scene)) continue;
    kept++;
    prevScene = fr.scene;
    const before: any = new FormB(fr.scene);
    const { corners: closed } = closedCorners(before);
    // Agreement (master vs closed), fine-panel cause for outs.
    const masterMap = new Map(before.corners.map((c: any) => [keyOf(c), c]));
    for (const lc of closed) {
      const rc: any = masterMap.get(keyOf(lc));
      if (!rc) { outs.push({ frame: fr.i, key: keyOf(lc), cause: "closed-only corner" }); continue; }
      comparedCorners++;
      const dV = Math.hypot(lc.Vx - rc.Vx, lc.Vy - rc.Vy) / before.h;
      const dQ = Math.hypot(lc.qx - rc.qx, lc.qy - rc.qy) / before.h;
      const dR = Math.abs(lc.r - rc.r) / before.h;
      const dF = Math.max(Math.abs(lc.dA - rc.dA), Math.abs(lc.dB - rc.dB)) / before.h;
      maxDiff.V = Math.max(maxDiff.V, dV); maxDiff.Q = Math.max(maxDiff.Q, dQ);
      maxDiff.R = Math.max(maxDiff.R, dR); maxDiff.F = Math.max(maxDiff.F, dF);
      const dev2 = fr.scene.camera.pxPerUnit * 2;
      maxDevPx = Math.max(maxDevPx, Math.max(dV, dQ, dF) * before.h * dev2, dR * before.h * dev2);
      if (Math.max(dV, dQ, dR, dF) > 0.01) {
        outCount++;
        if (outs.length < 200) {
          const fine = fineR(before, rc) / before.h;
          const closedH = lc.r / before.h;
          const cause = Math.abs(closedH - fine) <= 0.01 ? "converged branch (quadrature/tracked advance in master)" : Math.abs(fine - rc.r / before.h) <= 0.01 ? "closed divergence" : "branch (all three differ)";
          outs.push({ frame: fr.i, key: keyOf(lc), site: `${fr.scene.junctions[lc.j]?.id} arms ${before.arms[lc.a].ei}-${before.arms[lc.b].ei}`, dVH: +fmt(dV, 4), dQH: +fmt(dQ, 4), drH: +fmt(dR, 4), dFeetH: +fmt(dF, 4), rMasterH: +fmt(rc.r / before.h, 4), rClosedH: +fmt(closedH, 4), rFine256H: +fmt(fine, 4), cause });
        }
      }
    }
    for (const rc of before.corners as any[]) if (!closed.some((l: any) => keyOf(l) === keyOf(rc))) { outCount++; if (outs.length < 200) outs.push({ frame: fr.i, key: keyOf(rc), cause: "master-only corner" }); }
    // Motion, corrected, two sets (master-exact and closed-exact).
    const mapB = tracked(before, before.corners, fr.scene);
    const mapL = tracked(before, closed, fr.scene);
    if (prevBefore) compare(prevBefore, mapB, before, aggBefore, evBefore);
    if (prevLean) compare(prevLean, mapL, before, aggLean, evLean);
    prevBefore = mapB;
    prevLean = mapL;
  }
  const res = {
    recording: name, frames, keptDistinct: kept, comparedCorners, outCount,
    maxVH: maxDiff.V, maxQH: maxDiff.Q, maxRH: maxDiff.R, maxFeetH: maxDiff.F, maxDevPxDpr2: maxDevPx,
    outs,
    masterExact: { ...aggBefore, maxExcessDev: +fmt(aggBefore.maxExcessDev, 3), appear: Object.fromEntries(evBefore.appear), vanish: Object.fromEntries(evBefore.vanish) },
    closedExact: { ...aggLean, maxExcessDev: +fmt(aggLean.maxExcessDev, 3), appear: Object.fromEntries(evLean.appear), vanish: Object.fromEntries(evLean.vanish) },
  };
  console.log(`${name}: kept ${kept}, corners compared ${comparedCorners}, max dV ${fmt(maxDiff.V, 7)}h dQ ${fmt(maxDiff.Q, 7)}h dr ${fmt(maxDiff.R, 7)}h dFeet ${fmt(maxDiff.F, 7)}h (${fmt(maxDevPx, 4)} dev px @dpr2), outs ${outCount} (stored ${outs.length})`);
  console.log(`  motion corrected: master-exact over ${aggBefore.over} (edge ${aggBefore.overEdge}/round ${aggBefore.overRound}) maxExcess ${fmt(aggBefore.maxExcessDev, 3)} devpx; closed-exact over ${aggLean.over} (edge ${aggLean.overEdge}/round ${aggLean.overRound}) maxExcess ${fmt(aggLean.maxExcessDev, 3)} devpx`);
  return res;
}

const names = process.argv[2] ? process.argv[2].split(",") : RECORDINGS;
const all: any[] = [];
for (const n of names) all.push(await runRecording(n));
writeFileSync(`${OUT}/recordings_s1c.json`, JSON.stringify(all, null, 1));
writeFileSync(`${OUT}/recordings_s1c.txt`, all.map((r) => `${r.recording}: kept ${r.keptDistinct} compared ${r.comparedCorners} maxV ${r.maxVH}h maxQ ${r.maxQH}h maxR ${r.maxRH}h maxFeet ${r.maxFeetH}h maxDev ${r.maxDevPxDpr2}px outs ${r.outCount}; master-exact over ${r.masterExact.over} maxExcess ${r.masterExact.maxExcessDev}; closed-exact over ${r.closedExact.over} maxExcess ${r.closedExact.maxExcessDev}`).join("\n") + "\n");

