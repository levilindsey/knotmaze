// K8 sdf phone: why bench_frame found no canvas (bench_AB, 04:53). Launches
// Chrome exactly as bench_frame does, loads one URL, and after waitMs reports
// the canvases, the stamp, console errors and the perf hooks.
//   node bench_diag.mjs <url> [waitMs]
import puppeteer from "puppeteer-core";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, waitArg] = process.argv.slice(2);
const waitMs = Number(waitArg) || 15000;
const profile = mkdtempSync(join(tmpdir(), "bench-diag-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile, defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    "--window-size=1720,1060"],
});
try {
  const page = await browser.newPage();
  const lines = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") lines.push(m.type() + " " + m.text().slice(0, 240)); });
  page.on("pageerror", (e) => lines.push("pageerror " + String(e).slice(0, 240)));
  page.on("requestfailed", (r) => lines.push("requestfailed " + r.url().slice(0, 160) + " " + (r.failure()?.errorText || "")));
  const resp = await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.bringToFront();
  await new Promise((r) => setTimeout(r, waitMs));
  const st = await page.evaluate(() => ({
    canvases: document.querySelectorAll("canvas").length,
    title: document.title,
    hooks: { perf: typeof window.__knotPerf, renderer: typeof window.__knotRenderer },
    perf: typeof window.__knotPerf === "function" ? window.__knotPerf() : null,
    stamp: ([...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /^P\d/.test(t.trim())) || "").trim().slice(0, 120),
    body: document.body.innerHTML.slice(0, 300),
    vis: document.visibilityState,
  }));
  console.log(JSON.stringify({ url, status: resp?.status(), ...st, console: lines.slice(0, 20) }, null, 1));
} finally {
  await browser.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* held briefly */ }
}
