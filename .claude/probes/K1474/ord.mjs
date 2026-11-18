// K1474: ordinary load (no freeze, no clock pins) of a gf link; wait for gf composites and a settled
// frame, screenshot, print the junction-B pixel (device 1732,276) from the PNG the caller reads.
import { writeFileSync } from "node:fs";
import { launch } from "../K1460/cap.mjs";
const [, , base, profileDir, outPng, link] = process.argv;
const browser = await launch(profileDir);
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${base}/?${link}`, { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 30, { timeout: 900000, polling: 500 });
  // let the hero settle finish: wait until the perf state has been non-loading and quiet a while
  await new Promise((r) => setTimeout(r, 12000));
  const stat = await page.evaluate(() => ({ c: globalThis.__knotGf?.stats?.composites, s: window.__knotPerf?.()?.state }));
  writeFileSync(outPng, await page.screenshot({ type: "png" }));
  console.log(JSON.stringify(stat), outPng);
  await page.close();
} finally { await browser.close(); }
