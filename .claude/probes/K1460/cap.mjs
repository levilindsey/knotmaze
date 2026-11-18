// K1460 s4: the one capture path shot.mjs and oneshot.mjs share, so both freeze to the same state.
// - Chrome runs with --disable-gpu-watchdog (K1468: a cold gf load hangs the GPU main thread 50-70 s and the
//   watchdog kills the GPU process; the context is lost and gf recompiles in a loop).
// - warm(): load the gf link on this profile and wait until composites keep rising (2-4 min cold). One profile
//   per build, warmed once, reused.
// - load(): freeze the sim the moment the hook exists (EARLY, s3), step to SIMT, stop the paint clocks, wait for
//   gf's switch-in and a redraw, each with a timeout. Counts webglcontextlost; a load that saw one is retried.
import puppeteer from "puppeteer-core";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function launch(profileDir) {
  return puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
    args: ["--use-angle=d3d11", "--disable-gpu-watchdog", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
      "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
  });
}
async function newPage(browser, tag, dsf) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`[${tag}] pageerror ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" || /CTXLOST|CTXRESTORED/.test(m.text())) console.log(`[${tag}] console ${m.text().slice(0, 300)}`); });
  await page.evaluateOnNewDocument(() => {
    window.__knotLoopMode = "continuous";
    window.__ctxLost = 0; // counted on an attached canvas only: Pixi's isWebGLSupported test canvas loses its context on purpose
    const g = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t, o) {
      const c = g.call(this, t, o);
      if (c && /webgl/.test(t) && !this.__h) { this.__h = 1; this.addEventListener("webglcontextlost", () => { if (!this.isConnected) return; window.__ctxLost++; console.log("CTXLOST"); }); }
      return c;
    };
  });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: dsf });
  return page;
}
const gfStat = (page) => page.evaluate(() => { const g = globalThis.__knotGf; return g ? { sw: g.stats.switchedMs, c: g.stats.composites, f: g.stats.fallback, lost: window.__ctxLost } : { lost: window.__ctxLost }; }).catch((e) => ({ err: e.message }));
// Waits until composites rise on three successive 5 s reads (or maxS passes); returns the last stat.
export async function warm(browser, url, maxS = 420) {
  const page = await newPage(browser, "warm", 1);
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 900000 });
  let last = -1, rises = 0, s;
  while ((Date.now() - t0) / 1000 < maxS) {
    await sleep(5000);
    s = await gfStat(page);
    if (s.sw > 0) await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf?.redraw?.(); }).catch(() => {});
    const c = s.c ?? -1;
    rises = c > last && s.sw > 0 ? rises + 1 : 0;
    last = c;
    console.log(`[warm ${((Date.now() - t0) / 1000).toFixed(0)}s] ${JSON.stringify(s)}`);
    if (rises >= 3) break;
  }
  await page.close();
  return { ok: rises >= 3, s, secs: (Date.now() - t0) / 1000 };
}
async function waitFor(page, fn, arg, ms) {
  try { await page.waitForFunction(fn, { timeout: ms, polling: 200 }, arg); return true; } catch { return false; }
}
// One frozen capture. Returns { page, hash, lost, ok }; ok false = a timeout or a context loss (retry it).
export async function load(browser, url, { tag = "", gf = true, simT = 20, dsf = 2, switchMs = 600000 } = {}) {
  const page = await newPage(browser, tag, dsf);
  await page.evaluateOnNewDocument(() => {
    const iv = setInterval(() => { if (typeof window.__knotPhysFreeze === "function" && window.__knotPS?.()) { clearInterval(iv); window.__knotPhysFreeze(true); } }, 0);
  });
  await page.goto(url, { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  const hash = await page.evaluate(async (t) => {
    const fz = await window.__knotPhysFreeze(true);
    await window.__knotStepUntil(t);
    const r = window.__knotRenderer();
    r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
    window.__knotLoop?.({ continuous: true });
    const d = await window.__knotPhysDump();
    const h = d?.hashes ?? d; return String(h?.all ?? JSON.stringify(h).slice(0, 80)) + " " + (fz?.simTime ?? -1).toFixed(3);
  }, simT);
  let ok = true;
  if (gf) {
    ok = await waitFor(page, () => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && (globalThis.__knotGf?.stats?.composites ?? 0) > 2, null, switchMs);
    if (ok) {
      await sleep(1500);
      const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw?.(); return globalThis.__knotGf.stats.composites; });
      ok = await waitFor(page, (c) => globalThis.__knotGf.stats.composites > c + 2, c0, 30000);
      await sleep(600);
    }
  } else await sleep(2500);
  const s = await gfStat(page);
  if (s.lost > 0) ok = false;
  if (gf && s.f) ok = false;
  return { page, hash, lost: s.lost ?? 0, ok, stat: s };
}
