// K1247 s19: smoke test of the outline with and without oe=1 in headed real-time Chrome: page errors,
// console errors/warnings, the WebGL error flag at rest and after a 2 s drag, the outline's reply count
// and last reply bytes, and two screenshots per URL (rest, mid-drag).
//   node .claude/probes/K1247/k1247s19_smoke.mjs <outDir> <url> [<url> ...]
import puppeteer from "puppeteer-core";
import { mkdirSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , outDir, ...urls] = process.argv;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "k1247s19-smoke-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile, defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    "--window-size=1720,1060"],
});
const glErr = () => {
  const c = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0];
  const gl = c && (c.getContext("webgl2") || c.getContext("webgl"));
  if (!gl) return "no gl";
  const out = []; for (let k = 0; k < 8; k++) { const e = gl.getError(); if (!e) break; out.push(e); }
  return out.join(",") || "0";
};
try {
  for (const [u, url] of urls.entries()) {
    const page = await browser.newPage();
    const errors = []; const cons = [];
    page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") cons.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.bringToFront();
    await page.mouse.move(1, 1);
    await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 120000 });
    await page.waitForFunction(() => {
      const o = window.__knotOutline; const p = window.__knotPerf?.();
      return (p?.asleep ?? false) && (!o || (o.stats.replies > 0 && o.settled));
    }, { timeout: 120000, polling: 250 }).catch(() => {});
    await sleep(1000);
    const glRest = await page.evaluate(glErr);
    await page.screenshot({ path: join(outDir, `smoke${u}_rest.png`) });
    const grab = await page.evaluate(() => {
      const r = window.__knotRenderer?.(); const v = window.__knotView?.(); let best = null;
      for (const s of r.chainSamples) {
        if (!s) continue;
        for (let i = 0; i < s.count; i += 3) {
          const x = s.positions[2 * i] * v.s + v.x; const y = s.positions[2 * i + 1] * v.s + v.y;
          const d = Math.hypot(x - innerWidth / 2, y - innerHeight / 2);
          if (!best || d < best.d) best = { x, y, d };
        }
      }
      return best;
    });
    await page.mouse.move(grab.x, grab.y); await page.mouse.down();
    for (let k = 1; k <= 40; k++) { await page.mouse.move(grab.x + 3 * k, grab.y + 1.5 * k); await sleep(50); }
    await page.screenshot({ path: join(outDir, `smoke${u}_drag.png`) });
    await page.mouse.up(); await sleep(1500);
    const glDrag = await page.evaluate(glErr);
    const st = await page.evaluate(() => { const s = window.__knotOutline?.stats; return { replies: s?.replies, replyBytes: s?.replyBytes, stamp: document.querySelector("#stamp, .stamp")?.textContent?.slice(0, 80) }; });
    console.log(JSON.stringify({ url, errors, console: cons.slice(0, 6), glRest, glDrag, ...st }));
    await page.close();
  }
} finally {
  await browser.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
