// K1468 Done 5: frame time at rest, warm, master beside the fix. bench_frame.mjs's BENCH and waitRest (copied: it
// launches a fresh, cold profile, and master's cold gf hangs), on a given warm profile, in continuous loop mode.
//   node .claude/probes/K1468/rest.mjs <profileDir> <out.json> <rounds> <url> [<url> ...]   env SEC=10 REDRAW=1
// REDRAW=1 sets __knotGfOpts.redraw (gf's pass every frame, not just its composite). Hold the perf lock.
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , profileDir, outFile, roundsArg, ...urls] = process.argv;
const SEC = +(process.env.SEC ?? 10), REDRAW = process.env.REDRAW === "1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// In-page: SEC seconds of frames.
const BENCH = (SEC) => new Promise((resolve) => {
  const canvas = document.querySelector("canvas");
  const gl = canvas.getContext("webgl2");
  const names = ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced", "drawRangeElements"];
  const orig = {};
  let tFirst = -1, draws = 0, drawsTotal = 0;
  for (const n of names) {
    if (typeof gl[n] !== "function") continue;
    orig[n] = gl[n];
    gl[n] = function (...a) { if (tFirst < 0) tFirst = performance.now(); draws++; return orig[n].apply(this, a); };
  }
  const r = window.__knotRenderer ? window.__knotRenderer() : null;
  let upd = null;
  if (r && typeof r.update === "function") {
    const proto = Object.getPrototypeOf(r), own = Object.prototype.hasOwnProperty.call(r, "update") ? r.update : null;
    upd = { ms: 0, n: 0, restore: () => { if (own) r.update = own; else delete r.update; } };
    const base = own || proto.update;
    r.update = function (...a) { const t = performance.now(); const v = base.apply(this, a); upd.ms += performance.now() - t; upd.n++; return v; };
  }
  const frame = [], submit = [], fin = [], iv = [], perFrameDraws = [];
  const px = new Uint8Array(4); // K932: the 1-px read's sink.
  let last = -1, lost = 0;
  const onLost = () => { lost++; };
  canvas.addEventListener("webglcontextlost", onLost);
  const t0 = performance.now();
  const cb = () => {
    const now = performance.now();
    if (last >= 0) iv.push(now - last);
    last = now;
    if (tFirst >= 0) {
      const t1 = performance.now();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const t2 = performance.now();
      frame.push(t2 - tFirst); submit.push(t1 - tFirst); fin.push(t2 - t1); perFrameDraws.push(draws);
      drawsTotal += draws;
    }
    tFirst = -1; draws = 0;
    if (now - t0 < SEC * 1000) { requestAnimationFrame(cb); return; }
    for (const n of Object.keys(orig)) gl[n] = orig[n];
    if (upd) upd.restore();
    canvas.removeEventListener("webglcontextlost", onLost);
    const s = (a) => {
      if (!a.length) return null;
      const b = [...a].sort((x, y) => x - y);
      const q = (f) => +b[Math.min(b.length - 1, Math.floor(f * b.length))].toFixed(3);
      return { n: b.length, mean: +(b.reduce((x, y) => x + y, 0) / b.length).toFixed(3), p50: q(0.5), p90: q(0.9), p95: q(0.95), max: +b[b.length - 1].toFixed(3) };
    };
    const p = window.__knotPerf ? window.__knotPerf() : null;
    resolve({
      frameMs: s(frame), submitMs: s(submit), finishMs: s(fin), intervalMs: s(iv.slice(1)),
      framesDrawn: frame.length, rafFrames: iv.length + 1, drawsPerFrame: frame.length ? +(drawsTotal / frame.length).toFixed(1) : 0,
      updateMsPerCall: upd && upd.n ? +(upd.ms / upd.n).toFixed(3) : null, updateCalls: upd ? upd.n : null,
      perf: p ? { state: p.state, asleep: p.asleep } : null, contextLost: lost,
    });
  };
  // Register after the app's ticker has registered its next frame: a
  // microtask queued from inside a draw runs once the app's rAF callback
  // returns, after Pixi's own requestAnimationFrame call. That first frame
  // is not measured (its draws began before the bench was in order).
  let armed = false;
  const start = () => { tFirst = -1; draws = 0; requestAnimationFrame(cb); };
  const arm = (n) => { const f = gl[n]; gl[n] = function (...a) { if (!armed) { armed = true; queueMicrotask(start); } return f.apply(this, a); }; };
  for (const n of Object.keys(orig)) arm(n);
  // A page that draws nothing (asleep with the ticker idle) still ends.
  setTimeout(() => { if (!armed) { armed = true; start(); } }, 1000);
});

async function waitRest(page, maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const ok = await page.evaluate(() => {
      if (typeof window.__knotPerf !== "function" || !window.__knotRenderer || !window.__knotRenderer()) return false;
      const p = window.__knotPerf();
      const rv = window.__knotReveal ? window.__knotReveal() : null;
      return (p.state === "frozen" || p.asleep) && (!rv || (rv.done && !rv.fxAlive)) && !p.plucks;
    }).catch(() => false);
    if (ok) return Date.now() - t0;
    await sleep(250);
  }
  return -1;
}

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 }, protocolTimeout: 900000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    ...(process.env.EXTRA ? process.env.EXTRA.split(" ") : [])],
});
const runs = [];
try {
  for (let round = 0; round < +roundsArg; round++) {
    for (const url of (round % 2 ? [...urls].reverse() : urls)) {
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
      await page.goto(url, { waitUntil: "load", timeout: 600000 });
      await page.bringToFront();
      await page.mouse.move(1, 1);
      await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 600000, polling: 300 });
      const restMs = await waitRest(page, 120000);
      if (REDRAW) await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; });
      await sleep(1500);
      const c0 = await page.evaluate(() => globalThis.__knotGf.stats.composites);
      const m = await page.evaluate(BENCH, SEC);
      const c1 = await page.evaluate(() => ({ c: globalThis.__knotGf.stats.composites, fb: globalThis.__knotGf.stats.fallback ?? null }));
      runs.push({ round, url, restMs, composites: c1.c - c0, fallback: c1.fb, ...m });
      console.log(round, url, "frameP50", m.frameMs?.p50, "intervalP50", m.intervalMs?.p50, "composites", c1.c - c0, "lost", m.contextLost);
      await page.close();
    }
  }
} finally { await browser.close(); }
const summary = {};
for (const u of urls) {
  const rs = runs.filter((x) => x.url === u);
  const med = (f) => { const v = rs.map(f).filter((x) => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
  summary[u] = { runs: rs.length, frameP50: rs.map((x) => x.frameMs?.p50), frameP50med: med((x) => x.frameMs?.p50), intervalP50: rs.map((x) => x.intervalMs?.p50) };
}
writeFileSync(outFile, JSON.stringify({ when: new Date().toISOString(), SEC, REDRAW, summary, runs }, null, 1));
console.log("SUMMARY " + JSON.stringify(summary));