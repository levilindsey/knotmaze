// K1179 S1c scenes: task 1 (master's form B on the exact outline),
// task 2 agreement on the 12 scenes, and the scene half of task 4
// (criteria 1v and 2 in three columns; column 1 quoted from Run K's
// record, .claude/probes/K1179/s1b/out/scenes_s1b.json).
// Run: npx.cmd vite-node .claude/probes/K1179/s1c/s1c_scenes.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import { loadScene, rootBandEff, SCENES_12 } from "../outline";
import { bareMinK } from "../s1b/lib_s1b";
import { closedCorners } from "./closed";
import { classifyS1c, fillChecker, fineR, fmt, keyOf, measureExact, pctile, siteOf } from "./lib_s1c";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });
const s1b = JSON.parse(readFileSync(`${HERE}/../s1b/out/scenes_s1b.json`, "utf8"));
const s1bClass = new Map<string, string>();
for (const r of s1b.cuspClassified as any[]) s1bClass.set(`${r.scene}|${r.junction}|${r.arms}`, r.cls);
const s1bPerScene = new Map<string, any>((s1b.summary.perScene as any[]).map((r: any) => [r.scene, r]));

const txt: string[] = [];
const perScene: any[] = [];
const agreementOuts: any[] = [];
const failList: any[] = []; // every 1v / criterion-2 failure in columns 2-3
let totClosed = { compared: 0, maxV: 0, maxQ: 0, maxR: 0, maxF: 0, maxDevPx: 0, outs: 0 };
const classAgg: Record<string, { runKN: number; fail1vMaster: number; fail1vClosed: number; worstTubeConcaveDeg: number; worstAt: string }> = {};
const smallOutside: any[] = [];

for (const name of SCENES_12) {
  const sc = loadScene(name);
  const fb: any = new FormB(sc);
  const { corners: closed } = closedCorners(fb);
  const buriedM = fillChecker(fb, fb.corners);
  const buriedC = fillChecker(fb, closed);
  const closedMap = new Map(closed.map((c: any) => [keyOf(c), c]));
  // Agreement (master vs closed), fine integral for outs.
  let maxV = 0, maxQ = 0, maxR = 0, maxF = 0, maxDev = 0, outs = 0, compared = 0;
  for (const rc of fb.corners as any[]) {
    const lc: any = closedMap.get(keyOf(rc));
    if (!lc) { agreementOuts.push({ scene: name, site: siteOf(fb, sc, rc), cause: "master-only corner (closed solve returned no corner)" }); outs++; continue; }
    compared++;
    const dV = Math.hypot(lc.Vx - rc.Vx, lc.Vy - rc.Vy) / fb.h;
    const dQ = Math.hypot(lc.qx - rc.qx, lc.qy - rc.qy) / fb.h;
    const dR = Math.abs(lc.r - rc.r) / fb.h;
    const dF = Math.max(Math.abs(lc.dA - rc.dA), Math.abs(lc.dB - rc.dB)) / fb.h;
    maxV = Math.max(maxV, dV); maxQ = Math.max(maxQ, dQ); maxR = Math.max(maxR, dR); maxF = Math.max(maxF, dF);
    maxDev = Math.max(maxDev, Math.max(dV, dQ, dF, dR) * fb.h * sc.camera.pxPerUnit * 2);
    if (Math.max(dV, dQ, dR, dF) > 0.01) {
      outs++;
      const fine = fineR(fb, rc) / fb.h;
      const fine32 = fineR(fb, rc, 32) / fb.h;
      const closedH = lc.r / fb.h;
      const masterH = rc.r / fb.h;
      // Sub-cause: the closed form against the converged (256-panel)
      // integral on the nearest-following branch, and that branch's own
      // 32-panel form against master (form B's node count).
      let cause: string;
      if (Math.abs(closedH - fine) <= 0.01 && Math.abs(fine32 - masterH) <= 0.01) {
        cause = `quadrature: form B's 32-node trapezoid (32-panel ${fmt(fine32, 4)}, 256-panel ${fmt(fine, 4)}, master ${fmt(masterH, 4)})`;
      } else if (Math.abs(closedH - fine) <= 0.01) {
        cause = `branch: master's tracked advance vs the converged branch (32-panel ${fmt(fine32, 4)}, 256-panel ${fmt(fine, 4)}, master ${fmt(masterH, 4)})`;
      } else if (Math.abs(fine - masterH) <= 0.01) {
        cause = `closed divergence: the pair sheet vs the nearest-following branch (256-panel ${fmt(fine, 4)}, master ${fmt(masterH, 4)})`;
      } else {
        cause = `branch (all three differ): master ${fmt(masterH, 4)}, closed ${fmt(closedH, 4)}, 256-panel ${fmt(fine, 4)}, 32-panel ${fmt(fine32, 4)}`;
      }
      agreementOuts.push({ scene: name, site: siteOf(fb, sc, rc), dVH: +fmt(dV, 4), dQH: +fmt(dQ, 4), drH: +fmt(dR, 4), dFeetH: +fmt(dF, 4), rMasterH: +fmt(masterH, 4), rClosedH: +fmt(closedH, 4), rFine256H: +fmt(fine, 4), rFine32H: +fmt(fine32, 4), cause });
    }
  }
  for (const lc of closed) if (!fb.corners.some((rc: any) => keyOf(rc) === keyOf(lc))) agreementOuts.push({ scene: name, site: siteOf(fb, sc, lc), cause: "closed-only corner" });
  totClosed.compared += compared;
  totClosed.maxV = Math.max(totClosed.maxV, maxV); totClosed.maxQ = Math.max(totClosed.maxQ, maxQ);
  totClosed.maxR = Math.max(totClosed.maxR, maxR); totClosed.maxF = Math.max(totClosed.maxF, maxF);
  totClosed.maxDevPx = Math.max(totClosed.maxDevPx, maxDev); totClosed.outs += outs;
  // Exact criteria, master and closed corner sets.
  const exactOf = (corners: any[], buriedFn: any, col: string) => {
    let fail1v = 0, feetFail = 0, feetBuried = 0, worstJump = 0, worstJumpAt = "", worstTube = 0, minLiveR = Infinity;
    for (const c of corners) {
      const m = measureExact(fb, c, buriedFn);
      if (m.exposed && m.live) minLiveR = Math.min(minLiveR, c.r);
      if (m.exposed && m.live && m.failA) {
        fail1v++;
        const expectedSign = -Math.sign(fb.arms[c.a].ux * fb.arms[c.b].uy - fb.arms[c.a].uy * fb.arms[c.b].ux) || 1;
        const cl = classifyS1c(fb, c, false, bareMinK(fb, c, expectedSign));
        failList.push({ col, scene: name, site: siteOf(fb, sc, c), criterion: "1v(a)", cls: cl.cls, detail: cl.detail, worstJumpDeg: +fmt(m.worstJumpDeg, 2), meets: m.meets.filter((mm) => mm.jumpDeg > 1).slice(0, 4) });
      }
      if (m.worstJumpDeg > worstJump) { worstJump = m.worstJumpDeg; worstJumpAt = siteOf(fb, sc, c); }
      worstTube = Math.max(worstTube, m.tubeConcaveDeg);
      for (const f of m.feet) {
        if (f.buried) feetBuried++;
        if (f.fail) { feetFail++; failList.push({ col, scene: name, site: siteOf(fb, sc, c), criterion: "2", foot: f.which, gapDev: +fmt(f.gapDev, 3), jumpDeg: +fmt(f.jumpDeg, 2) }); }
      }
      c.__exact = m;
    }
    return { fail1v, feetFail, feetBuried, worstJump, worstJumpAt, worstTube, minLiveRH: Number.isFinite(minLiveR) ? +fmt(minLiveR / fb.h, 4) : null };
  };
  const exM = exactOf(fb.corners, buriedM, "master-exact");
  const exC = exactOf(closed, buriedC, "closed-exact");
  // Small rounds outside Run I's null bands (master set; closed counted).
  const smallOf = (corners: any[]): number => {
    let n = 0;
    for (const c of corners as any[]) {
      if (!(c.r0 >= fb.h && c.r < 0.25 * fb.h)) continue;
      const rb = rootBandEff(fb, c.theta);
      if (c.dA > fb.arms[c.a].L + 1e-9 || c.dB > fb.arms[c.b].L + 1e-9) continue;
      if (c.room <= 0.5 * fb.h) continue;
      if (Math.min(c.dVa, c.dVb) < rb) continue;
      if (c.omega <= 0) continue;
      n++;
    }
    return n;
  };
  const smallM = smallOf(fb.corners);
  const smallC = smallOf(closed);
  for (const c of fb.corners as any[]) {
    if (!(c.r0 >= fb.h && c.r < 0.25 * fb.h)) continue;
    const rb = rootBandEff(fb, c.theta);
    if (c.dA > fb.arms[c.a].L + 1e-9 || c.dB > fb.arms[c.b].L + 1e-9) continue;
    if (c.room <= 0.5 * fb.h || Math.min(c.dVa, c.dVb) < rb || c.omega <= 0) continue;
    smallOutside.push({ scene: name, site: siteOf(fb, sc, c), rH: +fmt(c.r / fb.h, 4), r0H: +fmt(c.r0 / fb.h, 3) });
  }
  // Per-class aggregation (Run K classes from its record; this run's 1v).
  for (const c of fb.corners as any[]) {
    const site = `${name}|${sc.junctions[c.j]?.id}|${fb.arms[c.a].ei}-${fb.arms[c.b].ei}`;
    const cls = s1bClass.get(site);
    const m = (c as any).__exact;
    const lc: any = closedMap.get(keyOf(c));
    const failM = !!(m?.exposed && m?.live && m?.failA);
    if (cls) {
      classAgg[cls] ??= { runKN: 0, fail1vMaster: 0, fail1vClosed: 0, worstTubeConcaveDeg: 0, worstAt: "" };
      classAgg[cls].runKN++;
      if (failM) classAgg[cls].fail1vMaster++;
      if (m && m.tubeConcaveDeg > classAgg[cls].worstTubeConcaveDeg) { classAgg[cls].worstTubeConcaveDeg = m.tubeConcaveDeg; classAgg[cls].worstAt = `${name} ${siteOf(fb, sc, c)}`; }
    }
    if (lc && failM) {
      // The closed corner at the same site, for the class table's third count.
      const mc = (lc as any).__exact;
      if (mc?.exposed && mc?.live && mc?.failA && cls) classAgg[cls].fail1vClosed++;
    }
  }
  const bk: any = s1bPerScene.get(name);
  const row = {
    scene: name, corners: fb.corners.length, closedCorners: closed.length,
    runK: bk ? { corrCusp: bk.before.corrCusp, feetFail: bk.before.footFail } : null,
    exactMaster: exM, exactClosed: exC, smallOutsideMaster: smallM, smallOutsideClosed: smallC,
    agreement: { compared, outs, maxVH: +fmt(maxV, 5), maxQH: +fmt(maxQ, 5), maxRH: +fmt(maxR, 5), maxFeetH: +fmt(maxF, 5), maxDevPxDpr2: +fmt(maxDev, 3) },
  };
  perScene.push(row);
  txt.push(`${name}: corners ${row.corners} closed ${row.closedCorners}; RunK corrCusp ${row.runK?.corrCusp} feet ${row.runK?.feetFail}; exact master 1vFail ${exM.fail1v} feetFail ${exM.feetFail} (buried ${exM.feetBuried}) worstJump ${fmt(exM.worstJump, 2)}deg at ${exM.worstJumpAt}; exact closed 1vFail ${exC.fail1v} feetFail ${exC.feetFail}; small outside ${smallM}/${smallC}; agreement outs ${outs}/${compared} maxQ ${fmt(maxQ, 4)}h maxR ${fmt(maxR, 4)}h`);
  console.log(txt[txt.length - 1]);
}
const summary = {
  perScene, classAgg,
  agreementTotals: { compared: totClosed.compared, outs: totClosed.outs, maxVH: +fmt(totClosed.maxV, 5), maxQH: +fmt(totClosed.maxQ, 5), maxRH: +fmt(totClosed.maxR, 5), maxFeetH: +fmt(totClosed.maxF, 5), maxDevPxDpr2: +fmt(totClosed.maxDevPx, 3) },
  runKCuspClasses: s1b.summary.cuspClasses, smallOutsideCount: smallOutside.length,
};
writeFileSync(`${OUT}/scenes_s1c.json`, JSON.stringify({ summary, agreementOuts, failList, smallOutside }, null, 1));
txt.push(`\nTOTAL agreement outs ${totClosed.outs}/${totClosed.compared}; classes ${JSON.stringify(classAgg)}; small outside ${smallOutside.length}`);
writeFileSync(`${OUT}/scenes_s1c.txt`, txt.join("\n") + "\n");
console.log(txt[txt.length - 1]);
