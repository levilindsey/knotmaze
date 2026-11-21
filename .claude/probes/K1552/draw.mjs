// K1552 (27M) Done 4: warm redraw cost on link A at rest after the switch to gf, with the second
// corner try on (gfh=1) and off (&gfk=0). One kept profile; per repeat a fresh load, then 100 forced
// redraws, each timed in the page from __knotGf.redraw() to stats.composites moving.
//   node .claude/probes/K1552/draw.mjs <base> <profileDir> <out.json>
// Writes both configurations to <out.json>: {on: {repeats: [{median, mean, min, max, samples}]}, off: {...}}
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , base, prof, out] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1660,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
async function load(q) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("pageerror " + e.message.slice(0, 200)));
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${base}/?${q}`, { waitUntil: "load", timeout: 900000 });
  await page.bringToFront();
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 240000, polling: 300 });
  await sleep(2500);
  return page;
}
async function repeat(page) {
  const samples = await page.evaluate(async () => {
    const sleep2 = (ms) => new Promise((r) => setTimeout(r, ms));
    const out2 = [];
    for (let i = 0; i < 100; i++) {
      const c0 = globalThis.__knotGf.stats.composites;
      const t0 = performance.now();
      globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true };
      globalThis.__knotGf.redraw();
      while (globalThis.__knotGf.stats.composites <= c0) await sleep2(1);
      out2.push(performance.now() - t0);
      await sleep2(30);
    }
    return out2;
  });
  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return { median, mean, min: sorted[0], max: sorted.at(-1), samples };
}
const result = {};
for (const [label, q] of [
  ["on", "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1&snd=none"],
  ["off", "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1&gfk=0&snd=none"],
]) {
  result[label] = { repeats: [] };
  for (let r = 0; r < 3; r++) {
    const page = await load(q);
    const rep = await repeat(page);
    console.log(`${label} repeat ${r + 1}: median ${rep.median.toFixed(2)} ms mean ${rep.mean.toFixed(2)} min ${rep.min.toFixed(2)} max ${rep.max.toFixed(2)}`);
    result[label].repeats.push(rep);
    await page.close();
  }
}
writeFileSync(out, JSON.stringify(result, null, 1));
await browser.close();
console.log("draw done");
