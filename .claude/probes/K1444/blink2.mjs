// K1444: full-viewport frame burst + long-task log + gf stats, on a kept profile (warm shader cache on rerun).
// Usage: node blink2.mjs <url> <outPrefix> <profileDir> [frames] [gapMs]
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , url, pre, profileDir, n = "60", gap = "250"] = process.argv;
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: Number(process.env.DSF ?? 1) });
  const logs = [];
  page.on("console", (m) => logs.push(m.text()));
  page.on("pageerror", (e) => logs.push(`PAGEERROR: ${e.message}`));
  await page.evaluateOnNewDocument(() => {
    window.__lt = [];
    let last = performance.now();
    const tick = (t) => { if (t - last > 300) window.__lt.push([Math.round(last), Math.round(t - last)]); last = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    window.addEventListener("webglcontextlost", (e) => window.__lt.push(["ctxlost", Math.round(performance.now())]), true);
  });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 400000 });
  console.log("loaded", Date.now() - t0);
  const rows = [];
  for (let i = 0; i < Number(n); i++) {
    const c = process.env.CLIP?.split(",").map(Number); const buf = await page.screenshot(c ? { type: "png", clip: { x: c[0], y: c[1], width: c[2], height: c[3] } } : { type: "jpeg", quality: 70 });
    writeFileSync(`${pre}_${String(i).padStart(2, "0")}.${process.env.CLIP ? "png" : "jpg"}`, buf);
    rows.push(`${i} t=${Date.now() - t0} bytes=${buf.length}`);
    await new Promise((r) => setTimeout(r, Number(gap)));
  }
  console.log(rows.join("\n"));
  console.log("GAPS", JSON.stringify(await page.evaluate(() => window.__lt)));
  console.log("GF", JSON.stringify(await page.evaluate(() => { const g = globalThis.__knotGf; return g ? { stats: g.stats, home: g.home } : null; })).slice(0, 1500));
  console.log("LOGS", logs.slice(0, 30).join(" | ").slice(0, 2000));
} finally { await browser.close(); }
