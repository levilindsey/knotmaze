// K1524 flip: scripts/diag_screenshot.mjs's load (headed, hardware GPU, a new profile, 1600x900 at dsf 1.5), plus what
// it does not report: WebGL context losses and restores on the app's canvas, the page's own loss report
// (__knotContext), the hovered run, the active plucks, and three shots: _a as the page stands, _b after a second
// of forced frames, _c after the probe's mouse moved to the corner. Reddish outline strokes showed in link A's
// live shots with the second corner try on; this says whether plucks, a lost context, a stale frame or a hover
// go with them (they were the song's plucks: probes.md, PROBE LORE 2026-11-19, K1524).
// Usage: node redshot.mjs <url> <outPrefix> [settleMs=90000]
import puppeteer from "puppeteer-core";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , url, outPrefix, settleMsArg] = process.argv;
const settleMs = Number(settleMsArg ?? 90000);
const profileDir = join(tmpdir(), `k1524-redshot-profile-${process.pid}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: [
    "--use-angle=d3d11",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-position=2200,50",
    "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 });
  const logs = [];
  page.on("console", (m) => logs.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => logs.push(`PAGEERROR: ${e.message.slice(0, 200)}`));

  // Context events of canvases in the document only (capture at the document): Pixi's detached test canvas
  // loses its context on purpose and is not counted.
  await page.evaluateOnNewDocument(() => {
    const ev = [];
    window.__redCtx = ev;
    for (const type of ["webglcontextlost", "webglcontextrestored"]) {
      document.addEventListener(type, () => ev.push({ type, t: Math.round(performance.now()) }), true);
    }
  });

  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 30000 });
  await page.bringToFront();
  await sleep(settleMs);

  const facts = () =>
    page.evaluate(() => {
      const divs = [...document.querySelectorAll("div")].map((d) => d.textContent ?? "");
      const stamp = divs.find((t) => /^P\d/.test(t)) ?? "STAMP MISSING";
      const F = window.__knotFabricRenderer?.();
      const gf = globalThis.__knotGf;
      const perf = window.__knotPerf?.(1) ?? null;
      const loop = window.__knotLoop?.() ?? null;
      let gfStats = null;
      try {
        gfStats = gf?.stats ? JSON.parse(JSON.stringify(gf.stats)) : null;
      } catch {
        gfStats = "unreadable";
      }
      return {
        stamp: stamp.slice(0, 120),
        dpr: window.devicePixelRatio,
        ctxEvents: window.__redCtx,
        knotContext: window.__knotContext?.() ?? null,
        hoverEdge: F ? F.hoverEdge : null,
        teleHover: F ? F.telegraphHoverEdge : null,
        gfUp: !!gf,
        gfKRetry: globalThis.__knotGfKRetry ?? null,
        gfStats,
        plucks: perf?.plucks ?? null,
        pluckActive: (() => {
          try {
            const a = window.__knotPluckState?.()?.active;
            return Array.isArray(a) ? a.length : (a ?? null);
          } catch {
            return "unreadable";
          }
        })(),
        params: (() => {
          const p = window.__knotParams?.();
          return p ? { soundMode: p.soundMode ?? null, soundSpeed: p.soundSpeed ?? null } : null;
        })(),
        asleep: perf?.asleep ?? null,
        state: perf?.state ?? null,
        loop: loop ? { mode: loop.mode, stopped: loop.stopped, frames: loop.frames } : null,
      };
    });

  const out = { url, settleMs, loadS: +((Date.now() - t0) / 1000).toFixed(1) };
  out.a = await facts();
  await page.screenshot({ path: `${outPrefix}_a.png` });

  // b: a second and a half of forced frames, nothing else touched.
  await page.evaluate(() => window.__knotLoop?.({ continuous: true }));
  await sleep(1500);
  out.b = await facts();
  await page.screenshot({ path: `${outPrefix}_b.png` });

  // c: the probe's own mouse parked in the corner (a hover, if one was lit, moves or goes).
  await page.mouse.move(4, 4);
  await sleep(1500);
  out.c = await facts();
  await page.screenshot({ path: `${outPrefix}_c.png` });

  out.logs = logs.slice(0, 40);
  console.log(JSON.stringify(out, null, 1));
} finally {
  await browser.close();
  try {
    rmSync(profileDir, { recursive: true, force: true });
  } catch {
    // Profile cleanup is best-effort.
  }
}
