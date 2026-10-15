// FRAME BENCH (K8 G3-0; G3G4_sdf_geometry.md section 5.0): the draw phase's
// time per frame without a GPU timer query, so it runs on the Pixel 11
// (Chrome there exposes no EXT_disjoint_timer_query) as well as the desktop.
//
// Per frame: the time of the frame's FIRST draw call (drawElements,
// drawArrays and their Instanced / Range forms, all wrapped on the app's
// context), then gl.finish() in a requestAnimationFrame callback that runs
// right after the app's own ticker callback (registered after Pixi's, so
// it keeps that order every frame), and the time again. frameMs = first
// draw -> finish returned: the CPU's submission plus the GPU work still
// queued, nothing from before the first draw (a mid-tick upload or the
// sim). submitMs = first draw -> the finish call, finishMs = blocked in
// finish. No app code: everything hangs off the page's canvas, plus
// __knotRenderer().update (ms per call, the way g1/probe_perf wraps it) and
// the page's caps when the hooks exist.
//
// Usage:
//   node scripts/bench_frame.mjs <url> [<url2> ...] [--sec 5] [--rounds 1]
//        [--cdp http://127.0.0.1:9222] [--size 1600x900] [--dpr 2]
//        [--angle d3d11] [--profile-root <dir>] [--rest-ms 120000]
//        [--settle-ms 1500] [--out <file.json>]
// Several URLs alternate for --rounds rounds, the order reversed every
// other round (A B, B A, ...: ABBA cancels a linear drift; desktop
// update() crept up about 0.3 to 0.7 ms per page over one A B A B run),
// a fresh tab each, because a phone throttles over minutes. Without --cdp it launches a
// headed desktop Chrome off-screen with its own profile (deleted at the
// end); with --cdp it connects to a running Chrome (the phone over
// `scripts/phone.ps1`: adb forward tcp:9222 localabstract:chrome_devtools_remote)
// and closes its tabs when done. Hold $env:TEMP\claude-perf.lock while it
// runs (claude-config rules/sessions.md).
import puppeteer from "puppeteer-core";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const argv = process.argv.slice(2);
const urls = [];
const opt = { sec: 5, rounds: 1, cdp: "", size: "1600x900", dpr: 2, angle: "d3d11", "profile-root": tmpdir(), "rest-ms": 120000, "settle-ms": 1500, out: "" };
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) {
    const k = argv[i].slice(2);
    if (!(k in opt)) { console.error(`unknown option --${k}`); process.exit(2); }
    opt[k] = typeof opt[k] === "number" ? Number(argv[++i]) : argv[++i];
  } else urls.push(argv[i]);
}
if (urls.length === 0) { console.error("usage: node scripts/bench_frame.mjs <url> [<url2> ...] [--sec 5] [--rounds 1] [--cdp <browserURL>] [--out <file>]"); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// In-page: the GL caps the SDF stages budget against.
const CAPS = () => {
  const c = document.createElement("canvas");
  const gl = c.getContext("webgl2");
  if (!gl) return { webgl2: false };
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const prec = (stage, type) => { const p = gl.getShaderPrecisionFormat(stage, type); return p ? { rangeMin: p.rangeMin, rangeMax: p.rangeMax, precision: p.precision } : null; };
  const out = {
    webgl2: true,
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
    maxVaryingComponents: gl.getParameter(gl.MAX_VARYING_COMPONENTS),
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    precision: {
      vertexHighp: prec(gl.VERTEX_SHADER, gl.HIGH_FLOAT), vertexMediump: prec(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT),
      fragmentHighp: prec(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT), fragmentMediump: prec(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT),
    },
    timerQuery: !!gl.getExtension("EXT_disjoint_timer_query_webgl2"),
    colorBufferFloat: !!gl.getExtension("EXT_color_buffer_float"),
    floatLinear: !!gl.getExtension("OES_texture_float_linear"),
    dpr: devicePixelRatio, viewport: `${innerWidth}x${innerHeight}`,
    ua: navigator.userAgent.slice(0, 140),
  };
  const lose = gl.getExtension("WEBGL_lose_context");
  if (lose) lose.loseContext();
  return out;
};

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
      gl.finish();
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

const stampOf = (page) => page.evaluate(() => ([...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /^P\d/.test(t.trim())) || "").trim().slice(0, 90));

let browser, profile = null;
if (opt.cdp) {
  browser = await puppeteer.connect({ browserURL: opt.cdp, defaultViewport: null });
} else {
  const [w, h] = opt.size.split("x").map(Number);
  mkdirSync(opt["profile-root"], { recursive: true });
  profile = mkdtempSync(join(opt["profile-root"], "bench-frame-"));
  browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: false, userDataDir: profile, defaultViewport: { width: w, height: h, deviceScaleFactor: opt.dpr },
    args: [`--use-angle=${opt.angle}`, "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
      "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
      `--window-size=${w + 120},${h + 160}`],
  });
}
const runs = [];
let caps = null;
try {
  for (let round = 0; round < opt.rounds; round++) {
    for (const url of (round % 2 ? [...urls].reverse() : urls)) {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e.message || e).slice(0, 200)));
      await page.goto(url, { waitUntil: "load", timeout: 120000 });
      await page.bringToFront();
      if (!opt.cdp) await page.mouse.move(1, 1);
      if (!caps) caps = await page.evaluate(CAPS);
      const restMs = await waitRest(page, opt["rest-ms"]);
      await sleep(opt["settle-ms"]);
      const m = await page.evaluate(BENCH, opt.sec);
      runs.push({ round, url, stamp: await stampOf(page), restMs, ...m, errors });
      await page.close();
    }
  }
} finally {
  if (opt.cdp) await browser.disconnect();
  else { await browser.close(); if (profile) rmSync(profile, { recursive: true, force: true }); }
}
const byUrl = {};
for (const u of urls) {
  const rs = runs.filter((x) => x.url === u);
  const mean = (f) => { const v = rs.map(f).filter((x) => x != null); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3) : null; };
  byUrl[u] = { runs: rs.length, frameP50: mean((x) => x.frameMs && x.frameMs.p50), frameMean: mean((x) => x.frameMs && x.frameMs.mean),
    finishP50: mean((x) => x.finishMs && x.finishMs.p50), intervalP50: mean((x) => x.intervalMs && x.intervalMs.p50),
    updateMsPerCall: mean((x) => x.updateMsPerCall) };
}
const res = { when: new Date().toISOString(), host: opt.cdp ? `cdp ${opt.cdp}` : `desktop ${opt.size}@${opt.dpr} angle=${opt.angle}`, sec: opt.sec, rounds: opt.rounds, caps, summary: byUrl, runs };
if (opt.out) writeFileSync(opt.out, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res));
process.exit(runs.some((x) => x.contextLost) ? 1 : 0);
