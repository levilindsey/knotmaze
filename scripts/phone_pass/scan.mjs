// scan.mjs: frozen render-sync cells on the Pixel 11, in the pass's own tab (the scan and the bisect of rounds 2026-10-27b and c).
// The cell of k539_g31.mjs (clean origin, load frozen = &fw=0&phy=0, pinAll + PIN2, renderLoop(ITER): ITER full renders, each
// followed by a 1-px readback, in one task, K10), with: a PLAN of cells (env PLAN, JSON [[build, link], ...], build = base|head,
// link = dense|maxfab|knot24), else every link (env ONLY=dense,maxfab,knot24 filters) with RUNS runs a build (default 1): one run
// each, the build that goes first alternating by link (base first on the 1st and 3rd link, head first on the 2nd), RUNS=2: ABBA
// then BAAB. No screenshots (SHOT=1 takes them). Every run records __knotParams() (paramDiff is computed offline: round.mjs,
// report_scan.mjs, pdiff.mjs), the build stamp, gl.getError() drained before and after, ctxLost and the phone's thermal state.
// A failed cell is recorded and the pass goes on; a watchdog trip stops it.
//
// Call, once `phone_pass.ps1 -Phase start -Base <sha8> -Head <sha8> -Out <pass folder>` is up (bisect2.mjs and run_pass.ps1 do both):
//   node scripts/phone_pass/scan.mjs <pass folder>/config.json      (env DIR=scan, ITER=60, RUNS=1, ONLY=, PLAN=, SHOT=)
// Writes <pass folder>/<DIR>/results.json and log.txt.
import { pathToFileURL } from "node:url";
import { KIT, head, base, connect, ownPage, parkTab, sleep, out, assertFree, thermal, shotViewport, loadFrozen, checkBuild, makeLog, cleanOrigin, prep, saveJSON, savePNG } from "./p_common.mjs";
const W = await import(pathToFileURL(KIT + "walk.mjs").href);
const DIR = process.env.DIR || "scan";
const log = makeLog(DIR);
const Q = "am=instant&snd=none";
const ITER = Number(process.env.ITER || 60);
const RUNS = Number(process.env.RUNS || 1);
const ALL = [
  { name: "dense", q: "b&gs=24&wd=0.6&brd=0.6" },
  { name: "maxfab", q: "b&gs=24&wd=1&brd=1&ded=1&del=40&jsp=.5" },
  { name: "knot24", q: "b&gs=24&wd=1&mf=0" },
];
const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
const LINKS = only ? ALL.filter((l) => only.includes(l.name)) : ALL;
const B = { base, head };
let PLAN;
if (process.env.PLAN) PLAN = JSON.parse(process.env.PLAN);
else {
  PLAN = [];
  LINKS.forEach((l, i) => {
    const first = i % 2 === 0 ? ["base", "head"] : ["head", "base"];
    const seq = RUNS === 1 ? first : [first[0], first[1], first[1], first[0]].concat(RUNS > 2 ? first : []);
    for (const k of seq) PLAN.push([k, l.name]);
  });
}
const R = { head: head.sha, base: base.sha, iter: ITER, plan: PLAN, errors: [], thermalStart: null, thermalEnd: null, runs: [] };
const save = () => saveJSON(DIR, R);
const GL = () => {
  const L = window.__knotBackgroundLayer && window.__knotBackgroundLayer();
  const gl = L && L.renderer && L.renderer.gl;
  if (!gl) return { err: "no gl" };
  const errs = [];
  for (let i = 0; i < 8; i++) { const e = gl.getError(); if (!e) break; errs.push(e); }
  return { errs, isContextLost: gl.isContextLost(), ctxLost: window.__ctxLost, ctxRestored: window.__ctxRestored };
};
const PIN2 = () => {
  const F = window.__knotFabricRenderer && window.__knotFabricRenderer();
  if (!F) return false;
  F.exploreClock = 1000;
  if (typeof F.tickExplore === "function") { const proto = Object.getPrototypeOf(F); F.tickExplore = function () { return proto.tickExplore.call(this, 0); }; }
  return true;
};
let browser;
try {
  browser = await connect();
  R.thermalStart = thermal();
  const page = await ownPage(browser);
  await prep(page, R.errors);
  await page.bringToFront();
  const seen = {};
  for (const [bk, ln] of PLAN) {
    const b = B[bk], link = ALL.find((l) => l.name === ln);
    const run = (seen[bk + ln] = (seen[bk + ln] || 0) + 1);
    const c = { link: ln, build: bk, sha: b.sha, run };
    try {
      assertFree();
      const url = `${b.host}/?${link.q}&${Q}&fw=0&phy=0`;
      c.at = new Date().toISOString().slice(11, 19);
      await cleanOrigin(page, b.host);
      const { stamp } = await loadFrozen(page, url);
      checkBuild(b, stamp);
      c.stamp = stamp.slice(0, 70);
      const pin = await page.evaluate(W.pinAll).then(() => "ok", (e) => "pinAll: " + String(e.message).slice(0, 80));
      c.pin = pin;
      c.pin2 = await page.evaluate(PIN2);
      await sleep(500);
      c.params = await page.evaluate(() => { try { return window.__knotParams(); } catch { return null; } });
      c.vp = await page.evaluate(() => [window.innerWidth, window.innerHeight, +window.devicePixelRatio.toFixed(3)]);
      c.glLoad = await page.evaluate(GL);
      c.renderLoop = await page.evaluate(W.renderLoop, ITER).catch((e) => ({ err: String(e.message).slice(0, 80) }));
      c.glAfter = await page.evaluate(GL);
      if (process.env.SHOT) savePNG(DIR, `${ln}_${bk}_${b.sha}_r${run}.png`, await shotViewport(page));
      c.thermal = thermal();
    } catch (e) {
      c.error = String(e.message).slice(0, 200);
      R.errors.push(`${ln} ${bk} ${b.sha}: ${c.error}`);
      if (/WATCHDOG/.test(c.error)) { R.runs.push(c); save(); log("TRIP", c.error); throw e; }
    }
    R.runs.push(c);
    save();
    log(ln, bk, b.sha, "run", run, "renderLoop", JSON.stringify(c.renderLoop || c.error), "glLoad", JSON.stringify(c.glLoad && c.glLoad.errs), "glAfter", JSON.stringify(c.glAfter && c.glAfter.errs), "ctxLost", c.glAfter && c.glAfter.ctxLost, "th", JSON.stringify(c.thermal).slice(0, 90));
  }
  await parkTab(page);
} catch (e) {
  R.errors.push("ABORT: " + e.message);
  log("ABORT", e.message, String(e.stack || "").split("\n").slice(1, 4).join(" | "));
} finally {
  try { R.thermalEnd = thermal(); } catch {}
  try { save(); } catch {}
  try { if (browser) await browser.disconnect(); } catch {}
}
log("done", JSON.stringify({ errors: R.errors }));
