// K1179 S1e scenes: master's form B re-run on the exact outline
// (Run H's column, re-run not copied), variants (i) K=32 and (ii) K=8,
// on the 12 scenes: criterion 1v (raw + visible, per class), 2, small
// rounds, concave turning, node-fallback counts, and agreement with
// form B (gated: corners where master itself fails 1v are reported
// apart and left out of the gate).
// Run: npx.cmd vite-node .claude/probes/K1179/s1e/s1e_scenes.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import { loadScene, rootBandEff, SCENES_12 } from "../outline";
import { bareMinK, marginsAt, otherDist } from "../s1b/lib_s1b";
import { classifyS1c, fillChecker, measureExact } from "../s1c/lib_s1c";
import { agreementDev, measureVariant, s1dChecker } from "../s1d/lib_s1d";
import { curvAt, fmt, keyOf, pctile, s1eCorner, siteOf } from "./lib_s1e";
import type { S1eCorner } from "./lib_s1e";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });

const txt: string[] = [];
const perScene: any[] = [];
const failList: any[] = [];
const agreeList: any[] = []; // gated corners over 2 dev px, per variant
const agreeListApart: any[] = []; // master-1v-failing corners over 2 dev px
const agreeVals: Record<string, number[]> = { k32: [], k8: [] };
const agreeValsApart: Record<string, number[]> = { k32: [], k8: [] };
let fallbackCount = { k32: 0, k8: 0, nullCount: { k32: 0, k8: 0 }, total: 0 };
const fallbackList: any[] = [];
const smallCensus: Record<string, { candidates: number; inSlack: number; beyond: number; inRoot: number; outside: number; outsideLive: number; outsideNull: number }> = {
  k32: { candidates: 0, inSlack: 0, beyond: 0, inRoot: 0, outside: 0, outsideLive: 0, outsideNull: 0 },
  k8: { candidates: 0, inSlack: 0, beyond: 0, inRoot: 0, outside: 0, outsideLive: 0, outsideNull: 0 },
};
let liveCount = { master: 0, k32: 0, k8: 0 };

for (const name of SCENES_12) {
  const sc = loadScene(name);
  const fb: any = new FormB(sc);
  const srcOf = (c: any) => ({ j: c.j, a: c.a, b: c.b, theta: c.theta, style: c.style, Vx: c.Vx, Vy: c.Vy, dVa: c.dVa, dVb: c.dVb });
  const winCache = new Map();
  const v32: S1eCorner[] = fb.corners.map((c: any) => s1eCorner(fb, srcOf(c), 32, undefined, { winCache }));
  const v8: S1eCorner[] = fb.corners.map((c: any) => s1eCorner(fb, srcOf(c), 8, undefined, { winCache }));
  const m32 = new Map(v32.map((c) => [keyOf(c), c]));
  const m8 = new Map(v8.map((c) => [keyOf(c), c]));
  fallbackCount.total += fb.corners.length;
  fallbackCount.k32 += v32.filter((c) => c.nodeFallback).length;
  fallbackCount.k8 += v8.filter((c) => c.nodeFallback).length;
  fallbackCount.nullCount.k32 += v32.filter((c) => c.nodeFallback && !c.live).length;
  fallbackCount.nullCount.k8 += v8.filter((c) => c.nodeFallback && !c.live).length;
  liveCount.k32 += v32.filter((c) => c.live).length;
  liveCount.k8 += v8.filter((c) => c.live).length;
  liveCount.master += (fb.corners as any[]).filter((c: any) => c.r > 1e-12 && c.omega > 0).length;
  for (const [tag, arr] of [["k32", v32], ["k8", v8]] as const) {
    for (const c of arr) if (c.nodeFallback) fallbackList.push({ variant: tag, scene: name, site: siteOf(fb, sc, c), fallbackToK: c.fallbackToK, live: c.live, rH: +fmt(c.r / fb.h, 4), rEffH: +fmt(c.rEff / fb.h, 4), theta: +fmt(c.theta, 4) });
    const masterByKey = new Map((fb.corners as any[]).map((mc: any) => [keyOf(mc), mc]));
    for (const c of arr) {
      const mc = masterByKey.get(keyOf(c));
      if (!mc || !(mc.r0 >= fb.h)) continue;
      const effArc = c.live ? Math.max(c.walkA.arcOf(c.Fa.x, c.Fa.y), c.walkB.arcOf(c.Fb.x, c.Fb.y)) : 0;
      const rEq = effArc * Math.tan(c.theta / 2);
      if (!(rEq < 0.25 * fb.h)) continue;
      const cs = smallCensus[tag];
      cs.candidates++;
      const rb = rootBandEff(fb, c.theta);
      const inSlack = c.slack <= 0.5 * fb.h;
      const beyond = c.beyondA || c.beyondB;
      const inRoot = Math.min(c.dVa, c.dVb) < rb;
      if (inSlack) cs.inSlack++;
      if (beyond) cs.beyond++;
      if (inRoot) cs.inRoot++;
      if (!inSlack && !beyond && !inRoot) { cs.outside++; if (c.live) cs.outsideLive++; else cs.outsideNull++; }
    }
  }

  // master measures (exact) + fail flags for the agreement gate
  const buriedM = fillChecker(fb, fb.corners);
  const masterMeas = new Map<string, any>();
  for (const c of fb.corners as any[]) masterMeas.set(keyOf(c), measureExact(fb, c, buriedM));
  const buried32 = s1dChecker(fb, v32 as any);
  const buried8 = s1dChecker(fb, v8 as any);

  const agg = (corners: any[], measurer: (c: any) => any, col: string) => {
    let fRaw = 0, fVis = 0, feetFail = 0, small = 0, concave = 0;
    const byClass: Record<string, { raw: number; vis: number }> = {};
    let worstJump = 0, worstAt = "";
    for (const c of corners) {
      const m = measurer(c);
      if (m.failRaw) fRaw++;
      if (m.failVisible) fVis++;
      if ((m as any).concaveFail) concave++;
      if ((m as any).smallOutside) small++;
      for (const f of m.feet) if (f.fail) feetFail++;
      const meets = (m as any).meets as any[] | undefined;
      if (meets) for (const mm of meets) {
        if (mm.jumpDeg <= 1) continue;
        byClass[mm.cls] ??= { raw: 0, vis: 0 };
        byClass[mm.cls].raw++;
        if (mm.overshootDev >= 0.5) byClass[mm.cls].vis++;
      }
      const wj = (m as any).worstJumpDeg ?? (m as any).worstJump ?? 0;
      if (wj > worstJump) { worstJump = wj; worstAt = siteOf(fb, sc, c); }
      if (col !== "master" && (m.failRaw || m.failVisible || (m as any).concaveFail || (m as any).smallOutside)) {
        failList.push({ col, scene: name, site: siteOf(fb, sc, c), failRaw: m.failRaw, failVisible: m.failVisible, concaveDeg: +fmt((m as any).maxConcaveAnyDeg ?? 0, 3), small: (m as any).smallOutside, meets: (m.meets ?? []).filter((mm: any) => mm.jumpDeg > 1) });
      }
    }
    return { fRaw, fVis, feetFail, small, concave, byClass, worstJump, worstAt };
  };

  const aM = agg(fb.corners, (c: any) => {
    const m = masterMeas.get(keyOf(c));
    const dev2 = sc.camera.pxPerUnit * 2;
    const depthH = Math.max(-marginsAt(fb, c).min / fb.h, 1 + c.r / fb.h - otherDist(fb, c) / fb.h, 0) * fb.h;
    const vis = m.exposed && m.live && m.failA && depthH * dev2 >= 0.5;
    const expS = -Math.sign(fb.arms[c.a].ux * fb.arms[c.b].uy - fb.arms[c.a].uy * fb.arms[c.b].ux) || 1;
    return { failRaw: m.exposed && m.live && m.failA, failVisible: vis, feet: m.feet, meets: m.meets.map((mm: any) => ({ jumpDeg: mm.jumpDeg, overshootDev: depthH * dev2, cls: classifyS1c(fb, c, false, bareMinK(fb, c, expS)).cls })), worstJump: m.worstJumpDeg, concaveFail: false, smallOutside: false, maxConcaveAnyDeg: 0 };
  }, "master");
  let smallM = 0;
  for (const c of fb.corners as any[]) {
    if (!(c.r0 >= fb.h && c.r < 0.25 * fb.h)) continue;
    const rb = rootBandEff(fb, c.theta);
    if (c.dA > fb.arms[c.a].L + 1e-9 || c.dB > fb.arms[c.b].L + 1e-9) continue;
    if (c.room <= 0.5 * fb.h) continue;
    if (Math.min(c.dVa, c.dVb) < rb) continue;
    if (c.omega <= 0) continue;
    smallM++;
  }
  aM.small = smallM;
  const masterOf = (c: S1eCorner) => (fb.corners as any[]).find((mc: any) => keyOf(mc) === keyOf(c));
  const a32 = agg(v32, (c: S1eCorner) => measureVariant(fb, c as any, masterOf(c), buried32), "k32");
  const a8 = agg(v8, (c: S1eCorner) => measureVariant(fb, c as any, masterOf(c), buried8), "k8");

  for (const mc of fb.corners as any[]) {
    const mm = masterMeas.get(keyOf(mc));
    const masterFails1v = !!(mm && mm.exposed && mm.live && mm.failA);
    for (const [tag, cm] of [["k32", m32], ["k8", m8]] as const) {
      const c = cm.get(keyOf(mc));
      if (!c) continue;
      const dev = agreementDev(fb, c as any, mc);
      if (masterFails1v) {
        agreeValsApart[tag].push(dev);
        if (dev > 2) agreeListApart.push({ variant: tag, scene: name, site: siteOf(fb, sc, mc), devPx: +fmt(dev, 3), theta: +fmt(mc.theta, 4), masterFails1v: true });
      } else {
        agreeVals[tag].push(dev);
        if (dev > 2) agreeList.push({ variant: tag, scene: name, site: siteOf(fb, sc, mc), devPx: +fmt(dev, 3), theta: +fmt(mc.theta, 4), curvA: +fmt(curvAt(fb, c.a, c.dFootA), 4), curvB: +fmt(curvAt(fb, c.b, c.dFootB), 4), limitingFactor: c.limitingFactor, limitingK: c.limitingK, rMasterH: +fmt(mc.r / fb.h, 4), rS1eH: +fmt(c.r / fb.h, 4), rEffH: +fmt(c.rEff / fb.h, 4), nodeFallback: c.nodeFallback, fallbackToK: c.fallbackToK });
      }
    }
  }
  const row = { scene: name, corners: fb.corners.length, master: aM, k32: a32, k8: a8 };
  perScene.push(row);
  txt.push(`${name}: corners ${row.corners}; master 1v raw/vis ${aM.fRaw}/${aM.fVis} feet ${aM.feetFail}; k32 raw/vis ${a32.fRaw}/${a32.fVis} feet ${a32.feetFail} small ${a32.small} concave ${a32.concave}; k8 raw/vis ${a8.fRaw}/${a8.fVis} feet ${a8.feetFail} small ${a8.small} concave ${a8.concave}`);
  console.log(txt[txt.length - 1]);
}
const tot = (k: "master" | "k32" | "k8") => perScene.reduce((s, r) => ({
  fRaw: s.fRaw + r[k].fRaw, fVis: s.fVis + r[k].fVis, feetFail: s.feetFail + r[k].feetFail,
  small: s.small + (r[k].small ?? 0), concave: s.concave + (r[k].concave ?? 0),
}), { fRaw: 0, fVis: 0, feetFail: 0, small: 0, concave: 0 });
const classTot: Record<string, Record<string, { raw: number; vis: number }>> = {};
for (const r of perScene) for (const k of ["master", "k32", "k8"]) for (const [cls, v] of Object.entries<any>(r[k].byClass)) {
  classTot[k] ??= {}; classTot[k][cls] ??= { raw: 0, vis: 0 };
  classTot[k][cls].raw += v.raw; classTot[k][cls].vis += v.vis;
}
const summ = (xs: number[]) => ({ n: xs.length, p50: +fmt(pctile(xs, 0.5), 4), p95: +fmt(pctile(xs, 0.95), 4), max: xs.length ? +fmt(Math.max(...xs), 4) : 0, over1: xs.filter((x) => x > 1).length, over2: xs.filter((x) => x > 2).length });
const agreeSummary = { k32: summ(agreeVals.k32), k8: summ(agreeVals.k8) };
const agreeApart = { k32: summ(agreeValsApart.k32), k8: summ(agreeValsApart.k8) };
writeFileSync(`${OUT}/scenes_s1e.json`, JSON.stringify({ perScene, totals: { master: tot("master"), k32: tot("k32"), k8: tot("k8") }, classTot, fallbackCount, fallbackList, smallCensus, liveCount, agreeSummary, agreeApart, agreeList, agreeListApart, failList }, null, 1));
txt.push(`TOTALS master ${JSON.stringify(tot("master"))} k32 ${JSON.stringify(tot("k32"))} k8 ${JSON.stringify(tot("k8"))}; classes ${JSON.stringify(classTot)}; fallback ${JSON.stringify(fallbackCount)}; smallCensus ${JSON.stringify(smallCensus)}; live ${JSON.stringify(liveCount)}; agreementGated ${JSON.stringify(agreeSummary)}; agreementApart ${JSON.stringify(agreeApart)}`);
writeFileSync(`${OUT}/scenes_s1e.txt`, txt.join("\n") + "\n");
console.log(txt[txt.length - 1]);
