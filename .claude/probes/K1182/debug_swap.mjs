// K1182 Run F debug: verify the C swap at cross ji33 really writes the
// biarc rim into the fan vertices, and measure ji33's record (gold +
// pulse band centrelines) and its neighbours' rim movement off/on.
//   pwsh -File run_locked.ps1 -Batch batch_debug.txt
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, sleep, frames } from "./lib.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const st = { q: Q, moves: [0, 246, 82, 83, 199] };
const JI = 33;
const setFlagVar = async (page, on) => {
  await page.evaluate(async (on) => {
    const m = await import("/src/render/ribbon/rim_curve.ts");
    m.setRimCurveBiarc(on);
  }, on);
};
const CAPTURE_FN = (ji) => {
  const r = window.__knotRenderer();
  const meshB = r.filletMesh, meshT = r.filletTopMesh;
  const proto = Object.getPrototypeOf(meshB);
  const orig = proto.pushFan;
  const calls = [];
  proto.pushFan = function (apexX, apexY, rim, rec, flank, seal, flankFill, bandIn, bandOut) {
    const vBefore = this.vUsed;
    const res = orig.call(this, apexX, apexY, rim, rec, flank, seal, flankFill, bandIn, bandOut);
    if (flank != null) {
      const vAfter = this.vUsed;
      calls.push({ mesh: this === meshB ? 0 : this === meshT ? 1 : -1, rec, rim: Array.from(rim), vertices: vAfter > vBefore ? Array.from(this.vertexData.subarray(vBefore * 2, vAfter * 2)) : [] });
    }
    return res;
  };
  try { r.joinery.rebuildFillets(true); } finally { proto.pushFan = orig; }
  const fp = r.joinery.fieldProbe;
  const recNow = fp.record(ji);
  return { record: recNow, center: fp.center(ji), wedges: calls.filter((c) => c.rec === recNow), routes: (fp.routes(ji) || []).map((x) => ({ ia: x.ia, ib: x.ib, d: x.d, m: x.m })) };
};
const RECORD_FN = (ji) => {
  const r = window.__knotRenderer();
  const fp = r.joinery.fieldProbe;
  const rb = fp.record(ji);
  const rd = window.__examRd;
  const out = { rb, nr: 0, np: 0, golds: [], pulses: [] };
  if (rb < 0 || !rd) return out;
  const routeBase = Math.round(rd[rb * 4 + 3]);
  const nr = Math.round(rd[(rb + 1) * 4 + 3]);
  out.nr = nr;
  if (!(routeBase > 0)) return out;
  let base = routeBase;
  for (let i = 0; i < nr; i++) {
    const nv = Math.round(rd[base * 4]);
    const verts = [];
    for (let v = 0; v < nv; v++) { const o = (base + 1 + v) * 4; verts.push([rd[o], rd[o + 1], rd[o + 2]]); }
    out.golds.push({ nv, m: rd[base * 4 + 1], ia: rd[base * 4 + 2], ib: rd[base * 4 + 3], verts });
    base += 1 + nv;
  }
  const np = Math.round(rd[base * 4]);
  out.np = np;
  let pb = base + 1;
  for (let i = 0; i < np && i < 4; i++) {
    const nv = Math.round(rd[pb * 4]);
    if (!(nv >= 2 && nv <= 64)) { out.pulses.push({ badNv: nv }); break; }
    const hn = rd[(pb + 2) * 4] ** 2 + rd[(pb + 2) * 4 + 1] ** 2 + rd[(pb + 2) * 4 + 2] ** 2;
    const HB = Math.abs(hn - 1) < 1e-3 || hn === 0 ? 4 : 2;
    const verts = [];
    for (let v = 0; v < nv; v++) { const o = (pb + HB + v) * 4; verts.push([rd[o], rd[o + 1], rd[o + 2], rd[o + 3]]); }
    out.pulses.push({ nv, m: rd[pb * 4 + 1], ia: rd[pb * 4 + 2], ib: rd[pb * 4 + 3], distJ: rd[(pb + 1) * 4], flags: rd[(pb + 1) * 4 + 1], shared: rd[(pb + 1) * 4 + 2], verts });
    pb += HB + nv;
  }
  return out;
};
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, st.q, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await waitAsleep(page, 20000);
  await page.evaluate(PIN);
  await sleep(200);
  // Expose recordData's array to the record reader.
  await page.evaluate(async () => {
    const hit = performance.getEntriesByType("resource").map((e) => e.name).find((n) => n.includes("/src/render/junction_field.ts"));
    const JF = await import(hit ?? "/src/render/junction_field.ts");
    window.__examRd = JF.recordData().data;
  });
  await setFlagVar(page, false);
  const capOff = await page.evaluate(CAPTURE_FN, JI);
  const recOff = await page.evaluate(RECORD_FN, JI);
  await setFlagVar(page, true);
  const capOn = await page.evaluate(CAPTURE_FN, JI);
  const recOn = await page.evaluate(RECORD_FN, JI);
  // Persistent swap (flag off + on rims), then read the vertices written.
  await setFlagVar(page, false);
  const swapped = await page.evaluate(({ targetRec, onRims }) => {
    const r = window.__knotRenderer();
    const proto = Object.getPrototypeOf(r.filletMesh);
    const orig = proto.pushFan;
    let wedgeIdx = 0, prevRec = -999;
    const seen = [];
    proto.pushFan = function (apexX, apexY, rim, rec, flank, seal, flankFill, bandIn, bandOut) {
      let useRim = rim, idx = -1;
      if (flank != null) {
        if (rec !== prevRec) wedgeIdx = 0;
        prevRec = rec;
        if (rec === targetRec) { idx = wedgeIdx; if (onRims[idx]) useRim = onRims[idx].slice(); }
        wedgeIdx++;
      }
      const vBefore = this.vUsed;
      const res = orig.call(this, apexX, apexY, useRim, rec, flank, seal, flankFill, bandIn, bandOut);
      if (rec === targetRec && flank != null) {
        const vAfter = this.vUsed;
        seen.push({ idx, vertices: vAfter > vBefore ? Array.from(this.vertexData.subarray(vBefore * 2, vAfter * 2)) : [] });
      }
      return res;
    };
    r.joinery.rebuildFillets(true);
    proto.pushFan = orig;
    r.tickPaint(0);
    return seen;
  }, { targetRec: capOff.record, onRims: capOff.wedges.map((w, i) => capOn.wedges[i].rim) });
  // Neighbours: every junction centre within 1.3 world, with its record.
  const nbrs = await page.evaluate((c) => {
    const fp = window.__knotRenderer().joinery.fieldProbe;
    const out = [];
    for (let ji = 0; ji < 600; ji++) {
      const cc = fp.center(ji);
      if (cc && Math.hypot(cc[0] - c[0], cc[1] - c[1]) < 1.3) out.push({ ji, center: cc, record: fp.record(ji), routes: (fp.routes(ji) || []).length });
    }
    return out;
  }, capOff.center);
  const maxDiff = (a, b) => {
    let m = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) m = Math.max(m, Math.abs(a[i] - b[i]));
    return m;
  };
  const rimRing = (verts, rimCount) => {
    const out = [];
    for (let i = 0; i < rimCount; i++) out.push(verts[(1 + i) * 2], verts[(1 + i) * 2 + 1]);
    return out;
  };
  const report = { ji: JI, center: capOff.center, record: capOff.record, routes: capOff.routes, neighbours: nbrs, wedges: [], pulses: { off: recOff, on: recOn } };
  for (let i = 0; i < capOff.wedges.length; i++) {
    const offRim = capOff.wedges[i].rim, onRim = capOn.wedges[i].rim;
    const sw = swapped.find((s) => s.idx === i);
    const swRim = sw ? rimRing(sw.vertices, offRim.length / 2) : null;
    report.wedges.push({
      order: i, rimOffVsOn: maxDiff(offRim, onRim),
      swappedVsOn: swRim ? maxDiff(swRim, onRim) : null,
      swappedVsOff: swRim ? maxDiff(swRim, offRim) : null,
    });
  }
  const move = (a, b) => {
    if (!a || !b) return null;
    let m = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) m = Math.max(m, Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]));
    return m;
  };
  report.pulseMove = recOff.pulses.map((p, i) => ({ i, ia: p.ia, ib: p.ib, mOff: p.m, move: move(p.verts, recOn.pulses[i]?.verts) }));
  report.goldMove = recOff.golds.map((p, i) => ({ i, move: move(p.verts, recOn.golds[i]?.verts) }));
  writeFileSync(resolve("exam/debug_ji33.json"), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
} finally {
  await browser.close();
}
