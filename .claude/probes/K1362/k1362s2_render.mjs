// K1362 s2: rp=gf renders each scene in the app, at rest and through the s18
// drag (k1247s18_bench.mjs's loop drag, shortened). Per scene: page errors,
// __knotGf's fallback and stats, a screenshot at rest and one mid-drag.
//   node k1362s2_render.mjs <base url> <out dir> <name>=<query> [...]
import puppeteer from "puppeteer-core";
import { writeFileSync, rmSync, mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , base, outDir, ...pairs] = process.argv;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "k1362s2-render-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile, defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    "--window-size=1720,1060"],
});
const out = [];
const stat = () => {
  const g = window.__knotGf;
  if (!g) return null;
  const s = g.stats;
  return { rebuilds: s.rebuilds, passes: s.passes, composites: s.composites, fallback: s.fallback, timed: g.timed, gpuN: g.gpuMs.length, px: s.px.at(-1) ?? 0 };
};
try {
  for (const pr of pairs) {
    const i = pr.indexOf("=");
    const name = pr.slice(0, i);
    const url = `${base}${pr.slice(i + 1)}`;
    const page = await browser.newPage();
    const rec = { name, url, errors: [] };
    page.on("pageerror", (e) => rec.errors.push(String(e.message).slice(0, 300)));
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warn") rec.errors.push(`console.${m.type()}: ${m.text()}`.slice(0, 300)); });
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.bringToFront();
    await page.mouse.move(1, 1);
    await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 120000 });
    await page.waitForFunction(() => window.__knotPerf?.().asleep, { timeout: 60000, polling: 250 }).catch(() => {});
    await sleep(800);
    rec.rest = await page.evaluate(stat);
    await page.screenshot({ path: join(outDir, `${name}_rest.png`) });
    const grab = await page.evaluate(() => {
      const r = window.__knotRenderer?.(); const v = window.__knotView?.();
      let best = null;
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
    await page.mouse.move(grab.x, grab.y);
    await page.mouse.down();
    for (let k = 1; k <= 10; k++) { await page.mouse.move(grab.x + 6 * k, grab.y + 3 * k); await sleep(50); }
    const N = 40;
    for (let k = 1; k <= N; k++) {
      const u = Math.sin((4 * Math.PI * k) / N);
      await page.mouse.move(grab.x + 60 + 120 * u, grab.y + 30 + 60 * u * Math.cos((2 * Math.PI * k) / N));
      await sleep(50);
      if (k === N / 2) await page.screenshot({ path: join(outDir, `${name}_drag.png`) });
    }
    rec.drag = await page.evaluate(stat);
    await page.mouse.up();
    out.push(rec);
    console.log(JSON.stringify(rec));
    await page.close();
  }
} finally {
  writeFileSync(join(outDir, "render.json"), JSON.stringify(out, null, 1));
  await browser.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
