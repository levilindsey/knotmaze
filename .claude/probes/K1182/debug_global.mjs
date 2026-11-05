// K1182 Run F debug 2: global what-ifs on the cross stand (ji33's crop
// contains neighbouring junctions' fans; exam.mjs's what-ifs are
// target-only). Captures every wedge rim off/on, then: all wedges
// swapped, all band rings dropped, all band normals wider-stencil.
//   pwsh -File run_locked.ps1 -Batch batch_debug2.txt
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, sleep, frames } from "./lib.mjs";
import { decodePNG, toRGB } from "./png.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const st = { q: Q, moves: [0, 246, 82, 83, 199] };
const JI = 33, CLIP = 200, ZOOM = 90;
const setFlagVar = async (page, on) => {
  await page.evaluate(async (on) => {
    const m = await import("/src/render/ribbon/rim_curve.ts");
    m.setRimCurveBiarc(on);
  }, on);
};
const afterRebuild = async (page) => {
  await page.evaluate(() => window.__knotRenderer().tickPaint(0));
  await frames(page, 3);
  await sleep(200);
};
const CAPALL_FN = () => {
  const r = window.__knotRenderer();
  const proto = Object.getPrototypeOf(r.filletMesh);
  const orig = proto.pushFan;
  const calls = [];
  proto.pushFan = function (apexX, apexY, rim, rec, flank, seal, flankFill, bandIn, bandOut) {
    const res = orig.call(this, apexX, apexY, rim, rec, flank, seal, flankFill, bandIn, bandOut);
    if (flank != null) calls.push({ rec, rim: Array.from(rim) });
    return res;
  };
  try { r.joinery.rebuildFillets(true); } finally { proto.pushFan = orig; }
  const fp = r.joinery.fieldProbe;
  const recToJi = {};
  for (let ji = 0; ji < 600; ji++) { const rb = fp.record(ji); if (rb >= 0) recToJi[rb] = ji; }
  return { calls, recToJi, center33: fp.center(33) };
};
const INSTALL_FN = ({ mode, offMap, onMap }) => {
  const r = window.__knotRenderer();
  const proto = Object.getPrototypeOf(r.filletMesh);
  if (window.__examPushFanOrig) proto.pushFan = window.__examPushFanOrig;
  const orig = proto.pushFan;
  window.__examPushFanOrig = orig;
  const counts = {};
  proto.pushFan = function (apexX, apexY, rim, rec, flank, seal, flankFill, bandIn, bandOut) {
    let useRim = rim, useBandIn = bandIn ?? 0, useBandOut = bandOut ?? 0;
    if (flank != null) {
      const map = mode === "swapOn" ? onMap : mode === "swapOff" ? offMap : null;
      if (map && map[rec]) {
        const i = (counts[rec] = (counts[rec] ?? 0) + 1) - 1;
        const arr = map[rec];
        if (arr[i % arr.length]) useRim = arr[i % arr.length].slice();
      }
      if (mode === "D") { useBandIn = 0; useBandOut = 0; }
    }
    const vBefore = this.vUsed;
    const res = orig.call(this, apexX, apexY, useRim, rec, flank, seal, flankFill, useBandIn, useBandOut);
    if (mode === "A" && flank != null && useBandIn > 0) {
      const rimCount = useRim.length / 2, vCount = this.vUsed - vBefore;
      if (rimCount > 2 && vCount >= 1 + 2 * rimCount) {
        const vd = this.vertexData, hasOuter = vCount >= 1 + 3 * rimCount && useBandOut > 0;
        for (let i = 0; i < rimCount; i++) {
          const px = useRim[i * 2], py = useRim[i * 2 + 1];
          const i0 = Math.max(i - 2, 0), i1 = Math.min(i + 2, rimCount - 1);
          let tx = useRim[i1 * 2] - useRim[i0 * 2], ty = useRim[i1 * 2 + 1] - useRim[i0 * 2 + 1];
          const tl = Math.hypot(tx, ty);
          if (tl > 1e-9) { tx /= tl; ty /= tl; } else { tx = 1; ty = 0; }
          let nx = -ty, ny = tx;
          if (nx * (apexX - px) + ny * (apexY - py) < 0) { nx = -nx; ny = -ny; }
          const ii = vBefore + 1 + rimCount + i;
          vd[ii * 2] = px + nx * useBandIn; vd[ii * 2 + 1] = py + ny * useBandIn;
          if (hasOuter) { const oo = vBefore + 1 + 2 * rimCount + i; vd[oo * 2] = px - nx * useBandOut; vd[oo * 2 + 1] = py - ny * useBandOut; }
        }
      }
    }
    return res;
  };
  r.joinery.rebuildFillets(true);
  r.tickPaint(0);
  return true;
};
const RESTORE_FN = () => {
  const r = window.__knotRenderer();
  const proto = Object.getPrototypeOf(r.filletMesh);
  if (window.__examPushFanOrig) { proto.pushFan = window.__examPushFanOrig; delete window.__examPushFanOrig; }
  r.joinery.rebuildFillets(true);
  r.tickPaint(0);
  return true;
};
function diffCount(aBuf, bBuf) {
  const a = toRGB(decodePNG(aBuf)), b = toRGB(decodePNG(bBuf));
  let px = 0, exact = 0;
  for (let i = 0; i < a.W * a.H * 3; i += 3) {
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
    if (d > 0) exact++;
    if (d > 8) px++;
  }
  return { px, exact };
}
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, st.q, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await waitAsleep(page, 20000);
  const screenOf = (w) => page.evaluate((ww) => {
    const k = window.__knotFabric();
    const w0 = k.toWorld(0, 0), wx = k.toWorld(100, 0), wy = k.toWorld(0, 100);
    return { x: ((ww[0] - w0.x) * 100) / (wx.x - w0.x), y: ((ww[1] - w0.y) * 100) / (wy.y - w0.y) };
  }, w);
  const centre = await page.evaluate((ji) => window.__knotRenderer().joinery.fieldProbe.center(ji), JI);
  let pt = await screenOf(centre);
  const pxPerWorld = () => page.evaluate((p) => {
    const k = window.__knotFabric();
    const a = k.toWorld(p.x, p.y), b = k.toWorld(p.x + 100, p.y);
    return 100 / Math.hypot(b.x - a.x, b.y - a.y);
  }, pt);
  const wheel = async (dy) => {
    await page.mouse.move(pt.x, pt.y);
    await page.keyboard.down("Control");
    await page.mouse.wheel({ deltaY: dy });
    await page.keyboard.up("Control");
    await sleep(250);
    await viewStill(page);
  };
  let s0 = await pxPerWorld();
  if (s0 < ZOOM * 0.97) {
    await wheel(-30);
    const s1 = await pxPerWorld();
    const kEff = Math.log(s1 / s0) / 30;
    if (kEff > 0 && s1 < ZOOM * 0.97) await wheel(-Math.log(ZOOM / s1) / kEff);
  }
  await page.mouse.move(2, 2);
  await sleep(400);
  await viewStill(page);
  await waitAsleep(page, 20000);
  await page.evaluate(PIN);
  await sleep(200);
  pt = await screenOf(centre);
  const shoot = async () => {
    const clip = { x: Math.max(0, Math.min(1700 - CLIP, Math.round(pt.x - CLIP / 2))), y: Math.max(0, Math.min(950 - CLIP, Math.round(pt.y - CLIP / 2))), width: CLIP, height: CLIP };
    return page.screenshot({ type: "png", clip });
  };
  const toMap = (calls) => {
    const m = {};
    for (const c of calls) (m[c.rec] ??= []).push(c.rim);
    return m;
  };
  await setFlagVar(page, false);
  const capOff = await page.evaluate(CAPALL_FN);
  await afterRebuild(page);
  const offBuf = await shoot();
  await setFlagVar(page, true);
  const capOn = await page.evaluate(CAPALL_FN);
  await afterRebuild(page);
  const onBuf = await shoot();
  const offMap = toMap(capOff.calls), onMap = toMap(capOn.calls);
  // Per-junction rim movement (max per wedge), for junctions near ji33.
  const moveByJi = {};
  for (const [rec, arr] of Object.entries(offMap)) {
    const onArr = onMap[rec];
    if (!onArr) continue;
    let mx = 0;
    for (let i = 0; i < Math.min(arr.length, onArr.length); i++)
      for (let k = 0; k < arr[i].length; k += 2) mx = Math.max(mx, Math.hypot(arr[i][k] - onArr[i][k], arr[i][k + 1] - onArr[i][k + 1]));
    const ji = capOff.recToJi[rec];
    if (ji !== undefined) moveByJi[ji] = +mx.toFixed(4);
  }
  const shots = {};
  const run = async (id, mode, flagOn) => {
    await setFlagVar(page, flagOn);
    await page.evaluate(INSTALL_FN, { mode, offMap, onMap });
    await afterRebuild(page);
    shots[id] = await shoot();
    await page.evaluate(RESTORE_FN);
    await afterRebuild(page);
    console.log(`${id} done`);
  };
  await run("swapAllOn", "swapOn", false);
  await run("swapAllOff", "swapOff", true);
  await run("Dglobal", "D", true);
  await run("Aglobal", "A", true);
  const base = diffCount(offBuf, onBuf);
  const out = { ji: JI, center: centre, onOff: base, nearMoveByJi: Object.fromEntries(Object.entries(moveByJi).filter(([ji]) => Math.abs(ji - 33) < 12)), counts: {} };
  for (const id of Object.keys(shots)) {
    out.counts[id] = { vsOff: diffCount(shots[id], offBuf), vsOn: diffCount(shots[id], onBuf) };
    writeFileSync(resolve(`exam/crops/cross_ji33_${id}.png`), shots[id]);
  }
  writeFileSync(resolve("exam/debug_global_ji33.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
} finally {
  await browser.close();
}
