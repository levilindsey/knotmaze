// K1444: capture a burst of frames of a live link to see whether the maze blinks.
// Usage: node blink.mjs <url> <outPrefix> [settleMs] [frames] [gapMs]
import puppeteer from "puppeteer-core";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const [, , url, pre, settle = "15000", n = "24", gap = "120"] = process.argv;
const profileDir = join(tmpdir(), `knotmaze-blink-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  const logs = [];
  page.on("console", (m) => logs.push(m.text()));
  page.on("pageerror", (e) => logs.push(`PAGEERROR: ${e.message}`));
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 300000 });
  await new Promise((r) => setTimeout(r, Number(settle)));
  const rows = [];
  for (let i = 0; i < Number(n); i++) {
    const buf = await page.screenshot({ type: "png", clip: { x: 300, y: 100, width: 800, height: 700 } });
    writeFileSync(`${pre}_${String(i).padStart(2, "0")}.png`, buf);
    rows.push(`${i} t=${Date.now() - t0} bytes=${buf.length}`);
    await new Promise((r) => setTimeout(r, Number(gap)));
  }
  console.log(rows.join("\n"));
  console.log("LOGS", logs.slice(0, 30).join(" | ").slice(0, 3000));
} finally { await browser.close(); try { rmSync(profileDir, { recursive: true, force: true }); } catch {} }
