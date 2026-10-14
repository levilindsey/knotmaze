// Diagnostic renderer: drives a headed, hardware-GPU Chrome (system binary,
// throwaway profile, window off-screen) via DevTools protocol, captures the
// settled page, and reports the page's build stamp, real GPU string, the
// sim/wall timing and console output.
// Usage: node scripts/diag_screenshot.mjs <url> <out.png> [settleMs]
//
// TIMING (K147): the stamp's sim and wall seconds do not match, and need
// not: the first frame's hitch (pixi caps a frame's dt at 0.1 s), the
// hidden pre-settle running ahead of wall, the settle budget's slow motion
// (the stamp's "settle lag": simulated seconds the budget dropped) and
// sleep (the sim stops) all separate them. `timing` reports them; the rAF
// check the old "sim must match wall" stood for is `frames`: a median near
// 16.7 ms is healthy, ~1000 ms means an occluded or background window (a
// frozen, mid-settle capture). Probes that time the sim against wall can
// pass `&stb=0` (no budget: real-time stepping through the settle).
import puppeteer from "puppeteer-core";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , url, outPath, settleMsArg] = process.argv;
const settleMs = Number(settleMsArg ?? 12000);
// One profile per run: parallel runs must not share one.
const profileDir = join(tmpdir(), `knotmaze-diag-profile-${process.pid}`);

const browser = await puppeteer.launch({
  executablePath:
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: [
    process.env.DIAG_SWIFTSHADER
      ? "--use-angle=swiftshader"
      : "--use-angle=d3d11",
    "--no-first-run",
    "--no-default-browser-check",
    // Off-screen, so a real pointer cannot contaminate the page, and never
    // treated as occluded (an occluded window stops its rAF).
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
  page.on("console", (m) => logs.push(m.text()));
  page.on("pageerror", (e) => logs.push(`PAGEERROR: ${e.message}`));

  // Every frame's timestamp, from the first script on.
  await page.evaluateOnNewDocument(() => {
    const t = [];
    window.__diagFrames = t;
    const loop = (now) => {
      t.push(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  await page.goto(url, { waitUntil: "load", timeout: 30000 });
  // Foreground the window: Chrome throttles rAF to ~1fps when occluded,
  // which freezes the sim mid-settle and invalidates the capture.
  await page.bringToFront();
  await new Promise((resolve) => setTimeout(resolve, settleMs));

  const facts = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    const divs = [...document.querySelectorAll("div")].map(
      (d) => d.textContent ?? ""
    );
    const stamp = divs.find((t) => /^P\d/.test(t)) ?? "STAMP MISSING";
    const num = (re) => {
      const m = stamp.match(re);
      return m ? Number(m[1]) : null;
    };
    const settle = window.__knotSettle?.() ?? null;
    const perf = window.__knotPerf?.(1) ?? null;
    const sim = num(/sim (\d+(?:\.\d+)?)s/);
    const wall = num(/wall (\d+(?:\.\d+)?)s/);
    const lag = settle ? settle.lagS : num(/settle lag (\d+(?:\.\d+)?)s/) ?? 0;
    const asleep = perf ? perf.asleep : /asleep/.test(stamp);
    return {
      gpu: gl
        ? ext
          ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER)
        : "no webgl",
      stamp,
      dpr: window.devicePixelRatio,
      canvasCount: document.querySelectorAll("canvas").length,
      timing: {
        sim,
        wall,
        settleLagS: +lag.toFixed(2),
        asleep,
        phase: settle?.phase ?? null,
        presettle: settle?.presettle ?? null,
        budget: settle?.budget ?? null,
      },
      frames: (() => {
        const t = window.__diagFrames ?? [];
        const d = [];
        for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
        d.sort((a, b) => a - b);
        const q = (p) =>
          d.length ? +d[Math.min(d.length - 1, Math.floor(d.length * p))].toFixed(1) : null;
        return { n: t.length, medianMs: q(0.5), p95Ms: q(0.95), maxMs: q(1) };
      })(),
    };
  });

  await page.screenshot({ path: outPath });
  console.log(JSON.stringify({ facts, logs }, null, 2));
} finally {
  await browser.close();
  try {
    rmSync(profileDir, { recursive: true, force: true });
  } catch {
    // Profile cleanup is best-effort.
  }
}
