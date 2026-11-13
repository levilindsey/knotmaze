// K1362 c1: a copy of k1362s2_bench.mjs that also reads, over each span: c1's gf stats (gatherMs,
// mainMs = main's whole share per rebuild, workMs = the build worker's, latencyMs = post to arrival;
// on a build without them main's share is export + tables + pack + upload), main's gf ms per FRAME
// (the span's sum over its frames), and the physics worker's live stepping (__knotPerf physMs and
// substeps deltas, ms per worker frame) and sim/wall (host.snapSim over wall). Env:
//   GFOPTS='{"worker":false}' / '{"verify":true}'  -> window.__knotGfOpts before load
//   VERIFY=1  -> verify on, and at rest one forced rebuild (__knotGf.rebuild) before the spans;
//                each run then records worker, builds, verified, mismatch (not a timing run)
//   node k1362c1_bench.mjs <out.json> <url> [<url> ...]
// K1362 s2: a copy of K1247/k1247s18_bench.mjs that also reads rp=gf's __knotGf over each span: the
// GPU pass's timer-query ms and the empty query's (gpu - empty per pass), the table build on main
// (scene export, tables, pack, upload ms), the pixels shaded per pass, and, once mid-drag after the
// span, counts() (segments and corners tested per pixel, mean and p95). Same rest and loop drag.
//   node k1362s2_bench.mjs <out.json> <url> [<url> ...]
// K1247 s18: a copy of K1240/s4/k1240s4b_bench.mjs that also records the last reply's bytes (stats.replyBytes).
// K1247 s20: draws inside a transform-feedback pass no longer start the frame clock (see BENCH).
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
const VERIFY = process.env.VERIFY === "1";
const GFOPTS = process.env.GFOPTS ? JSON.parse(process.env.GFOPTS) : VERIFY ? { verify: true } : null;
const profile = mkdtempSync(join(tmpdir(), "k1362c1-bench-"));
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
  let tFirst = -1, draws = 0, inTF = false;
  for (const n of names) {
    if (typeof gl[n] !== "function") continue;
    orig[n] = gl[n];
    gl[n] = function (...a) { if (tFirst < 0 && !inTF) tFirst = performance.now(); draws++; return orig[n].apply(this, a); };
  }
  // K1247 s20: a transform-feedback pass (the record placement, run in the worker reply's message task, between
  // frames) is not a frame's first draw: before this, it started the frame clock early and the idle wait to
  // the next rAF counted as frame time (the s19/s20 oe=1 mid-drag p95 of 53-76 ms).
  for (const [n, v] of [["beginTransformFeedback", true], ["endTransformFeedback", false]]) {
    orig[n] = gl[n]; gl[n] = function (...a) { inTF = v; return orig[n].apply(this, a); };
  }
  const o = window.__knotOutline;
  const r0 = o ? o.stats.replies : 0, d0 = o ? o.stats.draws : 0;
  const G = window.__knotGf;
  const gk = ["exportMs", "tablesMs", "packMs", "uploadMs", "cpuPassMs", "px", "gatherMs", "mainMs", "workMs", "latencyMs", "verifyMs"];
  const g0 = G ? Object.fromEntries(gk.map((k) => [k, (G.stats[k] ?? []).length])) : null;
  const pf0 = window.__knotPerf?.(1);
  const w0 = performance.now();
  const gq0 = G ? G.gpuMs.length : 0;
  const p0 = G ? G.stats.passes : 0;
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
    const pf1 = window.__knotPerf?.(1);
    if (pf0 && pf1) {
      const wall = (performance.now() - w0) / 1000;
      const dms = pf1.physMs - pf0.physMs, dsub = pf1.substeps - pf0.substeps;
      const h0 = pf0.host ?? {}, h1 = pf1.host ?? {};
      const dwf = (h1.workerFrames ?? 0) - (h0.workerFrames ?? 0);
      res.phys = {
        kind: h1.kind ?? null, stepMs: +dms.toFixed(1), substeps: dsub, workerFrames: dwf,
        msPerWorkerFrame: dwf > 0 ? +(dms / dwf).toFixed(3) : null, msPerSec: +(dms / wall).toFixed(2),
        simPerWall: h1.snapSim !== undefined ? +((h1.snapSim - h0.snapSim) / wall).toFixed(3) : null,
        lagS: pf1.lagS, asleep: pf1.asleep,
      };
    }
    if (G) {
      // Queries resolve frames late: wait is not possible inside the rAF, so the
      // span's passes are those whose results arrived (the tail is read after).
      const gs = { fallback: G.stats.fallback, timed: G.timed, disjoint: G.disjoint, rebuilds: G.stats.rebuilds, passes: G.stats.passes };
      for (const k of gk) gs[k] = s((G.stats[k] ?? []).slice(g0[k]));
      const tb = G.stats.exportMs.slice(g0.exportMs).map((x, i) => x + G.stats.tablesMs[g0.exportMs + i] + G.stats.packMs[g0.exportMs + i] + G.stats.uploadMs[g0.exportMs + i]);
      gs.buildTotalMs = s(tb);
      // Main's gf share per rebuild and per frame (c1's mainMs; else the whole build ran on main).
      const mainR = G.stats.mainMs ? G.stats.mainMs.slice(g0.mainMs) : tb;
      gs.mainPerRebuild = s(mainR);
      gs.mainSum = +mainR.reduce((a, b) => a + b, 0).toFixed(1);
      gs.frames = iv.length + 1;
      gs.mainPerFrame = +(gs.mainSum / gs.frames).toFixed(3);
      gs.c1 = G.stats.mainMs ? { worker: G.stats.worker, workerBuilds: G.stats.workerBuilds, threadBuilds: G.stats.threadBuilds, stale: G.stats.stale, verified: G.stats.verified, mismatch: G.stats.mismatch.slice(0, 5), nMismatch: G.stats.mismatch.length } : null;
      gs.p0 = p0; gs.p1 = G.stats.passes; gs.gq0 = gq0;
      res.gf = gs;
    }
    if (o) {
      const nr = o.stats.replies - r0, nd = o.stats.draws - d0;
      const rep = nr > 0 ? o.stats.replyMs.slice(-Math.min(nr, o.stats.replyMs.length)) : [];
      const cols = ["worker", "roundTrip", "upload", "frame", "zChains", "fill", "paint", "band"];
      res.outline = { replies: nr, draws: nd, restructures: o.stats.restructures, rebuilds: o.stats.rebuilds.map((x) => `${x.cause} ${x.ms}`) };
      cols.forEach((c, i) => { res.outline[c] = s(rep.map((x) => x[i])); });
      res.outline.draw = s(nd > 0 ? o.stats.drawMsLog.slice(-Math.min(nd, o.stats.drawMsLog.length)) : []);
      res.outline.structureMs = o.stats.structureMs; res.outline.replyBytes = o.stats.replyBytes; res.outline.fillRec = o.stats.fillRec; res.outline.structureParts = o.stats.structureParts ?? null;
    }
    resolve(res);
  };
  requestAnimationFrame(cb);
});
// In-page: the GPU pass times of passes [p0, p1) (timer query minus the empty
// query right after it), once their results arrived.
const GPU = (p0, p1) => {
  const G = window.__knotGf;
  const a = G.gpuMs.slice(p0, p1), e = G.emptyMs.slice(p0, p1);
  const d = a.map((x, i) => x - e[i]);
  const s = (v) => {
    if (!v.length) return null;
    const b = [...v].sort((x, y) => x - y);
    const q = (f) => +b[Math.min(b.length - 1, Math.floor(f * b.length))].toFixed(3);
    return { n: b.length, p50: q(0.5), p95: q(0.95), max: +b[b.length - 1].toFixed(3) };
  };
  return { passes: p1 - p0, arrived: a.length, raw: s(a), empty: s(e), net: s(d), disjoint: G.disjoint };
};
const out = { when: new Date().toISOString(), host: "desktop 1600x900@2 d3d11", runs: [] };
try {
  for (const url of urls) {
    const page = await browser.newPage();
    const rec = { url, errors: [] };
    page.on("pageerror", (e) => rec.errors.push(String(e.message).slice(0, 200)));
    page.on("console", (m) => { if (m.type() === "error" || /K1362 gf/.test(m.text())) rec.errors.push(`console: ${m.text()}`.slice(0, 200)); });
    if (GFOPTS) await page.evaluateOnNewDocument((o) => { window.__knotGfOpts = o; }, GFOPTS);
    rec.gfOpts = GFOPTS;
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.bringToFront();
    await page.mouse.move(1, 1);
    await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 120000 });
    const tw = Date.now();
    await page.waitForFunction(() => {
      const o = window.__knotOutline; const p = window.__knotPerf?.();
      const g = window.__knotGf;
      return (p?.asleep ?? false) && (!o || (o.stats.replies > 0 && o.settled)) && (!g || g.stats.passes > 0 || !!g.stats.fallback);
    }, { timeout: 120000, polling: 250 }).catch(() => {});
    rec.restWaitMs = Date.now() - tw;
    rec.stamp = await page.evaluate(() => ([...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /^P\d/.test(t.trim())) || "").trim().slice(0, 90));
    await page.evaluate(() => window.__knotLoop?.({ continuous: true }));
    await sleep(1500);
    // VERIFY: at rest, one forced rebuild (in the worker once it is ready), checked against the old path.
    const c1 = () => { const G = window.__knotGf; return G && G.stats.mainMs !== undefined ? { worker: G.stats.worker, workerBuilds: G.stats.workerBuilds, threadBuilds: G.stats.threadBuilds, stale: G.stats.stale, verified: G.stats.verified, mismatch: G.stats.mismatch.slice(0, 5), nMismatch: G.stats.mismatch.length, rebuilds: G.stats.rebuilds, fallback: G.stats.fallback } : null; };
    rec.loadC1 = await page.evaluate(c1);
    if (VERIFY && rec.loadC1) {
      await page.evaluate(() => window.__knotGf.rebuild());
      await page.waitForFunction((n) => window.__knotGf.stats.rebuilds > n, { timeout: 10000, polling: 50 }, rec.loadC1.rebuilds).catch(() => {});
      await sleep(300);
      rec.restC1 = await page.evaluate(c1);
      rec.restC1.asleep = await page.evaluate(() => window.__knotPerf().asleep);
    }
    rec.rest = await page.evaluate(BENCH, SEC);
    await sleep(400);
    if (rec.rest.gf) rec.rest.gf.gpu = await page.evaluate(GPU, rec.rest.gf.p0, rec.rest.gf.p1);
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
    if (rec.drag.gf) {
      // Still held: the last pass's candidates per pixel, then the span's GPU times.
      rec.drag.gf.counts = await page.evaluate(() => window.__knotGf.counts());
      await sleep(400);
      rec.drag.gf.gpu = await page.evaluate(GPU, rec.drag.gf.p0, rec.drag.gf.p1);
    }
    await page.mouse.up();
    rec.endC1 = await page.evaluate(c1);
    out.runs.push(rec);
    console.log(JSON.stringify(rec));
    await page.close();
  }
} finally {
  writeFileSync(outFile, JSON.stringify(out, null, 1));
  await browser.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}