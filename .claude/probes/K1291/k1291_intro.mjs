// K1291 s1: what rp=outline shows during the appearance reveal, beside
// today's look. Not a same-state A/B (the reveal runs on its own clock):
// frames at fixed wall times after the first frame, headed real-time
// Chrome, off-screen. Evidence for the reveal width masks, which s1 left.
//   node k1291_intro.mjs <base> <outDir> [ms,ms,...]
import puppeteer from "puppeteer-core";
import { mkdirSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , base, outDir, msArg] = process.argv;
const TIMES = (msArg ?? "400,900,1600,3000").split(",").map(Number);
const LINK = "?s=b&snd=none";
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [look, extra] of [["today", ""], ["outline", "&rp=outline"]]) {
  const profileDir = mkdtempSync(join(tmpdir(), "k1291-intro-"));
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: false,
    userDataDir: profileDir,
    defaultViewport: { width: 1240, height: 900, deviceScaleFactor: 1 },
    args: [
      "--use-angle=d3d11", "--no-first-run", "--no-default-browser-check",
      "--window-position=2200,50", "--window-size=1360,1040",
      "--disable-features=CalculateNativeWinOcclusion",
      "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    ],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(base + "/" + LINK + extra, { waitUntil: "domcontentloaded" });
    // The reveal starts when the loader hands over (__knotReveal exists).
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      const ok = await page.evaluate(() => typeof window.__knotReveal === "function" && window.__knotReveal() != null);
      if (ok) break;
      await sleep(50);
    }
    const start = Date.now();
    for (const t of TIMES) {
      const wait = start + t - Date.now();
      if (wait > 0) await sleep(wait);
      await page.screenshot({ path: join(outDir, `${look}_${t}.png`) });
    }
    console.log(`${look}: shots ${TIMES.join(",")} ms; page errors ${errors.length}${errors.length ? ": " + errors[0] : ""}`);
  } finally {
    await browser.close();
    rmSync(profileDir, { recursive: true, force: true });
  }
}
