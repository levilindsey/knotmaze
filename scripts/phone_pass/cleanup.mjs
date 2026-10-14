// phone_pass cleanup (K156; K81's cleanup_origins.mjs for the pass's two
// hosts): leave the phone's Chrome as found. Clears what the knotmaze pages
// stored for the pass's origins (localStorage: panel folds, scroll, daily
// records and saved attempts), in the pass's own tab only, then parks that tab
// on about:blank. The tab itself is closed afterwards by phone_pass.ps1
// (-Phase cleanup: /json/close/<id>, while Chrome is still in front).
// The storage is cleared from a static file of each build (favicon.svg): a
// bare page URL would boot the app as today's daily.
// Usage: node cleanup.mjs <config.json>
import { BUILDS, connect, myPage, sleep } from "./lib.mjs";

const browser = await connect();
try {
  const page = await myPage(browser);
  const hosts = [...new Set(BUILDS.map((b) => b.host))].reverse();
  for (const host of hosts) {
    await page.goto(`${host}/favicon.svg`, { waitUntil: "load", timeout: 30000 }).catch(() => {});
    const r = await page.evaluate(() => {
      let n = -1;
      try { n = localStorage.length; localStorage.clear(); sessionStorage.clear(); } catch (e) { return String(e); }
      return `cleared ${n} localStorage keys`;
    });
    console.log(host, r);
  }
  await page.goto("about:blank");
  await sleep(300);
} finally {
  await browser.disconnect();
}
