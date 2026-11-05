// K1179 S1d scenes: master's form B re-run on the exact outline
// (Run L's column, re-run not copied), variant (i) and variant (ii),
// on the 12 scenes: criterion 1v (raw + visible), 2, small rounds,
// concave turning, fallback counts, and the agreement with form B.
// Run: npx.cmd vite-node .claude/probes/K1179/s1d/s1d_scenes.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import { loadScene, rootBandEff, SCENES_12 } from "../outline";
import { bareMinK, marginsAt, otherDist } from "../s1b/lib_s1b";
import { classifyS1c, fillChecker, measureExact } from "../s1c/lib_s1c";
import { agreementDev, curvAt, fmt, keyOf, measureVariant, pctile, s1dChecker, s1dCorner, siteOf } from "./lib_s1d";
import type { S1dCorner } from "./lib_s1d";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });

const txt: string[] = [];
const perScene: any[] = [];
const failList: any[] = [];
const agreeList: any[] = []; // every corner over 1 dev px, per variant
const agreeVals: Record<string, number[]> = { v1: [], v2: [] };
let fallback = { v1: 0, v2: 0, total: 0 };

for (const name of SCENES_12) {
  const sc = loadScene(name);
  const fb: any = new FormB(sc);
  const srcOf = (c: any) => ({ j: c.j, a: c.a, b: c.b, theta: c.theta, style: c.style, Vx: c.Vx, Vy: c.Vy, dVa: c.dVa, dVb: c.dVb });
  const v1: S1dCorner[] = fb.corners.map((c: any) => s1dCorner(fb, srcOf(c), 1));
  const v2: S1dCorner[] = fb.corners.map((c: any) => s1dCorner(fb, srcOf(c), 2));
  const v1Map = new Map(v1.map((c) => [keyOf(c), c]));
  const v2Map = new Map(v2.map((c) => [keyOf(c), c]));
  fallback.total += fb.corners.length;
  fallback.v1 += v1.filter((c) => c.fallback).length;
  fallback.v2 += v2.filter((c) => c.fallback).length;
  const buriedM = fillChecker(fb, fb.corners);
  const buried1 = s1dChecker(fb, v1);
  const buried2 = s1dChecker(fb, v2);
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
        failList.push({ col, scene: name, site: siteOf(fb, sc, c), failRaw: m.failRaw, failVisible: m.failVisible, concaveDeg: +fmt((m as any).maxConcaveAnyDeg ?? 0, 3), concave2pxDeg: +fmt((m as any).maxConcave2pxDeg ?? 0, 3), small: (m as any).smallOutside, meets: (m.meets ?? []).filter((mm: any) => mm.jumpDeg > 1) });
      }
    }
    return { fRaw, fVis, feetFail, small, concave, byClass, worstJump, worstAt };
  };
  const aM = agg(fb.corners, (c: any) => {
    const m = measureExact(fb, c, buriedM);
    // Visible under Run H's 0.5 dev px rule: the fill's depth past the
    // crossed edge is -margin (class c) or r + h - D_other (class d).
    const dev2 = sc.camera.pxPerUnit * 2;
    const depthH = Math.max(-marginsAt(fb, c).min / fb.h, 1 + c.r / fb.h - otherDist(fb, c) / fb.h, 0) * fb.h;
    const vis = m.exposed && m.live && m.failA && depthH * dev2 >= 0.5;
    const expS = -Math.sign(fb.arms[c.a].ux * fb.arms[c.b].uy - fb.arms[c.a].uy * fb.arms[c.b].ux) || 1;
    return { failRaw: m.exposed && m.live && m.failA, failVisible: vis, feet: m.feet, meets: m.meets.map((mm) => ({ jumpDeg: mm.jumpDeg, overshootDev: depthH * dev2, cls: classifyS1c(fb, c, false, bareMinK(fb, c, expS)).cls })), worstJump: m.worstJumpDeg, concaveFail: false, smallOutside: false, maxConcaveAnyDeg: 0 };
  }, "master");
  // Master's small rounds, as Run L counted them.
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
  const a1 = agg(v1, (c: S1dCorner) => measureVariant(fb, c, (fb.corners as any[]).find((mc: any) => keyOf(mc) === keyOf(c)), buried1), "v1");
  const a2 = agg(v2, (c: S1dCorner) => measureVariant(fb, c, (fb.corners as any[]).find((mc: any) => keyOf(mc) === keyOf(c)), buried2), "v2");
  // Agreement per corner.
  for (const mc of fb.corners as any[]) {
    for (const [tag, cm] of [["v1", v1Map], ["v2", v2Map]] as const) {
      const c = cm.get(keyOf(mc));
      if (!c) continue;
      const dev = agreementDev(fb, c, mc);
      agreeVals[tag].push(dev);
      if (dev > 1) agreeList.push({ variant: tag, scene: name, site: siteOf(fb, sc, mc), devPx: +fmt(dev, 3), theta: +fmt(mc.theta, 4), curvA: +fmt(curvAt(fb, c.a, c.dFootA), 4), curvB: +fmt(curvAt(fb, c.b, c.dFootB), 4), g: +fmt(c.g, 4), cap: +fmt(c.cap, 4), steep: +fmt(c.steep, 4), marginGate: +fmt(c.marginGate, 4), fallback: c.fallback, kind: c.kind });
    }
  }
  const row = { scene: name, corners: fb.corners.length, master: aM, v1: a1, v2: a2 };
  perScene.push(row);
  txt.push(`${name}: corners ${row.corners}; master 1v raw/vis ${aM.fRaw}/${aM.fVis} feet ${aM.feetFail}; v1 raw/vis ${a1.fRaw}/${a1.fVis} feet ${a1.feetFail} small ${a1.small} concave ${a1.concave}; v2 raw/vis ${a2.fRaw}/${a2.fVis} feet ${a2.feetFail} small ${a2.small} concave ${a2.concave}`);
  console.log(txt[txt.length - 1]);
}
const tot = (k: "master" | "v1" | "v2") => perScene.reduce((s, r) => ({
  fRaw: s.fRaw + r[k].fRaw, fVis: s.fVis + r[k].fVis, feetFail: s.feetFail + r[k].feetFail,
  small: s.small + (r[k].small ?? 0), concave: s.concave + (r[k].concave ?? 0),
}), { fRaw: 0, fVis: 0, feetFail: 0, small: 0, concave: 0 });
const classTot: Record<string, Record<string, { raw: number; vis: number }>> = {};
for (const r of perScene) for (const k of ["master", "v1", "v2"]) for (const [cls, v] of Object.entries<any>(r[k].byClass)) {
  classTot[k] ??= {}; classTot[k][cls] ??= { raw: 0, vis: 0 };
  classTot[k][cls].raw += v.raw; classTot[k][cls].vis += v.vis;
}
const agreeSummary: Record<string, any> = {};
for (const tag of ["v1", "v2"]) {
  const xs = agreeVals[tag];
  agreeSummary[tag] = { n: xs.length, p50: +fmt(pctile(xs, 0.5), 4), p95: +fmt(pctile(xs, 0.95), 4), max: +fmt(Math.max(...xs), 4), over1: xs.filter((x) => x > 1).length };
}
writeFileSync(`${OUT}/scenes_s1d.json`, JSON.stringify({ perScene, totals: { master: tot("master"), v1: tot("v1"), v2: tot("v2") }, classTot, fallback, agreeSummary, agreeList, failList }, null, 1));
txt.push(`TOTALS master ${JSON.stringify(tot("master"))} v1 ${JSON.stringify(tot("v1"))} v2 ${JSON.stringify(tot("v2"))}; classes ${JSON.stringify(classTot)}; fallback ${JSON.stringify(fallback)}; agreement ${JSON.stringify(agreeSummary)}`);
writeFileSync(`${OUT}/scenes_s1d.txt`, txt.join("\n") + "\n");
console.log(txt[txt.length - 1]);
