// K1240 S4b: frame bench at rest and mid-drag, with the outline's own
// numbers. bench_frame.mjs's frame time (first draw call -> a 1-px
// readPixels returned, so the GPU work queued is in it), plus the rAF
// interval, at rest (5 s after the sim sleeps and the outline settles) and
// during a 5 s loop drag (k1240s4_smoke.mjs's). With rp=outline it also
// reads __knotOutline.stats: per reply [worker frame, round trip, upload,
// parts: frame, zChains, fill, paint, band] and each draw's ms, median
// and p95 per phase. Hold $env:TEMP\claude-perf.lock while it runs.
//   node k1240s4b_bench.mjs <out.json> <url> [<url> ...]
import puppeteer from "puppeteer-core";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , outFile, ...urls] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SEC = 5;
const profile = mkdtempSync(join(tmpdir(), "k1240s4b-bench-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile, defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    "--window-size=1720,1060"],
});
// In-page: SEC seconds of frames (bench_frame.mjs's BENCH, the app's canvas
// by export_scene.mjs's rule) and the outline's samples over the same span.
const BENCH = (SEC) => new Promise((resolve) => {
  let canvas = null; let area = -1;
  for (const k of document.querySelectorAll("canvas")) {
    if (k.id === "knot-loading-canvas") continue;
    const r = k.getBoundingClientRect();
    if (r.width * r.height >= area) { area = r.width * r.height; canvas = k; }
  }
  const gl = canvas.getContext("webgl2");
  const names = ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced", "drawRangeElements"];
  const orig = {};
  let tFirst = -1, draws = 0;
  for (const n of names) {
    if (typeof gl[n] !== "function") continue;
    orig[n] = gl[n];
    gl[n] = function (...a) { if (tFirst < 0) tFirst = performance.now(); draws++; return orig[n].apply(this, a); };
  }
  const o = window.__knotOutline;
  const r0 = o ? o.stats.replies : 0, d0 = o ? o.stats.draws : 0;
  const frame = [], iv = [], px = new Uint8Array(4);
  let last = -1;
  const t0 = performance.now();
  const cb = () => {
    const now = performance.now();
    if (last >= 0) iv.push(now - last);
    last = now;
    if (tFirst >= 0) { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); frame.push(performance.now() - tFirst); }
    tFirst = -1; draws = 0;
    if (now - t0 < SEC * 1000) { requestAnimationFrame(cb); return; }
    for (const n of Object.keys(orig)) gl[n] = orig[n];
    const s = (a) => {
      if (!a.length) return null;
      const b = [...a].sort((x, y) => x - y);
      const q = (f) => +b[Math.min(b.length - 1, Math.floor(f * b.length))].toFixed(2);
      return { n: b.length, p50: q(0.5), p95: q(0.95), max: +b[b.length - 1].toFixed(2) };
    };
    const res = { frameMs: s(frame), intervalMs: s(iv.slice(1)) };
    if (o) {
      const nr = o.stats.replies - r0, nd = o.stats.draws - d0;
      const rep = nr > 0 ? o.stats.replyMs.slice(-Math.min(nr, o.stats.replyMs.length)) : [];
      const cols = ["worker", "roundTrip", "upload", "frame", "zChains", "fill", "paint", "band"];
      res.outline = { replies: nr, draws: nd, restructures: o.stats.restructures, rebuilds: o.stats.rebuilds.map((x) => `${x.cause} ${x.ms}`) };
      cols.forEach((c, i) => { res.outline[c] = s(rep.map((x) => x[i])); });
      res.outline.draw = s(nd > 0 ? o.stats.drawMsLog.slice(-Math.min(nd, o.stats.drawMsLog.length)) : []);
      res.outline.structureMs = o.stats.structureMs;
    }
    resolve(res);
  };
  requestAnimationFrame(cb);
});
const out = { when: new Date().toISOString(), host: "desktop 1600x900@2 d3d11", runs: [] };
try {
  for (const url of urls) {
    const page = await browser.newPage();
    const rec = { url, errors: [] };
    page.on("pageerror", (e) => rec.errors.push(String(e.message).slice(0, 200)));
    page.on("console", (m) => { if (m.type() === "error") rec.errors.push(`console: ${m.text()}`.slice(0, 200)); });
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.bringToFront();
    await page.mouse.move(1, 1);
    await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 120000 });
    const tw = Date.now();
    await page.waitForFunction(() => {
      const o = window.__knotOutline; const p = window.__knotPerf?.();
      return (p?.asleep ?? false) && (!o || (o.stats.replies > 0 && o.settled));
    }, { timeout: 120000, polling: 250 }).catch(() => {});
    rec.restWaitMs = Date.now() - tw;
    rec.stamp = await page.evaluate(() => ([...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /^P\d/.test(t.trim())) || "").trim().slice(0, 90));
    await page.evaluate(() => window.__knotLoop?.({ continuous: true }));
    await sleep(1500);
    rec.rest = await page.evaluate(BENCH, SEC);
    // Mid-drag: grab the sample nearest the screen's centre, loop for SEC s.
    const grab = await page.evaluate(() => {
      const r = window.__knotRenderer?.(); const v = window.__knotView?.();
      let best = null;
      for (const s of r.chainSamples) {
        if (!s) continue;
        for (let i = 0; i < s.count; i += 3) {
          const x = s.positions[2 * i] * v.s + v.x; const y = s.positions[2 * i + 1] * v.s + v.y;
          const d = Math.hypot(x - innerWidth / 2, y - innerHeight / 2);
          if (!best || d < best.d) best = { x, y, d };
        }
      }
      return best;
    });
    await page.mouse.move(grab.x, grab.y);
    await page.mouse.down();
    for (let k = 1; k <= 10; k++) { await page.mouse.move(grab.x + 6 * k, grab.y + 3 * k); await sleep(50); }
    const pending = page.evaluate(BENCH, SEC);
    const N = Math.round((SEC * 1000) / 50);
    for (let k = 1; k <= N; k++) { const u = Math.sin((4 * Math.PI * k) / N); await page.mouse.move(grab.x + 60 + 120 * u, grab.y + 30 + 60 * u * Math.cos((2 * Math.PI * k) / N)); await sleep(50); }
    rec.drag = await pending;
    await page.mouse.up();
    out.runs.push(rec);
    console.log(JSON.stringify(rec));
    await page.close();
  }
} finally {
  writeFileSync(outFile, JSON.stringify(out, null, 1));
  await browser.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}