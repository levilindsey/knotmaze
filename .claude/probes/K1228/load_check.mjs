// K1228: load one stand URL and print console/pageerror lines.
import { openBrowser, sleep } from "./lib.mjs";
const url = process.argv[2];
const browser = await openBrowser();
try {
  const page = await browser.newPage();
  page.on("console", (m) => console.log(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => console.log(`[pageerror] ${e.message}\n${e.stack || ""}`));
  await page.setViewport({ width: 1700, height: 950, deviceScaleFactor: 1.5 });
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    const ok = await page.evaluate(() => !!(window.__knotRenderer && window.__knotRenderer()));
    console.log(`t${i + 1} renderer ${ok}`);
    if (ok) break;
  }
} finally {
  await browser.close();
}
