// K1214 22M: CDP Profiler over the same 7 moves as tail22m.mjs (stand
// and cheapest-move pick copied verbatim from tail22m; rule 11). Runs
// against a Vite DEV server of the build's own worktree, because a
// preview bundle is minified into one chunk and its profile cannot be
// grouped by source file; the dev profile's costs are not the tail's
// numbers, only the by-file attribution. Aggregates self time from the
// profile's samples/timeDeltas, lists the top functions, and groups by
// file: junction_routes.ts, ribbon/joinery.ts, junction_field.ts,
// ribbon_renderer.ts, the rest (other src, packages, native/idle).
//   K1214_HOST=http://127.0.0.1:5995 K1214_LABEL=1fe793f5 node cdp22m.mjs <outDir>
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
  return { page, cdp };
}

const OUT = resolve(process.argv[2] || "out_cdp");
mkdirSync(OUT, { recursive: true });
const QUERY = "b.J&am=instant&fw=0&snd=none&phw=0";
const VIEW = { width: 1600, height: 900, deviceScaleFactor: 2 };
const HOST = process.env.K1214_HOST;
const LABEL = process.env.K1214_LABEL || HOST;

const DRIVE = (N) => new Promise((resolve) => {
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  const log = [];
  const t0 = performance.now();
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
    resolve(log);
  })().catch((e) => resolve([...log, { error: String(e && e.message || e) }]));
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

function aggregate(profile) {
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const selfUs = new Map();
  let totalUs = 0;
  const samples = profile.samples || [];
  const deltas = profile.timeDeltas || [];
  for (let i = 0; i < samples.length; i++) {
    const d = deltas[i] || 0;
    totalUs += d;
    selfUs.set(samples[i], (selfUs.get(samples[i]) || 0) + d);
  }
  const byFn = new Map();
  for (const [id, us] of selfUs) {
    const n = nodes.get(id);
    if (!n) continue;
    const cf = n.callFrame || {};
    const key = `${cf.functionName || "(anon)"} @ ${cf.url || ""}:${(cf.lineNumber ?? -1) + 1}`;
    byFn.set(key, (byFn.get(key) || 0) + us);
  }
  const fileOf = (url) => {
    if (/junction_routes\.ts/.test(url)) return "junction_routes.ts";
    if (/ribbon\/joinery\.ts/.test(url)) return "ribbon/joinery.ts";
    if (/junction_field\.ts/.test(url)) return "junction_field.ts";
    if (/ribbon_renderer\.ts/.test(url)) return "ribbon_renderer.ts";
    return "rest";
  };
  const byFile = new Map();
  for (const [id, us] of selfUs) {
    const n = nodes.get(id);
    if (!n) continue;
    const f = fileOf((n.callFrame || {}).url || "");
    byFile.set(f, (byFile.get(f) || 0) + us);
  }
  const top = [...byFn.entries()].map(([fn, us]) => ({ fn, selfMs: +(us / 1000).toFixed(2) })).sort((a, b) => b.selfMs - a.selfMs).slice(0, 30);
  const files = ["junction_routes.ts", "ribbon/joinery.ts", "junction_field.ts", "ribbon_renderer.ts", "rest"]
    .map((f) => ({ file: f, selfMs: +(((byFile.get(f) || 0)) / 1000).toFixed(2) }));
  return { totalMs: +(totalUs / 1000).toFixed(2), top, files };
}

const log = [];
const browser = await openBrowser();
try {
  const { page, cdp } = await openPageAt(browser, HOST, QUERY, log, VIEW);
  page.setDefaultTimeout(240000);
  try {
    await waitAsleep(page);
    await viewStill(page);
    await waitRest(page);
    await sleep(500);
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 500 });
    await cdp.send("Profiler.start");
    const playLog = await page.evaluate(DRIVE, 7);
    const { profile } = await cdp.send("Profiler.stop");
    const agg = aggregate(profile);
    const rec = { label: LABEL, host: HOST, stamp: await stampOf(page), playLog, ...agg, pageErrors: log.filter((l) => l.includes("pageerror")) };
    writeFileSync(join(OUT, "cdp.json"), JSON.stringify(rec, null, 1));
    console.log(`${LABEL}: profile total ${agg.totalMs} ms; files ${agg.files.map((f) => `${f.file}=${f.selfMs}`).join(" ")}`);
  } finally { await page.close(); }
} finally { await browser.close(); }
