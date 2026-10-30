// K783: load to asleep, 20 typical links (bare seeds 1-20, the default
// design) at desktop size and phone size (emulated viewport on the
// desktop GPU). Per link: wall seconds to asleep, the sim seconds then,
// physics ms per wall second until then, and the median frame.
import puppeteer from "puppeteer-core";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.K783_BASE ?? "http://localhost:5199/";
const CAP_MS = 30000;
const profileDir = join(tmpdir(), `knotmaze-k783-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--window-size=1500,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});

async function measure(form, seed) {
  const page = await browser.newPage();
  if (form === "phone") {
    await page.emulate({
      viewport: { width: 411, height: 753, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36",
    });
  } else {
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  }
  await page.evaluateOnNewDocument(() => {
    const t = [];
    window.__diagFrames = t;
    const loop = (now) => { t.push(now); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  const t0 = Date.now();
  await page.goto(`${BASE}?${seed.toString(36)}&snd=none&am=instant`, { waitUntil: "load", timeout: 60000 });
  await page.bringToFront();
  let asleepAt = -1;
  let last = null;
  while (Date.now() - t0 < CAP_MS) {
    last = await page.evaluate(() => {
      const perf = window.__knotPerf?.(1) ?? null;
      const settle = window.__knotSettle?.() ?? null;
      return perf ? { asleep: perf.asleep, physMs: perf.physMs, substeps: perf.substeps, phase: settle?.phase } : null;
    }).catch(() => null);
    if (last?.asleep) { asleepAt = Date.now() - t0; break; }
    await new Promise((r) => setTimeout(r, 250));
  }
  const frames = await page.evaluate(() => {
    const t = window.__diagFrames ?? [];
    const d = [];
    for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
    d.sort((a, b) => a - b);
    return d.length ? +d[Math.floor(d.length / 2)].toFixed(1) : null;
  }).catch(() => null);
  const stamp = await page.evaluate(() => {
    const divs = [...document.querySelectorAll("div")].map((d) => d.textContent ?? "");
    return divs.find((x) => /^P\d/.test(x)) ?? "";
  }).catch(() => "");
  const sim = /sim (\d+(?:\.\d+)?)s/.exec(stamp)?.[1] ?? null;
  await page.close();
  const wall = (asleepAt >= 0 ? asleepAt : Date.now() - t0) / 1000;
  return {
    form, seed,
    asleep: asleepAt >= 0,
    wallS: +wall.toFixed(2),
    simS: sim !== null ? Number(sim) : null,
    physMsPerS: last ? +(last.physMs / wall).toFixed(1) : null,
    medianFrameMs: frames,
    phase: last?.phase ?? null,
  };
}

try {
  for (const form of [process.env.K783_FORM ?? "desktop"]) {
    for (let seed = Number(process.env.K783_FROM ?? 1); seed <= 20; seed++) {
      console.log(JSON.stringify(await measure(form, seed)));
    }
  }
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
