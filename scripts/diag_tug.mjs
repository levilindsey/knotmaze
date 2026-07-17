// Interaction diagnostic: settle, confirm quiescence, drag a thread,
// screenshot mid-drag and after release, confirm re-sleep.
// Usage: node scripts/diag_tug.mjs <url> <outPrefix>
import puppeteer from "puppeteer-core";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , url, outPrefix] = process.argv;
const profileDir = join(tmpdir(), "knotmaze-diag-profile-tug");

const browser = await puppeteer.launch({
  executablePath:
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--window-size=1720,1000"],
});

const stampText = (page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll("div")]
        .map((d) => d.textContent ?? "")
        .find((t) => t.startsWith("P3")) ?? "STAMP MISSING"
  );

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "load", timeout: 30000 });
  await page.bringToFront();

  await new Promise((r) => setTimeout(r, 7000));
  console.log("after settle:", await stampText(page));

  await page.mouse.move(800, 450);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(800 + i * 9, 450 - i * 8);
    await new Promise((r) => setTimeout(r, 30));
  }
  await page.screenshot({ path: `${outPrefix}_drag.png` });
  console.log("mid-drag:", await stampText(page));
  await page.mouse.up();

  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `${outPrefix}_after.png` });

  await new Promise((r) => setTimeout(r, 6000));
  console.log("after release+wait:", await stampText(page));
} finally {
  await browser.close();
  try {
    rmSync(profileDir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup.
  }
}
