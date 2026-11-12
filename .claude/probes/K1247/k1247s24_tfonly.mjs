// K1247 s24: ob=1's band placement pass alone. At rest (no reply, no upload) it re-runs the last placement on
// N frames (`__knotOutline.replace(1)` a frame) and reads its timer-query GPU ms, so the reply frame's TF cost
// splits into the pass itself and whatever (deferred record-texture uploads) a reply adds to it. Run under the
// perf lock (k1247s24_tfonly.ps1 takes it).
//   node .claude/probes/K1247/k1247s24_tfonly.mjs <out.json> <url>...
import puppeteer from "puppeteer-core";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , outFile, ...urls] = process.argv;
const N = 60;
const profile = mkdtempSync(join(tmpdir(), "k1247s24-tf-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile, defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    "--window-size=1720,1060"],
});
const out = [];
try {
  for (const url of urls) {
    const page = await browser.newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.bringToFront();
    await page.mouse.move(1, 1);
    await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 120000 });
    await page.waitForFunction(() => { const o = window.__knotOutline; const p = window.__knotPerf?.(); return (p?.asleep ?? false) && (!o || (o.stats.replies > 0 && o.settled)); }, { timeout: 120000, polling: 250 }).catch(() => {});
    const r = await page.evaluate(async (N) => {
      const o = window.__knotOutline; const raf = () => new Promise((res) => requestAnimationFrame(() => res()));
      if (!o || typeof o.replace !== "function") return { err: "no replace hook" };
      const g0 = o.stats.bandTfGpuMs.length; const c0 = o.stats.bandTfCpuMs.length;
      for (let i = 0; i < N; i++) { o.replace(1); await raf(); await raf(); }
      for (let i = 0; i < 12; i++) { o.replace(0); await raf(); }
      const q = (a) => { const s = [...a].sort((x, y) => x - y); const at = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))]; return s.length ? { n: s.length, p50: at(0.5), p95: at(0.95), max: at(1) } : null; };
      return { gpu: q(o.stats.bandTfGpuMs.slice(g0)), cpu: q(o.stats.bandTfCpuMs.slice(c0)), bandRec: o.stats.bandRec, bandCount: o.stats.bandCount };
    }, N);
    out.push({ url, errors, ...r });
    console.log(JSON.stringify({ url, ...r }));
    await page.close();
  }
} finally {
  await browser.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* the profile may still be locked */ }
}
writeFileSync(outFile, JSON.stringify(out, null, 1));
