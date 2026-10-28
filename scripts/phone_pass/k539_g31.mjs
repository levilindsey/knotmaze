// k539_g31.mjs: the K539 frozen render-sync cell on the Pixel 11 (the pass's own tab), base vs head, ABBA per link: the cell
// scan.mjs and bisect2.mjs reuse (first written for the G3-1 attribution, K156 round 2026-10-27 step 6).
// base and head are the two builds a `phone_pass.ps1 -Phase start` pass serves; ONE commit apart, the mazes match and a frozen frame
// is the same state on both. The cell: clean origin, load frozen (&fw=0&phy=0 + pinAll + PIN2), renderLoop(ITER) = ITER full renders
// each followed by a 1-px readback in one task (K10). Per link, TWO runs a build in an alternating order: ORDER=abba (default: base,
// head, head, base; a linear drift in heat cancels between the builds' means) or abab. Also per cell: gl.getError() drained, ctx lost,
// a shot; base vs head pixel diff of the first runs (pixdiff_g31.mjs reads the shots).
//
// Call, once `phone_pass.ps1 -Phase start ... -Out <pass folder>` is up:
//   node scripts/phone_pass/k539_g31.mjs <pass folder>/config.json   (env ORDER=abba|abab, ITER=60, ONLY=dense|maxfab|knot24)
// Writes <pass folder>/g31/results.json, log.txt and the shots.
import { pathToFileURL } from "node:url";
import { KIT, head, base, connect, ownPage, parkTab, sleep, out, assertFree, thermal, shotViewport, loadFrozen, checkBuild, makeLog, cleanOrigin, prep, readImg, saveJSON, savePNG, S } from "./p_common.mjs";
const W = await import(pathToFileURL(KIT + "walk.mjs").href);
const DIR = "g31";
const log = makeLog(DIR);
const Q = "am=instant&snd=none";
const ITER = Number(process.env.ITER || 60);
const ORDER = (process.env.ORDER || "abba").toLowerCase();
const ALL = [
  { name: "dense", q: "b&gs=24&wd=0.6&brd=0.6" },
  { name: "maxfab", q: "b&gs=24&wd=1&brd=1&ded=1&del=40&jsp=.5" },
  { name: "knot24", q: "b&gs=24&wd=1&mf=0" },
];
const LINKS = process.env.ONLY ? ALL.filter((l) => l.name === process.env.ONLY) : ALL;
const SEQ = ORDER === "abab" ? [base, head, base, head] : [base, head, head, base];
const R = { head: head.sha, base: base.sha, order: ORDER, iter: ITER, errors: [], thermalStart: null, thermalEnd: null, cells: {} };
const save = () => saveJSON(DIR, R);
const GL = () => {
  const L = window.__knotBackgroundLayer && window.__knotBackgroundLayer();
  const gl = L && L.renderer && L.renderer.gl;
  if (!gl) return { err: "no gl" };
  const errs = [];
  for (let i = 0; i < 8; i++) { const e = gl.getError(); if (!e) break; errs.push(e); }
  return { errs, isContextLost: gl.isContextLost(), ctxLost: window.__ctxLost, ctxRestored: window.__ctxRestored, buf: [gl.drawingBufferWidth, gl.drawingBufferHeight], maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE) };
};
const PIN2 = () => {
  const F = window.__knotFabricRenderer && window.__knotFabricRenderer();
  if (!F) return false;
  F.exploreClock = 1000;
  if (typeof F.tickExplore === "function") { const proto = Object.getPrototypeOf(F); F.tickExplore = function () { return proto.tickExplore.call(this, 0); }; }
  return true;
};
const exactDiff = (a, b) => {
  if (a.W !== b.W || a.H !== b.H) return { err: "size", a: [a.W, a.H], b: [b.W, b.H] };
  let n = 0, n8 = 0;
  for (let i = 0; i < a.data.length; i += 3) { const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]); if (d) n++; if (d > 8) n8++; }
  return { px: n, px8: n8, total: a.W * a.H };
};
const med = (a) => { const s = a.filter((v) => typeof v === "number").sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
let browser;
try {
  browser = await connect();
  R.thermalStart = thermal();
  const page = await ownPage(browser);
  await prep(page, R.errors);
  await page.bringToFront();
  const sheet = [];
  async function frozen(b, link, run) {
    assertFree();
    const url = `${b.host}/?${link.q}&${Q}&fw=0&phy=0`;
    await cleanOrigin(page, b.host);
    const { stamp } = await loadFrozen(page, url);
    checkBuild(b, stamp);
    await page.evaluate(W.pinAll);
    await page.evaluate(PIN2);
    await sleep(500);
    const c = { build: b.key, run, url, stamp: stamp.slice(0, 70), at: new Date().toISOString().slice(11, 19) };
    c.params = await page.evaluate(() => { try { return window.__knotParams(); } catch { return null; } });
    c.vp = await page.evaluate(() => [window.innerWidth, window.innerHeight, +window.devicePixelRatio.toFixed(3)]);
    c.glLoad = await page.evaluate(GL);
    c.renderLoop = await page.evaluate(W.renderLoop, ITER).catch((e) => ({ err: String(e.message).slice(0, 80) }));
    c.glAfter = await page.evaluate(GL);
    const buf = await shotViewport(page);
    savePNG(DIR, `${link.name}_${b.key}_r${run}.png`, buf);
    c.img = readImg(buf);
    c.thermal = thermal();
    log(link.name, "run", run, b.key, b.sha, "renderLoop", JSON.stringify(c.renderLoop), "glLoad", JSON.stringify(c.glLoad.errs), "glAfter", JSON.stringify(c.glAfter.errs), "ctxLost", c.glAfter.ctxLost, "th", JSON.stringify(c.thermal).slice(0, 90));
    return c;
  }
  for (const link of LINKS) {
    const cell = (R.cells[link.name] = { link: link.q, runs: [] });
    const imgs = { base: [], head: [] };
    for (const [i, b] of SEQ.entries()) {
      const c = await frozen(b, link, i + 1);
      imgs[b.key].push(c.img);
      cell.runs.push({ ...c, img: undefined, params: i < 2 ? c.params : undefined });
      save();
    }
    const m = (k) => med(cell.runs.filter((r) => r.build === k).map((r) => r.renderLoop && r.renderLoop.median));
    cell.medianOfMedians = { base: m("base"), head: m("head") };
    cell.baseVsHead = exactDiff(imgs.base[0], imgs.head[0]);
    cell.baseVsBase = exactDiff(imgs.base[0], imgs.base[imgs.base.length - 1]);
    cell.headVsHead = exactDiff(imgs.head[0], imgs.head[imgs.head.length - 1]);
    const pk = new Set([...Object.keys(cell.runs.find((r) => r.build === "head").params || {}), ...Object.keys(cell.runs.find((r) => r.build === "base").params || {})]);
    const hp = cell.runs.find((r) => r.build === "head").params || {}, bp = cell.runs.find((r) => r.build === "base").params || {};
    cell.paramDiff = [...pk].filter((k) => JSON.stringify(hp[k]) !== JSON.stringify(bp[k]));
    sheet.push({ a: imgs.base[0], b: imgs.head[0] });
    log(link.name, "median of medians base", cell.medianOfMedians.base, "head", cell.medianOfMedians.head, "base vs head", JSON.stringify(cell.baseVsHead), "base vs base", JSON.stringify(cell.baseVsBase), "head vs head", JSON.stringify(cell.headVsHead), "paramDiff", JSON.stringify(cell.paramDiff));
    save();
  }
  if (sheet.length) S.composeSheet(sheet, out(DIR, "sheet_g31.png"));
  R.sheet = out(DIR, "sheet_g31.png");
  R.sheetOrder = LINKS.map((l) => l.name);
  await parkTab(page);
} catch (e) {
  R.errors.push("ABORT: " + e.message);
  log("ABORT", e.message, String(e.stack || "").split("\n").slice(1, 4).join(" | "));
} finally {
  try { R.thermalEnd = thermal(); } catch {}
  try { save(); } catch {}
  try { if (browser) await browser.disconnect(); } catch {}
}
log("done", JSON.stringify({ errors: R.errors, sheet: R.sheet }));