// K1239: sample __knotFieldB cover at given device points on a fbb page.
// Usage: node cover_probe.mjs <base> <points.json> [family]
import puppeteer from "puppeteer-core";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const [, , base, ptsFile, fam = "def"] = process.argv;
const SEEDS = { muse: "3", def: "b", fat: "p9ar6", ring: "1rphqy1", user: "1471kin" };
const pts = JSON.parse(readFileSync(ptsFile, "utf8"));
const profileDir = join(tmpdir(), `k1239-cover-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 });
  const url = `${base}/?${SEEDS[fam]}&tlk=border&fbb=1&am=instant&snd=none&phy=0&fw=0&phw=0`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 60000 });
  await page.waitForFunction(() => window.__knotFieldB && window.__knotFieldB.stats.renders > 5, { timeout: 60000 });
  await sleep(1000);
  if (process.env.ZOOM) {
    await page.mouse.move(800, 450);
    await page.keyboard.down("Control");
    for (let i = 0; i < 2; i++) { await page.mouse.wheel({ deltaY: -120 }); await sleep(60); }
    await page.keyboard.up("Control");
    await sleep(3500);
  }
  const out = await page.evaluate((pts) => {
    const cov = window.__knotFieldB.readCover();
    if (!cov) return { err: "no cover" };
    return {
      w: cov.w, h: cov.h, stats: { ...window.__knotFieldB.stats },
      vals: pts.map(([x, y]) => cov.data[Math.round(y) * cov.w + Math.round(x)]),
    };
  }, pts);
  console.log(JSON.stringify(out));
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
