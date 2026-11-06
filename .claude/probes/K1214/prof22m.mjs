// K1214 22M: split one 7-moves window on a BUILT preview into per-frame
// JS phases. Stand and move pick copied verbatim from tail22m.mjs (22E's
// TAILBENCH: link b.J&am=instant&fw=0&snd=none&phw=0, 7 cheapest moves
// by __knotTurnMove). Named changes from tail22m (rule 11): the collector
// also records, per frame, the main-thread ms spent inside wrapped
// renderer/fabric methods (probe-only wraps, restored at the end:
// renderer.update, renderer.rebuildFillets, renderer.tickPaint,
// fabric.tickAnim, fabric.tickExplore, fabric.update) and the bench
// collector's submit/finish split (first draw -> readPixels call ->
// read returned: finish is the GPU-stall proxy; no per-pass GPU timer
// hook exists for the fabric passes in src/app/probe_hooks.ts), plus
// __knotPerf() snapshots bracketing the window. One run times ONE host:
//   K1214_HOST=http://127.0.0.1:5990 K1214_LABEL=1fe793f5 node prof22m.mjs <outDir>
// under the perf lock (run_locked.ps1 -Batch); never time without it.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, waitAsleep, viewStill, sleep } from "./lib.mjs";

async function openPageAt(browser, host, query, log, vp) {
  const page = await browser.newPage();
  page.on("console", (m) => log.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
  await page.setViewport(vp);
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await page.evaluateOnNewDocument(() => {
    window.__knotLoopMode = "continuous";
    window.__ctxLost = 0;
    document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true);
  });
  await page.goto(`${host}/?${query}`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer() && window.__knotFabric && window.__knotFabric(), { timeout: 60000 });
  return page;
}

const OUT = resolve(process.argv[2] || "out_prof");
mkdirSync(OUT, { recursive: true });
const QUERY = "b.J&am=instant&fw=0&snd=none&phw=0";
const VIEW = { width: 1600, height: 900, deviceScaleFactor: 2 };
const MOVES = 7;
const HOST = process.env.K1214_HOST;
const LABEL = process.env.K1214_LABEL || HOST;

const INSTALL = () => {
  const r = window.__knotRenderer();
  const fb = window.__knotFabricRenderer();
  const cur = () => window.__ph.cur;
  const wrap = (obj, name, key) => {
    if (!obj || typeof obj[name] !== "function") { window.__ph.missing.push(key); return; }
    const proto = Object.getPrototypeOf(obj);
    const own = Object.prototype.hasOwnProperty.call(obj, name) ? obj[name] : null;
    const base = own || proto[name];
    obj[name] = function (...a) {
      const t = performance.now();
      try { return base.apply(this, a); }
      finally { const c = cur(); c[key] = (c[key] || 0) + (performance.now() - t); c[key + "N"] = (c[key + "N"] || 0) + 1; }
    };
    window.__ph.restore.push(() => { if (own) obj[name] = own; else delete obj[name]; });
  };
  window.__ph = { cur: {}, restore: [], missing: [] };
  wrap(r, "update", "update");
  wrap(r, "rebuildFillets", "rebuild");
  wrap(r, "tickPaint", "tickPaint");
  wrap(fb, "tickAnim", "tickAnim");
  wrap(fb, "tickExplore", "tickExplore");
  wrap(fb, "update", "fabricUpdate");
  return { missing: window.__ph.missing };
};

const COLLECT = (N) => new Promise((resolve) => {
  const canvas = document.querySelector("canvas");
  const gl = canvas.getContext("webgl2");
  const names = ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced", "drawRangeElements"];
  const orig = {};
  let tFirst = -1, draws = 0;
  for (const n of names) {
    if (typeof gl[n] !== "function") continue;
    orig[n] = gl[n];
    gl[n] = function (...a) { if (tFirst < 0) tFirst = performance.now(); draws++; return orig[n].apply(this, a); };
  }
  const frames = [];
  const px = new Uint8Array(4);
  let lost = 0, done = false, tail = 0;
  const onLost = () => { lost++; };
  canvas.addEventListener("webglcontextlost", onLost);
  const t0 = performance.now();
  const log = [];
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  (async () => {
    for (let i = 0; i < N; i++) {
      for (let w = 0; w < 600 && window.__knotFabric().animating; w++) await delay(20);
      const k = window.__knotFabric();
      if (!k.choices.length) { log.push({ i, stop: "no choices" }); break; }
      const best = k.choices.reduce((a, b) => (b.cost < a.cost ? b : a));
      const ok = window.__knotTurnMove(best.edge);
      let sawAnim = false;
      for (let w = 0; w < 600; w++) {
        await delay(20);
        const a = window.__knotFabric().animating;
        if (a) sawAnim = true;
        if (!a && (sawAnim || w > 10)) break;
      }
      log.push({ i, eid: best.edge, head1: window.__knotFabric().head, ok, sawAnim, atMs: +(performance.now() - t0).toFixed(1) });
    }
    done = true;
  })().catch((e) => { log.push({ error: String(e && e.message || e) }); done = true; });
  const cb = () => {
    const now = performance.now();
    if (tFirst >= 0) {
      const t1 = performance.now();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const t2 = performance.now();
      const ph = { ...(window.__ph ? window.__ph.cur : {}) };
      if (window.__ph) window.__ph.cur = {};
      frames.push({
        frameMs: +(t2 - tFirst).toFixed(3), submitMs: +(t1 - tFirst).toFixed(3), finishMs: +(t2 - t1).toFixed(3),
        draws, animating: !!window.__knotFabric().animating, head: window.__knotFabric().head, ...ph,
      });
    }
    tFirst = -1; draws = 0;
    if (done) { if (++tail >= 5) {
      for (const n of Object.keys(orig)) gl[n] = orig[n];
      canvas.removeEventListener("webglcontextlost", onLost);
      if (window.__ph) for (const f of window.__ph.restore) f();
      resolve({ frames, contextLost: lost, windowSec: +((now - t0) / 1000).toFixed(3), playLog: log });
      return;
    } }
    if (now - t0 > 180000) {
      for (const n of Object.keys(orig)) gl[n] = orig[n];
      canvas.removeEventListener("webglcontextlost", onLost);
      resolve({ error: "play window over 180 s", frames, playLog: log, contextLost: lost });
      return;
    }
    requestAnimationFrame(cb);
  };
  let armed = false;
  const start = () => { tFirst = -1; draws = 0; if (window.__ph) window.__ph.cur = {}; requestAnimationFrame(cb); };
  const arm = (n) => { const f = gl[n]; gl[n] = function (...a) { if (!armed) { armed = true; queueMicrotask(start); } return f.apply(this, a); }; };
  for (const n of Object.keys(orig)) arm(n);
  setTimeout(() => { if (!armed) { armed = true; start(); } }, 1000);
});

async function waitRest(page, maxMs = 90000) {
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
const stampOf = (page) => page.evaluate(() =>
  ([...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /^P\d/.test(t.trim())) || "").trim().slice(0, 90));

const log = [];
const browser = await openBrowser();
try {
  const page = await openPageAt(browser, HOST, QUERY, log, VIEW);
  page.setDefaultTimeout(240000);
  try {
    await waitAsleep(page);
    await viewStill(page);
    await waitRest(page);
    await sleep(500);
    const perf0 = await page.evaluate(() => window.__knotPerf(600));
    const inst = await page.evaluate(INSTALL);
    const play = await page.evaluate(COLLECT, MOVES);
    const perf1 = await page.evaluate(() => window.__knotPerf(600));
    const rec = { label: LABEL, host: HOST, stamp: await stampOf(page), perf0, perf1, install: inst, ...play, pageErrors: log.filter((l) => l.includes("pageerror")) };
    writeFileSync(join(OUT, "prof.json"), JSON.stringify(rec, null, 1));
    const fr = play.frames || [];
    console.log(`${LABEL}: frames ${fr.length} moves ${play.playLog?.length} window ${play.windowSec}s missing ${JSON.stringify(inst.missing)} ctxLost ${play.contextLost}`);
    if (play.contextLost) throw new Error(`webgl context lost (${play.contextLost})`);
  } finally { await page.close(); }
} finally { await browser.close(); }
