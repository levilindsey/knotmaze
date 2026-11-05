// K1179 S1b scenes: tasks 1, 2, 5 and the scene half of tasks 3-4 over
// the 12 K868 scenes. Three corner sets per scene: Run I's form B
// (before), task 2's reference (margin band [0, 0.05h]), the lean solve.
// Run: npx.cmd vite-node .claude/probes/K1179/s1b/s1b_scenes.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import { candidates as candFnDirect, pointAt } from "../../../../src/render/field/geom";
const candMod = { candidates: candFnDirect };
import { cornerSequence, edgeOutlinePoints, footMetric, isBuried, loadScene, menger, rootBandEff, SCENES_12 } from "../outline";
import { FormB as FormBRef } from "./form_b_ref";
import { leanCorners } from "./lean";
import { bareMinK, fillChecker, fmt, gateFactors, isBuriedUnion, marginsAt, minCurv, otherDist, pctile, resampleParts } from "./lib_s1b";
import type { SPt } from "./lib_s1b";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });

const keyOf = (c: any) => `${c.j}|${c.a}-${c.b}`;
interface FootRec { which: string; gapDev: number; jumpDeg: number; fail: boolean; buried: boolean; tubeOwn: boolean | null; fillOnly: boolean }
interface CornerRec {
  key: string; scene: string; junction: string; arms: string; thetaDeg: number; rH: number; r0H: number;
  exposed: boolean; runIMinK: number; corrArcMinK: number; corrEdgeExcessMin: number; corrFail: boolean;
  bareMinK: number; marginMinH: number; otherH: number; feet: FootRec[]; footFail: boolean;
  cls?: string; clsDetail?: string;
}

function bareSeqKs(fb: any, ai: number, dF: number, tx: number, ty: number, reverse: boolean, expectedSign: number): { pts: SPt[]; ks: number[] } {
  const h = fb.h;
  const a = fb.arms[ai];
  const at0 = pointAt(fb.polys[a.pi], a.sR + a.dir * dF);
  const ux = at0.tx * a.dir;
  const uy = at0.ty * a.dir;
  const nx = -uy;
  const ny = ux;
  const dPlus = Math.hypot(at0.x + nx * h - tx, at0.y + ny * h - ty);
  const dMinus = Math.hypot(at0.x - nx * h - tx, at0.y - ny * h - ty);
  const side = dPlus <= dMinus ? 1 : -1;
  let raw = edgeOutlinePoints(fb, ai, side, Math.max(0, dF - 0.15 * h), dF + 0.15 * h);
  if (reverse) raw = raw.reverse();
  const uni = resampleParts(raw.map((p) => ({ ...p, part: "edge" })), 0.01 * h);
  const ks = uni.map((_, i) => {
    const p0 = uni[Math.max(0, i - 5)];
    const p1 = uni[i];
    const p2 = uni[Math.min(uni.length - 1, i + 5)];
    if (p0 === p1 || p1 === p2) return Infinity;
    return (menger(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y) / expectedSign) * h;
  });
  return { pts: uni, ks };
}

function measureSet(sceneName: string, fb: any, corners: any[], sc: any): CornerRec[] {
  const h = fb.h;
  const dev = fb.ppuDev;
  const buried = fillChecker(fb, corners);
  const recs: CornerRec[] = [];
  for (const c of corners) {
    const jid = sc.junctions[c.j]?.id ?? `j${c.j}`;
    const arms = `${fb.arms[c.a].ei}-${fb.arms[c.b].ei}`;
    const exposed = c.r > 1e-12 && c.omega > 0 && c.dA <= fb.arms[c.a].L + 1e-9 && c.dB <= fb.arms[c.b].L + 1e-9;
    const seq = cornerSequence(fb, c);
    let runIMinK = Infinity;
    let corrArcMinK = Infinity;
    let corrEdgeExcessMin = Infinity;
    if (exposed) {
      // Run I's form: tube burial only, bare curvature counted.
      const uniI = resampleParts(seq.pts.filter((p) => !isBuried(fb, p.x, p.y)).map((p) => ({ x: p.x, y: p.y, part: p.part })), 0.01 * h);
      runIMinK = minCurv(uniI, seq.expectedSign, h).minK;
      // Corrected: union burial (tubes + fills), per-point bare comparison
      // on the 0.1h edge parts, arc held to -0.01/h.
      const expC = seq.pts.filter((p) => !buried(p.x, p.y));
      const uniC = resampleParts(expC.map((p) => ({ x: p.x, y: p.y, part: p.part })), 0.01 * h);
      const ks = uniC.map((_, i) => {
        const p0 = uniC[Math.max(0, i - 5)];
        const p1 = uniC[i];
        const p2 = uniC[Math.min(uniC.length - 1, i + 5)];
        if (p0 === p1 || p1 === p2) return Infinity;
        return (menger(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y) / seq.expectedSign) * h;
      });
      const bareA = bareSeqKs(fb, c.a, c.dA, c.tax, c.tay, true, seq.expectedSign);
      const bareB = bareSeqKs(fb, c.b, c.dB, c.tbx, c.tby, false, seq.expectedSign);
      const bareAt = (p: SPt, which: "A" | "B"): number => {
        const bs = which === "A" ? bareA : bareB;
        let best = Infinity;
        let bk = Infinity;
        for (let i = 0; i < bs.pts.length; i++) {
          const d = Math.hypot(bs.pts[i].x - p.x, bs.pts[i].y - p.y);
          if (d < best) { best = d; bk = bs.ks[i]; }
        }
        return bk;
      };
      uniC.forEach((p, i) => {
        const k = ks[i];
        if (!Number.isFinite(k)) return;
        if (p.part === "arc") corrArcMinK = Math.min(corrArcMinK, k);
        else {
          const bk = bareAt(p, p.part === "edgeA" ? "A" : "B");
          if (Number.isFinite(bk)) corrEdgeExcessMin = Math.min(corrEdgeExcessMin, k - bk);
        }
      });
    }
    const corrFail = exposed && (corrArcMinK < -0.01 || corrEdgeExcessMin < -0.01);
    // Feet (criterion 2), live rounds only, as Run I gated them.
    const feet: FootRec[] = [];
    let footFail = false;
    if (exposed && c.r >= 0.05 * h) {
      for (const which of ["A", "B"] as const) {
        const m = footMetric(fb, c, which);
        const gapDev = m.gapWorld * dev;
        const tx = which === "A" ? c.tax : c.tbx;
        const ty = which === "A" ? c.tay : c.tby;
        const isBur = buried(tx, ty);
        const tube = isBuried(fb, tx, ty);
        const fail = !isBur && (gapDev > 0.05 || m.jumpDeg > 1);
        if (fail) footFail = true;
        // Who buries the foot, when a tube does: its own arm's fold (b)
        // or another arm's / chain's tube (d)?
        let tubeOwn: boolean | null = null;
        if (tube) {
          tubeOwn = false;
          const outC: any[] = [];
          const { candidates: candFn } = candMod;
          candFn(fb.grid, tx, ty, fb.h, outC);
          for (const cd of outC) {
            if (cd.d >= fb.h - 1e-7) continue;
            for (const ai of [c.a, c.b]) {
              const arm = fb.arms[ai];
              if (arm.pi !== cd.chain) continue;
              const dd = fb.armDist(ai, cd.s);
              if (dd >= -1e-9 && dd <= arm.L + 1e-9) tubeOwn = true;
            }
          }
        }
        feet.push({ which, gapDev, jumpDeg: m.jumpDeg, fail, buried: isBur, tubeOwn, fillOnly: isBur && !tube });
      }
    }
    recs.push({
      key: keyOf(c), scene: sceneName, junction: String(jid), arms,
      thetaDeg: (c.theta * 180) / Math.PI, rH: c.r / h, r0H: c.r0 / h, exposed,
      runIMinK, corrArcMinK, corrEdgeExcessMin, corrFail,
      bareMinK: exposed ? bareMinK(fb, c, seq.expectedSign) : Infinity,
      marginMinH: marginsAt(fb, c).min / h, otherH: otherDist(fb, c) / h,
      feet, footFail,
    });
  }
  return recs;
}
void isBuriedUnion;

// ---- classification of Run I's failures (task 1) -------------------------
function classify(r: CornerRec, kind: "cusp" | "foot", foot?: FootRec): { cls: string; detail: string } {
  if (kind === "cusp") {
    if (!r.corrFail) return { cls: "a", detail: "passes under union burial + bare-adjusted edge test" };
    if (r.marginMinH < -1e-9) return { cls: "c", detail: `margin min ${fmt(r.marginMinH, 4)}h at q (own arms)` };
    if (r.otherH < 1 + r.rH - 1e-9) return { cls: "d", detail: `other centreline ${fmt(r.otherH, 3)}h from q vs h+r ${fmt(1 + r.rH, 3)}h` };
    if (r.bareMinK < -0.01) return { cls: "b", detail: `bare edge min k*h ${fmt(r.bareMinK, 3)}` };
    return { cls: "e", detail: `arc min ${fmt(r.corrArcMinK, 3)}, edge excess ${fmt(r.corrEdgeExcessMin, 3)}, bare ${fmt(r.bareMinK, 3)}, margin ${fmt(r.marginMinH, 4)}h` };
  }
  // Feet: same letters, tested at the failing foot itself.
  if (foot?.fillOnly) return { cls: "a", detail: "tangent point under a round's fill (not in a tube)" };
  if (foot?.buried && foot.tubeOwn) return { cls: "b", detail: "tangent point inside its own arms' tube (a fold/bend of the bare tube)" };
  if (foot?.buried && !foot.tubeOwn) return { cls: "d", detail: "tangent point inside another arm's or chain's tube" };
  if (r.marginMinH < -1e-9) return { cls: "c", detail: `margin min ${fmt(r.marginMinH, 4)}h at q (own arms)` };
  if (r.otherH < 1 + r.rH - 1e-9) return { cls: "d", detail: `other centreline ${fmt(r.otherH, 3)}h from q` };
  if (r.bareMinK < -0.35) return { cls: "b", detail: `bare edge min k*h ${fmt(r.bareMinK, 3)} (vertex/bend at the foot)` };
  return { cls: "e", detail: `bare ${fmt(r.bareMinK, 3)}, margin ${fmt(r.marginMinH, 4)}h, other ${fmt(r.otherH, 3)}h` };
}

// ---- main -----------------------------------------------------------------
const txt: string[] = [];
const perScene: any[] = [];
const cuspClassified: any[] = [];
const footClassified: any[] = [];
const refCuspClassified: any[] = [];
const refFootClassified: any[] = [];
const cureRows: any[] = [];
const smallOutside: any[] = [];
const leanOuts: any[] = [];
let leanMax = { V: 0, Q: 0, R: 0, F: 0 };
let leanCompared = 0;
let drAll: number[] = [];
let omegaMin = Infinity;
let omegaMax = -Infinity;

for (const name of SCENES_12) {
  const sc = loadScene(name);
  const before: any = new FormB(sc);
  const ref: any = new FormBRef(sc);
  const lean = leanCorners(ref);
  const sets: Record<string, CornerRec[]> = {
    before: measureSet(name, before, before.corners, sc),
    ref: measureSet(name, ref, ref.corners, sc),
    lean: measureSet(name, ref, lean, sc),
  };
  // Task 2: r movement before -> ref, matched by corner key.
  const bMap = new Map(before.corners.map((c: any) => [keyOf(c), c]));
  const drScene: number[] = [];
  let sceneMaxDR = 0;
  let sceneMaxAt = "";
  for (const rc of ref.corners as any[]) {
    omegaMin = Math.min(omegaMin, rc.omega);
    omegaMax = Math.max(omegaMax, rc.omega);
    const bc: any = bMap.get(keyOf(rc));
    if (!bc) continue;
    const dr = (rc.r - bc.r) / ref.h;
    drScene.push(dr);
    drAll.push(dr);
    if (Math.abs(dr) > Math.abs(sceneMaxDR)) { sceneMaxDR = dr; sceneMaxAt = `${sc.junctions[rc.j]?.id} ${ref.arms[rc.a].ei}-${ref.arms[rc.b].ei}`; }
  }
  // Lean agreement (task 3, scenes part).
  const refMap = new Map(ref.corners.map((c: any) => [keyOf(c), c]));
  for (const lc of lean) {
    const rc: any = refMap.get(keyOf(lc));
    if (!rc) { leanOuts.push({ scene: name, key: keyOf(lc), cause: "lean-only corner" }); continue; }
    leanCompared++;
    const dV = Math.hypot(lc.Vx - rc.Vx, lc.Vy - rc.Vy) / ref.h;
    const dQ = Math.hypot(lc.qx - rc.qx, lc.qy - rc.qy) / ref.h;
    const dR = Math.abs(lc.r - rc.r) / ref.h;
    const dF = Math.max(Math.abs(lc.dA - rc.dA), Math.abs(lc.dB - rc.dB)) / ref.h;
    leanMax.V = Math.max(leanMax.V, dV); leanMax.Q = Math.max(leanMax.Q, dQ);
    leanMax.R = Math.max(leanMax.R, dR); leanMax.F = Math.max(leanMax.F, dF);
    if (Math.max(dV, dQ, dR, dF) > 0.01) leanOuts.push({ scene: name, key: keyOf(lc), dV, dQ, dR, dF });
  }
  for (const rc of ref.corners as any[]) if (!lean.some((l: any) => keyOf(l) === keyOf(rc))) leanOuts.push({ scene: name, key: keyOf(rc), cause: "ref-only corner" });
  // Classification: Run I-form failures of the before set.
  for (const r of sets.before) {
    if (r.exposed && r.runIMinK < -0.01) {
      const cl = classify(r, "cusp");
      cuspClassified.push({ scene: name, junction: r.junction, arms: r.arms, thetaDeg: +fmt(r.thetaDeg, 1), rH: +fmt(r.rH, 3), runIMinK: +fmt(r.runIMinK, 3), corrArcMinK: +fmt(r.corrArcMinK, 3), corrEdgeExcessMin: +fmt(r.corrEdgeExcessMin, 3), ...cl });
    }
    // Run I's foot failures: gap or jump over gate, buried or not.
    for (const f of r.feet) if (f.gapDev > 0.05 || f.jumpDeg > 1) {
      const cl = classify(r, "foot", f);
      footClassified.push({ scene: name, junction: r.junction, arms: r.arms, at: f.which, gapDev: +fmt(f.gapDev, 3), jumpDeg: +fmt(f.jumpDeg, 2), buried: f.buried, ...cl });
    }
  }
  // Task 2: the reference's own failures, classified the same way, and
  // whether each before failure is cured (corrected pass) at the ref.
  const refBySite = new Map(sets.ref.map((r) => [`${r.junction}|${r.arms}`, r]));
  for (const r of sets.ref) {
    if (r.exposed && r.runIMinK < -0.01) refCuspClassified.push({ scene: name, junction: r.junction, arms: r.arms, ...classify(r, "cusp") });
    for (const f of r.feet) if (f.gapDev > 0.05 || f.jumpDeg > 1) refFootClassified.push({ scene: name, junction: r.junction, arms: r.arms, at: f.which, ...classify(r, "foot", f) });
  }
  for (const r of sets.before) {
    const rr = refBySite.get(`${r.junction}|${r.arms}`);
    if (r.exposed && r.runIMinK < -0.01) cureRows.push({ kind: "cusp", scene: name, junction: r.junction, arms: r.arms, cls: classify(r, "cusp").cls, cured: rr ? !rr.corrFail : false });
  }
  // Small rounds outside null bands (task 5 input), from the before set.
  for (const c of before.corners as any[]) {
    if (!(c.r0 >= before.h && c.r < 0.25 * before.h)) continue;
    const rb = rootBandEff(before, c.theta);
    const reasons: string[] = [];
    if (c.dA > before.arms[c.a].L + 1e-9 || c.dB > before.arms[c.b].L + 1e-9) reasons.push("foot past span");
    if (c.room <= 0.5 * before.h) reasons.push("cap band");
    if (Math.min(c.dVa, c.dVb) < rb) reasons.push("root band");
    if (c.omega <= 0) reasons.push("omega=0");
    if (reasons.length) continue;
    const gf = gateFactors(before, c);
    const rc: any = refMap.get(keyOf(c));
    smallOutside.push({
      scene: name, junction: String(sc.junctions[c.j]?.id), arms: `${before.arms[c.a].ei}-${before.arms[c.b].ei}`,
      thetaDeg: +fmt((c.theta * 180) / Math.PI, 1), rH: +fmt(c.r / before.h, 4), r0H: +fmt(c.r0 / before.h, 3),
      refRH: rc ? +fmt(rc.r / ref.h, 4) : null, roomH: +fmt(c.room / before.h, 3),
      mAH: +fmt(gf.mAH, 4), mBH: +fmt(gf.mBH, 4), marginOld: +fmt(gf.marginOld, 3), marginNew: +fmt(gf.marginNew, 3),
      steep: +fmt(gf.steep, 3), cap: +fmt(gf.cap, 3), root: +fmt(gf.root, 3), slackH: +fmt(gf.slackH, 3),
    });
  }
  const agg = (recs: CornerRec[]) => ({
    corners: recs.length, exposed: recs.filter((r) => r.exposed).length,
    runICusp: recs.filter((r) => r.exposed && r.runIMinK < -0.01).length,
    corrCusp: recs.filter((r) => r.corrFail).length,
    corrWorstArc: +fmt(Math.min(...recs.map((r) => r.corrArcMinK)), 3),
    corrWorstEdgeExcess: +fmt(Math.min(...recs.map((r) => r.corrEdgeExcessMin)), 3),
    footFail: recs.reduce((n, r) => n + r.feet.filter((f) => f.fail).length, 0),
    footBuried: recs.reduce((n, r) => n + r.feet.filter((f) => f.buried).length, 0),
    footWorstGapDev: +fmt(Math.max(0, ...recs.flatMap((r) => r.feet.map((f) => f.gapDev))), 3),
    footWorstJumpDeg: +fmt(Math.max(0, ...recs.flatMap((r) => r.feet.map((f) => f.jumpDeg))), 2),
  });
  const row = { scene: name, before: agg(sets.before), ref: agg(sets.ref), lean: agg(sets.lean), drMoved001: drScene.filter((d) => Math.abs(d) > 0.01).length, drMax: +fmt(sceneMaxDR, 4), drMaxAt: sceneMaxAt, drN: drScene.length };
  perScene.push(row);
  txt.push(`${name}: cusp RunI ${row.before.runICusp} -> corrected before ${row.before.corrCusp} / ref ${row.ref.corrCusp} / lean ${row.lean.corrCusp}; feet fail ${row.before.footFail}/${row.ref.footFail}/${row.lean.footFail} (buried ${row.before.footBuried}/${row.ref.footBuried}/${row.lean.footBuried}); dr moved ${row.drMoved001}/${row.drN} max ${fmt(sceneMaxDR, 3)}h at ${sceneMaxAt}`);
  console.log(txt[txt.length - 1]);
}
const classCount = (rows: any[]) => {
  const m: Record<string, number> = {};
  for (const r of rows) m[r.cls] = (m[r.cls] ?? 0) + 1;
  return m;
};
const worstOf = (rows: any[], cls: string, score: (r: any) => number) => rows.filter((r) => r.cls === cls).sort((x, y) => score(y) - score(x))[0] ?? null;
const cureByClass = (): Record<string, { n: number; cured: number }> => {
  const m: Record<string, { n: number; cured: number }> = {};
  for (const r of cureRows) {
    m[r.cls] ??= { n: 0, cured: 0 };
    m[r.cls].n++;
    if (r.cured) m[r.cls].cured++;
  }
  return m;
};
const summary = {
  perScene, cuspClasses: classCount(cuspClassified), footClasses: classCount(footClassified),
  refCuspClasses: classCount(refCuspClassified), refFootClasses: classCount(refFootClassified), cureByClass: cureByClass(),
  cuspWorstPerClass: ["a", "b", "c", "d", "e"].map((cls) => ({ cls, worst: worstOf(cuspClassified, cls, (r) => -r.runIMinK) })),
  footWorstPerClass: ["a", "b", "c", "d", "e"].map((cls) => ({ cls, worst: worstOf(footClassified, cls, (r) => Math.max(r.gapDev / 0.05, r.jumpDeg)) })),
  dr: { n: drAll.length, moved001: drAll.filter((d) => Math.abs(d) > 0.01).length, absP50H: +fmt(pctile(drAll.map(Math.abs), 0.5), 5), absP90H: +fmt(pctile(drAll.map(Math.abs), 0.9), 4), absP99H: +fmt(pctile(drAll.map(Math.abs), 0.99), 4), absMaxH: +fmt(Math.max(...drAll.map(Math.abs)), 4) },
  omegaRef: { min: +fmt(omegaMin, 4), max: +fmt(omegaMax, 4) },
  lean: { compared: leanCompared, maxVh: +fmt(leanMax.V, 6), maxQh: +fmt(leanMax.Q, 6), maxRh: +fmt(leanMax.R, 6), maxFeetH: +fmt(leanMax.F, 6), outs: leanOuts },
  smallOutside,
};
writeFileSync(`${OUT}/scenes_s1b.json`, JSON.stringify({ summary, cuspClassified, footClassified, refCuspClassified, refFootClassified, cureRows }, null, 1));
txt.push(`\nCusp classes ${JSON.stringify(summary.cuspClasses)}; foot classes ${JSON.stringify(summary.footClasses)}; ref cusp classes ${JSON.stringify(summary.refCuspClasses)}; ref foot classes ${JSON.stringify(summary.refFootClasses)}; cure ${JSON.stringify(summary.cureByClass)}`);
txt.push(`dr |.| p50 ${summary.dr.absP50H}h p90 ${summary.dr.absP90H}h p99 ${summary.dr.absP99H}h max ${summary.dr.absMaxH}h; moved>0.01h ${summary.dr.moved001}/${summary.dr.n}`);
txt.push(`ref omega ${summary.omegaRef.min}..${summary.omegaRef.max}; lean max V ${summary.lean.maxVh}h Q ${summary.lean.maxQh}h r ${summary.lean.maxRh}h feet ${summary.lean.maxFeetH}h outs ${leanOuts.length}/${leanCompared}`);
txt.push(`small rounds outside null bands: ${smallOutside.length}`);
writeFileSync(`${OUT}/scenes_s1b.txt`, txt.join("\n") + "\n");
console.log(txt.slice(-4).join("\n"));


