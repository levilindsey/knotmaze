// K8 sdf phone: does every program link? Loads each URL headed, waits, and
// prints K307's warm-up report (failures, wave sizes) plus every console
// line that mentions a link failure or a shader error.
//   node warm.mjs <waitMs> <url>...
// Run under the perf lock (sdf_gaps/locked.ps1).
import puppeteer from "puppeteer-core";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [waitArg, ...urls] = process.argv.slice(2);
const waitMs = Number(waitArg) || 20000;
const profile = mkdtempSync(join(tmpdir(), "k8warm-"));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile,
  args: ["--use-angle=d3d11", "--window-position=-2400,0", "--window-size=1400,1040", "--no-first-run", "--no-default-browser-check", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion"],
});
let bad = 0;
try {
  for (const url of urls) {
    const page = await browser.newPage();
    const lines = [];
    page.on("console", (m) => { const t = m.text(); if (/link|compile|ERROR: 0:|CONTEXT_LOST|lost/i.test(t)) lines.push(t.slice(0, 300)); });
    page.on("pageerror", (e) => lines.push("pageerror " + String(e).slice(0, 300)));
    await page.goto(url, { waitUntil: "load" });
    await new Promise((r) => setTimeout(r, waitMs));
    const rep = await page.evaluate(() => {
      const w = window.__knotWarmup ? window.__knotWarmup() : null;
      const gl = document.querySelector("canvas")?.getContext("webgl2");
      return {
        failures: w ? w.failures.map((f) => ({ name: f.name, log: f.log.slice(0, 200) })) : "no report",
        wave1: w && w.wave1 ? Object.keys(w.wave1).length : null,
        wave1Names: w && w.wave1 && w.wave1.names ? w.wave1.names : undefined,
        relinked: w ? w.relinked : null,
        glError: gl ? gl.getError() : null,
        lost: gl ? gl.isContextLost() : null,
      };
    });
    const ok = Array.isArray(rep.failures) && rep.failures.length === 0 && lines.length === 0 && rep.glError === 0 && !rep.lost;
    if (!ok) bad++;
    console.log(JSON.stringify({ url, ok, ...rep, console: lines }));
    await page.close();
  }
} finally {
  await browser.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may hold it briefly */ }
}
console.log(bad === 0 ? "ALL LINKED" : `FAILED ${bad}`);
