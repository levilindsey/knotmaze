// K728: at link ?s=5ovogt&gs=24&wd=1&cr=1.52&gap=.02 (zero temperature),
// how far do the threads move in 60 sim-seconds, and do they stop?
// In-thread host (&phw=0), frozen on arrival, then stepped with
// __knotStepUntil; positions from __knotPhysDump({arrays:true}).
import puppeteer from "puppeteer-core";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.K728_BASE ?? "http://localhost:5199/";
const LINK = "?s=5ovogt&gs=24&wd=1&cr=1.52&gap=.02&phy=1&phw=0&snd=none&am=instant";
const profileDir = join(tmpdir(), `knotmaze-k728-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--window-size=1500,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + LINK, { waitUntil: "load", timeout: 60000 });
  await page.bringToFront();
  await page.waitForFunction(() => typeof window.__knotStepUntil === "function", { timeout: 30000 });
  const frozen = await page.evaluate(() => window.__knotPhysFreeze(true));
  const d0 = await page.evaluate(() => window.__knotPhysDump({ arrays: true }));
  const p0 = d0.positions;
  const n = d0.n;
  console.log(JSON.stringify({ stamp: frozen, simStart: d0.simTime, particles: n }));
  const rows = [];
  let prev = p0;
  for (let t = Math.ceil(d0.simTime) + 5; t <= d0.simTime + 60; t += 5) {
    const sim = await page.evaluate((tt) => window.__knotStepUntil(tt), t);
    const d = await page.evaluate(() => window.__knotPhysDump({ arrays: true }));
    const p = d.positions;
    let maxFrom0 = 0;
    let maxStep = 0;
    for (let i = 0; i < p.length; i += 2) {
      const dx = p[i] - p0[i];
      const dy = p[i + 1] - p0[i + 1];
      const d0v = Math.hypot(dx, dy);
      if (d0v > maxFrom0) maxFrom0 = d0v;
      const sx = p[i] - prev[i];
      const sy = p[i + 1] - prev[i + 1];
      const sv = Math.hypot(sx, sy);
      if (sv > maxStep) maxStep = sv;
    }
    rows.push({ sim: +sim.toFixed(2), maxFromStart: +maxFrom0.toFixed(4), maxPer5s: +maxStep.toFixed(5) });
    console.log(JSON.stringify(rows[rows.length - 1]));
    prev = p;
  }
  console.log(JSON.stringify({ errors, rows }));
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
