// K1247 s24: s18's capture, grabbing at the chain sample nearest the world point env GRAB_W="x,y" (else the
// screen centre): g41_user_tw64 across j48/j49 (GRAB_W=13.57,7.45).
// K1247 s18: capture the outline's scenes over the bench's 5 s loop drag (k1240s4b_bench.mjs's grab and
// path), for the Node replay (k1247s18_inv.ts). Needs outline_app's __knotOutlineCapture hook.
//   node .claude/probes/K1247/k1247s18_capture.mjs <outDir> <name> <url>
// Writes <outDir>/<name>/f000.json ... (f000 = the scene at rest just before the grab).
import puppeteer from "puppeteer-core";
import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , outDir, name, url] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SEC = 5;
const dir = join(outDir, name); mkdirSync(dir, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "k1247s18-cap-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile, defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    "--window-size=1720,1060"],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.bringToFront();
  await page.mouse.move(1, 1);
  await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 120000 });
  await page.waitForFunction(() => {
    const o = window.__knotOutline; const p = window.__knotPerf?.();
    return (p?.asleep ?? false) && (!o || (o.stats.replies > 0 && o.settled));
  }, { timeout: 120000, polling: 250 }).catch(() => {});
  await page.evaluate(() => window.__knotLoop?.({ continuous: true }));
  await sleep(1500);
  const GW = process.env.GRAB_W ? process.env.GRAB_W.split(",").map(Number) : null;
  const grab = await page.evaluate((GW) => {
    const r = window.__knotRenderer?.(); const v = window.__knotView?.();
    let best = null;
    for (const s of r.chainSamples) {
      if (!s) continue;
      for (let i = 0; i < s.count; i += 3) {
        const x = s.positions[2 * i] * v.s + v.x; const y = s.positions[2 * i + 1] * v.s + v.y;
        const d = GW ? Math.hypot(s.positions[2 * i] - GW[0], s.positions[2 * i + 1] - GW[1]) : Math.hypot(x - innerWidth / 2, y - innerHeight / 2);
        if (!best || d < best.d) best = { x, y, d };
      }
    }
    return best;
  }, GW);
  console.log(JSON.stringify({ grab }));
  await page.evaluate(() => { window.__knotOutlineCapture = []; });
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) { await page.mouse.move(grab.x + 6 * k, grab.y + 3 * k); await sleep(50); }
  const N = Math.round((SEC * 1000) / 50);
  for (let k = 1; k <= N; k++) { const u = Math.sin((4 * Math.PI * k) / N); await page.mouse.move(grab.x + 60 + 120 * u, grab.y + 30 + 60 * u * Math.cos((2 * Math.PI * k) / N)); await sleep(50); }
  await page.mouse.up();
  await page.evaluate(() => { const c = window.__knotOutlineCapture; window.__knotOutlineCapture = null; window.__k1247cap = c; });
  const n = await page.evaluate(() => window.__k1247cap.length);
  for (let i = 0; i < n; i++) {
    const js = await page.evaluate((k) => window.__k1247cap[k], i);
    writeFileSync(join(dir, `f${String(i).padStart(3, "0")}.json`), js);
  }
  const stats = await page.evaluate(() => ({ rebuilds: window.__knotOutline?.stats?.rebuilds, replies: window.__knotOutline?.stats?.replies }));
  console.log(JSON.stringify({ name, frames: n, errors, rebuilds: stats.rebuilds?.map((r) => r.cause.slice(0, 60)) }));
} finally {
  await browser.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
