// K1458: one ordinary load; print the gf tables' reach (h, W, aa, rc) and the look's gap/fade, save a full shot.
//   node info.mjs <url> <out.png> <profileDir> [waitMs=6000]   env DSF=2
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , url, out, profileDir, waitMs = "6000"] = process.argv;
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: Number(process.env.DSF ?? 2) });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 600000 });
  if (new URL(url).searchParams.get("rp") === "gf")
    await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 600000, polling: 200 });
  console.log("ready at", Date.now() - t0, "ms");
  await new Promise((r) => setTimeout(r, Number(waitMs)));
  const info = await page.evaluate(() => {
    const T = globalThis.__knotGf?.tables;
    const r = globalThis.__knotRenderer?.();
    const v = globalThis.__knotView?.();
    return {
      T: T ? { h: T.h, W: T.W, aa: T.aa, rc: T.rc, sigma: T.sigma, zt: T.zt } : null,
      fade: r?.fadeLength, style: r?.style ? { thread: r.style.threadWidth, casing: r.style.casingWidth } : null,
      view: v ? JSON.stringify(v).slice(0, 300) : null, search: location.search,
    };
  });
  console.log(JSON.stringify(info, null, 1));
  writeFileSync(out, await page.screenshot({ type: "png" }));
} finally { await browser.close(); }
