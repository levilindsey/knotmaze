// K414 check: phw=0 must never request the worker chunk (and run
// in-thread); a default page must request it and run the worker.
import puppeteer from "puppeteer-core";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.K414_BASE ?? "http://localhost:5199/";
const profileDir = join(tmpdir(), `knotmaze-k414-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--window-size=1500,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
async function run(query) {
  const page = await browser.newPage();
  const reqs = [];
  page.on("request", (r) => reqs.push(r.url()));
  await page.goto(BASE + query, { waitUntil: "load", timeout: 60000 });
  await page.bringToFront();
  await page.waitForFunction(() => typeof window.__knotPerf === "function", { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3000));
  const perf = await page.evaluate(() => window.__knotPerf(1));
  const workerReqs = reqs.filter((u) => u.includes("physics_worker"));
  const links = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel="modulepreload"]')].map((l) => l.href));
  await page.close();
  return { query, host: perf?.host?.kind ?? perf?.kind ?? null, workerReqs, links };
}
try {
  console.log(JSON.stringify(await run("?7&phw=0&snd=none&am=instant")));
  console.log(JSON.stringify(await run("?7&snd=none&am=instant")));
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
