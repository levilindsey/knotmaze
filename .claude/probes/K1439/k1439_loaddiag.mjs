// K1439: why a page never leaves loading (errors, failed requests, state every 4 s).
//   node .claude/probes/K1439/k1439_loaddiag.mjs <url>
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
const url = process.argv[2];
const profileDir = join(tmpdir(), `k1439-diag-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false, userDataDir: profileDir, defaultViewport: { width: 1240, height: 900, deviceScaleFactor: 2 },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--window-size=1280,1060", "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("pageerror", String(e.message).slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("console", m.type(), m.text().slice(0, 300)); });
page.on("requestfailed", (r) => console.log("reqfail", r.url().slice(0, 120), r.failure()?.errorText));
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.bringToFront();
for (let i = 0; i < 6; i++) {
  await new Promise((r) => setTimeout(r, 4000));
  const s = await page.evaluate(() => ({ step: typeof window.__knotStepUntil, ps: !!window.__knotPS?.(), state: window.__knotPerf?.().state ?? null, settle: window.__knotSettle?.() ?? null, href: location.href.slice(0, 100) }));
  console.log(JSON.stringify(s).slice(0, 400));
}
await browser.close();
rmSync(profileDir, { recursive: true, force: true });

