// K1384 / 27Z3: does a cold first visit under rp=gf still block the page?
// One cold load: a fresh Chrome profile (headed, hardware GPU, real time; never
// --virtual-time-budget), starting from .claude/probes/K1450/cold.mjs.
// From the navigation until 10 s after gf's first composite (mode gf), or for
// the load's first 60 s (mode control), it records every main-thread long task
// (PerformanceObserver "longtask": start, duration, on the performance
// timeline), every gap between animation frames over 100 ms, and the time of
// gf's first composite (__knotGf.stats.composites first above 0, polled in the
// page every 20 ms; the Node wall time of the same event rides along).
//   node .claude/probes/K1384/cold27z3.mjs <url> <freshProfileDir> <out.json> <gf|control>
// The profile directory must not exist yet or be empty: the GPU program cache
// lives in the profile, so a reused profile is a warm visit, not this probe.
import puppeteer from "puppeteer-core";
import { existsSync, readdirSync, writeFileSync } from "node:fs";

const [, , url, profileDir, out, mode] = process.argv;
if (!url || !profileDir || !out || (mode !== "gf" && mode !== "control")) {
  console.error("usage: node .claude/probes/K1384/cold27z3.mjs <url> <freshProfileDir> <out.json> <gf|control>");
  process.exit(2);
}
if (existsSync(profileDir) && readdirSync(profileDir).length) {
  console.error(`profile is not fresh (not empty): ${profileDir}`);
  process.exit(2);
}

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
  protocolTimeout: 900000,
});
const errors = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => { if (errors.length < 20) errors.push(`pageerror: ${e.message}`); });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => {
    const z = (globalThis.__z3 = {
      longtasks: [], gaps: [], frames: 0, firstCompMs: -1, gfSwitchedMs: -1, lost: 0,
    });
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) z.longtasks.push({ start: +e.startTime.toFixed(1), dur: +e.duration.toFixed(1) });
      }).observe({ type: "longtask", buffered: true });
    } catch { /* no longtask support: the frame gaps still record the stalls */ }
    let last = -1;
    const loop = (t) => {
      z.frames++;
      if (last >= 0 && t - last > 100) z.gaps.push({ start: +last.toFixed(1), gap: +(t - last).toFixed(1) });
      last = t;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    setInterval(() => {
      const s = globalThis.__knotGf?.stats;
      if (!s) return;
      if (s.switchedMs >= 0) z.gfSwitchedMs = s.switchedMs;
      if (z.firstCompMs < 0 && (s.composites ?? 0) > 0) z.firstCompMs = performance.now();
    }, 20);
    addEventListener("webglcontextlost", () => { z.lost++; }, true);
  });
  const tNav = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 900000 });
  let firstCompositeWallMs = -1;
  let timedOut = false;
  if (mode === "gf") {
    try {
      await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 500 });
      firstCompositeWallMs = Date.now() - tNav;
    } catch { timedOut = true; }
    await new Promise((r) => setTimeout(r, 10000));
  } else {
    const left = 60000 - (Date.now() - tNav);
    if (left > 0) await new Promise((r) => setTimeout(r, left));
  }
  const dump = await page.evaluate(() => {
    const s = globalThis.__knotGf?.stats;
    return {
      ...globalThis.__z3,
      perfNow: +performance.now().toFixed(1),
      gf: s ? {
        composites: s.composites, passes: s.passes, switchedMs: s.switchedMs,
        compileWorker: s.compileWorker, compileWarmed: s.compileWarmed,
        compileIssued: s.compileIssued, compileReady: s.compileReady, compileFirstMs: s.compileFirstMs,
        fallback: s.fallback,
      } : null,
    };
  });
  const rec = { url, mode, timedOut, wallMs: Date.now() - tNav, firstCompositeWallMs, errors, ...dump };
  writeFileSync(out, JSON.stringify(rec, null, 1));
  const lt = dump.longtasks.reduce((m, t) => Math.max(m, t.dur), 0);
  const gp = dump.gaps.reduce((m, g) => Math.max(m, g.gap), 0);
  console.log(`${mode} firstComp page ${dump.firstCompMs} ms wall ${firstCompositeWallMs} ms; ` +
    `${dump.longtasks.length} longtasks (max ${lt} ms), ${dump.gaps.length} gaps>100ms (max ${gp} ms), frames ${dump.frames}` +
    (dump.gf ? `; gf worker=${dump.gf.compileWorker} warmed=${dump.gf.compileWarmed} fallback=${JSON.stringify(dump.gf.fallback)}` : "; no gf") +
    (errors.length ? `; errors: ${errors.join(" | ")}` : ""));
} finally {
  await browser.close();
}
