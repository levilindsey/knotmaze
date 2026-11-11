// K1240 S4: rp=outline in the app: load, settle, drag. Headed hardware-GPU
// Chrome off-screen (diag_screenshot.mjs's launch), real time.
// Usage: node k1240s4_smoke.mjs <base> <outDir> <tag> <query> [settleMs=20000] [dragMs=1500]
// (S4b: dragMs > 1500 drags a loop of that length: out and back, twice;
// <tag>.json's steps.dragRebuilds lists the restructures from the grab to
// the outline's settle after release, with their causes.)
// Writes <tag>_rest.png, <tag>_drag.png, <tag>_after.png and <tag>.json
// (the outline's stats at each step, rAF intervals during the drag, console
// warnings/errors, the build stamp).
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , base, outDir, tag, query, settleArg, dragArg] = process.argv;
const DRAG = Number(dragArg ?? 1500);
const SETTLE = Number(settleArg ?? 20000);
mkdirSync(outDir, { recursive: true });
const profileDir = join(tmpdir(), `k1240s4-smoke-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: [
    "--use-angle=d3d11", "--no-first-run", "--no-default-browser-check",
    "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
  ],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { url: `${base}/?${query}`, logs: [], steps: {} };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 });
  page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") out.logs.push(`${m.type()}: ${m.text()}`.slice(0, 300)); });
  page.on("pageerror", (e) => out.logs.push(`PAGEERROR: ${e.message}`.slice(0, 300)));
  await page.goto(out.url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 90000 });
  const info = () => page.evaluate(() => {
    const divs = [...document.querySelectorAll("div")].map((d) => d.textContent ?? "");
    const o = window.__knotOutline;
    return { stamp: divs.find((t) => /^P\d/.test(t)) ?? "STAMP MISSING", outline: o ? { ...o.stats, settled: o.settled } : null, view: window.__knotView?.() };
  });
  // Settle: the sim asleep (or the cap) and the outline caught up.
  const t0 = Date.now();
  await page.waitForFunction(() => {
    const o = window.__knotOutline; const p = window.__knotPerf?.();
    return o && o.stats.replies > 0 && o.settled && (p?.asleep ?? p?.sleeping ?? true);
  }, { timeout: SETTLE, polling: 500 }).catch(() => {});
  out.steps.rest = { waitedMs: Date.now() - t0, ...(await info()) };
  writeFileSync(join(outDir, `${tag}_rest.png`), await page.screenshot());
  // Drag: grab a thread point near the screen's centre and pull it 120 px.
  const grab = await page.evaluate(() => {
    const r = window.__knotRenderer?.(); const v = window.__knotView?.();
    if (!r || !v) return null;
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
  out.steps.grab = grab;
  if (grab) {
    await page.evaluate(() => {
      window.__k1240raf = [];
      let last = performance.now();
      const tick = (t) => { window.__k1240raf.push(t - last); last = t; if (window.__k1240raf.length < 2000) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    await page.mouse.move(grab.x, grab.y);
    await page.mouse.down();
    const dragT0 = await page.evaluate(() => performance.now());
    if (DRAG > 1500) {
      const N = Math.round(DRAG / 50);
      for (let k = 1; k <= N; k++) { const u = Math.sin((2 * Math.PI * 2 * k) / N); await page.mouse.move(grab.x + 120 * u, grab.y + 60 * u * Math.cos((2 * Math.PI * k) / N)); await sleep(50); }
    } else for (let k = 1; k <= 30; k++) { await page.mouse.move(grab.x + 4 * k, grab.y + 2 * k); await sleep(50); }
    out.steps.dragWallMs = (await page.evaluate(() => performance.now())) - dragT0;
    await sleep(1500);
    out.steps.drag = await info();
    writeFileSync(join(outDir, `${tag}_drag.png`), await page.screenshot());
    await page.mouse.up();
    const raf = await page.evaluate(() => window.__k1240raf.slice());
    const sorted = raf.slice().sort((a, b) => a - b);
    out.steps.dragRaf = { n: raf.length, median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.floor(sorted.length * 0.95)], max: sorted[sorted.length - 1] };
    const t1 = Date.now();
    await page.waitForFunction(() => window.__knotOutline?.settled, { timeout: SETTLE, polling: 500 }).catch(() => {});
    out.steps.after = { waitedMs: Date.now() - t1, ...(await info()) };
    out.steps.dragRebuilds = (out.steps.after.outline?.rebuilds ?? []).filter((b) => b.at >= dragT0);
    writeFileSync(join(outDir, `${tag}_after.png`), await page.screenshot());
  }
} finally {
  writeFileSync(join(outDir, `${tag}.json`), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 4000));
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
